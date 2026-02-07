-- ============================================
-- MIGRAÇÃO: Taxas de Entrega por Bairro
-- ============================================

-- Tabela de bairros para entrega
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_active ON delivery_neighborhoods(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_order ON delivery_neighborhoods(display_order);

-- Tabela de promoções de frete
CREATE TABLE IF NOT EXISTS delivery_promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Tipo de desconto: 'percentage' (% de desconto) ou 'fixed' (valor fixo do frete)
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    -- Valor do desconto (se percentage: 0-100, se fixed: valor do frete em R$)
    discount_value DECIMAL(10,2) NOT NULL,
    -- Tipo de alvo: 'all' (todos os bairros) ou 'specific' (bairros específicos)
    target_type VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
    -- Período da promoção
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para promoções
CREATE INDEX IF NOT EXISTS idx_delivery_promotions_active ON delivery_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_promotions_dates ON delivery_promotions(start_date, end_date);

-- Tabela de relacionamento entre promoções e bairros específicos
CREATE TABLE IF NOT EXISTS delivery_promotion_neighborhoods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID NOT NULL REFERENCES delivery_promotions(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES delivery_neighborhoods(id) ON DELETE CASCADE,
    UNIQUE(promotion_id, neighborhood_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_promotion_neighborhoods_promotion ON delivery_promotion_neighborhoods(promotion_id);
CREATE INDEX IF NOT EXISTS idx_delivery_promotion_neighborhoods_neighborhood ON delivery_promotion_neighborhoods(neighborhood_id);

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Habilitar RLS
ALTER TABLE delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_promotion_neighborhoods ENABLE ROW LEVEL SECURITY;

-- Políticas para delivery_neighborhoods
CREATE POLICY "Permitir leitura pública de bairros" ON delivery_neighborhoods
    FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de bairros para usuários autenticados" ON delivery_neighborhoods
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- Políticas para delivery_promotions
CREATE POLICY "Permitir leitura pública de promoções ativas" ON delivery_promotions
    FOR SELECT USING (
        is_active = true 
        AND start_date <= CURRENT_DATE 
        AND end_date >= CURRENT_DATE
    );

CREATE POLICY "Permitir gerenciamento de promoções para usuários autenticados" ON delivery_promotions
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- Políticas para delivery_promotion_neighborhoods
CREATE POLICY "Permitir leitura pública de promoções por bairro" ON delivery_promotion_neighborhoods
    FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de promoções por bairro para usuários autenticados" ON delivery_promotion_neighborhoods
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- ============================================
-- TRIGGER para atualizar updated_at
-- ============================================

-- Trigger para delivery_neighborhoods
CREATE TRIGGER update_delivery_neighborhoods_updated_at
    BEFORE UPDATE ON delivery_neighborhoods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para delivery_promotions
CREATE TRIGGER update_delivery_promotions_updated_at
    BEFORE UPDATE ON delivery_promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
