# 📋 Planejamento - Dashboard de Loja Online

## 🎯 Visão Geral

Dashboard administrativo com **código reutilizável** para gerenciamento de lojas online. Cada cliente recebe:
- Seu próprio **deploy** do dashboard (em servidor/domínio separado)
- Seu próprio **banco de dados** no Supabase
- **Nenhum conhecimento** de que outras lojas usam o mesmo sistema

O código é padronizado, mas cada loja opera de forma **100% independente**.

---

## 🏗️ Arquitetura do Sistema

```
    REPOSITÓRIO GIT (Código Base)
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌────────┐
│ Deploy │  │ Deploy │  │ Deploy │
│ Vercel │  │ Vercel │  │ Vercel │
│ Loja A │  │ Loja B │  │ Loja C │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
    ▼           ▼           ▼
┌────────┐  ┌────────┐  ┌────────┐
│Supabase│  │Supabase│  │Supabase│
│Projeto │  │Projeto │  │Projeto │
│ Loja A │  │ Loja B │  │ Loja C │
└────────┘  └────────┘  └────────┘
```

### Como funciona:
1. **Código único** no repositório Git
2. **Deploy separado** para cada cliente (Vercel, Netlify, etc.)
3. **Variáveis de ambiente** diferentes para cada deploy (URL do Supabase)
4. **Banco Supabase** independente para cada loja
5. **Schema SQL padronizado** - mesmo script para criar o banco de qualquer loja

---

## 🗄️ Estrutura do Banco de Dados (Supabase/PostgreSQL)

> **Nota:** O schema é padronizado. Para cada nova loja, crie um novo projeto no Supabase e execute o mesmo script SQL (`database/schema.sql`).

### Tabelas Principais

#### 1. `store_config` - Configuração da Loja
```sql
- id (PK)
- store_name
- store_logo
- store_phone (WhatsApp)
- store_address
- store_email
- primary_color
- secondary_color
- whatsapp_messages (mensagens padrão)
- created_at / updated_at
```

#### 2. `users` - Usuários do Dashboard
```sql
- id (PK)
- name
- email
- password_hash
- role (admin, manager, employee)
- avatar
- is_active
- created_at / updated_at
```

#### 3. `categories` - Categorias de Produtos
```sql
- id (PK)
- name, slug, description, image
- parent_id (subcategorias)
- is_active, display_order
- created_at / updated_at
```

#### 4. `products` - Produtos
```sql
- id (PK)
- name, slug, description
- barcode, ean_code, sku
- category_id (FK)
- cost_price (valor pago)
- sale_price (valor vendido)
- stock_quantity, min_stock_alert
- weight, unit
- is_active, is_featured
- created_at / updated_at
```

#### 5. `product_images` - Imagens dos Produtos
```sql
- id (PK)
- product_id (FK)
- image_url
- is_primary, display_order
```

#### 6. `stock_movements` - Movimentação de Estoque
```sql
- id (PK)
- product_id (FK)
- movement_type (entrada, saída, ajuste)
- quantity, unit_cost
- previous_stock, new_stock
- reference, notes
- user_id (FK)
- created_at
```

#### 7. `combos` - Combos de Produtos
```sql
- id (PK)
- name, slug, description, image
- regular_price (soma dos produtos)
- combo_price (preço promocional)
- is_active
- created_at / updated_at
```

#### 8. `combo_items` - Itens do Combo
```sql
- id (PK)
- combo_id (FK)
- product_id (FK)
- quantity
```

#### 9. `offers` - Ofertas/Promoções
```sql
- id (PK)
- name
- offer_type (sazonal, clube_desconto)
- product_id (FK) ou combo_id (FK)
- discount_type (percentage, fixed)
- discount_value, final_price
- start_date, end_date
- is_active
- created_at / updated_at
```

#### 10. `offer_history` - Histórico de Ofertas
```sql
- id (PK)
- product_id ou combo_id
- offer_name, offer_type
- original_price, discount_type, discount_value, final_price
- applied_by, applied_at
```

