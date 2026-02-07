-- Migration: Habilitar criação de pedidos pela Loja
-- Execute este script no SQL Editor do Supabase após a migration anterior

-- ============================================
-- Desabilitar RLS para permitir que clientes criem pedidos
-- ============================================

-- PEDIDOS - Desabilitar RLS para permitir criação/leitura
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- ITENS DO PEDIDO - Desabilitar RLS para permitir criação/leitura
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- HISTÓRICO DE STATUS - Desabilitar RLS para permitir leitura
ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;

-- CLIENTES - Desabilitar RLS para permitir criação/atualização de cadastro
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Criar função para obter próximo número de pedido (caso não exista)
-- ============================================
-- A coluna order_number já é SERIAL, então incrementa automaticamente

-- ============================================
-- Nota: Em produção, você pode querer usar RLS com políticas específicas
-- Por exemplo:
-- - Clientes só podem ver seus próprios pedidos
-- - Dashboard pode ver todos os pedidos
-- Por enquanto, desabilitamos RLS para simplificar
-- ============================================
