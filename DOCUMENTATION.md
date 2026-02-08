# Documentação do FormFlow Builder

O **FormFlow Builder** é uma plataforma completa para criação de formulários inteligentes, gestão de leads e automação de marketing via WhatsApp. O sistema permite criar experiências de coleta de dados de alta conversão e automatizar o relacionamento com os contatos.

---

## 🚀 Visão Geral

O sistema é dividido em três pilares principais:
1.  **Captura**: Criação de formulários modernos e páginas de links.
2.  **Gestão**: CRM leve para administração de leads e métricas.
3.  **Automação**: Disparos de mensagens via WhatsApp (Remarketing) e integrações.

---

## 📦 Módulos e Funcionalidades

### 1. Construtor de Formulários (Form Builder)
Crie formulários ilimitados com diferentes estilos de experiência do usuário:

*   **Tipos de Formulários:**
    *   **Estilo Typeform:** Uma pergunta por vez, focado em alta conversão e experiência imersiva.
    *   **Estilo Chat:** Simula uma conversa de chat (conversacional), ideal para qualificação de leads.
    *   **Formulário Padrão:** Layout clássico com todos os campos visíveis, ideal para cadastros rápidos.
    *   **Link na Bio:** Página estilo "Linktree" para centralizar links de redes sociais, com botões personalizados.

*   **Recursos do Editor:**
    *   Editor "Arrastar e Soltar" (Drag-and-drop).
    *   Campos variados: Texto, Email, Telefone, Select, Checkbox, etc.
    *   Personalização de temas e cores.
    *   Configuração de Slugs personalizados (URL amigável).

### 2. Gestão de Leads (CRM)
Centralize todos os dados capturados em um único lugar:

*   **Listagem Completa:** Visualize todas as submissões recebidas.
*   **Leads Parciais:** Capture dados mesmo que o usuário não finalize o formulário (recuperação de abandono).
*   **Status do Lead:** Acompanhe o progresso (Novo, Em Contato, Convertido, etc.).
*   **Exportação:** Exporte dados para planilhas (CSV/Excel) para uso externo.

### 3. Automação de Marketing (WhatsApp)
Integração nativa com **Evolution API** para automação de mensagens:

*   **Gestão de Instâncias:** Conecte múltiplos números de WhatsApp via QR Code diretamente no painel.
*   **Campanhas de Remarketing:**
    *   **Recuperação de Abandono:** Envie mensagens automáticas para quem começou a preencher mas parou.
    *   **Sequências (Drip):** Crie funis de mensagens agendadas (ex: Boas-vindas imediata, Follow-up após 24h).
    *   **Multi-mensagens:** Envie sequências de texto, imagem, áudio e vídeo em um único passo.
    *   **Teste de Campanha:** Simule o envio para um número de teste antes de ativar.
    *   **Variáveis Dinâmicas:** Personalize mensagens com `{nome}`, `{email}`, etc.

### 4. Encurtador de Links
Ferramenta integrada para gestão de links curtos:

*   Crie URLs curtas e amigáveis (`/l/promocao`).
*   Defina datas de expiração para links temporários.
*   Monitore a quantidade de cliques (Analytics básico).

### 5. Branding e White-Label
Personalize a plataforma para ficar com a cara da sua empresa:

*   **Identidade Visual:** Altere o nome do sistema, cor primária e cor de destaque.
*   **Logotipo:** Faça upload do seu próprio logo para substituir o padrão.
*   **Domínio:** O sistema está preparado para rodar em seu próprio domínio.

---

## 🛠️ Integrações e Webhooks

*   **Webhooks:** Envie dados de formulários preenchidos para qualquer sistema externo (Zapier, n8n, CRM proprietário) em tempo real.
*   **Evolution API:** Integração profunda para controle total de sessões de WhatsApp.

---

## 📊 Dashboard e Analytics

*   Visão geral de visitas, conversões e taxa de conversão.
*   Gráficos de desempenho por período.
*   Status das instâncias de WhatsApp conectadas.

---

## 💻 Aspectos Técnicos

*   **Frontend:** React, Tailwind CSS, Shadcn/UI (Interface moderna e responsiva).
*   **Backend:** Node.js, Express.
*   **Banco de Dados:** PostgreSQL.
*   **Infraestrutura:** Docker Ready (fácil deploy via Easypanel, Portainer, etc.).
