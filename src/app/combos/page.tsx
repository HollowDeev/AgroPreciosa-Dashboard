import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { CombosClient } from './combos-client'

export default async function CombosPage() {
  const supabase = await createClient()

  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Buscar combos com itens
  const { data: combos } = await supabase
    .from('combos')
    .select(`
      *,
      combo_items (
        id,
        product_id,
        quantity,
        products (id, name, sale_price, stock_quantity)
      )
    `)
    .order('created_at', { ascending: false })

  // Buscar todos os produtos para seleção
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sale_price, stock_quantity')
    .eq('is_active', true)
    .order('name')

  return (
    <DashboardLayout storeName={storeConfig?.store_name}>
      <CombosClient
        storeConfig={storeConfig}
        initialCombos={combos || []}
        products={products || []}
      />
    </DashboardLayout>
  )
}