#### 11. `customers` - Clientes
```sql
- id (PK)
- name, email, phone, cpf, birth_date
- address (street, number, complement, neighborhood, city, state, zipcode)
- is_club_member, club_joined_at
- total_orders, total_spent
- notes
- created_at / updated_at
```

#### 12. `orders` - Pedidos
```sql
- id (PK)
- order_number
- customer_id (FK)
- delivery_type (delivery, pickup)
- status (pending, preparing, sent, ready_pickup, delivered, cancelled)
- subtotal, discount_amount, delivery_fee, total
- payment_method, payment_status
- delivery_address (JSON)
- notes
- created_at / updated_at
```

#### 13. `order_items` - Itens do Pedido
```sql
- id (PK)
- order_id (FK)
- product_id ou combo_id
- product_name, quantity, unit_price, discount_amount, total
```

#### 14. `order_status_history` - Histórico de Status
```sql
- id (PK)
- order_id (FK)
- status, notes
- user_id (FK)
- notified_via_whatsapp, notified_at
- created_at
```

#### 15. `expense_categories` - Categorias de Despesas
```sql
- id (PK)
- name, color, icon
- is_active
```

#### 16. `expenses` - Despesas
```sql
- id (PK)
- category_id (FK)
- description, amount
- payment_date, due_date
- is_paid, is_recurring
- payment_method, receipt_url, notes
- user_id (FK)
- created_at / updated_at
```

#### 17. `daily_sales_summary` - Resumo Diário
```sql
- id (PK)
- date
- total_orders, total_revenue, total_cost, total_profit
- total_items_sold, average_ticket
- delivery_orders, pickup_orders, cancelled_orders
```

---

## 📱 Módulos do Dashboard

### 1. 🏠 **Dashboard Principal**
- Resumo de vendas do dia/semana/mês
- Pedidos pendentes
- Produtos com estoque baixo
- Gráfico de vendas
- Top produtos vendidos

### 2. 📦 **Produtos**
- Listagem com busca e filtros
- Cadastro/Edição de produto
- Upload de foto ou captura pela câmera
- Visualização de margem de lucro
- Importação em massa (CSV)

### 3. 📊 **Estoque**
- Entrada de inventário
- Movimentações
- Alertas de estoque baixo
- Histórico de movimentações

### 4. 🎁 **Ofertas**
- Criar oferta (sazonal ou clube)
- Histórico de ofertas por produto
- Aplicar desconto (R$ ou %)
- Ofertas para combos

### 5. 🛒 **Combos**
- Criar/editar combos
- Selecionar produtos
- Definir preço promocional

### 6. 📋 **Pedidos**
- Visualização por abas (Entrega/Retirada)
- Agrupamento por status
- Seleção múltipla para ações em massa
- Botão WhatsApp com mensagem padrão
- Histórico de alterações

### 7. 👥 **Clientes**
- Listagem e busca
- Cadastro/edição
- Filtro por clube
- Histórico de pedidos do cliente

### 8. 💰 **Financeiro**
- Cadastro de despesas
- Categorias de despesas
- Relatório de receitas x despesas
- Fluxo de caixa

### 9. 📈 **Relatórios**
- Vendas por período
- Produtos mais vendidos
- Clientes mais ativos
- Margem de lucro
- Comparativo de períodos

### 10. ⚙️ **Configurações**
- Dados da loja (nome, logo, cores)
- Usuários e permissões
- Mensagens padrão WhatsApp
- Configurações de entrega

---

## ✅ Checklist de Desenvolvimento

### Fase 1: Setup Inicial ✅
- [x] Criar projeto NextJS 14 (App Router)
- [x] Configurar TypeScript
- [x] Configurar Tailwind CSS
- [x] Instalar shadcn/ui (componentes)
- [x] Configurar cliente Supabase
- [x] Executar schema SQL no Supabase
- [x] Configurar autenticação Supabase
- [x] Criar layout responsivo base

