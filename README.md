# FormFlow Builder

Sistema de formulários multi-estilo (Typeform, Chat, Standard) com painel administrativo para gestão de leads.

## Arquitetura

```
formflow-builder/
├── Dockerfile              # Frontend Docker (deploy no Easypanel)
├── nginx.conf              # Nginx config para SPA
├── docker-compose.yml      # Stack completa (dev local)
│
├── backend/                # API Node.js (deploy no Easypanel)
│   ├── Dockerfile
│   ├── docker-compose.yml  # Apenas backend + DB
│   ├── package.json
│   └── src/
│       └── ...
│
├── src/                    # Frontend React
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── ...
│
└── docs/                   # Documentação
    ├── API.md
    └── DATABASE.md
```

## Deploy no Easypanel

### Opção 1: Frontend e Backend Separados (Recomendado)

#### Frontend (Serviço 1)
1. Crie um novo serviço no Easypanel
2. Conecte via GitHub:
   - **Proprietário**: r2d2agency
   - **Repositório**: formflow-builder
   - **Ramo**: main
   - **Caminho de Build**: `/` (raiz)
3. Configure a variável de ambiente:
   ```
   VITE_API_URL=https://sua-api.easypanel.host/api
   ```

#### Backend (Serviço 2)
1. Crie outro serviço no Easypanel
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
   CORS_ORIGIN=https://seu-frontend.easypanel.host
   ```

#### PostgreSQL (Serviço 3)
1. Crie um serviço PostgreSQL no Easypanel
2. Execute o script `backend/init.sql` para criar as tabelas
3. Configure as credenciais no serviço da API

### Opção 2: Deploy Local com Docker Compose

```bash
# Sobe tudo (frontend + backend + postgres)
docker-compose up -d

# Acesse:
# Frontend: http://localhost
# Backend: http://localhost:3001/api
```

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
