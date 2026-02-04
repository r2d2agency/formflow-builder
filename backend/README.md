# FormBuilder API Backend

API Node.js/Express para o sistema de formulários.

## Estrutura

```
backend/
├── docker-compose.yml    # Orquestração Docker
├── Dockerfile            # Build da API
├── init.sql              # Schema inicial do banco
├── package.json          # Dependências
├── .env.example          # Template de variáveis
└── src/
    ├── index.js          # Servidor Express
    ├── middleware/
    │   └── auth.js       # Middleware JWT
    └── routes/
        ├── auth.js       # Login/Logout/Me
        ├── forms.js      # CRUD formulários
        ├── leads.js      # CRUD leads
        ├── evolution.js  # Instâncias Evolution API
        ├── dashboard.js  # Estatísticas
        └── public.js     # Submissão pública
```

## Deploy no Easypanel

### Via GitHub (Recomendado)

1. Conecte o repositório no Easypanel
2. Configure:
   - **Proprietário**: `r2d2agency`
   - **Repositório**: `formflow-builder`
   - **Ramo**: `main`
   - **Caminho de Build**: `/backend`

3. Adicione as variáveis de ambiente no Easypanel:
   - `DB_HOST`: Host do PostgreSQL
   - `DB_USER`: Usuário do banco
   - `DB_PASSWORD`: Senha do banco
   - `DB_NAME`: Nome do banco
   - `JWT_SECRET`: Chave secreta JWT
   - `CORS_ORIGIN`: URL do frontend Lovable

### Via Docker Compose

```bash
cd backend
cp .env.example .env
# Edite o .env com suas configurações
docker-compose up -d
```

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuário atual |
| GET | /api/forms | Listar formulários |
| POST | /api/forms | Criar formulário |
| GET | /api/leads | Listar leads |
| POST | /api/public/forms/:slug/submit | Submeter lead |

## Usuário Admin Padrão

- **Email**: admin@formbuilder.com
- **Senha**: Gere um hash bcrypt para sua senha

Gere o hash em: https://bcrypt-generator.com/
