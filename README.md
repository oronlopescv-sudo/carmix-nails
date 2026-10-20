# Carmix Nails — site + agendamento online + painel

Site público, marcação online e painel de administração para o estúdio Carmix Nails.
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · React Hook Form · Recharts · Zod.

## O que está incluído

**Site público** (pt-PT, fuso Atlantic/Cape_Verde, preços em escudos CVE):
- `/` home com hero, serviços em destaque, sobre, galeria, testemunhos e horários
- `/servicos` catálogo por categorias + `/servicos/[slug]` detalhe com preço e duração
- `/agendar` marcação online em 4 passos (serviço → profissional → dia/hora → dados)
- `/reserva` procurar marcação pela referência (ex.: `CN-XXXXXX`) e `/reserva/[ref]` para consultar, remarcar ou cancelar
- `/sobre`, `/galeria`, `/contactos`, `/politica-de-privacidade`, `/termos`
- `robots.txt` + `sitemap.xml` automáticos

**Motor de marcação**: janelas por profissional e dia da semana, intervalo entre horários configurável, antecedência mínima/máxima, prevenção de conflitos no servidor, pausa após serviço, bloqueios (férias, feriados, encerramentos) e limite para cancelar/remarcar.

**Painel `/admin`**: dashboard com gráficos e indicadores, agendamentos (vistas dia/semana/mês, pesquisa, ações de confirmar/remarcar/cancelar/concluir), marcação manual por telefone, serviços (preços, duração, fotos, destaques), clientes com RGPD (anonimização), profissionais (horários semanais + bloqueios), galeria (upload, ordem, ocultar), testemunhos (reais, publicados manualmente), configurações completas e utilizadores.

**Segurança**: passes com bcrypt (12 rounds), sessões em base de dados com cookie `HttpOnly`, rate limit no login e nas verificações públicas, logs de auditoria de toda a atividade administrativa, proteção contra spam (honeypot), validação Zod em todas as escritas.

## Instalação (development)

```bash
cp .env.example .env          # preencha DATABASE_URL e NEXT_PUBLIC_SITE_URL
npm install
npm run setup                 # migração + seed (categorias, 23 serviços, horários)
npm run dev                   # http://localhost:3000
```

A base PostgreSQL pode ser local (Docker) ou alojada:

```bash
# exemplo com Docker local
docker run -d --name carmix-pg -p 5433:5432 \
  -e POSTGRES_USER=carmix -e POSTGRES_PASSWORD=carmix -e POSTGRES_DB=carmix \
  postgres:17
```

## Primeiro acesso ao painel

```bash
npm run create-admin          # pede nome, utilizador (ou e-mail) e passe (mín. 5; recomendamos 10+)
```

Depois entre em `/admin/login` e mude o passe em Configurações → Utilizadores
(a própria conta exige a passe atual).

## Como o estúdio usa

1. **Preços e serviços** — Serviços: edite preços (em escudos), durações e fotos. Desative em vez de eliminar se houver marcações registadas.
2. **Horários** — Profissionais → Horários define as janelas de cada dia; Horários → Encerramentos fecha o estúdio inteiro (feriados, férias).
3. **Marcações** — Agendamentos mostra o dia/semana/mês; os pendentes pedem confirmação (ou ative a confirmação automática em Configurações). "Marcação manual" cria reservas recebidas por telefone.
4. **Cliente cancela/remarca** — na sua página `/reserva/[ref]` (referência no e-mail), respeitando o limite de horas definido em Configurações.
5. **Testemunhos** — só entram no site quando o painel os publica. Nunca se inventam.
6. **Durações ajustáveis** — a duração no catálogo é a estimada; no dia, o atendimento pode variar (nota visível ao cliente).

## E-mail (opcional)

Com `RESEND_API_KEY` configurada, as clientes recebem confirmação/lembrete/cancelamentos e o estúdio recebe aviso de nova marcação. Sem a chave, tudo funciona — apenas não há e-mails (avisado honestamente no painel).

## Produção (Hostinger web app / VPS)

Variáveis de ambiente no painel do Hostinger:

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | ligação PostgreSQL (TLS acrescentado automaticamente em servidores remotos) |
| `NEXT_PUBLIC_SITE_URL` | sim | URL público do site |
| `ADMIN_USER` + `ADMIN_PASSWORD` | 1.º deploy | cria a primeira conta do painel (palavra-passe mín. 8) |
| `ADMIN_NAME` | não | nome mostrado no painel |

`npm run build` prepara a base de dados sozinho (`scripts/db-prepare.ts`): aplica as
migrações, corre o seed se ainda não houver serviços e cria a conta de administração
se ainda não houver nenhuma. Se algo falhar, o build continua e o registo explica a causa.

```bash
npm run build                 # db:prepare + gera .next/standalone
npm start                     # arranca node .next/standalone/server.js (respeita PORT/HOSTNAME)
```

Diagnóstico do site publicado: abrir `/api/health` (estado da base de dados e contagens,
sem segredos). Acesso ao painel: ícone de cadeado no cabeçalho ou "Área reservada" no rodapé.

O `output: "standalone"` no `next.config.ts` embute o servidor a correr sem `node_modules` completo — igual aos outros projetos da Hostinger. Defina obrigatoriamente `DATABASE_URL` e `NEXT_PUBLIC_SITE_URL` no painel do ambiente; `RESEND_API_KEY` e restantes variáveis de e-mail são opcionais. `UPLOAD_DIR` (opcional) fixa a pasta das fotografias carregadas — se não existir, usa-se `data/uploads` (copiada para o bundle pelo `copy-static`).

## Verificações automatizadas

```bash
npx tsc --noEmit              # tipos
npx tsx scripts/e2e-probe.ts  # com o servidor em 3000: marca real, conflito, sessões admin, todas as páginas
```

O probe cria e limpa os próprios dados de teste (cliente "Cliente Teste").