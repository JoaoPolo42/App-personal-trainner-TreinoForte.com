# PT Manager — Setup

## 1. Instalar Node.js

Abra o terminal e execute:
```bash
# Opção A — via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Opção B — via apt (requer sudo)
sudo apt update && sudo apt install -y nodejs npm
```

## 2. Instalar dependências do projeto

```bash
cd ~/personal-trainer-app
npm install
```

## 3. Configurar Supabase

1. Acesse https://supabase.com e crie um projeto gratuito
2. No painel do Supabase, vá em **SQL Editor**
3. Cole e execute o conteúdo de `supabase/schema.sql`
4. Vá em **Settings > API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Configurar variáveis de ambiente

Edite o arquivo `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 5. Rodar o projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## Estrutura do App

| Rota | Descrição |
|------|-----------|
| `/auth/login` | Login do trainer |
| `/auth/register` | Cadastro do trainer |
| `/dashboard` | Painel principal |
| `/clients` | Lista de clientes |
| `/clients/new` | Cadastrar cliente |
| `/clients/[id]` | Perfil completo do cliente |
| `/clients/[id]/plan` | Plano de treino (exercícios) |
| `/clients/[id]/sessions/new` | Lançar sessão de treino |
| `/clients/[id]/reports` | Dashboard de evolução com gráficos |
| `/clients/[id]/reports/pdf` | Exportar relatório PDF |
| `/schedule` | Agenda e agendamentos com PIX |
| `/settings` | Perfil e chave PIX |
