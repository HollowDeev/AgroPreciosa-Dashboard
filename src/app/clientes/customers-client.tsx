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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Users,
  Crown,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatPhone, generateWhatsAppLink } from '@/lib/utils'
import { Customer } from '@/types/database'

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zipcode: z.string().optional(),
  is_club_member: z.boolean(),
  notes: z.string().optional(),
})

type CustomerForm = z.infer<typeof customerSchema>

interface CustomersClientProps {
  initialCustomers: Customer[]
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [clubFilter, setClubFilter] = useState<'all' | 'club' | 'regular'>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      is_club_member: false,
    },
  })

  // Filtrar clientes
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search) ||
      customer.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesClub = 
      clubFilter === 'all' || 
      (clubFilter === 'club' && customer.is_club_member) ||
      (clubFilter === 'regular' && !customer.is_club_member)

    return matchesSearch && matchesClub
  })

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    reset({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      cpf: customer.cpf || '',
      birth_date: customer.birth_date || '',
      address_street: customer.address_street || '',
      address_number: customer.address_number || '',
      address_complement: customer.address_complement || '',
      address_neighborhood: customer.address_neighborhood || '',
      address_city: customer.address_city || '',
      address_state: customer.address_state || '',
      address_zipcode: customer.address_zipcode || '',
      is_club_member: customer.is_club_member,
      notes: customer.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Deseja realmente excluir o cliente "${customer.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      if (error) throw error

      setCustomers(customers.filter((c) => c.id !== customer.id))
      toast.success('Cliente excluído com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir cliente')
    }
  }

  const handleNewCustomer = () => {
    setSelectedCustomer(null)
    reset({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      birth_date: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_zipcode: '',
      is_club_member: false,
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: CustomerForm) => {
    setIsLoading(true)
    try {
      const customerData = {
        ...data,
        email: data.email || null,
        club_joined_at: data.is_club_member && !selectedCustomer?.is_club_member 
          ? new Date().toISOString() 
          : selectedCustomer?.club_joined_at || null,
      }

      if (selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id)

        if (error) throw error

        setCustomers(customers.map(c => 
          c.id === selectedCustomer.id ? { ...c, ...customerData } : c
        ))
        toast.success('Cliente atualizado com sucesso!')
      } else {
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single()

        if (error) throw error

        setCustomers([...customers, newCustomer])
        toast.success('Cliente criado com sucesso!')
      }

      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cliente')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes da sua loja
          </p>
        </div>
        <Button onClick={handleNewCustomer}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={clubFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setClubFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={clubFilter === 'club' ? 'default' : 'outline'}
            onClick={() => setClubFilter('club')}
          >
            <Crown className="mr-2 h-4 w-4" />
            Clube
          </Button>
          <Button
            variant={clubFilter === 'regular' ? 'default' : 'outline'}
            onClick={() => setClubFilter('regular')}
          >
            Regulares
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden lg:table-cell">Cidade</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Total Gasto</TableHead>
              <TableHead className="text-center">Clube</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground">
                          {customer.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatPhone(customer.phone)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {customer.address_city || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.total_orders}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {formatCurrency(customer.total_spent)}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.is_club_member && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Crown className="mr-1 h-3 w-3" />
                        Clube
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => window.open(
                            generateWhatsAppLink(customer.phone, `Olá ${customer.name}!`),
                            '_blank'
                          )}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(customer)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados básicos */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome completo"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  {...register('cpf')}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
              />
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h4 className="font-medium">Endereço</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address_street">Rua</Label>
                  <Input
                    id="address_street"
                    {...register('address_street')}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    {...register('address_number')}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    {...register('address_complement')}
                    placeholder="Apto, Bloco..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    {...register('address_neighborhood')}
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="address_city">Cidade</Label>
                  <Input
                    id="address_city"
                    {...register('address_city')}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_state">Estado</Label>
                  <Input
                    id="address_state"
                    {...register('address_state')}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_zipcode">CEP</Label>
                  <Input
                    id="address_zipcode"
                    {...register('address_zipcode')}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>

            {/* Clube */}
            <div className="flex items-center gap-2">
              <Switch
                id="is_club_member"
                checked={watch('is_club_member')}
                onCheckedChange={(checked) => setValue('is_club_member', checked)}
              />
              <Label htmlFor="is_club_member" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Membro do Clube de Descontos
              </Label>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Observações sobre o cliente..."
                rows={3}
              />
            </div>

            {/* Botões */}
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
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
