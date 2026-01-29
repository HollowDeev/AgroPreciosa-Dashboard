import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout'
import { ConfiguracoesClient } from './configuracoes-client'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  // Buscar configuração da loja
  const { data: storeConfig } = await supabase
    .from('store_config')
    .select('*')
    .single()

  // Buscar usuários
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  // Buscar usuário atual
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <DashboardLayout storeName={storeConfig?.store_name}>
      <ConfiguracoesClient
        storeConfig={storeConfig}
        users={users || []}
        currentUserId={user?.id || ''}
      />
    </DashboardLayout>
  )
}
