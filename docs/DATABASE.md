# Database Schema - FormBuilder

Schema PostgreSQL para o sistema de formulários.

## Criar Tabelas

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forms table
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('typeform', 'chat', 'standard')),
    fields JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    source VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evolution instances table
CREATE TABLE evolution_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    default_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks table (optional, can use form settings instead)
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST' CHECK (method IN ('POST', 'PUT')),
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_form_id ON leads(form_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_is_active ON forms(is_active);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evolution_instances_updated_at
    BEFORE UPDATE ON evolution_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Inserir Usuário Admin

```sql
-- Insira a senha já hasheada (bcrypt)
-- Exemplo com senha "admin123" (hash de exemplo, gere o seu!)
INSERT INTO users (email, password_hash, name, role)
VALUES (
    'admin@exemplo.com',
    '$2b$10$YourHashedPasswordHere',
    'Administrador',
    'admin'
);
```

## Estrutura JSONB

### fields (em forms)
```json
[
  {
    "id": "uuid",
    "type": "text",
    "label": "Nome",
    "placeholder": "Digite seu nome",
    "required": true,
    "order": 0,
    "validation": {
      "min": 2,
      "max": 100,
      "pattern": null,
      "message": null
    },
    "options": null
  },
  {
    "id": "uuid",
    "type": "select",
    "label": "Interesse",
    "placeholder": "Selecione",
    "required": true,
    "order": 1,
    "options": ["Opção 1", "Opção 2", "Opção 3"]
  }
]
```

### settings (em forms)
```json
{
  "redirect_url": "https://exemplo.com/obrigado",
  "facebook_pixel": "123456789012345",
  "google_analytics": "G-XXXXXXXXXX",
  "google_tag_manager": "GTM-XXXXXXX",
  "webhook_url": "https://hooks.exemplo.com/lead",
  "webhook_enabled": true,
  "whatsapp_notification": true,
  "evolution_instance_id": "uuid",
  "success_message": "Obrigado pelo cadastro!",
  "button_text": "Enviar",
  "primary_color": "#3B82F6",
  "background_color": "#FFFFFF"
}
```

### data (em leads)
```json
{
  "Nome": "João Silva",
  "Email": "joao@email.com",
  "WhatsApp": "11999998888",
  "Interesse": "Produto Premium"
}
```

## Views Úteis

```sql
-- View de leads com nome do formulário
CREATE VIEW leads_with_form AS
SELECT 
    l.*,
    f.name as form_name,
    f.slug as form_slug
FROM leads l
JOIN forms f ON l.form_id = f.id;

-- View de estatísticas por formulário
CREATE VIEW form_stats AS
SELECT 
    f.id,
    f.name,
    f.slug,
    f.is_active,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as leads_today,
    COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as leads_week,
    COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as leads_month
FROM forms f
LEFT JOIN leads l ON f.id = l.form_id
GROUP BY f.id, f.name, f.slug, f.is_active;
```

## Queries Úteis

```sql
-- Dashboard stats
SELECT 
    (SELECT COUNT(*) FROM forms) as total_forms,
    (SELECT COUNT(*) FROM forms WHERE is_active = true) as active_forms,
    (SELECT COUNT(*) FROM leads) as total_leads,
    (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '1 day') as leads_today,
    (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days') as leads_this_week,
    (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days') as leads_this_month;

-- Leads recentes com formulário
SELECT 
    l.id,
    l.data,
    l.created_at,
    f.name as form_name
FROM leads l
JOIN forms f ON l.form_id = f.id
ORDER BY l.created_at DESC
LIMIT 50;
```
