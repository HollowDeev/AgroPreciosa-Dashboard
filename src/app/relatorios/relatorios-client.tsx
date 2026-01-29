'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Crown,
  Package,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DailySalesSummary, Customer, StoreConfig } from '@/types/database'

interface TopProduct {
  id: string
  name: string
  quantity: number
  revenue: number
}

interface RelatoriosClientProps {
  storeConfig: StoreConfig | null
  dailySales: DailySalesSummary[]
  topProducts: TopProduct[]
  customers: Customer[]
  totalRevenue: number
  totalOrders: number
  totalProfit: number
  avgOrderValue: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#A4DE6C']

export function RelatoriosClient({
  storeConfig,
  dailySales,
  topProducts,
  customers,
  totalRevenue,
  totalOrders,
  totalProfit,
  avgOrderValue,
}: RelatoriosClientProps) {
  // Preparar dados para gráficos
  const chartData = dailySales.map(day => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    receita: day.total_revenue,
    lucro: day.total_profit,
    pedidos: day.total_orders,
  }))

  // Dados para gráfico de pizza de produtos
  const pieData = topProducts.slice(0, 5).map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    value: p.revenue,
  }))

  // Análise de clientes
  const clubMembers = customers.filter(c => c.is_club_member).length
  const newCustomersThisMonth = customers.filter(c => {
    const created = new Date(c.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  // Margem média
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise de desempenho dos últimos 30 dias
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(avgOrderValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Lucro Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Margem: {avgMargin}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              {newCustomersThisMonth} novos este mês
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        {/* Tab Vendas */}
        <TabsContent value="vendas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de receita diária */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Receita Diária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Bar dataKey="receita" fill="#0088FE" name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de lucro diário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Evolução do Lucro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke="#00C49F" 
                        strokeWidth={2}
                        name="Lucro"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pedidos por dia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pedidos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="pedidos" fill="#8884D8" name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Produtos */}
        <TabsContent value="produtos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ranking de produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top 10 Produtos (Receita)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <p className="text-muted-foreground">Sem dados de vendas</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        topProducts.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              {index < 3 ? (
                                <Badge className={
                                  index === 0 ? 'bg-yellow-500' : 
                                  index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                }>
                                  {index + 1}º
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">{index + 1}º</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {product.name.length > 25 
                                ? product.name.substring(0, 25) + '...' 
                                : product.name}
                            </TableCell>
                            <TableCell className="text-center">{product.quantity}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(product.revenue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de pizza */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição de Receita (Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Sem dados</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Clientes */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Membros do Clube
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clubMembers}</div>
                <p className="text-xs text-muted-foreground">
                  {customers.length > 0 ? ((clubMembers / customers.length) * 100).toFixed(1) : 0}% dos clientes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newCustomersThisMonth}</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de últimos clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimos Clientes Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-center">Clube</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.slice(0, 10).map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <p className="text-sm">{customer.phone}</p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {customer.is_club_member ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Crown className="mr-1 h-3 w-3" /> Membro
                            </Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(customer.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
