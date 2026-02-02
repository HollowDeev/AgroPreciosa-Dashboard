import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { OffersClient } from './offers-client'

async function getOffersData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  const { data: offers } = await supabase
    .from('offers')
    .select(`
      *,
      products (id, name, sale_price),
      combos (id, name, combo_price)
    `)
    .order('created_at', { ascending: false })

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sale_price')
    .eq('is_active', true)
    .order('name')

  const { data: combos } = await supabase
    .from('combos')
    .select('id, name, combo_price')
    .eq('is_active', true)
    .order('name')

  const { data: offerHistory } = await supabase
    .from('offer_history')
    .select('*')
    .order('applied_at', { ascending: false })
    .limit(100)

  return {
    storeConfig,
    offers: offers || [],
    products: products || [],
    combos: combos || [],
    offerHistory: offerHistory || [],
  }
}

export default async function OffersPage() {
  const data = await getOffersData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <OffersClient 
        initialOffers={data.offers}
        products={data.products}
        combos={data.combos}
        offerHistory={data.offerHistory}
        storeConfig={data.storeConfig}
      />
    </DashboardLayout>
  )
}
