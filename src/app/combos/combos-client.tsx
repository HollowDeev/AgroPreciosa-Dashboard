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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Package,
  Trash2,
  Loader2,
  ShoppingBag,
  Edit,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Combo, ComboItem, Product, StoreConfig } from '@/types/database'

const comboSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  combo_price: z.number().min(0.01, 'Preço deve ser maior que 0'),
  is_active: z.boolean(),
})

type ComboForm = {
  name: string
  description?: string
  combo_price: number
  is_active: boolean
}

interface ComboWithItems extends Combo {
  combo_items: (ComboItem & { products: Pick<Product, 'id' | 'name' | 'sale_price' | 'stock_quantity'> })[]
}

interface CombosClientProps {
  storeConfig: StoreConfig | null
  initialCombos: ComboWithItems[]
  products: Pick<Product, 'id' | 'name' | 'sale_price' | 'stock_quantity'>[]
}

interface SelectedProduct {
  product_id: string
  product_name: string
  sale_price: number
  quantity: number
}

export function CombosClient({ storeConfig, initialCombos, products }: CombosClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [combos, setCombos] = useState(initialCombos)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ComboWithItems | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ComboForm>({
    defaultValues: {
      name: '',
      description: '',
      combo_price: 0,
      is_active: true,
    },
  })

  // Calcular preço total dos produtos selecionados
  const totalProductsPrice = selectedProducts.reduce((sum, p) => sum + (p.sale_price * p.quantity), 0)
  const comboPrice = watch('combo_price') || 0
  const savings = totalProductsPrice - comboPrice
  const savingsPercent = totalProductsPrice > 0 ? ((savings / totalProductsPrice) * 100).toFixed(1) : '0'

  const handleNewCombo = () => {
    setEditingCombo(null)
    setSelectedProducts([])
    reset({
      name: '',
      description: '',
      combo_price: 0,
      is_active: true,
    })
    setIsDialogOpen(true)
  }

  const handleEditCombo = (combo: ComboWithItems) => {
    setEditingCombo(combo)
    setSelectedProducts(combo.combo_items.map(item => ({
      product_id: item.product_id,
      product_name: item.products.name,
      sale_price: item.products.sale_price,
      quantity: item.quantity,
    })))
    reset({
      name: combo.name,
      description: combo.description || '',
      combo_price: combo.combo_price,
      is_active: combo.is_active,
    })
    setIsDialogOpen(true)
  }

  const addProduct = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const existing = selectedProducts.find(p => p.product_id === productId)
    if (existing) {
      setSelectedProducts(selectedProducts.map(p =>
        p.product_id === productId ? { ...p, quantity: p.quantity + 1 } : p
      ))
    } else {
      setSelectedProducts([...selectedProducts, {
        product_id: product.id,
        product_name: product.name,
        sale_price: product.sale_price,
        quantity: 1,
      }])
    }
  }

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId)
      return
    }
    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, quantity } : p
    ))
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId))
  }

  const onSubmit = async (data: ComboForm) => {
    if (selectedProducts.length === 0) {
      toast.error('Adicione pelo menos um produto ao combo')
      return
    }

    setIsLoading(true)
    try {
      if (editingCombo) {
        // Atualizar combo
        const { error: updateError } = await supabase
          .from('combos')
          .update({
            name: data.name,
            description: data.description,
            combo_price: data.combo_price,
            is_active: data.is_active,
          })
          .eq('id', editingCombo.id)

        if (updateError) throw updateError

        // Remover itens antigos
        await supabase
          .from('combo_items')
          .delete()
          .eq('combo_id', editingCombo.id)

        // Inserir novos itens
        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(selectedProducts.map(p => ({
            combo_id: editingCombo.id,
            product_id: p.product_id,
            quantity: p.quantity,
          })))

        if (itemsError) throw itemsError

        toast.success('Combo atualizado com sucesso!')
      } else {
        // Criar novo combo
        const { data: newCombo, error: comboError } = await supabase
          .from('combos')
          .insert({
            name: data.name,
            description: data.description,
            combo_price: data.combo_price,
            is_active: data.is_active,
          })
          .select()
          .single()

        if (comboError) throw comboError

        // Inserir itens
        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(selectedProducts.map(p => ({
            combo_id: newCombo.id,
            product_id: p.product_id,
            quantity: p.quantity,
          })))

        if (itemsError) throw itemsError

        toast.success('Combo criado com sucesso!')
      }

      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar combo')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleComboStatus = async (combo: ComboWithItems) => {
    try {
      const { error } = await supabase
        .from('combos')
        .update({ is_active: !combo.is_active })
        .eq('id', combo.id)

      if (error) throw error

      setCombos(combos.map(c =>
        c.id === combo.id ? { ...c, is_active: !c.is_active } : c
      ))
      toast.success('Status atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const deleteCombo = async (combo: ComboWithItems) => {
    if (!confirm('Deseja excluir este combo?')) return

    try {
      const { error } = await supabase
        .from('combos')
        .delete()
        .eq('id', combo.id)

      if (error) throw error

      setCombos(combos.filter(c => c.id !== combo.id))
      toast.success('Combo excluído!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir combo')
    }
  }

  const getComboTotalPrice = (combo: ComboWithItems) => {
    return combo.combo_items.reduce((sum, item) => 
      sum + (item.products.sale_price * item.quantity), 0
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Combos</h1>
          <p className="text-muted-foreground">
            Monte kits e combos promocionais
          </p>
        </div>
        <Button onClick={handleNewCombo}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Combo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Combos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combos.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Total de Combos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Combo</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead className="text-right">Valor Original</TableHead>
              <TableHead className="text-right">Preço Combo</TableHead>
              <TableHead className="text-center">Economia</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum combo cadastrado</p>
                </TableCell>
              </TableRow>
            ) : (
              combos.map((combo) => {
                const totalPrice = getComboTotalPrice(combo)
                const savings = totalPrice - combo.combo_price
                const savingsPercent = totalPrice > 0 ? ((savings / totalPrice) * 100).toFixed(0) : '0'
                return (
                  <TableRow key={combo.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{combo.name}</p>
                        {combo.description && (
                          <p className="text-xs text-muted-foreground">{combo.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {combo.combo_items.slice(0, 3).map((item) => (
                          <Badge key={item.id} variant="secondary" className="text-xs">
                            {item.quantity}x {item.products.name}
                          </Badge>
                        ))}
                        {combo.combo_items.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{combo.combo_items.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground line-through">
                      {formatCurrency(totalPrice)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(combo.combo_price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-700">
                        {savingsPercent}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={combo.is_active}
                        onCheckedChange={() => toggleComboStatus(combo)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCombo(combo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCombo(combo)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCombo ? 'Editar Combo' : 'Novo Combo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Combo *</Label>
                <Input
                  {...register('name')}
                  placeholder="Ex: Kit Verão"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Preço do Combo *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('combo_price')}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                {...register('description')}
                placeholder="Descrição do combo..."
                rows={2}
              />
            </div>

            {/* Adicionar produtos */}
            <div className="space-y-2">
              <Label>Adicionar Produtos</Label>
              <Select onValueChange={addProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.sale_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produtos selecionados */}
            {selectedProducts.length > 0 && (
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Produtos no Combo</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <div key={product.product_id} className="flex items-center justify-between gap-2 p-2 border rounded">
                        <span className="flex-1 text-sm">{product.product_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(product.sale_price)}
                        </span>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateProductQuantity(product.product_id, parseInt(e.target.value))}
                          className="w-16"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {formatCurrency(product.sale_price * product.quantity)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(product.product_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total dos Produtos:</span>
                      <span className="font-medium">{formatCurrency(totalProductsPrice)}</span>
                    </div>
                    {comboPrice > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Economia para o cliente:</span>
                        <span>{formatCurrency(savings)} ({savingsPercent}%)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(v) => setValue('is_active', v)}
              />
              <Label htmlFor="is_active">Combo Ativo</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
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
                  editingCombo ? 'Atualizar Combo' : 'Criar Combo'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
