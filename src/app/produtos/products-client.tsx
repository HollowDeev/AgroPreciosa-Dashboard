'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Package,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Category, ProductWithDetails } from '@/types/database'
import { ProductFormDialog } from '@/components/products/product-form-dialog'

interface ProductsClientProps {
  initialProducts: ProductWithDetails[]
  categories: Category[]
}

export function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null)

  // Filtrar produtos
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = 
      categoryFilter === 'all' || product.category_id === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleEdit = (product: ProductWithDetails) => {
    setSelectedProduct(product)
    setIsDialogOpen(true)
  }

  const handleDelete = async (product: ProductWithDetails) => {
    if (!confirm(`Deseja realmente excluir o produto "${product.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== product.id))
      toast.success('Produto excluído com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir produto')
    }
  }

  const handleNewProduct = () => {
    setSelectedProduct(null)
    setIsDialogOpen(true)
  }

  const handleDialogSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos da sua loja
          </p>
        </div>
        <Button onClick={handleNewProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código de barras ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Margem</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.barcode && (
                        <p className="text-xs text-muted-foreground">
                          {product.barcode}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.category?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.cost_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.sale_price)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <span className={
                      (product.profit_margin_percent || 0) > 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }>
                      {(product.profit_margin_percent || 0).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={
                      product.stock_quantity <= product.min_stock_alert
                        ? 'text-yellow-600 font-medium'
                        : ''
                    }>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(product)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <ProductFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={selectedProduct}
        categories={categories}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}
