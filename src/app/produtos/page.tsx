import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { ProductsClient } from './products-client'

async function getProductsData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('store_name')
    .single()

  // Buscar produtos com categoria e imagem principal
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, image_url, is_primary, display_order)
    `)
    .order('name')

  // Processar produtos para adicionar imagem principal e calcular margem
  const processedProducts = (products || []).map(product => {
    const primaryImage = product.images?.find((img: any) => img.is_primary)?.image_url 
      || product.images?.[0]?.image_url 
      || null
    
    const marginValue = product.sale_price - product.cost_price
    const marginPercent = product.cost_price > 0 
      ? ((marginValue / product.cost_price) * 100) 
      : 0

    return {
      ...product,
      primary_image: primaryImage,
      profit_margin_value: marginValue,
      profit_margin_percent: marginPercent,
    }
  })

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return {
    storeConfig,
    products: processedProducts,
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
