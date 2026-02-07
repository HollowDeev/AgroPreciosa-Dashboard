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
  Truck,
  Pencil,
  MapPin,
  Calendar,
  Percent,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { StoreConfig, User } from '@/types/database'

interface DeliveryNeighborhood {
  id: string
  name: string
  fee: number
  is_active: boolean
  display_order: number
}

interface DeliveryPromotion {
  id: string
  name: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  target_type: 'all' | 'specific'
  start_date: string
  end_date: string
  is_active: boolean
}

const storeConfigSchema = z.object({
  store_name: z.string().min(1, 'Nome é obrigatório'),
  store_phone: z.string().default(''),
  store_email: z.string().email('Email inválido').or(z.literal('')).default(''),
  store_address: z.string().default(''),

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
  neighborhoods?: DeliveryNeighborhood[]
  promotions?: DeliveryPromotion[]
}

export function ConfiguracoesClient({ storeConfig, users: initialUsers, currentUserId, neighborhoods: initialNeighborhoods = [], promotions: initialPromotions = [] }: ConfiguracoesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  
  // Estados para taxa de entrega
  const [neighborhoods, setNeighborhoods] = useState<DeliveryNeighborhood[]>(initialNeighborhoods)
  const [promotions, setPromotions] = useState<DeliveryPromotion[]>(initialPromotions)
  const [isNeighborhoodDialogOpen, setIsNeighborhoodDialogOpen] = useState(false)
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false)
  const [editingNeighborhood, setEditingNeighborhood] = useState<DeliveryNeighborhood | null>(null)
  const [editingPromotion, setEditingPromotion] = useState<DeliveryPromotion | null>(null)
  
  // Form para bairro
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [neighborhoodFee, setNeighborhoodFee] = useState('')
  
  // Form para promoção
  const [promotionName, setPromotionName] = useState('')
  const [promotionDescription, setPromotionDescription] = useState('')
  const [promotionDiscountType, setPromotionDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [promotionDiscountValue, setPromotionDiscountValue] = useState('')
  const [promotionStartDate, setPromotionStartDate] = useState('')
  const [promotionEndDate, setPromotionEndDate] = useState('')
  const [promotionTargetType, setPromotionTargetType] = useState<'all' | 'specific'>('all')
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([])

  // Estados para frete grátis por valor mínimo
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    (storeConfig as any)?.free_shipping_min_value != null && (storeConfig as any)?.free_shipping_min_value > 0
  )
  const [freeShippingMinValue, setFreeShippingMinValue] = useState(
    (storeConfig as any)?.free_shipping_min_value?.toString() || ''
  )

  const storeForm = useForm<StoreConfigForm>({
    defaultValues: {
      store_name: storeConfig?.store_name || '',
      store_phone: storeConfig?.store_phone || '',
      store_email: storeConfig?.store_email || '',
      store_address: storeConfig?.store_address || '',
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

  // ============ Funções de Bairros ============
  const resetNeighborhoodForm = () => {
    setNeighborhoodName('')
    setNeighborhoodFee('')
    setEditingNeighborhood(null)
  }

  const openNeighborhoodDialog = (neighborhood?: DeliveryNeighborhood) => {
    if (neighborhood) {
      setEditingNeighborhood(neighborhood)
      setNeighborhoodName(neighborhood.name)
      setNeighborhoodFee(neighborhood.fee.toString())
    } else {
      resetNeighborhoodForm()
    }
    setIsNeighborhoodDialogOpen(true)
  }

  const saveFreeShippingConfig = async () => {
    setIsLoading(true)
    try {
      const value = freeShippingEnabled ? (parseFloat(freeShippingMinValue) || 0) : null
      
      const { error } = await supabase
        .from('store_config')
        .update({ free_shipping_min_value: value })
        .eq('id', storeConfig?.id)

      if (error) throw error

      toast.success('Configuração de frete grátis atualizada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const saveNeighborhood = async () => {
    if (!neighborhoodName.trim()) {
      toast.error('Nome do bairro é obrigatório')
      return
    }

    setIsLoading(true)
    try {
      const data = {
        name: neighborhoodName.trim(),
        fee: parseFloat(neighborhoodFee) || 0,
        is_active: true,
      }

      if (editingNeighborhood) {
        const { error } = await supabase
          .from('delivery_neighborhoods')
          .update(data)
          .eq('id', editingNeighborhood.id)

        if (error) throw error

        setNeighborhoods(neighborhoods.map(n => 
          n.id === editingNeighborhood.id ? { ...n, ...data } : n
        ))
        toast.success('Bairro atualizado!')
      } else {
        const { data: newNeighborhood, error } = await supabase
          .from('delivery_neighborhoods')
          .insert(data)
          .select()
          .single()

        if (error) throw error

        setNeighborhoods([...neighborhoods, newNeighborhood])
        toast.success('Bairro cadastrado!')
      }

      setIsNeighborhoodDialogOpen(false)
      resetNeighborhoodForm()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar bairro')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNeighborhood = async (id: string) => {
    if (!confirm('Deseja excluir este bairro?')) return

    try {
      const { error } = await supabase
        .from('delivery_neighborhoods')
        .delete()
        .eq('id', id)

      if (error) throw error

      setNeighborhoods(neighborhoods.filter(n => n.id !== id))
      toast.success('Bairro excluído!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir bairro')
    }
  }

  const toggleNeighborhoodActive = async (neighborhood: DeliveryNeighborhood) => {
    try {
      const { error } = await supabase
        .from('delivery_neighborhoods')
        .update({ is_active: !neighborhood.is_active })
        .eq('id', neighborhood.id)

      if (error) throw error

      setNeighborhoods(neighborhoods.map(n => 
        n.id === neighborhood.id ? { ...n, is_active: !n.is_active } : n
      ))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar bairro')
    }
  }

  // ============ Funções de Promoções ============
  const resetPromotionForm = () => {
    setPromotionName('')
    setPromotionDescription('')
    setPromotionDiscountType('percentage')
    setPromotionDiscountValue('')
    setPromotionStartDate('')
    setPromotionEndDate('')
    setPromotionTargetType('all')
    setSelectedNeighborhoods([])
    setEditingPromotion(null)
  }

  const openPromotionDialog = (promotion?: DeliveryPromotion) => {
    if (promotion) {
      setEditingPromotion(promotion)
      setPromotionName(promotion.name)
      setPromotionDescription(promotion.description || '')
      setPromotionDiscountType(promotion.discount_type)
      setPromotionDiscountValue(promotion.discount_value.toString())
      setPromotionStartDate(promotion.start_date)
      setPromotionEndDate(promotion.end_date)
      setPromotionTargetType(promotion.target_type)
      // Carregar bairros selecionados se for específico
      loadPromotionNeighborhoods(promotion.id)
    } else {
      resetPromotionForm()
    }
    setIsPromotionDialogOpen(true)
  }

  const loadPromotionNeighborhoods = async (promotionId: string) => {
    const { data } = await supabase
      .from('delivery_promotion_neighborhoods')
      .select('neighborhood_id')
      .eq('promotion_id', promotionId)

    if (data) {
      setSelectedNeighborhoods(data.map(d => d.neighborhood_id))
    }
  }

  const savePromotion = async () => {
    if (!promotionName.trim() || !promotionStartDate || !promotionEndDate) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (new Date(promotionEndDate) < new Date(promotionStartDate)) {
      toast.error('Data final deve ser maior que data inicial')
      return
    }

    setIsLoading(true)
    try {
      const data = {
        name: promotionName.trim(),
        description: promotionDescription.trim() || null,
        discount_type: promotionDiscountType,
        discount_value: parseFloat(promotionDiscountValue) || 0,
        target_type: promotionTargetType,
        start_date: promotionStartDate,
        end_date: promotionEndDate,
        is_active: true,
      }

      let promotionId: string

      if (editingPromotion) {
        const { error } = await supabase
          .from('delivery_promotions')
          .update(data)
          .eq('id', editingPromotion.id)

        if (error) throw error
        promotionId = editingPromotion.id

        setPromotions(promotions.map(p => 
          p.id === editingPromotion.id ? { ...p, ...data } : p
        ))
      } else {
        const { data: newPromotion, error } = await supabase
          .from('delivery_promotions')
          .insert(data)
          .select()
          .single()

        if (error) throw error
        promotionId = newPromotion.id

        setPromotions([...promotions, newPromotion])
      }

      // Atualizar bairros específicos se necessário
      if (promotionTargetType === 'specific') {
        // Remover bairros antigos
        await supabase
          .from('delivery_promotion_neighborhoods')
          .delete()
          .eq('promotion_id', promotionId)

        // Inserir novos bairros
        if (selectedNeighborhoods.length > 0) {
          const { error } = await supabase
            .from('delivery_promotion_neighborhoods')
            .insert(
              selectedNeighborhoods.map(neighborhoodId => ({
                promotion_id: promotionId,
                neighborhood_id: neighborhoodId,
              }))
            )

          if (error) throw error
        }
      }

      toast.success(editingPromotion ? 'Promoção atualizada!' : 'Promoção criada!')
      setIsPromotionDialogOpen(false)
      resetPromotionForm()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar promoção')
    } finally {
      setIsLoading(false)
    }
  }

  const deletePromotion = async (id: string) => {
    if (!confirm('Deseja excluir esta promoção?')) return

    try {
      const { error } = await supabase
        .from('delivery_promotions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPromotions(promotions.filter(p => p.id !== id))
      toast.success('Promoção excluída!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir promoção')
    }
  }

  const togglePromotionActive = async (promotion: DeliveryPromotion) => {
    try {
      const { error } = await supabase
        .from('delivery_promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id)

      if (error) throw error

      setPromotions(promotions.map(p => 
        p.id === promotion.id ? { ...p, is_active: !p.is_active } : p
      ))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar promoção')
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
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Taxas de Entrega
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

        {/* Tab Taxas de Entrega */}
        <TabsContent value="delivery" className="space-y-6">
          {/* Frete Grátis por Valor Mínimo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Frete Grátis Automático
              </CardTitle>
              <CardDescription>
                Configure um valor mínimo de compra para oferecer frete grátis automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <Label htmlFor="free-shipping-switch" className="text-base font-medium">
                    Ativar frete grátis por valor mínimo
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, compras acima do valor mínimo terão frete grátis automaticamente
                  </p>
                </div>
                <Switch
                  id="free-shipping-switch"
                  checked={freeShippingEnabled}
                  onCheckedChange={setFreeShippingEnabled}
                />
              </div>
              
              {freeShippingEnabled && (
                <div className="space-y-2">
                  <Label>Valor mínimo para frete grátis (R$)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={freeShippingMinValue}
                      onChange={(e) => setFreeShippingMinValue(e.target.value)}
                      placeholder="200,00"
                      className="w-40"
                    />
                    <Button onClick={saveFreeShippingConfig} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {isLoading ? '' : 'Salvar'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Um banner será exibido na loja informando os clientes sobre essa promoção
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bairros */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Bairros para Entrega
                </CardTitle>
                <CardDescription>
                  Configure os bairros e suas respectivas taxas de entrega
                </CardDescription>
              </div>
              <Button onClick={() => openNeighborhoodDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Bairro
              </Button>
            </CardHeader>
            <CardContent>
              {neighborhoods.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum bairro cadastrado</p>
                  <Button variant="outline" className="mt-4" onClick={() => openNeighborhoodDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar primeiro bairro
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bairro</TableHead>
                        <TableHead className="text-right">Taxa</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {neighborhoods.map((neighborhood) => (
                        <TableRow key={neighborhood.id}>
                          <TableCell className="font-medium">{neighborhood.name}</TableCell>
                          <TableCell className="text-right">
                            {neighborhood.fee === 0 ? (
                              <Badge variant="secondary">Grátis</Badge>
                            ) : (
                              <span>R$ {neighborhood.fee.toFixed(2).replace('.', ',')}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={neighborhood.is_active}
                              onCheckedChange={() => toggleNeighborhoodActive(neighborhood)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openNeighborhoodDialog(neighborhood)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNeighborhood(neighborhood.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promoções de Frete */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Promoções de Frete
                </CardTitle>
                <CardDescription>
                  Configure promoções de desconto ou frete fixo por período
                </CardDescription>
              </div>
              <Button onClick={() => openPromotionDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Promoção
              </Button>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-8">
                  <Percent className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma promoção cadastrada</p>
                  <Button variant="outline" className="mt-4" onClick={() => openPromotionDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira promoção
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Abrangência</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promotions.map((promotion) => {
                        const isExpired = new Date(promotion.end_date) < new Date()
                        const isUpcoming = new Date(promotion.start_date) > new Date()
                        
                        return (
                          <TableRow key={promotion.id} className={isExpired ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">
                              {promotion.name}
                              {isExpired && <Badge variant="destructive" className="ml-2">Expirada</Badge>}
                              {isUpcoming && <Badge variant="secondary" className="ml-2">Futura</Badge>}
                            </TableCell>
                            <TableCell>
                              {promotion.discount_type === 'percentage' ? (
                                <Badge className="bg-green-100 text-green-700">
                                  {promotion.discount_value}% OFF
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700">
                                  Frete R$ {promotion.discount_value.toFixed(2).replace('.', ',')}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                            </TableCell>
                            <TableCell>
                              {promotion.target_type === 'all' ? (
                                <Badge variant="outline">Todos os bairros</Badge>
                              ) : (
                                <Badge variant="outline">Bairros específicos</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={promotion.is_active}
                                onCheckedChange={() => togglePromotionActive(promotion)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openPromotionDialog(promotion)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deletePromotion(promotion.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* Dialog Novo/Editar Bairro */}
      <Dialog open={isNeighborhoodDialogOpen} onOpenChange={(open) => {
        setIsNeighborhoodDialogOpen(open)
        if (!open) resetNeighborhoodForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNeighborhood ? 'Editar Bairro' : 'Novo Bairro'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Bairro *</Label>
              <Input
                value={neighborhoodName}
                onChange={(e) => setNeighborhoodName(e.target.value)}
                placeholder="Ex: Centro, Jardim América..."
              />
            </div>

            <div className="space-y-2">
              <Label>Taxa de Entrega (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={neighborhoodFee}
                onChange={(e) => setNeighborhoodFee(e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Deixe 0 para frete grátis neste bairro
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNeighborhoodDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={saveNeighborhood} disabled={isLoading}>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova/Editar Promoção */}
      <Dialog open={isPromotionDialogOpen} onOpenChange={(open) => {
        setIsPromotionDialogOpen(open)
        if (!open) resetPromotionForm()
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção de Frete'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nome da Promoção *</Label>
              <Input
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                placeholder="Ex: Frete Grátis Natal, Desconto de Verão..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={promotionDescription}
                onChange={(e) => setPromotionDescription(e.target.value)}
                placeholder="Descrição da promoção..."
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <Select
                  value={promotionDiscountType}
                  onValueChange={(v) => setPromotionDiscountType(v as 'percentage' | 'fixed')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem de Desconto (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo do Frete (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {promotionDiscountType === 'percentage' ? 'Desconto (%)' : 'Valor do Frete (R$)'}
                </Label>
                <Input
                  type="number"
                  step={promotionDiscountType === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={promotionDiscountType === 'percentage' ? '100' : undefined}
                  value={promotionDiscountValue}
                  onChange={(e) => setPromotionDiscountValue(e.target.value)}
                  placeholder={promotionDiscountType === 'percentage' ? '10' : '0,00'}
                />
                {promotionDiscountType === 'percentage' && (
                  <p className="text-xs text-muted-foreground">
                    Use 100 para frete grátis
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Inicial *</Label>
                <Input
                  type="date"
                  value={promotionStartDate}
                  onChange={(e) => setPromotionStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Final *</Label>
                <Input
                  type="date"
                  value={promotionEndDate}
                  onChange={(e) => setPromotionEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Abrangência</Label>
              <Select
                value={promotionTargetType}
                onValueChange={(v) => setPromotionTargetType(v as 'all' | 'specific')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bairros</SelectItem>
                  <SelectItem value="specific">Bairros específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promotionTargetType === 'specific' && (
              <div className="space-y-2">
                <Label>Selecione os bairros</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {neighborhoods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Cadastre bairros primeiro
                    </p>
                  ) : (
                    neighborhoods.map((n) => (
                      <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNeighborhoods.includes(n.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNeighborhoods([...selectedNeighborhoods, n.id])
                            } else {
                              setSelectedNeighborhoods(selectedNeighborhoods.filter(id => id !== n.id))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{n.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          R$ {n.fee.toFixed(2).replace('.', ',')}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPromotionDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={savePromotion} disabled={isLoading}>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
