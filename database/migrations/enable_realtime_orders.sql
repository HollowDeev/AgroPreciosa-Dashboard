-- ============================================
-- ATIVAR SUPABASE REALTIME PARA TABELA ORDERS
-- ============================================
-- Execute este comando no SQL Editor do Supabase

-- Habilitar Realtime para a tabela orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Verificar se a tabela foi adicionada
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
