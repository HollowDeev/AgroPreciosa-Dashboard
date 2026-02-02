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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Settings, 
  Store, 
  MessageSquare, 
  Users,
  Plus,
  Loader2,
  Trash2,
  Save,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { StoreConfig, User } from '@/types/database'

const storeConfigSchema = z.object({
  store_name: z.string().min(1, 'Nome é obrigatório'),
  store_phone: z.string().default(''),
  store_email: z.string().email('Email inválido').or(z.literal('')).default(''),
  store_address: z.string().default(''),
  store_logo: z.string().default(''),
  whatsapp_message_preparing: z.string().default(''),
  whatsapp_message_ready: z.string().default(''),
})

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'manager', 'operator']),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type StoreConfigForm = z.infer<typeof storeConfigSchema>
type UserForm = z.infer<typeof userSchema>

interface ConfiguracoesClientProps {
  storeConfig: StoreConfig | null
  users: User[]
  currentUserId: string
}

export function ConfiguracoesClient({ storeConfig, users: initialUsers, currentUserId }: ConfiguracoesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)

  const storeForm = useForm<StoreConfigForm>({
    defaultValues: {
      store_name: storeConfig?.store_name || '',
      store_phone: storeConfig?.store_phone || '',
      store_email: storeConfig?.store_email || '',
      store_address: storeConfig?.store_address || '',
      store_logo: storeConfig?.store_logo || '',
      whatsapp_message_preparing: storeConfig?.whatsapp_message_preparing || '',
      whatsapp_message_ready: storeConfig?.whatsapp_message_ready || '',
      low_stock_threshold: storeConfig?.low_stock_threshold || 5,
      enable_club_discount: storeConfig?.enable_club_discount || false,
    },
  })

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'operator',
    },
  })

  // Função para lidar com toggle do clube
  const handleClubToggle = async (enabled: boolean) => {
    storeForm.setValue('enable_club_discount', enabled)
    
    // Se estiver desabilitando, desativar todas as ofertas do clube
    if (!enabled) {
      try {
        const { error } = await supabase
          .from('offers')
          .update({ is_active: false })
          .eq('offer_type', 'clube_desconto')
        
        if (error) throw error
        
        // Também desativar combos exclusivos do clube
        await supabase
          .from('combos')
          .update({ is_active: false })
          .eq('is_club_only', true)
        
        toast.info('Ofertas e combos do clube foram desativados')
      } catch (error: any) {
        console.error('Erro ao desativar ofertas do clube:', error)
      }
    }
  }

  const onSubmitStoreConfig = async (data: StoreConfigForm) => {
    setIsLoading(true)
    try {
      if (storeConfig) {
        const { error } = await supabase
          .from('store_config')
          .update(data)
          .eq('id', storeConfig.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('store_config')
          .insert(data)

        if (error) throw error
      }

      toast.success('Configurações salvas com sucesso!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitUser = async (data: UserForm) => {
    setIsLoading(true)
    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          },
        },
      })

      if (authError) throw authError

      // O trigger do banco deve criar o usuário na tabela users automaticamente
      toast.success('Usuário criado! Um email de confirmação foi enviado.')
      setIsUserDialogOpen(false)
      userForm.reset()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário')
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, role: role as User['role'] } : u))
      toast.success('Permissão atualizada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar permissão')
    }
  }

  const deleteUser = async (user: User) => {
    if (user.id === currentUserId) {
      toast.error('Você não pode excluir seu próprio usuário')
      return
    }

    if (!confirm(`Deseja excluir o usuário ${user.name}?`)) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error

      setUsers(users.filter(u => u.id !== user.id))
      toast.success('Usuário excluído!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir usuário')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-700">Admin</Badge>
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-700">Gerente</Badge>
      default:
        return <Badge variant="secondary">Operador</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure sua loja e gerencie usuários
        </p>
      </div>

      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        {/* Tab Loja */}
        <TabsContent value="store">
          <form onSubmit={storeForm.handleSubmit(onSubmitStoreConfig)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Informações da Loja
                </CardTitle>
                <CardDescription>
                  Configure as informações básicas da sua loja
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da Loja *</Label>
                    <Input
                      {...storeForm.register('store_name')}
                      placeholder="Minha Loja"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone/WhatsApp</Label>
                    <Input
                      {...storeForm.register('store_phone')}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      {...storeForm.register('store_email')}
                      placeholder="contato@minhaloja.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Logo</Label>
                    <Input
                      {...storeForm.register('store_logo')}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Textarea
                    {...storeForm.register('store_address')}
                    placeholder="Rua, número, bairro, cidade - UF"
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Alerta de Estoque Baixo</Label>
                    <Input
                      type="number"
                      {...storeForm.register('low_stock_threshold')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Produtos com estoque abaixo deste valor serão alertados
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Clube de Desconto
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="enable_club"
                        checked={storeForm.watch('enable_club_discount')}
                        onCheckedChange={(v) => handleClubToggle(v)}
                      />
                      <Label htmlFor="enable_club">Habilitar Clube de Desconto</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, permite criar ofertas e combos exclusivos para membros do clube.
                      As ofertas do clube serão gerenciadas na seção de Ofertas.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Tab Mensagens */}
        <TabsContent value="messages">
          <form onSubmit={storeForm.handleSubmit(onSubmitStoreConfig)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Mensagens Automáticas
                </CardTitle>
                <CardDescription>
                  Configure as mensagens padrão do WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mensagem - Pedido em Preparação</Label>
                  <Textarea
                    {...storeForm.register('whatsapp_message_preparing')}
                    placeholder="Olá {nome}! Seu pedido #{numero} está sendo preparado!"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{nome}'} e {'{numero}'} para personalizar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem - Pedido Pronto</Label>
                  <Textarea
                    {...storeForm.register('whatsapp_message_ready')}
                    placeholder="Olá {nome}! Seu pedido #{numero} está pronto para retirada!"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{nome}'} e {'{numero}'} para personalizar
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Mensagens
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Tab Usuários */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsUserDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários do Sistema
              </CardTitle>
              <CardDescription>
                Gerencie os usuários com acesso ao painel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Permissão</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                            {user.id === currentUserId && (
                              <Badge variant="outline" className="ml-2">Você</Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={user.role}
                              onValueChange={(v) => updateUserRole(user.id, v)}
                              disabled={user.id === currentUserId}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Gerente</SelectItem>
                                <SelectItem value="operator">Operador</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteUser(user)}
                              disabled={user.id === currentUserId}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Novo Usuário */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>

          <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                {...userForm.register('name')}
                placeholder="Nome completo"
              />
              {userForm.formState.errors.name && (
                <p className="text-sm text-destructive">{userForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                {...userForm.register('email')}
                placeholder="usuario@email.com"
              />
              {userForm.formState.errors.email && (
                <p className="text-sm text-destructive">{userForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                {...userForm.register('password')}
                placeholder="Mínimo 6 caracteres"
              />
              {userForm.formState.errors.password && (
                <p className="text-sm text-destructive">{userForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Permissão</Label>
              <Select
                value={userForm.watch('role')}
                onValueChange={(v) => userForm.setValue('role', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Acesso total</SelectItem>
                  <SelectItem value="manager">Gerente - Gerenciar produtos e pedidos</SelectItem>
                  <SelectItem value="operator">Operador - Apenas visualização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserDialogOpen(false)}
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
                  'Criar Usuário'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
