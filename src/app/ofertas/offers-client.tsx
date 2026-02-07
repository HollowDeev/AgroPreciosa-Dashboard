'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Tag,
  Percent,
  DollarSign,
  Loader2,
  Calendar,
  Trash2,
  Edit,
  Package,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  X,
  Check,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

// Tipos
interface Product {
  id: string
  name: string
  sale_price: number
  slug: string
  sku?: string
  brand?: string
  image?: string | null
  categoryName?: string | null
}

interface Category {
  id: string
  name: string
}

interface OfferPackage {
  id: string
  name: string
  slug: string
  description: string | null
  banner_image: string | null
  discount_mode: 'fixed' | 'custom'
  fixed_discount_value: number
  fixed_discount_type: 'percentage' | 'fixed_value'
  start_date: string | null
  end_date: string | null
  is_active: boolean
  display_order: number
  created_at: string
  items?: OfferPackageItem[]
}

interface OfferPackageItem {
  id: string
  package_id: string
  product_id: string
  custom_discount_type: 'percentage' | 'fixed_value'
  custom_discount_value: number
  original_price: number
  final_price: number
  display_order: number
  product?: Product
}

interface OffersClientProps {
  initialPackages: OfferPackage[]
  products: Product[]
  categories: Category[]
  storeUrl: string
}

const packageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().optional(),
  discount_mode: z.enum(['fixed', 'custom']),
  fixed_discount_type: z.enum(['percentage', 'fixed_value']),
  fixed_discount_value: z.number().min(0),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
})

type PackageForm = z.infer<typeof packageSchema>

