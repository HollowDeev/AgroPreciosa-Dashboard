'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Truck, 
  Store, 
  MoreHorizontal,
  MessageCircle,
  Eye,
  CheckCircle,
  Clock,
  Package,
  XCircle,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime, generateWhatsAppLink } from '@/lib/utils'
import { 
  OrderWithDetails, 
  OrderStatus, 
  StoreConfig,
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS 
} from '@/types/database'

interface OrdersClientProps {
  initialOrders: OrderWithDetails[]
  storeConfig: StoreConfig | null
}

const STATUS_GROUPS = {
  pending: ['pending'],
  preparing: ['preparing'],
  in_transit: ['sent', 'ready_pickup'],
  completed: ['delivered'],
  cancelled: ['cancelled'],
}

export function OrdersClient({ initialOrders, storeConfig }: OrdersClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all')

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
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      toast.success('Status atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
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
        .update({ status: newStatus })
        .in('id', selectedOrders)

      if (error) throw error

      setOrders(orders.map(o => 
        selectedOrders.includes(o.id) ? { ...o, status: newStatus } : o
      ))
      setSelectedOrders([])
      toast.success(`${selectedOrders.length} pedido(s) atualizado(s)!`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
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

    // Registrar notificação
    supabase
      .from('order_status_history')
      .update({ 
        notified_via_whatsapp: true, 
        notified_at: new Date().toISOString() 
      })
      .eq('order_id', order.id)
      .eq('status', order.status)
  }

  const OrderCard = ({ order }: { order: OrderWithDetails }) => (
    <Card className="relative">
      <div className="absolute top-4 left-4">
        <Checkbox
          checked={selectedOrders.includes(order.id)}
          onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
        />
      </div>
      <CardHeader className="pl-12">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              Pedido #{order.order_number}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {order.customer?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={ORDER_STATUS_COLORS[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge variant="outline">
              {order.delivery_type === 'delivery' ? (
                <><Truck className="mr-1 h-3 w-3" /> Entrega</>
              ) : (
                <><Store className="mr-1 h-3 w-3" /> Retirada</>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-12">
        <div className="space-y-3">
          {/* Items resumo */}
          <div className="text-sm">
            {order.items?.slice(0, 2).map((item) => (
              <p key={item.id} className="text-muted-foreground">
                {item.quantity}x {item.product_name}
              </p>
            ))}
            {(order.items?.length || 0) > 2 && (
              <p className="text-muted-foreground">
                +{(order.items?.length || 0) - 2} item(ns)
              </p>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total:</span>
            <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => openWhatsApp(order)}
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              WhatsApp
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/pedidos/${order.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Em Preparação
                </DropdownMenuItem>
                {order.delivery_type === 'delivery' ? (
                  <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'sent')}>
                    <Truck className="mr-2 h-4 w-4" />
                    Pedido Enviado
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready_pickup')}>
                    <Package className="mr-2 h-4 w-4" />
                    Pronto para Retirada
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Entregue
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const StatusSection = ({ 
    title, 
    icon: Icon, 
    orders, 
    statusKey 
  }: { 
    title: string
    icon: any
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie os pedidos da sua loja
          </p>
        </div>
        
        {/* Ações em massa */}
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {/* Tabs por tipo de entrega */}
      <Tabs defaultValue="all" onValueChange={(v) => setDeliveryTypeFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            <ClipboardList className="mr-2 h-4 w-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck className="mr-2 h-4 w-4" />
            Entrega
          </TabsTrigger>
          <TabsTrigger value="pickup">
            <Store className="mr-2 h-4 w-4" />
            Retirada
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
    </div>
  )
}
