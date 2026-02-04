# FormFlow Builder

Sistema de formulários multi-estilo (Typeform, Chat, Standard) com painel administrativo para gestão de leads.

## Arquitetura

```
formflow-builder/
├── backend/           # API Node.js (deploy no Easypanel)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   └── src/
│       └── ...
│
├── src/               # Frontend React (hospedado no Lovable)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── ...
│
└── docs/              # Documentação da API e Database
    ├── API.md
    └── DATABASE.md
```

## Deploy

### Frontend (Lovable)

O frontend é automaticamente hospedado pelo Lovable. 

**Configurar URL da API:**
1. No Lovable, vá em Settings → Environment Variables
2. Adicione: `VITE_API_URL=https://sua-api.easypanel.host/api`

**URLs:**
- Preview: https://id-preview--1adaa66b-6671-409e-9fcc-b2892d6994a7.lovable.app
- Produção: Configure em Publish → Custom Domain

### Backend (Easypanel)

1. Crie um novo serviço no Easypanel
2. Conecte via GitHub:
   - **Proprietário**: r2d2agency
   - **Repositório**: formflow-builder
   - **Ramo**: main
   - **Caminho de Build**: `/backend`

3. Configure as variáveis de ambiente:
   ```
   DB_HOST=seu-postgres-host
   DB_PORT=5432
   DB_USER=formbuilder
   DB_PASSWORD=sua-senha-segura
   DB_NAME=formbuilder
   JWT_SECRET=sua-chave-jwt-secreta
   CORS_ORIGIN=https://id-preview--1adaa66b-6671-409e-9fcc-b2892d6994a7.lovable.app
   ```

### PostgreSQL (Easypanel)

1. Crie um serviço PostgreSQL no Easypanel
2. Execute o script `backend/init.sql` para criar as tabelas
3. Configure as credenciais no serviço da API

## Funcionalidades

- ✅ 3 tipos de formulário (Typeform, Chat, Standard)
- ✅ Editor drag-and-drop de campos
- ✅ Captura e gestão de leads
- ✅ Integração Evolution API (WhatsApp)
- ✅ Webhooks customizados
- ✅ Pixels de rastreamento (Facebook, Google)
- ✅ Dashboard com estatísticas

## Tecnologias

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Query
- React Router

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Docker

## Desenvolvimento Local

```sh
# Frontend
npm install
npm run dev

# Backend
cd backend
npm install
docker-compose up -d  # Sobe PostgreSQL
npm run dev
```

## Usuário Admin Padrão

Após criar o banco, gere um hash bcrypt para sua senha em https://bcrypt-generator.com/ e atualize no `init.sql` ou via SQL:

```sql
UPDATE users SET password_hash = 'seu_hash_bcrypt' WHERE email = 'admin@formbuilder.com';
```
