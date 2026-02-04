# Backend API Documentation - FormBuilder

Este documento descreve a API necessária para o sistema de formulários. Implemente esses endpoints no seu backend Easypanel.

## Configuração

- **Base URL**: Configure em `VITE_API_URL` ou diretamente em `src/config/api.ts`
- **Autenticação**: Bearer Token (JWT)
- **Content-Type**: application/json

---

## Autenticação

### POST /api/auth/login
Login do usuário.

**Request:**
```json
{
  "email": "admin@exemplo.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@exemplo.com",
      "name": "Admin",
      "role": "admin"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/logout
Logout do usuário (invalidar token).

### GET /api/auth/me
Retorna o usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "admin@exemplo.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

---

## Formulários

### GET /api/forms
Lista todos os formulários.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 10)

**Response (200):**
```json
{
  "data": {
    "data": [...],
    "total": 25,
    "page": 1,
    "limit": 10,
    "total_pages": 3
  }
}
```

### GET /api/forms/:id
Retorna um formulário pelo ID.

### GET /api/forms/slug/:slug
Retorna um formulário pelo slug (para página pública).

### POST /api/forms
Cria um novo formulário.

**Request:**
```json
{
  "name": "Formulário de Contato",
  "slug": "contato",
  "description": "Descrição opcional",
  "type": "typeform", // "typeform" | "chat" | "standard"
  "fields": [
    {
      "id": "uuid",
      "type": "text",
      "label": "Nome",
      "placeholder": "Digite seu nome",
      "required": true,
      "order": 0
    }
  ],
  "settings": {
    "redirect_url": "https://exemplo.com/obrigado",
    "facebook_pixel": "123456789",
    "google_analytics": "G-XXXXXXXX",
    "google_tag_manager": "GTM-XXXXXX",
    "webhook_url": "https://hooks.exemplo.com/lead",
    "webhook_enabled": true,
    "whatsapp_notification": true,
    "evolution_instance_id": "uuid",
    "success_message": "Obrigado!",
    "button_text": "Enviar"
  },
  "is_active": true
}
```

### PUT /api/forms/:id
Atualiza um formulário.

### DELETE /api/forms/:id
Exclui um formulário.

---

## Leads

### GET /api/leads
Lista todos os leads.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)

### GET /api/leads/form/:formId
Lista leads de um formulário específico.

### GET /api/leads/:id
Retorna um lead pelo ID.

### DELETE /api/leads/:id
Exclui um lead.

### GET /api/leads/export
Exporta leads em CSV.

**Response:** URL do arquivo ou download direto.

---

## Evolution API Instances

### GET /api/evolution-instances
Lista todas as instâncias.

### GET /api/evolution-instances/:id
Retorna uma instância.

### POST /api/evolution-instances
Cria uma instância.

**Request:**
```json
{
  "name": "Instância Principal",
  "api_url": "https://evolution.exemplo.com",
  "api_key": "sua_api_key",
  "default_number": "5511999998888",
  "is_active": true
}
```

### PUT /api/evolution-instances/:id
Atualiza uma instância.

### DELETE /api/evolution-instances/:id
Exclui uma instância.

### POST /api/evolution-instances/:id/test
Testa a conexão com a Evolution API.

---

## Dashboard

### GET /api/dashboard/stats
Retorna estatísticas do dashboard.

**Response (200):**
```json
{
  "data": {
    "total_forms": 10,
    "active_forms": 8,
    "total_leads": 500,
    "leads_today": 15,
    "leads_this_week": 87,
    "leads_this_month": 250
  }
}
```

---

## Submissão Pública

### POST /api/public/forms/:slug/submit
Submete um formulário (endpoint público, sem autenticação).

**Request:**
```json
{
  "data": {
    "Nome": "João Silva",
    "Email": "joao@email.com",
    "WhatsApp": "11999998888"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Lead criado com sucesso"
}
```

**Ações no backend:**
1. Salvar lead no banco
2. Se `webhook_enabled`: enviar dados para webhook_url
3. Se `whatsapp_notification`: enviar mensagem via Evolution API
4. Disparar eventos de pixel (opcional, pode ser feito no frontend)

---

## Webhook Payload

Quando um lead é criado e webhook está ativo:

```json
{
  "form_id": "uuid",
  "form_name": "Formulário de Contato",
  "form_slug": "contato",
  "lead_id": "uuid",
  "data": {
    "Nome": "João Silva",
    "Email": "joao@email.com"
  },
  "submitted_at": "2024-01-15T10:30:00.000Z",
  "source": "organic",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

---

## Evolution API - Envio de Mensagem

Quando `whatsapp_notification` está ativo:

```bash
POST {evolution_api_url}/message/sendText/{instance}
Authorization: {api_key}

{
  "number": "5511999998888",
  "textMessage": {
    "text": "🎉 Novo lead!\n\nNome: João Silva\nEmail: joao@email.com\nFormulário: Contato"
  }
}
```

---

## Formato de Resposta Padrão

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```
