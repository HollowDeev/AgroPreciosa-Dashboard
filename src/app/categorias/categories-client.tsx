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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Loader2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderOpen,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateSlug } from '@/lib/utils'
import { Category } from '@/types/database'

// Lista de ícones disponíveis para seleção
const AVAILABLE_ICONS = [
  { value: '🌾', label: 'Ração/Grãos' },
  { value: '💊', label: 'Medicamentos' },
  { value: '🐾', label: 'Pet/Animais' },
  { value: '🎣', label: 'Pesca' },
  { value: '🌱', label: 'Jardinagem' },
  { value: '🔧', label: 'Ferragens' },
  { value: '🔨', label: 'Ferramentas' },
  { value: '🐕', label: 'Cachorro' },
  { value: '🐈', label: 'Gato' },
  { value: '🐦', label: 'Pássaros' },
  { value: '🐴', label: 'Cavalos' },
  { value: '🐄', label: 'Gado' },
  { value: '🐔', label: 'Aves' },
  { value: '🐟', label: 'Peixes' },
  { value: '🌿', label: 'Plantas' },
  { value: '🪴', label: 'Vasos' },
  { value: '🧴', label: 'Higiene' },
  { value: '🧹', label: 'Limpeza' },
  { value: '🏠', label: 'Casa' },
  { value: '📦', label: 'Geral' },
]

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  icon: z.string().min(1, 'Selecione um ícone'),
  is_active: z.boolean(),
  display_order: z.number().int().min(0),
})

type CategoryForm = z.infer<typeof categorySchema>

interface CategoriesClientProps {
  initialCategories: Category[]
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState(initialCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '📦',
      is_active: true,
      display_order: 0,
    },
  })

  const selectedIcon = watch('icon')

  const handleNewCategory = () => {
    setEditingCategory(null)
    reset({
      name: '',
      description: '',
      icon: '📦',
      is_active: true,
      display_order: categories.length,
    })
    setIsDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    reset({
      name: category.name,
      description: category.description || '',
      icon: (category as any).icon || '📦',
      is_active: category.is_active,
      display_order: category.display_order,
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: CategoryForm) => {
    setIsLoading(true)
    try {
      const slug = generateSlug(data.name)

      const categoryData = {
        name: data.name,
        slug,
        description: data.description || null,
        icon: data.icon,
        is_active: data.is_active,
        display_order: data.display_order,
      }

      if (editingCategory) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (error) throw error

        setCategories(categories.map(c =>
          c.id === editingCategory.id ? { ...c, ...categoryData } : c
        ))
        toast.success('Categoria atualizada com sucesso!')
      } else {
        // Criar nova categoria
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert(categoryData)
          .select()
          .single()

        if (error) throw error

        setCategories([...categories, newCategory])
        toast.success('Categoria criada com sucesso!')
      }

      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar categoria')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategoryStatus = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id)

      if (error) throw error

      setCategories(categories.map(c =>
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ))
      toast.success('Status atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Deseja excluir a categoria "${category.name}"? Produtos dessa categoria ficarão sem categoria.`)) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      setCategories(categories.filter(c => c.id !== category.id))
      toast.success('Categoria excluída!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir categoria')
    }
  }

  const moveCategory = async (category: Category, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === category.id)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === categories.length - 1)
    ) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const otherCategory = categories[newIndex]

    try {
      // Trocar display_order entre as duas categorias
      await supabase
        .from('categories')
        .update({ display_order: otherCategory.display_order })
        .eq('id', category.id)

      await supabase
        .from('categories')
        .update({ display_order: category.display_order })
        .eq('id', otherCategory.id)

      // Atualizar estado local
      const newCategories = [...categories]
      const temp = newCategories[currentIndex].display_order
      newCategories[currentIndex].display_order = newCategories[newIndex].display_order
      newCategories[newIndex].display_order = temp
      
      // Reordenar
      newCategories.sort((a, b) => a.display_order - b.display_order)
      setCategories(newCategories)
      
      toast.success('Ordem atualizada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reordenar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de produtos da sua loja
          </p>
        </div>
        <Button onClick={handleNewCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Total de Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-green-600" />
              Categorias Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-red-600" />
              Categorias Inativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.filter(c => !c.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ordem</TableHead>
              <TableHead className="w-[80px]">Ícone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveCategory(category, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUpDown className="h-3 w-3 rotate-180" />
                      </Button>
                      <span className="text-sm text-muted-foreground w-4 text-center">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveCategory(category, 'down')}
                        disabled={index === categories.length - 1}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-3xl">{(category as any).icon || '📦'}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">/{category.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground truncate">
                      {category.description || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={() => toggleCategoryStatus(category)}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteCategory(category)}
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nome da categoria"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ícone *</Label>
              <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg max-h-[200px] overflow-y-auto">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setValue('icon', icon.value)}
                    className={`p-2 text-2xl rounded-lg transition-colors hover:bg-muted ${
                      selectedIcon === icon.value
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-background'
                    }`}
                    title={icon.label}
                  >
                    {icon.value}
                  </button>
                ))}
              </div>
              {errors.icon && (
                <p className="text-sm text-destructive">{errors.icon.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descrição da categoria (opcional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                {...register('display_order', { valueAsNumber: true })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(v) => setValue('is_active', v)}
              />
              <Label htmlFor="is_active">Categoria Ativa</Label>
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
                  editingCategory ? 'Atualizar' : 'Criar Categoria'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
