// Tipos base do banco de dados

export interface StoreConfig {
  id: string
  store_name: string
  store_logo: string | null
  store_phone: string | null
  store_email: string | null
  store_address: string | null
  primary_color: string
  secondary_color: string
  whatsapp_message_preparing: string
  whatsapp_message_sent: string
  whatsapp_message_ready: string
  delivery_fee: number
  min_order_value: number
  currency: string
  timezone: string
  low_stock_threshold: number
  enable_club_discount: boolean
  club_discount_percentage: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  avatar: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parent_id: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  barcode: string | null
  ean_code: string | null
  sku: string | null
  category_id: string | null
  cost_price: number
  sale_price: number
  stock_quantity: number
  min_stock_alert: number
  weight: number | null
  unit: 'un' | 'kg' | 'g' | 'lt' | 'ml' | 'cx' | 'pc'
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface ProductWithDetails extends Product {
  category?: Category
  images?: ProductImage[]
  primary_image?: string
  profit_margin_percent?: number
  profit_margin_value?: number
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  display_order: number
  created_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: 'entrada' | 'saida' | 'ajuste'
  quantity: number
  unit_cost: number | null
  previous_stock: number
  new_stock: number
  reference: string | null
  notes: string | null
  user_id: string | null
  created_at: string
}

export interface Combo {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  regular_price: number
  combo_price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ComboItem {
  id: string
  combo_id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Offer {
  id: string
  name: string
  offer_type: 'sazonal' | 'clube_desconto'
  product_id: string | null
  combo_id: string | null
  original_price: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  final_price: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OfferHistory {
  id: string
  product_id: string | null
  combo_id: string | null
  offer_name: string
  offer_type: string
  original_price: number
  discount_type: string
  discount_value: number
  final_price: number
  applied_by: string | null
  applied_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  cpf: string | null
  birth_date: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zipcode: string | null
  is_club_member: boolean
  club_joined_at: string | null
  notes: string | null
  total_orders: number
  total_spent: number
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'preparing' | 'sent' | 'ready_pickup' | 'delivered' | 'cancelled'
export type DeliveryType = 'delivery' | 'pickup'
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'other'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface Order {
  id: string
  order_number: number
  customer_id: string
  delivery_type: DeliveryType
  status: OrderStatus
  subtotal: number
  discount_amount: number
  delivery_fee: number
  total: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  notes: string | null
  delivery_address: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipcode: string
  } | null
  estimated_delivery: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export interface OrderWithDetails extends Order {
  customer?: Customer
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  combo_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
  notes: string | null
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  notes: string | null
  user_id: string | null
  notified_via_whatsapp: boolean
  notified_at: string | null
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  category_id: string | null
  description: string
  amount: number
  payment_date: string | null
  due_date: string | null
  is_paid: boolean
  is_recurring: boolean
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null
  payment_method: string | null
  receipt_url: string | null
  notes: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface DailySalesSummary {
  id: string
  date: string
  total_orders: number
  total_revenue: number
  total_cost: number
  total_profit: number
  total_items_sold: number
  average_ticket: number
  delivery_orders: number
  pickup_orders: number
  cancelled_orders: number
  created_at: string
  updated_at: string
}

// Status labels em português
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  preparing: 'Em Preparação',
  sent: 'Enviado',
  ready_pickup: 'Pronto para Retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  sent: 'bg-purple-100 text-purple-800',
  ready_pickup: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  other: 'Outro'
}

export const UNIT_LABELS: Record<Product['unit'], string> = {
  un: 'Unidade',
  kg: 'Quilograma',
  g: 'Grama',
  lt: 'Litro',
  ml: 'Mililitro',
  cx: 'Caixa',
  pc: 'Pacote'
}
