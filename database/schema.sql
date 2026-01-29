
-- ============================================
-- SCHEMA DO BANCO DE DADOS - DASHBOARD MULTI-LOJA
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. CONFIGURAÇÃO DA LOJA
-- ============================================
CREATE TABLE store_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    store_logo TEXT,
    store_phone VARCHAR(20),
    store_email VARCHAR(255),
    store_address TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    whatsapp_message_preparing TEXT DEFAULT 'Olá {nome}! 👋 Seu pedido #{numero} está sendo preparado com carinho! 🛍️',
    whatsapp_message_sent TEXT DEFAULT 'Olá {nome}! 🚚 Seu pedido #{numero} saiu para entrega! Aguarde em seu endereço.',
    whatsapp_message_ready TEXT DEFAULT 'Olá {nome}! ✅ Seu pedido #{numero} está pronto para retirada!',
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);





-- ============================================
-- 2. USUÁRIOS DO DASHBOARD
-- ============================================
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CATEGORIAS DE PRODUTOS
-- ============================================
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por slug
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================
-- 4. PRODUTOS
-- ============================================
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    barcode VARCHAR(50),
    ean_code VARCHAR(13),
    sku VARCHAR(50),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    weight DECIMAL(10,3),
    unit VARCHAR(10) DEFAULT 'un' CHECK (unit IN ('un', 'kg', 'g', 'lt', 'ml', 'cx', 'pc')),
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_ean ON products(ean_code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- ============================================
-- 5. IMAGENS DOS PRODUTOS
-- ============================================
CREATE TABLE product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================
-- 6. MOVIMENTAÇÃO DE ESTOQUE
-- ============================================
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2),
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- ============================================
-- 7. COMBOS DE PRODUTOS
-- ============================================
CREATE TABLE combos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    regular_price DECIMAL(10,2) NOT NULL,
    combo_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_combos_slug ON combos(slug);

-- ============================================
-- 8. ITENS DO COMBO
-- ============================================
CREATE TABLE combo_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    UNIQUE(combo_id, product_id)
);

CREATE INDEX idx_combo_items_combo ON combo_items(combo_id);

-- ============================================
-- 9. OFERTAS/PROMOÇÕES
-- ============================================
CREATE TABLE offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    offer_type VARCHAR(30) NOT NULL CHECK (offer_type IN ('sazonal', 'clube_desconto')),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    original_price DECIMAL(10,2) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Garantir que seja produto OU combo, não ambos
    CONSTRAINT check_offer_target CHECK (
        (product_id IS NOT NULL AND combo_id IS NULL) OR 
        (product_id IS NULL AND combo_id IS NOT NULL)
    )
);

CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_combo ON offers(combo_id);
CREATE INDEX idx_offers_active ON offers(is_active);
CREATE INDEX idx_offers_dates ON offers(start_date, end_date);

-- ============================================
-- 10. HISTÓRICO DE OFERTAS (para reutilização)
-- ============================================
CREATE TABLE offer_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    offer_name VARCHAR(255) NOT NULL,
    offer_type VARCHAR(30) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_offer_history_product ON offer_history(product_id);
CREATE INDEX idx_offer_history_combo ON offer_history(combo_id);

-- ============================================
-- 11. CLIENTES
-- ============================================
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    cpf VARCHAR(14),
    birth_date DATE,
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zipcode VARCHAR(10),
    is_club_member BOOLEAN DEFAULT false,
    club_joined_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_customers_club ON customers(is_club_member);

-- ============================================
-- 12. PEDIDOS
-- ============================================
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number SERIAL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'sent', 'ready_pickup', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'cash', 'other')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    notes TEXT,
    delivery_address JSONB,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_type ON orders(delivery_type);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================
-- 13. ITENS DO PEDIDO
-- ============================================
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    combo_id UUID REFERENCES combos(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    notes TEXT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- 14. HISTÓRICO DE STATUS DO PEDIDO
-- ============================================
CREATE TABLE order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notified_via_whatsapp BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- ============================================
-- 15. CATEGORIAS DE DESPESAS
-- ============================================
CREATE TABLE expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO expense_categories (name, color, icon) VALUES
    ('Aluguel', '#EF4444', 'home'),
    ('Funcionários', '#3B82F6', 'users'),
    ('Energia', '#F59E0B', 'zap'),
    ('Água', '#06B6D4', 'droplet'),
    ('Internet/Telefone', '#8B5CF6', 'wifi'),
    ('Fornecedores', '#10B981', 'truck'),
    ('Marketing', '#EC4899', 'megaphone'),
    ('Impostos', '#6B7280', 'file-text'),
    ('Manutenção', '#F97316', 'tool'),
    ('Outros', '#71717A', 'more-horizontal');

-- ============================================
-- 16. DESPESAS
-- ============================================
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    due_date DATE,
    is_paid BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('weekly', 'monthly', 'yearly')),
    payment_method VARCHAR(30),
    receipt_url TEXT,
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(payment_date);
CREATE INDEX idx_expenses_due ON expenses(due_date);
CREATE INDEX idx_expenses_paid ON expenses(is_paid);

