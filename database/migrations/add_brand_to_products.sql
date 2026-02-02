-- Migration: Adicionar campo brand na tabela products
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna brand à tabela products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Comentário
COMMENT ON COLUMN products.brand IS 'Marca do produto (ex: Purina, Royal Canin, etc.)';
