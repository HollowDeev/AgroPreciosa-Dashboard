-- ============================================
-- MIGRAÇÃO: Adicionar Frete Grátis por Valor Mínimo
-- ============================================

-- Adicionar campo para valor mínimo de compra para frete grátis
-- Se NULL ou 0, a funcionalidade está desativada
ALTER TABLE store_config 
ADD COLUMN IF NOT EXISTS free_shipping_min_value DECIMAL(10,2) DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN store_config.free_shipping_min_value IS 'Valor mínimo de compra para frete grátis. NULL ou 0 = desativado';
