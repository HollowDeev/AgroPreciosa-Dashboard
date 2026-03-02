'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Truck,
  Store,
  MessageCircle,
  Eye,
  Package,
  ClipboardList,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  RefreshCw,
  ShoppingBag,
  ChevronDown,
  Clock,
  Flame,
  Send,
  CheckCircle,
  XCircle,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime, generateWhatsAppLink } from '@/lib/utils'
import { printThermalReceipt } from '@/lib/thermal-print'
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

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Aguardando' },
  { value: 'preparing', label: 'Em Preparação' },
  { value: 'sent', label: 'Enviado' },
  { value: 'ready_pickup', label: 'Pronto Retirada' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
]

// Grupos de status exibidos como accordions
const STATUS_GROUPS: {
  key: OrderStatus[]
  label: string
  icon: React.ElementType
  color: string
}[] = [
    { key: ['pending', 'preparing'], label: 'Em Preparação', icon: Flame, color: 'text-blue-600' },
    { key: ['sent'], label: 'Enviados', icon: Send, color: 'text-purple-600' },
    { key: ['ready_pickup'], label: 'Pronto Retirada', icon: CheckCircle, color: 'text-green-600' },
    { key: ['delivered'], label: 'Entregues', icon: CheckCircle, color: 'text-gray-500' },
    { key: ['cancelled'], label: 'Cancelados', icon: XCircle, color: 'text-red-500' },
  ]

const SELECT_QUERY = `
  *,
  customer:customers (id, name, phone, email),
  items:order_items (id, product_name, quantity, unit_price, discount_amount, total, notes)
`

