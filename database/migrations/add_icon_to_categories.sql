-- Migration: Adicionar campo icon na tabela categories
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna icon à tabela categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS icon VARCHAR(10) DEFAULT '📦';

-- Comentário
COMMENT ON COLUMN categories.icon IS 'Emoji/ícone da categoria para exibição na loja';
