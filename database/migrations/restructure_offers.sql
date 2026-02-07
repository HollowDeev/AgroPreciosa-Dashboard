-- ============================================
-- MIGRAÇÃO: Reestruturação de Ofertas em Pacotes
-- ============================================

-- ============================================
-- BACKUP: Renomear tabela antiga de ofertas
-- ============================================
ALTER TABLE IF EXISTS offers RENAME TO offers_old;

-- ============================================
-- 1. PACOTES DE OFERTAS (Offer Packages)
-- ============================================
-- Um pacote de oferta agrupa produtos com um nome e período
CREATE TABLE offer_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    banner_image TEXT,
    -- Tipo de desconto: 'fixed' (mesmo % para todos) ou 'custom' (% individual por item)
    discount_mode VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (discount_mode IN ('fixed', 'custom')),
    -- Se fixed: valor do desconto aplicado a todos os produtos
    fixed_discount_value DECIMAL(10,2) DEFAULT 0,
    -- Tipo de desconto fixo: 'percentage' ou 'fixed_value' (valor em R$)
    fixed_discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (fixed_discount_type IN ('percentage', 'fixed_value')),
    -- Período da promoção (opcional)
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_offer_packages_slug ON offer_packages(slug);
CREATE INDEX idx_offer_packages_active ON offer_packages(is_active);
CREATE INDEX idx_offer_packages_dates ON offer_packages(start_date, end_date);
CREATE INDEX idx_offer_packages_order ON offer_packages(display_order);

-- ============================================
-- 2. ITENS DO PACOTE DE OFERTA
-- ============================================
-- Produtos que fazem parte de um pacote de oferta
CREATE TABLE offer_package_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID NOT NULL REFERENCES offer_packages(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- Se o pacote é 'custom', cada item pode ter seu próprio desconto
    custom_discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (custom_discount_type IN ('percentage', 'fixed_value')),
    custom_discount_value DECIMAL(10,2) DEFAULT 0,
    -- Preço final calculado (para cache/performance)
    original_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(package_id, product_id)
);

CREATE INDEX idx_offer_package_items_package ON offer_package_items(package_id);
CREATE INDEX idx_offer_package_items_product ON offer_package_items(product_id);

-- ============================================
-- POLÍTICAS RLS
-- ============================================

ALTER TABLE offer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_package_items ENABLE ROW LEVEL SECURITY;

-- Políticas para offer_packages (leitura pública de ofertas ativas)
CREATE POLICY "Permitir leitura pública de pacotes de ofertas ativos" ON offer_packages
    FOR SELECT USING (
        is_active = true 
        AND (start_date IS NULL OR start_date <= CURRENT_DATE) 
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    );

CREATE POLICY "Permitir gerenciamento de pacotes para usuários autenticados" ON offer_packages
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- Políticas para offer_package_items
CREATE POLICY "Permitir leitura pública de itens de pacotes" ON offer_package_items
    FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de itens de pacotes para usuários autenticados" ON offer_package_items
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- ============================================
-- TRIGGERS para updated_at
-- ============================================

CREATE TRIGGER update_offer_packages_updated_at
    BEFORE UPDATE ON offer_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO: Calcular preço final do item
-- ============================================
CREATE OR REPLACE FUNCTION calculate_offer_item_price()
RETURNS TRIGGER AS $$
DECLARE
    v_package RECORD;
    v_product_price DECIMAL(10,2);
    v_discount_type VARCHAR(20);
    v_discount_value DECIMAL(10,2);
BEGIN
    -- Buscar informações do pacote
    SELECT * INTO v_package FROM offer_packages WHERE id = NEW.package_id;
    
    -- Buscar preço do produto
    SELECT sale_price INTO v_product_price FROM products WHERE id = NEW.product_id;
    
    -- Definir preço original
    NEW.original_price := v_product_price;
    
    -- Determinar tipo e valor de desconto
    IF v_package.discount_mode = 'fixed' THEN
        v_discount_type := v_package.fixed_discount_type;
        v_discount_value := v_package.fixed_discount_value;
    ELSE
        v_discount_type := NEW.custom_discount_type;
        v_discount_value := NEW.custom_discount_value;
    END IF;
    
    -- Calcular preço final
    IF v_discount_type = 'percentage' THEN
        NEW.final_price := v_product_price * (1 - v_discount_value / 100);
    ELSE
        NEW.final_price := GREATEST(0, v_product_price - v_discount_value);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_offer_item_price_trigger
    BEFORE INSERT OR UPDATE ON offer_package_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_offer_item_price();

-- ============================================
-- MIGRAÇÃO: Mover dados da tabela antiga (se existir)
-- ============================================
-- Esta parte é manual - você pode executar se quiser migrar dados existentes
-- INSERT INTO offer_packages (name, slug, description, discount_mode, fixed_discount_type, fixed_discount_value, start_date, end_date, is_active, created_by, created_at)
-- SELECT DISTINCT name, LOWER(REPLACE(name, ' ', '-')), NULL, 'custom', 'percentage', 0, start_date, end_date, is_active, created_by, created_at
-- FROM offers_old
-- WHERE product_id IS NOT NULL;