export function OrdersClient({ initialOrders, storeConfig }: OrdersClientProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [openGroups, setOpenGroups] = useState<string[]>(['Em Preparação', 'Enviados', 'Pronto Retirada'])
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const fetchOrderWithDetails = useCallback(async (orderId: string): Promise<OrderWithDetails | null> => {
    const { data, error } = await supabase
      .from('orders')
      .select(SELECT_QUERY)
      .eq('id', orderId)
      .single()
    if (error) { console.error(error); return null }
    return data as OrderWithDetails
  }, [supabase])

  const refreshOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(SELECT_QUERY)
      .order('created_at', { ascending: false })
    if (!error && data) setOrders(data as OrderWithDetails[])
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const newOrder = await fetchOrderWithDetails(payload.new.id)
        if (newOrder) {
          setOrders(prev => [newOrder, ...prev])
          toast.success(`🔔 Novo pedido #${newOrder.order_number}!`, {
            description: `${newOrder.customer?.name || 'Cliente'} — ${formatCurrency(newOrder.total)}`,
            duration: 10000,
          })
          try { new Audio('/notification.mp3').play().catch(() => { }) } catch { }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
        const updated = await fetchOrderWithDetails(payload.new.id)
        if (updated) {
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
          if (selectedOrder?.id === updated.id) setSelectedOrder(updated)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchOrderWithDetails, selectedOrder?.id])

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  const filtered = orders.filter(o =>
    deliveryFilter === 'all' || o.delivery_type === deliveryFilter
  )

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) { toast.error('Erro ao atualizar status: ' + error.message); return }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : prev)
    toast.success('Status atualizado!')
  }

  const getWhatsAppMessage = (order: OrderWithDetails) => {
    const name = order.customer?.name || 'Cliente'
    const num = order.order_number
    const msgs: Partial<Record<OrderStatus, string>> = {
      preparing: storeConfig?.whatsapp_message_preparing ||
        `Olá ${name}! 👋\n\nSeu pedido #${num} está sendo preparado com carinho! 🛍️`,
      sent: storeConfig?.whatsapp_message_sent ||
        `Olá ${name}! 🚚\n\nSeu pedido #${num} saiu para entrega!`,
      ready_pickup: storeConfig?.whatsapp_message_ready ||
        `Olá ${name}! ✅\n\nSeu pedido #${num} está pronto para retirada!\n\n📍 ${storeConfig?.store_address || 'Nossa loja'}`,
      delivered: `Olá ${name}! 🎉\n\nSeu pedido #${num} foi entregue! Obrigado pela preferência!`,
      cancelled: `Olá ${name}.\n\nSeu pedido #${num} foi cancelado.`,
    }
    return msgs[order.status] || `Olá ${name}! Seu pedido #${num} foi atualizado.`
  }

  const openWhatsApp = (order: OrderWithDetails) => {
    if (!order.customer?.phone) { toast.error('Cliente sem telefone cadastrado'); return }
    window.open(generateWhatsAppLink(order.customer.phone, getWhatsAppMessage(order)), '_blank')
  }

  const openDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  // ── Card de pedido ──────────────────────────────────────────────────────────
  const OrderCard = ({ order }: { order: OrderWithDetails }) => {
    const isDelivery = order.delivery_type === 'delivery'
    const addr = order.delivery_address
    const shortAddr = isDelivery && addr
      ? [addr.street, addr.number, addr.neighborhood].filter(Boolean).join(', ')
      : null

    const itemsText = order.items && order.items.length > 0
      ? order.items.map(i => `${i.quantity}x ${i.product_name}`).join(' · ')
      : null

    return (
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Topo */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">#{order.order_number}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isDelivery
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}>
              {isDelivery ? <Truck className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
              {isDelivery ? 'Entrega' : 'Retirada'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">{formatDateTime(order.created_at)}</span>
        </div>

        {/* Corpo */}
        <div className="px-4 pb-2 space-y-1 flex-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-sm truncate">
              {order.customer?.name || 'Cliente não identificado'}
            </span>
          </div>

          {shortAddr && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{shortAddr}</span>
            </div>
          )}

          {itemsText ? (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{itemsText}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
              <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Carregando itens...</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="px-4 py-1.5 bg-muted/40 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
        </div>

        {/* Select de status */}
        <div className="px-3 py-2 border-t border-border/50">
          <Select
            value={order.status}
            onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botões */}
        <div className="px-3 pb-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1 h-8 text-xs" onClick={() => openDetails(order)}>
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-8 text-xs px-2 text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-950"
            title="Imprimir nota"
            onClick={() => printThermalReceipt(order, storeConfig)}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="outline"
            className="flex-1 gap-1 h-8 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950"
            onClick={() => openWhatsApp(order)}
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Button>
        </div>
      </div>
    )
  }

  // ── Accordion de grupo de status ────────────────────────────────────────────
  const StatusAccordion = ({ group }: { group: typeof STATUS_GROUPS[0] }) => {
    const Icon = group.icon
    const isOpen = openGroups.includes(group.label)
    const groupOrders = filtered.filter(o => group.key.includes(o.status))

    return (
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Header do accordion */}
        <button
          onClick={() => toggleGroup(group.label)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 ${group.color}`} />
            <span className="font-semibold text-sm">{group.label}</span>
            <Badge variant="secondary" className="text-xs h-5 px-2">
              {groupOrders.length}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Conteúdo */}
        {isOpen && (
          <div className="p-3 border-t border-border/50">
            {groupOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum pedido neste status
              </p>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Modal de detalhes ────────────────────────────────────────────────────────
  const OrderDetailsDialog = () => {
    if (!selectedOrder) return null
    const order = selectedOrder
    const addr = order.delivery_address

    return (
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full max-w-lg max-h-[95dvh] overflow-y-auto p-0 rounded-2xl gap-0">
          {/* Header sticky */}
          <div className="sticky top-0 bg-background z-10 px-5 pt-5 pb-4 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Pedido #{order.order_number}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {formatDateTime(order.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3">
              <Select
                value={order.status}
                onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Cliente */}
            <section className="space-y-2">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Cliente</h3>
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-sm">{order.customer?.name || 'Não identificado'}</span>
                </div>
                {order.customer?.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${order.customer.phone}`} className="text-sm text-primary hover:underline">
                      {order.customer.phone}
                    </a>
                  </div>
                )}
                {order.customer?.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground break-all">{order.customer.email}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Entrega */}
            <section className="space-y-2">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {order.delivery_type === 'delivery' ? 'Endereço de Entrega' : 'Retirada na Loja'}
              </h3>
              <div className="bg-muted/40 rounded-xl p-3">
                {order.delivery_type === 'delivery' && addr ? (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm leading-relaxed">
                      <p className="font-medium">{addr.street}{addr.number ? `, ${addr.number}` : ''}</p>
                      {addr.complement && <p className="text-muted-foreground">{addr.complement}</p>}
                      <p className="text-muted-foreground">
                        {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(', ')}
                      </p>
                      {addr.zipcode && <p className="text-muted-foreground text-xs">CEP: {addr.zipcode}</p>}
                    </div>
                  </div>
                ) : order.delivery_type === 'delivery' ? (
                  <p className="text-sm text-muted-foreground">Endereço não informado</p>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Cliente retira na loja</span>
                  </div>
                )}
              </div>
            </section>

            {/* Pagamento */}
            <section className="space-y-2">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Pagamento</h3>
              <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {order.payment_method === 'cash'
                    ? <Banknote className="h-4 w-4 text-muted-foreground" />
                    : <CreditCard className="h-4 w-4 text-muted-foreground" />
                  }
                  <span className="text-sm">
                    {order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method] : 'Não informado'}
                  </span>
                </div>
                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                  {order.payment_status === 'paid' ? 'Pago' : order.payment_status === 'refunded' ? 'Reembolsado' : 'Pendente'}
                </Badge>
              </div>
              {order.notes && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-lg">
                  📝 {order.notes}
                </p>
              )}
            </section>

            {/* Itens */}
            <section className="space-y-2">
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Itens do Pedido</h3>
              <div className="bg-muted/40 rounded-xl divide-y divide-border/50 overflow-hidden">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}× {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="font-semibold text-sm">{formatCurrency(item.total)}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground italic text-center">
                    Carregando itens...
                  </p>
                )}
              </div>
            </section>

            {/* Totais */}
            <section className="bg-muted/40 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total)}</span>
              </div>
            </section>
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 bg-background border-t border-border/50 px-5 py-4 flex gap-3">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-11"
              onClick={() => openWhatsApp(order)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-11 px-4 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
              title="Imprimir nota 72mm"
              onClick={() => printThermalReceipt(order, storeConfig)}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" className="h-11 px-5" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Pedidos</h1>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-muted-foreground">{isConnected ? 'Ao vivo' : 'Desconectado'}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos da sua loja</p>
        </div>
        <div className="flex gap-2 items-center self-start sm:self-auto">
          {/* Filtro de entrega */}
          <Select value={deliveryFilter} onValueChange={(v) => setDeliveryFilter(v as typeof deliveryFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos ({orders.length})</SelectItem>
              <SelectItem value="delivery" className="text-xs">
                <span className="flex items-center gap-1.5"><Truck className="h-3 w-3" /> Entrega ({orders.filter(o => o.delivery_type === 'delivery').length})</span>
              </SelectItem>
              <SelectItem value="pickup" className="text-xs">
                <span className="flex items-center gap-1.5"><Store className="h-3 w-3" /> Retirada ({orders.filter(o => o.delivery_type === 'pickup').length})</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={refreshOrders} className="h-8 text-xs">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Accordions por status */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <ClipboardList className="h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {STATUS_GROUPS.map(group => (
            <StatusAccordion key={group.label} group={group} />
          ))}
        </div>
      )}

      <OrderDetailsDialog />
    </div>
  )
}
