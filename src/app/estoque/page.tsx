import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { StockClient } from './stock-client'

async function getStockData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('store_name')
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, barcode, sku, stock_quantity, min_stock_alert, unit')
    .eq('is_active', true)
    .order('name')

  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products (name),
      users (name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    storeConfig,
    products: products || [],
    movements: movements || [],
  }
}

export default async function StockPage() {
  const data = await getStockData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <StockClient 
        products={data.products} 
        initialMovements={data.movements}
      />
    </DashboardLayout>
  )
}