### Fase 2: Infraestrutura ✅
- [x] Sistema de autenticação completo
- [x] Middleware de proteção de rotas
- [x] Sistema de upload de imagens (Supabase Storage)
- [x] Configuração de variáveis de ambiente
- [x] Componentes reutilizáveis (DataTable, Modal, Forms)

### Fase 3: Módulo de Produtos ✅
- [x] CRUD de categorias
- [x] CRUD de produtos
- [x] Upload/Captura de imagens
- [x] Cálculo automático de margem
- [x] Listagem com busca e filtros

### Fase 4: Módulo de Estoque ✅
- [x] Entrada de inventário
- [x] Registro de movimentações
- [x] Alertas de estoque baixo
- [x] Histórico de movimentações

### Fase 5: Módulo de Combos e Ofertas ✅
- [x] CRUD de combos
- [x] Sistema de ofertas
- [x] Histórico de ofertas por produto
- [x] Tipos de desconto (R$ e %)

### Fase 6: Módulo de Pedidos ✅
- [x] Listagem com filtros e abas
- [x] Visualização por status
- [x] Alteração de status em massa
- [x] Integração WhatsApp
- [x] Histórico de status

### Fase 7: Módulo de Clientes ✅
- [x] CRUD de clientes
- [x] Sistema de clube de descontos
- [x] Histórico de pedidos

### Fase 8: Módulo Financeiro ✅
- [x] CRUD de despesas
- [x] Categorias de despesas
- [x] Dashboard financeiro

### Fase 9: Relatórios ✅
- [x] Gráficos de vendas
- [x] Relatório de produtos
- [x] Relatório de clientes
- [ ] Exportação de dados (pendente)

### Fase 10: Finalização
- [ ] Testes e ajustes
- [ ] Otimização de performance
- [ ] PWA (funcionar offline básico)
- [ ] Documentação de deploy

---

## 🛠️ Stack Tecnológica

| Tecnologia | Uso |
|------------|-----|
| **NextJS 14** | Framework React (App Router) |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS** | Estilização |
| **shadcn/ui** | Componentes UI |
| **Supabase** | Banco de dados + Auth + Storage |
| **React Query** | Gerenciamento de estado server |
| **Recharts** | Gráficos |
| **React Hook Form** | Formulários |
| **Zod** | Validação |
| **Lucide React** | Ícones |

---

## 📱 Design Responsivo

- Mobile-first approach
- Sidebar colapsável
- Bottom navigation no mobile
- Tabelas com scroll horizontal
- Cards adaptativos
- Touch-friendly (botões maiores)

---

## 🔐 Variáveis de Ambiente

```env
# Supabase (diferentes para cada deploy)
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-anon-key"
```

---

## 🚀 Como Criar Nova Loja (Passo a Passo)

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto para a loja
3. Copie a URL e a ANON KEY

### 2. Executar Schema SQL
1. Vá em **SQL Editor** no Supabase
2. Cole o conteúdo de `database/schema.sql`
3. Execute o script

### 3. Configurar Storage (Imagens)
1. Vá em **Storage** no Supabase
2. Crie um bucket chamado `images`
3. Configure como público

### 4. Deploy do Dashboard
1. Faça deploy na Vercel/Netlify
2. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Configuração Inicial
1. Acesse o dashboard
2. Crie o primeiro usuário admin
3. Configure os dados da loja em Configurações

---

## 📝 Mensagens Padrão WhatsApp

### Pedido em Preparação
```
Olá {nome}! 👋

Seu pedido #{numero} está sendo preparado com carinho! 🛍️

Em breve você receberá uma nova atualização.

{nome_loja}
```

### Pedido Enviado
```
Olá {nome}! 🚚

Seu pedido #{numero} saiu para entrega!

Aguarde em seu endereço.

{nome_loja}
```

### Pronto para Retirada
```
Olá {nome}! ✅

Seu pedido #{numero} está pronto para retirada!

📍 {endereco_loja}

{nome_loja}
```

---

*Documento criado em: Janeiro 2026*
*Versão: 1.1*
