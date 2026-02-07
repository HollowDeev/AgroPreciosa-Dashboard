import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { OrdersClient } from './orders-client'

async function getOrdersData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  const { data: orders } = await supabase
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

  return {
    storeConfig,
    orders: orders || [],
  }
}

export default async function OrdersPage() {
  const data = await getOrdersData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <OrdersClient 
        initialOrders={data.orders} 
        storeConfig={data.storeConfig}
      />
    </DashboardLayout>
  )
}
