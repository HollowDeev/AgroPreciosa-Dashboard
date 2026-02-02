-- Migration: Habilitar leitura pública para a Loja
-- Execute este script no SQL Editor do Supabase
-- Isso permite que a loja (sem autenticação) leia produtos, categorias, etc.

-- ============================================
-- IMPORTANTE: Desabilitar RLS temporariamente para tabelas públicas
-- Isso é mais simples e garante que funcione
-- ============================================

-- CATEGORIAS - Desabilitar RLS (leitura pública)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- PRODUTOS - Desabilitar RLS (leitura pública)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- IMAGENS DE PRODUTOS - Desabilitar RLS (leitura pública)
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- OFERTAS - Desabilitar RLS (leitura pública)
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;

-- COMBOS - Desabilitar RLS (leitura pública)
ALTER TABLE combos DISABLE ROW LEVEL SECURITY;

-- COMBO ITEMS - Desabilitar RLS (leitura pública)
ALTER TABLE combo_items DISABLE ROW LEVEL SECURITY;

-- CONFIGURAÇÃO DA LOJA - Desabilitar RLS (leitura pública)
ALTER TABLE store_config DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Nota: Se precisar de segurança adicional no futuro,
-- você pode usar políticas mais específicas.
-- Por enquanto, essas tabelas são públicas para leitura.
-- ============================================
