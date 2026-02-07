import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { OffersClient } from './offers-client'

async function getOffersData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Buscar pacotes de ofertas com contagem de itens
  const { data: packages } = await supabase
    .from('offer_packages')
    .select(`
      *,
      items:offer_package_items(count)
    `)
    .order('display_order')
    .order('created_at', { ascending: false })

  // Formatar contagem de itens
  const formattedPackages = (packages || []).map(pkg => ({
    ...pkg,
    items: pkg.items || []
  }))

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, name, sale_price, slug, sku, brand,
      categories(id, name),
      product_images(image_url, is_primary)
    `)
    .eq('is_active', true)
    .order('name')

  // Buscar categorias para filtro
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // URL da loja (pode vir de variável de ambiente ou config)
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3001'

  // Formatar produtos com imagem primária
  const formattedProducts = (products || []).map(p => ({
    ...p,
    image: p.product_images?.find((img: any) => img.is_primary)?.image_url || p.product_images?.[0]?.image_url || null,
    categoryName: (p.categories as any)?.name || null
  }))

  return {
    storeConfig,
    packages: formattedPackages,
    products: formattedProducts,
    categories: categories || [],
    storeUrl,
  }
}

export default async function OffersPage() {
  const data = await getOffersData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <OffersClient 
        initialPackages={data.packages}
        products={data.products}
        categories={data.categories}
        storeUrl={data.storeUrl}
      />
    </DashboardLayout>
  )
}
