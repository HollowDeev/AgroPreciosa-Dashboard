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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Search, 
  Boxes,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Loader2,
  History,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Product, StockMovement } from '@/types/database'

const movementSchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto'),
  movement_type: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.number().int().min(1, 'Quantidade deve ser maior que 0'),
  unit_cost: z.number().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type MovementForm = {
  product_id: string
  movement_type: 'entrada' | 'saida' | 'ajuste'
  quantity: number
  unit_cost?: number
  reference?: string
  notes?: string
}

interface StockClientProps {
  products: Pick<Product, 'id' | 'name' | 'barcode' | 'sku' | 'stock_quantity' | 'min_stock_alert' | 'unit'>[]
  initialMovements: (StockMovement & { products: { name: string }; users: { name: string } | null })[]
}

export function StockClient({ products, initialMovements }: StockClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [movements, setMovements] = useState(initialMovements)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMovementType, setSelectedMovementType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MovementForm>({
    defaultValues: {
      movement_type: 'entrada',
      quantity: 1,
    },
  })

  const selectedProductId = watch('product_id')
  const selectedProduct = products.find(p => p.id === selectedProductId)

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    product.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const handleNewMovement = (type: 'entrada' | 'saida' | 'ajuste') => {
    setSelectedMovementType(type)
    reset({
      product_id: '',
      movement_type: type,
      quantity: 1,
      unit_cost: undefined,
      reference: '',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: MovementForm) => {
    if (!selectedProduct) return

    setIsLoading(true)
    try {
      const previousStock = selectedProduct.stock_quantity
      let newStock = previousStock

      if (data.movement_type === 'entrada') {
        newStock = previousStock + data.quantity
      } else if (data.movement_type === 'saida') {
        newStock = previousStock - data.quantity
        if (newStock < 0) {
          toast.error('Estoque insuficiente!')
          setIsLoading(false)
          return
        }
      } else {
        newStock = data.quantity // Ajuste direto
      }

      const { data: movement, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: data.product_id,
          movement_type: data.movement_type,
          quantity: data.movement_type === 'ajuste' ? Math.abs(newStock - previousStock) : data.quantity,
          unit_cost: data.unit_cost || null,
          previous_stock: previousStock,
          new_stock: newStock,
          reference: data.reference || null,
          notes: data.notes || null,
        })
        .select(`
          *,
          products (name),
          users (name)
        `)
        .single()

      if (error) throw error

      setMovements([movement, ...movements])
      toast.success('Movimentação registrada com sucesso!')
      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar movimentação')
    } finally {
      setIsLoading(false)
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />
      case 'saida':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />
    }
  }

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'entrada':
        return 'Entrada'
      case 'saida':
        return 'Saída'
      default:
        return 'Ajuste'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            Controle as movimentações de estoque
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleNewMovement('entrada')} variant="outline">
            <ArrowUpCircle className="mr-2 h-4 w-4 text-green-500" />
            Entrada
          </Button>
          <Button onClick={() => handleNewMovement('saida')} variant="outline">
            <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" />
            Saída
          </Button>
          <Button onClick={() => handleNewMovement('ajuste')} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4 text-blue-500" />
            Ajuste
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">
            <Boxes className="mr-2 h-4 w-4" />
            Estoque Atual
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Código</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-medium">{product.name}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {product.barcode || product.sku || '-'}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {product.stock_quantity} {product.unit}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.min_stock_alert}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.stock_quantity <= product.min_stock_alert ? (
                          <Badge variant="destructive">Baixo</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Anterior</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Novo</TableHead>
                  <TableHead className="hidden md:table-cell">Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <History className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhuma movimentação</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.products?.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getMovementIcon(movement.movement_type)}
                          <span className="text-sm">
                            {getMovementLabel(movement.movement_type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                        {movement.previous_stock}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {movement.new_stock}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {movement.reference || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getMovementIcon(selectedMovementType)}
              {selectedMovementType === 'entrada' && 'Entrada de Estoque'}
              {selectedMovementType === 'saida' && 'Saída de Estoque'}
              {selectedMovementType === 'ajuste' && 'Ajuste de Estoque'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={watch('product_id')}
                onValueChange={(value) => setValue('product_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.stock_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && (
                <p className="text-sm text-destructive">{errors.product_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {selectedMovementType === 'ajuste' ? 'Novo Estoque' : 'Quantidade'}
              </Label>
              <Input
                id="quantity"
                type="number"
                {...register('quantity')}
                min={selectedMovementType === 'ajuste' ? 0 : 1}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
              {selectedProduct && selectedMovementType !== 'ajuste' && (
                <p className="text-sm text-muted-foreground">
                  Estoque atual: {selectedProduct.stock_quantity} {selectedProduct.unit}
                </p>
              )}
            </div>

            {selectedMovementType === 'entrada' && (
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Custo Unitário (R$)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  {...register('unit_cost')}
                  placeholder="0,00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reference">Referência</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="NF, pedido, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Observações..."
                rows={2}
              />
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
                  'Confirmar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