-- ============================================
-- 17. RESUMO DIÁRIO DE VENDAS (para relatórios rápidos)
-- ============================================
CREATE TABLE daily_sales_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    total_profit DECIMAL(12,2) DEFAULT 0,
    total_items_sold INT DEFAULT 0,
    average_ticket DECIMAL(10,2) DEFAULT 0,
    delivery_orders INT DEFAULT 0,
    pickup_orders INT DEFAULT 0,
    cancelled_orders INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_date ON daily_sales_summary(date);

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Produtos com estoque baixo
CREATE VIEW vw_low_stock_products AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.barcode,
    p.stock_quantity,
    p.min_stock_alert,
    c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock_quantity <= p.min_stock_alert
AND p.is_active = true
ORDER BY p.stock_quantity ASC;

-- View: Produtos com margem de lucro
CREATE VIEW vw_products_with_margin AS
SELECT 
    p.*,
    c.name as category_name,
    CASE 
        WHEN p.cost_price > 0 THEN ROUND(((p.sale_price - p.cost_price) / p.cost_price * 100), 2)
        ELSE 0 
    END as profit_margin_percent,
    (p.sale_price - p.cost_price) as profit_margin_value,
    (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) as primary_image
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- View: Pedidos com informações do cliente
CREATE VIEW vw_orders_with_customer AS
SELECT 
    o.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    c.is_club_member
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- View: Ofertas ativas
CREATE VIEW vw_active_offers AS
SELECT 
    o.*,
    p.name as product_name,
    p.sale_price as product_original_price,
    cb.name as combo_name,
    cb.combo_price as combo_original_price
FROM offers o
LEFT JOIN products p ON o.product_id = p.id
LEFT JOIN combos cb ON o.combo_id = cb.id
WHERE o.is_active = true
AND (o.start_date IS NULL OR o.start_date <= CURRENT_DATE)
AND (o.end_date IS NULL OR o.end_date >= CURRENT_DATE);

-- ============================================
-- FUNCTIONS E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON store_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON combos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_sales_updated_at BEFORE UPDATE ON daily_sales_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estoque após movimentação
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'entrada' THEN
        UPDATE products SET stock_quantity = stock_quantity + NEW.quantity WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'saida' THEN
        UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'ajuste' THEN
        UPDATE products SET stock_quantity = NEW.new_stock WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_stock AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Função para salvar histórico de ofertas
CREATE OR REPLACE FUNCTION save_offer_to_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO offer_history (
        product_id, combo_id, offer_name, offer_type,
        original_price, discount_type, discount_value, final_price, applied_by
    ) VALUES (
        NEW.product_id, NEW.combo_id, NEW.name, NEW.offer_type,
        NEW.original_price, NEW.discount_type, NEW.discount_value, NEW.final_price, NEW.created_by
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_save_offer_history AFTER INSERT ON offers FOR EACH ROW EXECUTE FUNCTION save_offer_to_history();

-- Função para atualizar estatísticas do cliente após pedido
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        UPDATE customers 
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_customer_stats AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Função para registrar histórico de status do pedido
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_log_order_status AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Segurança
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_summary ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (ajuste conforme necessário)
-- Exemplo: permitir todas as operações para usuários autenticados
CREATE POLICY "Authenticated users can do everything" ON store_config FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON product_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON combos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON combo_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON offers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON offer_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON order_status_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON expense_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can do everything" ON daily_sales_summary FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir configuração inicial da loja (ajuste os valores)
INSERT INTO store_config (store_name, store_phone, store_email) 
VALUES ('Minha Loja', '5511999999999', 'contato@minhaloja.com');

-- Criar usuário admin padrão (senha: admin123 - MUDE ISSO!)
-- Nota: No Supabase, use a autenticação integrada. Este é apenas exemplo.
-- INSERT INTO users (name, email, password_hash, role) 
-- VALUES ('Administrador', 'admin@loja.com', 'HASH_DA_SENHA', 'admin');

-- ============================================
-- FIM DO SCHEMA
-- ============================================