export function OffersClient({ initialPackages, products, categories, storeUrl }: OffersClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [packages, setPackages] = useState<OfferPackage[]>(initialPackages)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingPackage, setEditingPackage] = useState<OfferPackage | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { 
    discountType: 'percentage' | 'fixed_value'
    discountValue: number 
  }>>(new Map())
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showProductSelector, setShowProductSelector] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PackageForm>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      discount_mode: 'fixed',
      fixed_discount_type: 'percentage',
      fixed_discount_value: 10,
      start_date: '',
      end_date: '',
      is_active: true,
    },
  })

  const discountMode = watch('discount_mode')
  const fixedDiscountType = watch('fixed_discount_type')
  const fixedDiscountValue = watch('fixed_discount_value')
  const packageName = watch('name')

  // Gerar slug automaticamente
  useEffect(() => {
    if (packageName && !editingPackage) {
      const slug = packageName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
    }
  }, [packageName, editingPackage, setValue])

  // Filtrar produtos por busca e categoria
  const filteredProducts = products.filter(p => {
    // Já selecionado
    if (selectedProducts.has(p.id)) return false
    
    // Filtro por categoria
    if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false
    
    // Filtro por busca (nome, SKU ou marca)
    if (productSearch) {
      const search = productSearch.toLowerCase()
      const matchesName = p.name.toLowerCase().includes(search)
      const matchesSku = p.sku?.toLowerCase().includes(search)
      const matchesBrand = p.brand?.toLowerCase().includes(search)
      if (!matchesName && !matchesSku && !matchesBrand) return false
    }
    
    return true
  })

  const handleNewPackage = () => {
    reset({
      name: '',
      slug: '',
      description: '',
      discount_mode: 'fixed',
      fixed_discount_type: 'percentage',
      fixed_discount_value: 10,
      start_date: '',
      end_date: '',
      is_active: true,
    })
    setSelectedProducts(new Map())
    setEditingPackage(null)
    setIsDialogOpen(true)
  }

  const handleEditPackage = async (pkg: OfferPackage) => {
    // Carregar itens do pacote
    const { data: items } = await supabase
      .from('offer_package_items')
      .select('*, product:products(*)')
      .eq('package_id', pkg.id)
      .order('display_order')

    const productsMap = new Map<string, { discountType: 'percentage' | 'fixed_value', discountValue: number }>()
    items?.forEach(item => {
      productsMap.set(item.product_id, {
        discountType: item.custom_discount_type,
        discountValue: item.custom_discount_value
      })
    })
    setSelectedProducts(productsMap)

    reset({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description || '',
      discount_mode: pkg.discount_mode,
      fixed_discount_type: pkg.fixed_discount_type,
      fixed_discount_value: pkg.fixed_discount_value,
      start_date: pkg.start_date || '',
      end_date: pkg.end_date || '',
      is_active: pkg.is_active,
    })
    setEditingPackage(pkg)
    setIsDialogOpen(true)
  }

  const addProduct = (productId: string) => {
    const newMap = new Map(selectedProducts)
    newMap.set(productId, { discountType: 'percentage', discountValue: fixedDiscountValue })
    setSelectedProducts(newMap)
  }

  const removeProduct = (productId: string) => {
    const newMap = new Map(selectedProducts)
    newMap.delete(productId)
    setSelectedProducts(newMap)
  }

  const updateProductDiscount = (productId: string, discountType: 'percentage' | 'fixed_value', discountValue: number) => {
    const newMap = new Map(selectedProducts)
    newMap.set(productId, { discountType, discountValue })
    setSelectedProducts(newMap)
  }

  const calculateFinalPrice = (product: Product, discountType: 'percentage' | 'fixed_value', discountValue: number) => {
    if (discountMode === 'fixed') {
      if (fixedDiscountType === 'percentage') {
        return product.sale_price * (1 - fixedDiscountValue / 100)
      }
      return Math.max(0, product.sale_price - fixedDiscountValue)
    }
    if (discountType === 'percentage') {
      return product.sale_price * (1 - discountValue / 100)
    }
    return Math.max(0, product.sale_price - discountValue)
  }

  const onSubmit = async (data: PackageForm) => {
    if (selectedProducts.size === 0) {
      toast.error('Adicione pelo menos um produto à oferta')
      return
    }

    setIsLoading(true)
    try {
      const packageData = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        discount_mode: data.discount_mode,
        fixed_discount_type: data.fixed_discount_type,
        fixed_discount_value: data.fixed_discount_value,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        is_active: data.is_active,
      }

      let packageId: string

      if (editingPackage) {
        // Atualizar pacote existente
        const { error } = await supabase
          .from('offer_packages')
          .update(packageData)
          .eq('id', editingPackage.id)

        if (error) throw error
        packageId = editingPackage.id

        // Remover itens antigos
        await supabase
          .from('offer_package_items')
          .delete()
          .eq('package_id', packageId)
      } else {
        // Criar novo pacote
        const { data: newPkg, error } = await supabase
          .from('offer_packages')
          .insert(packageData)
          .select()
          .single()

        if (error) throw error
        packageId = newPkg.id
      }

      // Adicionar itens
      const items: any[] = []
      let order = 0
      selectedProducts.forEach((discount, productId) => {
        const product = products.find(p => p.id === productId)
        if (product) {
          items.push({
            package_id: packageId,
            product_id: productId,
            custom_discount_type: discount.discountType,
            custom_discount_value: discount.discountValue,
            original_price: product.sale_price,
            final_price: calculateFinalPrice(product, discount.discountType, discount.discountValue),
            display_order: order++
          })
        }
      })

      const { error: itemsError } = await supabase
        .from('offer_package_items')
        .insert(items)

      if (itemsError) throw itemsError

      toast.success(editingPackage ? 'Oferta atualizada!' : 'Oferta criada!')
      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar oferta')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStatus = async (pkg: OfferPackage) => {
    try {
      const { error } = await supabase
        .from('offer_packages')
        .update({ is_active: !pkg.is_active })
        .eq('id', pkg.id)

      if (error) throw error

      setPackages(packages.map(p =>
        p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
      ))
      toast.success('Status atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const deletePackage = async (pkg: OfferPackage) => {
    if (!confirm('Deseja excluir esta oferta? Os itens serão removidos automaticamente.')) return

    try {
      const { error } = await supabase
        .from('offer_packages')
        .delete()
        .eq('id', pkg.id)

      if (error) throw error

      setPackages(packages.filter(p => p.id !== pkg.id))
      toast.success('Oferta excluída!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir oferta')
    }
  }

  const copyLink = (slug: string) => {
    const url = `${storeUrl}/ofertas/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacotes de Ofertas</h1>
          <p className="text-muted-foreground">
            Crie promoções agrupando produtos com descontos
          </p>
        </div>
        <Button onClick={handleNewPackage}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Oferta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total de Ofertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-500" />
              Ofertas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {packages.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              Com Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {packages.filter(p => p.start_date || p.end_date).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle>Ofertas Cadastradas</CardTitle>
          <CardDescription>
            Cada oferta pode conter um ou mais produtos com desconto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma oferta cadastrada</p>
              <p className="text-sm">Clique em "Nova Oferta" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>
                      {pkg.discount_mode === 'fixed' ? (
                        <Badge variant="secondary">
                          {pkg.fixed_discount_type === 'percentage' 
                            ? `${pkg.fixed_discount_value}% todos` 
                            : `R$ ${pkg.fixed_discount_value} todos`}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Individual</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{pkg.items?.length || 0} itens</Badge>
                    </TableCell>
                    <TableCell>
                      {pkg.start_date || pkg.end_date ? (
                        <span className="text-sm">
                          {pkg.start_date && formatDate(pkg.start_date)}
                          {pkg.start_date && pkg.end_date && ' - '}
                          {pkg.end_date && formatDate(pkg.end_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem período</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          /ofertas/{pkg.slug}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => copyLink(pkg.slug)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={pkg.is_active}
                        onCheckedChange={() => toggleStatus(pkg)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deletePackage(pkg)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Oferta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Editar Oferta' : 'Nova Oferta'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Oferta *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Promoção de Verão"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/ofertas/</span>
                  <Input
                    id="slug"
                    placeholder="promocao-verao"
                    {...register('slug')}
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descrição da promoção..."
                {...register('description')}
              />
            </div>

            {/* Período */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início (opcional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Término (opcional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                />
              </div>
            </div>

            {/* Modo de Desconto */}
            <div className="space-y-4">
              <Label>Tipo de Desconto</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <Card 
                  className={`cursor-pointer transition-all ${discountMode === 'fixed' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setValue('discount_mode', 'fixed')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-4 w-4 rounded-full border-2 ${discountMode === 'fixed' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {discountMode === 'fixed' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium">Desconto Fixo</p>
                        <p className="text-sm text-muted-foreground">
                          Mesmo desconto para todos os produtos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all ${discountMode === 'custom' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setValue('discount_mode', 'custom')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-4 w-4 rounded-full border-2 ${discountMode === 'custom' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {discountMode === 'custom' && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium">Desconto Individual</p>
                        <p className="text-sm text-muted-foreground">
                          Desconto personalizado por produto
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuração de Desconto Fixo */}
              {discountMode === 'fixed' && (
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={fixedDiscountType}
                      onValueChange={(v) => setValue('fixed_discount_type', v as any)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed_value">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <div className="flex items-center gap-2">
                      {fixedDiscountType === 'percentage' ? (
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        type="number"
                        step="0.01"
                        className="w-32"
                        {...register('fixed_discount_value', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seleção de Produtos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Produtos na Oferta *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductSelector(!showProductSelector)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {showProductSelector ? 'Fechar' : 'Adicionar Produtos'}
                </Button>
              </div>
              
              {/* Busca de Produtos */}
              {showProductSelector && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Buscar por nome, SKU ou marca..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  {/* Lista de produtos disponíveis */}
                  <div className="border rounded-lg max-h-64 overflow-y-auto bg-background">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        {productSearch || selectedCategory !== 'all' 
                          ? 'Nenhum produto encontrado' 
                          : 'Digite para buscar ou selecione uma categoria'}
                      </div>
                    ) : (
                      filteredProducts.slice(0, 20).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => addProduct(product.id)}
                        >
                          {/* Imagem do produto */}
                          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info do produto */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {product.sku && <span>SKU: {product.sku}</span>}
                              {product.brand && <span>• {product.brand}</span>}
                              {product.categoryName && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.categoryName}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Preço */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-medium text-green-600">
                              {formatCurrency(product.sale_price)}
                            </p>
                          </div>
                          
                          {/* Botão adicionar */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                    {filteredProducts.length > 20 && (
                      <div className="p-2 text-center text-xs text-muted-foreground bg-muted/50">
                        Mostrando 20 de {filteredProducts.length} produtos. Refine sua busca.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Produtos selecionados */}
              {selectedProducts.size > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{selectedProducts.size} produto(s) selecionado(s)</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSelectedProducts(new Map())}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover todos
                    </Button>
                  </div>
                  <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {Array.from(selectedProducts.entries()).map(([productId, discount]) => {
                      const product = products.find(p => p.id === productId)
                      if (!product) return null
                      const finalPrice = calculateFinalPrice(product, discount.discountType, discount.discountValue)
                      const discountPercent = ((product.sale_price - finalPrice) / product.sale_price * 100).toFixed(0)
                      
                      return (
                        <div key={productId} className="p-3 flex items-center gap-3">
                          {/* Imagem do produto */}
                          <div className="h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="line-through text-muted-foreground">
                                {formatCurrency(product.sale_price)}
                              </span>
                              <span className="text-green-600 font-medium">
                                {formatCurrency(finalPrice)}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                -{discountPercent}%
                              </Badge>
                            </div>
                          </div>
                          
                          {discountMode === 'custom' && (
                            <div className="flex items-center gap-2">
                              <Select
                                value={discount.discountType}
                                onValueChange={(v) => updateProductDiscount(productId, v as any, discount.discountValue)}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="fixed_value">R$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24"
                                value={discount.discountValue}
                                onChange={(e) => updateProductDiscount(productId, discount.discountType, parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          )}
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeProduct(productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedProducts.size === 0 && (
                <p className="text-sm text-muted-foreground">
                  Busque e adicione produtos à oferta
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(v) => setValue('is_active', v)}
              />
              <Label htmlFor="is_active">Oferta ativa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingPackage ? 'Salvar Alterações' : 'Criar Oferta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
