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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  Trash2,
  Edit,
  FolderPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Expense, ExpenseCategory, DailySalesSummary, StoreConfig } from '@/types/database'

const expenseSchema = z.object({
  category_id: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que 0'),
  payment_date: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional(),
})

type ExpenseForm = {
  category_id: string
  description: string
  amount: number
  payment_date: string
  notes?: string
}

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
})

type CategoryForm = z.infer<typeof categorySchema>

interface FinanceiroClientProps {
  storeConfig: StoreConfig | null
  initialCategories: ExpenseCategory[]
  initialExpenses: (Expense & { expense_categories: ExpenseCategory })[]
  salesSummary: DailySalesSummary[]
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
}

export function FinanceiroClient({ 
  storeConfig, 
  initialCategories, 
  initialExpenses,
  salesSummary,
  totalRevenue,
  totalExpenses,
  totalProfit,
}: FinanceiroClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState(initialCategories)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const expenseForm = useForm<ExpenseForm>({
    defaultValues: {
      category_id: '',
      description: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  })

  const balance = totalRevenue - totalExpenses

  const handleNewExpense = () => {
    setEditingExpense(null)
    expenseForm.reset({
      category_id: '',
      description: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setIsExpenseDialogOpen(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    expenseForm.reset({
      category_id: expense.category_id || '',
      description: expense.description,
      amount: expense.amount,
      payment_date: expense.payment_date || new Date().toISOString().split('T')[0],
      notes: expense.notes || '',
    })
    setIsExpenseDialogOpen(true)
  }

  const onSubmitExpense = async (data: ExpenseForm) => {
    setIsLoading(true)
    try {
      if (editingExpense) {
        const { data: updated, error } = await supabase
          .from('expenses')
          .update({
            category_id: data.category_id,
            description: data.description,
            amount: data.amount,
            payment_date: data.payment_date,
            notes: data.notes,
          })
          .eq('id', editingExpense.id)
          .select(`
            *,
            expense_categories (id, name)
          `)
          .single()

        if (error) throw error

        setExpenses(expenses.map(e => e.id === editingExpense.id ? updated : e))
        toast.success('Despesa atualizada!')
      } else {
        const { data: newExpense, error } = await supabase
          .from('expenses')
          .insert({
            category_id: data.category_id,
            description: data.description,
            amount: data.amount,
            payment_date: data.payment_date,
            notes: data.notes,
          })
          .select(`
            *,
            expense_categories (id, name)
          `)
          .single()

        if (error) throw error

        setExpenses([newExpense, ...expenses])
        toast.success('Despesa registrada!')
      }

      setIsExpenseDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar despesa')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteExpense = async (expense: Expense) => {
    if (!confirm('Deseja excluir esta despesa?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id)

      if (error) throw error

      setExpenses(expenses.filter(e => e.id !== expense.id))
      toast.success('Despesa excluída!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir despesa')
    }
  }

  const onSubmitCategory = async (data: CategoryForm) => {
    setIsLoading(true)
    try {
      const { data: newCategory, error } = await supabase
        .from('expense_categories')
        .insert({
          name: data.name,
          description: data.description,
        })
        .select()
        .single()

      if (error) throw error

      setCategories([...categories, newCategory])
      toast.success('Categoria criada!')
      setIsCategoryDialogOpen(false)
      categoryForm.reset()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar categoria')
    } finally {
      setIsLoading(false)
    }
  }

  // Agrupar despesas por categoria
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const categoryName = expense.expense_categories?.name || 'Sem categoria'
    if (!acc[categoryName]) {
      acc[categoryName] = { total: 0, count: 0 }
    }
    acc[categoryName].total += expense.amount
    acc[categoryName].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">
            Controle de receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
          <Button onClick={handleNewExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Receita (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Despesas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Lucro Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="summary">Resumo por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Nenhuma despesa registrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.payment_date ? formatDate(expense.payment_date) : '-'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground">{expense.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {expense.expense_categories?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        -{formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense(expense)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <div className="col-span-3 text-center py-8">
                <FolderPlus className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma categoria criada</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd. Despesas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(expensesByCategory).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma despesa para resumir</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(expensesByCategory)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([categoryName, data]) => (
                      <TableRow key={categoryName}>
                        <TableCell className="font-medium">{categoryName}</TableCell>
                        <TableCell className="text-center">{data.count}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(data.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalExpenses > 0 ? ((data.total / totalExpenses) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Despesa */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={expenseForm.watch('category_id')}
                  onValueChange={(v) => expenseForm.setValue('category_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" {...expenseForm.register('payment_date')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                {...expenseForm.register('description')}
                placeholder="Ex: Conta de luz"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                {...expenseForm.register('amount')}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                {...expenseForm.register('notes')}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseDialogOpen(false)}
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
                  editingExpense ? 'Atualizar' : 'Registrar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria de Despesa</DialogTitle>
          </DialogHeader>

          <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                {...categoryForm.register('name')}
                placeholder="Ex: Fornecedores, Aluguel, Marketing..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                {...categoryForm.register('description')}
                placeholder="Descrição da categoria..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Categoria'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
