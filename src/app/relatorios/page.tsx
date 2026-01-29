import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { RelatoriosClient } from './relatorios-client'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Datas para os últimos 30 dias
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  // Buscar resumo diário de vendas
  const { data: dailySales } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .gte('summary_date', startDate.toISOString().split('T')[0])
    .lte('summary_date', endDate.toISOString().split('T')[0])
    .order('summary_date', { ascending: true })

  // Buscar pedidos para análise de produtos
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      created_at,
      order_items (
        quantity,
        unit_price,
        total_price,
        products (id, name)
      )
    `)
    .gte('created_at', startDate.toISOString())
    .in('status', ['entregue', 'enviado', 'em_preparo', 'aguardando_envio'])

  // Buscar clientes para análise
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  // Calcular produtos mais vendidos
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  orders?.forEach(order => {
    order.order_items?.forEach((item: any) => {
      const productId = item.products?.id
      const productName = item.products?.name
      if (productId && productName) {
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, quantity: 0, revenue: 0 }
        }
        productSales[productId].quantity += item.quantity
        productSales[productId].revenue += item.total_price
      }
    })
  })

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Calcular totais
  const totalRevenue = dailySales?.reduce((sum, s) => sum + s.total_revenue, 0) || 0
  const totalOrders = dailySales?.reduce((sum, s) => sum + s.orders_count, 0) || 0
  const totalProfit = dailySales?.reduce((sum, s) => sum + s.total_profit, 0) || 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <DashboardLayout storeName={storeConfig?.store_name}>
      <RelatoriosClient
        storeConfig={storeConfig}
        dailySales={dailySales || []}
        topProducts={topProducts}
        customers={customers || []}
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        totalProfit={totalProfit}
        avgOrderValue={avgOrderValue}
      />
    </DashboardLayout>
  )
}
