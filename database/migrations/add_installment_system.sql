-- ============================================================
-- MIGRATION: Sistema de Parcelamento (Installment System)
-- Make10 - Executar no Supabase SQL Editor
-- ============================================================

-- ─── 1. store_config: adicionar colunas de parcelamento ─────────────────────
ALTER TABLE store_config
  ADD COLUMN IF NOT EXISTS installment_enabled       BOOLEAN        DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_min_value     NUMERIC(10,2)  DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS installment_max_count     INTEGER        DEFAULT 12,
  ADD COLUMN IF NOT EXISTS installment_interest_rate NUMERIC(5,2)   DEFAULT 0.00;

COMMENT ON COLUMN store_config.installment_enabled
  IS 'Habilita ou desabilita o parcelamento na loja';
COMMENT ON COLUMN store_config.installment_min_value
  IS 'Valor mínimo da compra para liberar parcelamento (sem entrega)';
COMMENT ON COLUMN store_config.installment_max_count
  IS 'Número máximo de parcelas disponíveis';
COMMENT ON COLUMN store_config.installment_interest_rate
  IS 'Taxa de juros mensal em %. 0 = sem juros (parcelamento sem juros)';

-- ─── 2. offer_packages: restrição de método de pagamento ─────────────────────
ALTER TABLE offer_packages
  ADD COLUMN IF NOT EXISTS payment_restriction TEXT DEFAULT 'all'
    CHECK (payment_restriction IN ('all', 'cash_pix_debit'));

COMMENT ON COLUMN offer_packages.payment_restriction
  IS 'all = desconto válido em qualquer forma de pagamento incluindo parcelado; cash_pix_debit = desconto válido somente no Pix, Dinheiro, Débito ou Crédito 1x (sem parcelamento)';

-- ─── 3. orders: armazenar dados de parcelamento do pedido ────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS installments       INTEGER       DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_value  NUMERIC(10,2);

COMMENT ON COLUMN orders.installments
  IS 'Número de parcelas escolhidas pelo cliente. 1 = à vista';
COMMENT ON COLUMN orders.installment_value
  IS 'Valor de cada parcela (total/installments com ou sem juros)';

-- ─── 4. Garantir que Pix seja aceito como payment_method ─────────────────────
-- Verificar se a coluna payment_method já aceita 'pix'; se houver CHECK constraint, atualizar
DO $$
BEGIN
  -- Remover constraint existente se existir (nome pode variar)
  -- Isso é seguro pois vamos recriar com os novos valores
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%payment_method%'
  ) THEN
    -- Dropar a constraint pelo nome genérico (ajuste se necessário)
    EXECUTE (
      SELECT 'ALTER TABLE orders DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'orders'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%payment_method%'
      LIMIT 1
    );
  END IF;
END $$;

-- Recriar a constraint incluindo 'pix'
-- (só executa se a coluna existir e for TEXT/VARCHAR)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    BEGIN
      ALTER TABLE orders
        ADD CONSTRAINT orders_payment_method_check
        CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix'));
    EXCEPTION WHEN duplicate_object THEN
      -- constraint já existe com esse nome, ignorar
      NULL;
    END;
  END IF;
END $$;

-- ─── 5. Verificar e garantir índices úteis ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_config_installment
  ON store_config (installment_enabled)
  WHERE installment_enabled = true;

-- ─── Resultado final ─────────────────────────────────────────────────────────
-- Consultar para confirmar as colunas foram adicionadas:
SELECT
  'store_config' AS tabela,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'store_config'
  AND column_name IN ('installment_enabled', 'installment_min_value', 'installment_max_count', 'installment_interest_rate')

UNION ALL

SELECT
  'offer_packages' AS tabela,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'offer_packages'
  AND column_name = 'payment_restriction'

UNION ALL

SELECT
  'orders' AS tabela,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('installments', 'installment_value')

ORDER BY tabela, column_name;
