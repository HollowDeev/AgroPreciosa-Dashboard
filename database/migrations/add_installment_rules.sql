-- Migration: Multi-Tier Installment Rules
-- Run this in the Supabase SQL Editor for BOTH Make10 and AgroPreciosa

-- 1. Create installment_rules table
CREATE TABLE IF NOT EXISTS installment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES store_config(id) ON DELETE CASCADE,
  min_value NUMERIC(10,2) NOT NULL CHECK (min_value >= 0),
  max_installments INTEGER NOT NULL CHECK (max_installments >= 2 AND max_installments <= 24),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE installment_rules ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Public can read installment rules" ON installment_rules;
CREATE POLICY "Public can read installment rules"
  ON installment_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage installment rules" ON installment_rules;
CREATE POLICY "Authenticated users can manage installment rules"
  ON installment_rules FOR ALL USING (auth.role() = 'authenticated');

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_installment_rules_store_id
  ON installment_rules(store_id) WHERE is_active = true;

-- 5. Migrate existing data (if you had a single rule configured, convert it)
-- This will create one rule from the existing store_config settings
INSERT INTO installment_rules (store_id, min_value, max_installments, is_active, display_order)
SELECT
  id,
  COALESCE(installment_min_value, 100),
  COALESCE(installment_max_count, 12),
  COALESCE(installment_enabled, false),
  0
FROM store_config
WHERE installment_min_value IS NOT NULL AND installment_max_count IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify
SELECT
  ir.id,
  ir.min_value,
  ir.max_installments,
  ir.is_active,
  sc.store_name
FROM installment_rules ir
JOIN store_config sc ON sc.id = ir.store_id;
