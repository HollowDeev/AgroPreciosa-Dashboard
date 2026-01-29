'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Upload, Camera, X, Package } from 'lucide-react'
import { toast } from 'sonner'
import { generateSlug, formatCurrency, calculateMargin } from '@/lib/utils'
import { Category, Product, UNIT_LABELS } from '@/types/database'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  ean_code: z.string().optional(),
  sku: z.string().optional(),
  category_id: z.string().optional(),
  cost_price: z.number().min(0, 'Valor inválido'),
  sale_price: z.number().min(0.01, 'Valor de venda é obrigatório'),
  stock_quantity: z.number().int().min(0, 'Quantidade inválida'),
  min_stock_alert: z.number().int().min(0, 'Valor inválido'),
  weight: z.number().optional(),
  unit: z.enum(['un', 'kg', 'g', 'lt', 'ml', 'cx', 'pc']),
  is_active: z.boolean(),
  is_featured: z.boolean(),
})

type ProductForm = {
  name: string
  description?: string
  barcode?: string
  ean_code?: string
  sku?: string
  category_id?: string
  cost_price: number
  sale_price: number
  stock_quantity: number
  min_stock_alert: number
  weight?: number
  unit: 'un' | 'kg' | 'g' | 'lt' | 'ml' | 'cx' | 'pc'
  is_active: boolean
  is_featured: boolean
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  onSuccess: () => void
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
}: ProductFormDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.slug ? null : null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      barcode: product?.barcode || '',
      ean_code: product?.ean_code || '',
      sku: product?.sku || '',
      category_id: product?.category_id || '',
      cost_price: product?.cost_price || 0,
      sale_price: product?.sale_price || 0,
      stock_quantity: product?.stock_quantity || 0,
      min_stock_alert: product?.min_stock_alert || 5,
      weight: product?.weight || undefined,
      unit: product?.unit || 'un',
      is_active: product?.is_active ?? true,
      is_featured: product?.is_featured ?? false,
    },
  })

  const costPrice = watch('cost_price')
  const salePrice = watch('sale_price')
  const margin = calculateMargin(costPrice, salePrice)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Implementar captura de câmera (simplificado - usar input file com capture)
      stream.getTracks().forEach(track => track.stop())
    } catch {
      toast.error('Não foi possível acessar a câmera')
    }
  }

  const onSubmit = async (data: ProductForm) => {
    setIsLoading(true)
    try {
      const slug = generateSlug(data.name)
      
      let imageUrl: string | null = null
      
      // Upload da imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${slug}-${Date.now()}.${fileExt}`
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('images')
          .upload(`products/${fileName}`, imageFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(`products/${fileName}`)
        
        imageUrl = publicUrl
      }

      const productData = {
        ...data,
        slug,
        category_id: data.category_id || null,
      }

      if (product) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)

        if (error) throw error

        // Atualizar imagem principal se houver nova
        if (imageUrl) {
          await supabase
            .from('product_images')
            .upsert({
              product_id: product.id,
              image_url: imageUrl,
              is_primary: true,
              display_order: 0,
            })
        }

        toast.success('Produto atualizado com sucesso!')
      } else {
        // Criar novo produto
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()

        if (error) throw error

        // Adicionar imagem se houver
        if (imageUrl && newProduct) {
          await supabase
            .from('product_images')
            .insert({
              product_id: newProduct.id,
              image_url: imageUrl,
              is_primary: true,
              display_order: 0,
            })
        }

        toast.success('Produto criado com sucesso!')
      }

      reset()
      setImageFile(null)
      setImagePreview(null)
      onOpenChange(false)
      onSuccess()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Imagem */}
          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-4 items-start">
              {imagePreview ? (
                <div className="relative w-32 h-32">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </Label>
                <Label htmlFor="camera-capture" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Camera className="h-4 w-4" />
                    Câmera
                  </div>
                  <input
                    id="camera-capture"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </Label>
              </div>
            </div>
          </div>

          {/* Nome e Categoria */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nome do produto"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={watch('category_id') || ''}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição do produto"
              rows={3}
            />
          </div>

          {/* Códigos */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="Código de barras"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ean_code">Código EAN</Label>
              <Input
                id="ean_code"
                {...register('ean_code')}
                placeholder="EAN (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="Código interno"
              />
            </div>
          </div>

          {/* Preços e Margem */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                {...register('cost_price')}
                placeholder="0,00"
              />
              {errors.cost_price && (
                <p className="text-sm text-destructive">{errors.cost_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de Venda (R$) *</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                {...register('sale_price')}
                placeholder="0,00"
              />
              {errors.sale_price && (
                <p className="text-sm text-destructive">{errors.sale_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Margem de Lucro</Label>
              <div className={`p-2 rounded-md text-center font-medium ${
                margin > 0 ? 'bg-green-100 text-green-700' : 
                margin < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100'
              }`}>
                {margin.toFixed(1)}%
                <span className="text-xs block">
                  {formatCurrency(salePrice - costPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Estoque e Unidade */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Estoque Atual</Label>
              <Input
                id="stock_quantity"
                type="number"
                {...register('stock_quantity')}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock_alert">Estoque Mínimo</Label>
              <Input
                id="min_stock_alert"
                type="number"
                {...register('min_stock_alert')}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                {...register('weight')}
                placeholder="0,000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select
                value={watch('unit')}
                onValueChange={(value: any) => setValue('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Switches */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">Produto Ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_featured"
                checked={watch('is_featured')}
                onCheckedChange={(checked) => setValue('is_featured', checked)}
              />
              <Label htmlFor="is_featured">Produto em Destaque</Label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
