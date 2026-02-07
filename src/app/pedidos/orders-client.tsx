'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Truck, 
  Store, 
  MessageCircle,
  Eye,
  CheckCircle,
  Clock,
  Package,
  XCircle,
  ClipboardList,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  LucideIcon,
  ChevronDown,
  Bell,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime, generateWhatsAppLink } from '@/lib/utils'
import { 
  OrderWithDetails, 
  OrderStatus, 
  StoreConfig,
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from '@/types/database'

interface OrdersClientProps {
  initialOrders: OrderWithDetails[]
  storeConfig: StoreConfig | null
}

export function OrdersClient({ initialOrders, storeConfig }: OrdersClientProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Função para buscar um pedido completo com relacionamentos
  const fetchOrderWithDetails = useCallback(async (orderId: string): Promise<OrderWithDetails | null> => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          id,
          name,
          phone,
          email
        ),
        items:order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('Erro ao buscar pedido:', error)
      return null
    }
    return data as OrderWithDetails
  }, [supabase])

  // Função para recarregar todos os pedidos
  const refreshOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers (
          id,
          name,
          phone,
          email
        ),
        items:order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao recarregar pedidos:', error)
      return
    }
    setOrders(data as OrderWithDetails[])
  }, [supabase])

  // Configurar Realtime subscription
  useEffect(() => {
    console.log('🔌 Iniciando conexão Realtime...')
    
    // Criar canal de realtime para a tabela orders
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('🆕 Novo pedido recebido via Realtime:', payload)
          
          // Buscar o pedido completo com relacionamentos
          const newOrder = await fetchOrderWithDetails(payload.new.id)
          if (newOrder) {
            setOrders(prev => [newOrder, ...prev])
            
            // Notificação sonora e visual
            toast.success(`🔔 Novo pedido #${newOrder.order_number}!`, {
              description: `${newOrder.customer?.name || 'Cliente'} - ${formatCurrency(newOrder.total)}`,
              duration: 10000,
            })
            
            // Tentar tocar som de notificação
            try {
              const audio = new Audio('/notification.mp3')
              audio.volume = 0.5
              audio.play().catch(() => {})
            } catch (e) {
              // Ignorar erro se não conseguir tocar som
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('📝 Pedido atualizado via Realtime:', payload)
          
          // Buscar o pedido atualizado com relacionamentos
          const updatedOrder = await fetchOrderWithDetails(payload.new.id)
          if (updatedOrder) {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            
            // Atualizar o pedido selecionado se estiver aberto
            if (selectedOrder?.id === updatedOrder.id) {
              setSelectedOrder(updatedOrder)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🗑️ Pedido removido via Realtime:', payload)
          setOrders(prev => prev.filter(o => o.id !== payload.old.id))
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Realtime status:', status, err ? `Erro: ${err.message}` : '')
        setIsConnected(status === 'SUBSCRIBED')
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao Realtime com sucesso!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal Realtime:', err)
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Timeout na conexão Realtime')
        }
      })

    // Cleanup ao desmontar o componente
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOrderWithDetails, selectedOrder?.id])

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  // Filtrar por tipo de entrega
  const filteredOrders = orders.filter((order) => {
    if (deliveryTypeFilter === 'all') return true
    return order.delivery_type === deliveryTypeFilter
  })

  // Agrupar por status
  const ordersByStatus = {
    preparing: filteredOrders.filter(o => o.status === 'pending' || o.status === 'preparing'),
    sent: filteredOrders.filter(o => o.status === 'sent'),
    ready_pickup: filteredOrders.filter(o => o.status === 'ready_pickup'),
    delivered: filteredOrders.filter(o => o.status === 'delivered'),
    cancelled: filteredOrders.filter(o => o.status === 'cancelled'),
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (status: string, checked: boolean) => {
    const statusOrders = ordersByStatus[status as keyof typeof ordersByStatus]
    if (checked) {
      const newSelected = [...selectedOrders, ...statusOrders.map(o => o.id)]
      setSelectedOrders([...new Set(newSelected)])
    } else {
      setSelectedOrders(selectedOrders.filter(id => 
        !statusOrders.some(o => o.id === id)
      ))
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      
      // Atualizar o pedido selecionado se estiver aberto
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
      
      toast.success('Status atualizado!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
      toast.error(message)
    }
  }

  const updateBulkStatus = async (newStatus: OrderStatus) => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido')
      return
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedOrders)

      if (error) throw error

      setOrders(orders.map(o => 
        selectedOrders.includes(o.id) ? { ...o, status: newStatus } : o
      ))
      setSelectedOrders([])
      toast.success(`${selectedOrders.length} pedido(s) atualizado(s)!`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
      toast.error(message)
    }
  }

  const getWhatsAppMessage = (order: OrderWithDetails, status: OrderStatus) => {
    let message = ''
    const customerName = order.customer?.name || 'Cliente'
    const orderNumber = order.order_number

    switch (status) {
      case 'preparing':
        message = storeConfig?.whatsapp_message_preparing || 
          `Olá ${customerName}! 👋\n\nSeu pedido #${orderNumber} está sendo preparado com carinho! 🛍️\n\nEm breve você receberá uma nova atualização.`
        break
      case 'sent':
        message = storeConfig?.whatsapp_message_sent ||
          `Olá ${customerName}! 🚚\n\nSeu pedido #${orderNumber} saiu para entrega!\n\nAguarde em seu endereço.`
        break
      case 'ready_pickup':
        message = storeConfig?.whatsapp_message_ready ||
          `Olá ${customerName}! ✅\n\nSeu pedido #${orderNumber} está pronto para retirada!\n\n📍 ${storeConfig?.store_address || 'Nossa loja'}`
        break
      default:
        message = `Olá ${customerName}! Seu pedido #${orderNumber} foi atualizado.`
    }

    return message
      .replace('{nome}', customerName)
      .replace('{numero}', String(orderNumber))
      .replace('{nome_loja}', storeConfig?.store_name || 'Nossa Loja')
      .replace('{endereco_loja}', storeConfig?.store_address || '')
  }

  const openWhatsApp = (order: OrderWithDetails) => {
    if (!order.customer?.phone) {
      toast.error('Cliente sem telefone cadastrado')
      return
    }

    const message = getWhatsAppMessage(order, order.status)
    const url = generateWhatsAppLink(order.customer.phone, message)
    window.open(url, '_blank')
  }

  const openOrderDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  const getPaymentIcon = (method: string | null) => {
    if (method === 'cash') return <Banknote className="h-4 w-4" />
    return <CreditCard className="h-4 w-4" />
  }

  // Card do pedido (estilo accordion)
  const OrderCard = ({ order }: { order: OrderWithDetails }) => {
    const isExpanded = expandedOrders.includes(order.id)
    
    return (
      <Card className="overflow-hidden">
        {/* Header - sempre visível */}
        <div 
          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleOrderExpanded(order.id)}
        >
          <Checkbox
            checked={selectedOrders.includes(order.id)}
            onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {order.customer?.name || 'Cliente não identificado'}
              </span>
              <Badge className={`${ORDER_STATUS_COLORS[order.status]} text-xs`}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>#{order.order_number}</span>
              <span>•</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Conteúdo expandido */}
        {isExpanded && (
          <div className="border-t px-3 py-2 space-y-2 bg-muted/30">
            {/* Tipo de entrega */}
            <div className="flex items-center gap-2 text-xs">
              {order.delivery_type === 'delivery' ? (
                <><Truck className="h-3 w-3" /> Entrega</>
              ) : (
                <><Store className="h-3 w-3" /> Retirada</>
              )}
            </div>

            {/* Status Select */}
            <div className="flex items-center gap-2">
              <Select
                value={order.status}
                onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
              >
                <SelectTrigger className="h-7 text-xs w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="preparing">Em Preparação</SelectItem>
                  {order.delivery_type === 'delivery' ? (
                    <SelectItem value="sent">Enviado</SelectItem>
                  ) : (
                    <SelectItem value="ready_pickup">Pronto Retirada</SelectItem>
                  )}
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-1 text-xs">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Ações */}
            <div className="flex gap-1 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs flex-1"
                onClick={() => openWhatsApp(order)}
              >
                <MessageCircle className="mr-1 h-3 w-3" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => openOrderDetails(order)}
              >
                <Eye className="mr-1 h-3 w-3" />
                Detalhes
              </Button>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // Seção por status
  const StatusSection = ({ 
    title, 
    icon: Icon, 
    orders, 
    statusKey 
  }: { 
    title: string
    icon: LucideIcon
    orders: OrderWithDetails[]
    statusKey: string
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
        {orders.length > 0 && (
          <Checkbox
            checked={orders.every(o => selectedOrders.includes(o.id))}
            onCheckedChange={(checked) => handleSelectAll(statusKey, !!checked)}
          />
        )}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum pedido
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )

  // Modal de detalhes do pedido
  const OrderDetailsDialog = () => {
    if (!selectedOrder) return null

    const order = selectedOrder

    return (
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedido #{order.order_number}
            </DialogTitle>
            <DialogDescription>
              {formatDateTime(order.created_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Select
                value={order.status}
                onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue>
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="preparing">Em Preparação</SelectItem>
                  {order.delivery_type === 'delivery' ? (
                    <SelectItem value="sent">Enviado</SelectItem>
                  ) : (
                    <SelectItem value="ready_pickup">Pronto Retirada</SelectItem>
                  )}
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Dados do Cliente */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer?.name || 'Não informado'}</span>
                </div>
                {order.customer?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer.phone}</span>
                  </div>
                )}
                {order.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Entrega */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                {order.delivery_type === 'delivery' ? (
                  <><Truck className="h-4 w-4" /> Entrega</>
                ) : (
                  <><Store className="h-4 w-4" /> Retirada na Loja</>
                )}
              </h4>
              {order.delivery_type === 'delivery' && order.delivery_address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {order.delivery_address.street}, {order.delivery_address.number}
                    {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                    <br />
                    {order.delivery_address.neighborhood}, {order.delivery_address.city}/{order.delivery_address.state}
                    <br />
                    CEP: {order.delivery_address.zipcode}
                  </span>
                </div>
              )}
              {order.delivery_type === 'pickup' && (
                <p className="text-sm text-muted-foreground">
                  Cliente retirará o pedido na loja
                </p>
              )}
            </div>

            <Separator />

            {/* Pagamento */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                {getPaymentIcon(order.payment_method)}
                Pagamento
              </h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Forma:</span>{' '}
                  {order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : 'Não informado'}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status === 'paid' ? 'Pago' : 
                     order.payment_status === 'refunded' ? 'Reembolsado' : 'Pendente'}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Pagamento na {order.delivery_type === 'pickup' ? 'retirada' : 'entrega'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Itens do Pedido
              </h4>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <p className="text-muted-foreground italic">Sem itens cadastrados</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Resumo de Valores */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete:</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Observações */}
            {order.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Observações</h4>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              </>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => openWhatsApp(order)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Pedidos</h1>
            {/* Indicador de conexão realtime */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Ao vivo' : 'Desconectado'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gerencie os pedidos da sua loja
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão de atualizar */}
          <Button variant="outline" size="sm" onClick={refreshOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          
          {/* Ações em massa */}
          {selectedOrders.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedOrders.length} selecionado(s)
              </span>
              <Select onValueChange={(value) => updateBulkStatus(value as OrderStatus)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">Em Preparação</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="ready_pickup">Pronto Retirada</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Tabs por tipo de entrega */}
      <Tabs defaultValue="all" onValueChange={(v) => setDeliveryTypeFilter(v as 'all' | 'delivery' | 'pickup')}>
        <TabsList>
          <TabsTrigger value="all">
            <ClipboardList className="mr-2 h-4 w-4" />
            Todos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck className="mr-2 h-4 w-4" />
            Entrega ({orders.filter(o => o.delivery_type === 'delivery').length})
          </TabsTrigger>
          <TabsTrigger value="pickup">
            <Store className="mr-2 h-4 w-4" />
            Retirada ({orders.filter(o => o.delivery_type === 'pickup').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Seções por status */}
      <div className="space-y-8">
        <StatusSection
          title="Em Preparação"
          icon={Clock}
          orders={ordersByStatus.preparing}
          statusKey="preparing"
        />
        
        {deliveryTypeFilter !== 'pickup' && (
          <StatusSection
            title="Pedidos Enviados"
            icon={Truck}
            orders={ordersByStatus.sent}
            statusKey="sent"
          />
        )}
        
        {deliveryTypeFilter !== 'delivery' && (
          <StatusSection
            title="Prontos para Retirada"
            icon={Package}
            orders={ordersByStatus.ready_pickup}
            statusKey="ready_pickup"
          />
        )}
        
        <StatusSection
          title="Entregues"
          icon={CheckCircle}
          orders={ordersByStatus.delivered}
          statusKey="delivered"
        />
        
        <StatusSection
          title="Cancelados"
          icon={XCircle}
          orders={ordersByStatus.cancelled}
          statusKey="cancelled"
        />
      </div>

      {/* Modal de detalhes */}
      <OrderDetailsDialog />
    </div>
  )
}
