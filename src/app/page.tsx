import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  AlertTriangle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = await createClient()
  
  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Buscar estatísticas de produtos
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Buscar produtos com estoque baixo
  const { data: lowStockProducts } = await supabase
    .from('vw_low_stock_products')
    .select('*')
    .limit(5)

  // Buscar pedidos pendentes
  const { data: pendingOrders, count: pendingOrdersCount } = await supabase
    .from('orders')
    .select('*, customers(name, phone)', { count: 'exact' })
    .in('status', ['pending', 'preparing'])
    .order('created_at', { ascending: false })
    .limit(5)

  // Buscar total de clientes
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  // Buscar vendas de hoje
  const today = new Date().toISOString().split('T')[0]
  const { data: todaySales } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'delivered')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  const todayRevenue = todaySales?.reduce((sum, order) => sum + order.total, 0) || 0
  const todayOrdersCount = todaySales?.length || 0

  return {
    storeConfig,
    totalProducts: totalProducts || 0,
    lowStockProducts: lowStockProducts || [],
    pendingOrders: pendingOrders || [],
    pendingOrdersCount: pendingOrdersCount || 0,
    totalCustomers: totalCustomers || 0,
    todayRevenue,
    todayOrdersCount
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da sua loja
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.todayRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {data.todayOrdersCount} pedido(s) entregue(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.pendingOrdersCount}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando ação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                No catálogo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Pedidos Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Pedidos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.pendingOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pedido pendente
                </p>
              ) : (
                <div className="space-y-3">
                  {data.pendingOrders.map((order: any) => (
                    <Link
                      key={order.id}
                      href={`/pedidos/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">Pedido #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customers?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.status === 'pending' ? 'Pendente' : 'Em Preparação'}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <Link 
                    href="/pedidos" 
                    className="block text-center text-sm text-primary hover:underline pt-2"
                  >
                    Ver todos os pedidos
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estoque Baixo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todos os produtos com estoque adequado
                </p>
              ) : (
                <div className="space-y-3">
                  {data.lowStockProducts.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/produtos/${product.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.category_name || 'Sem categoria'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-yellow-600">
                          {product.stock_quantity} un
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mín: {product.min_stock_alert}
                        </p>
                      </div>
                    </Link>
                  ))}
                  <Link 
                    href="/estoque" 
                    className="block text-center text-sm text-primary hover:underline pt-2"
                  >
                    Ver estoque completo
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
