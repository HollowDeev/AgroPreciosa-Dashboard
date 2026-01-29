import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { ProductsClient } from './products-client'

async function getProductsData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('store_name')
    .single()

  const { data: products } = await supabase
    .from('vw_products_with_margin')
    .select('*')
    .order('name')

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return {
    storeConfig,
    products: products || [],
    categories: categories || [],
  }
}

export default async function ProductsPage() {
  const data = await getProductsData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <ProductsClient 
        initialProducts={data.products} 
        categories={data.categories} 
      />
    </DashboardLayout>
  )
}
