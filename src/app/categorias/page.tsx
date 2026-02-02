import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { CategoriesClient } from './categories-client'

export default async function CategoriesPage() {
  const supabase = await createClient()

  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('store_name')
    .single()

  // Buscar categorias
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <DashboardLayout storeName={storeConfig?.store_name}>
      <CategoriesClient initialCategories={categories || []} />
    </DashboardLayout>
  )
}
