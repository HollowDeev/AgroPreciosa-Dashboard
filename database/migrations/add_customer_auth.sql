-- Migration: Adicionar autenticação de clientes
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna auth_id na tabela customers para vincular com Supabase Auth
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Criar índice para busca por auth_id
CREATE INDEX IF NOT EXISTS idx_customers_auth_id ON customers(auth_id);

-- Habilitar RLS na tabela customers (se não estiver habilitado)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
DROP POLICY IF EXISTS "Customers can update own data" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customers;
DROP POLICY IF EXISTS "Dashboard users can view all customers" ON customers;
DROP POLICY IF EXISTS "Dashboard users can manage customers" ON customers;
DROP POLICY IF EXISTS "Allow anon insert for registration" ON customers;

-- Política para clientes verem apenas seus próprios dados
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Política para clientes atualizarem seus próprios dados
CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- Política para permitir inserção durante registro (precisa ser aberta temporariamente)
CREATE POLICY "Allow anon insert for registration" ON customers
  FOR INSERT
  WITH CHECK (true);

-- Política para usuários do dashboard verem todos os clientes
CREATE POLICY "Dashboard users can view all customers" ON customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.email = auth.jwt()->>'email'
    )
  );

-- Política para usuários do dashboard gerenciarem clientes
CREATE POLICY "Dashboard users can manage customers" ON customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.email = auth.jwt()->>'email'
    )
  );

-- Comentário
COMMENT ON COLUMN customers.auth_id IS 'ID do usuário no Supabase Auth para login/autenticação';
