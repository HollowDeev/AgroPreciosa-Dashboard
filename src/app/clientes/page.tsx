import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { CustomersClient } from './customers-client'

async function getCustomersData() {
  const supabase = await createClient()
  
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('store_name')
    .single()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('name')

  return {
    storeConfig,
    customers: customers || [],
  }
}

export default async function CustomersPage() {
  const data = await getCustomersData()

  return (
    <DashboardLayout storeName={data.storeConfig?.store_name}>
      <CustomersClient initialCustomers={data.customers} />
    </DashboardLayout>
  )
}
