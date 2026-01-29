import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { FinanceiroClient } from './financeiro-client'

export default async function FinanceiroPage() {
  const supabase = await createClient()

  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Buscar categorias de despesas
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name')

  // Buscar despesas do mês atual
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const endOfMonth = new Date()
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)
  endOfMonth.setDate(0)
  endOfMonth.setHours(23, 59, 59, 999)

  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_categories (id, name)
    `)
    .gte('expense_date', startOfMonth.toISOString())
    .lte('expense_date', endOfMonth.toISOString())
    .order('expense_date', { ascending: false })

  // Buscar resumo de vendas do mês
  const { data: salesSummary } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .gte('summary_date', startOfMonth.toISOString().split('T')[0])
    .lte('summary_date', endOfMonth.toISOString().split('T')[0])

  // Calcular totais
  const totalRevenue = salesSummary?.reduce((sum, s) => sum + s.total_revenue, 0) || 0
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
  const totalProfit = salesSummary?.reduce((sum, s) => sum + s.total_profit, 0) || 0

  return (
    <DashboardLayout storeName={storeConfig?.store_name}>
      <FinanceiroClient
        storeConfig={storeConfig}
        initialCategories={categories || []}
        initialExpenses={expenses || []}
        salesSummary={salesSummary || []}
        totalRevenue={totalRevenue}
        totalExpenses={totalExpenses}
        totalProfit={totalProfit}
      />
    </DashboardLayout>
  )
}
