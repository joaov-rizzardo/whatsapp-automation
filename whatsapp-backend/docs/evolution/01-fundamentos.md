# 01 — Fundamentos

## O que é

API REST open-source (Node.js + TypeScript) que expõe o WhatsApp como HTTP. Você sobe o servidor,
cria uma **instância** (uma conexão com um número de WhatsApp), e passa a enviar/receber mensagens
via REST + webhooks. `[fonte: site]`

Dois motores de conexão, escolhidos por instância no campo `integration` `[fonte: spec 2.1.1]`:

| `integration` | O que é | Implicação prática |
|---|---|---|
| `WHATSAPP-BAILEYS` | WhatsApp Web via engenharia reversa (biblioteca Baileys) | Grátis, conecta lendo QR Code com um celular. **Não é oficial** — risco de ban, e o número precisa de um aparelho pareado |
| `WHATSAPP-BUSINESS` | API oficial do WhatsApp Business (Meta) | Oficial e estável, mas exige conta aprovada na Meta, e mensagens ativas passam por templates aprovados |

Para um app de automação isso é a **primeira decisão de arquitetura** e ela muda tudo: Baileys
permite mandar texto livre para qualquer um; a Business API restringe mensagens iniciadas por você a
templates pré-aprovados dentro/fora da janela de 24h. `[não verificado — regras de janela/template são da Meta, confirmar na doc oficial da Meta]`

## Não confundir: os produtos do ecossistema

A Evolution Foundation publica vários produtos na **mesma documentação**, com **autenticação
diferente**. Misturar isso é uma fonte garantida de 401.

| Produto | O que é | Auth | Base URL |
|---|---|---|---|
| **Evolution API** ← *é este aqui* | WhatsApp REST, self-hosted | header `apikey` | sua própria URL |
| **Evolution Go** | Reescrita em Golang, mais performática | `[não verificado]` | sua própria URL |
| **EvoAI / Evo CRM** | Plataforma SaaS de CRM/agentes | header `api_access_token` (UUID) | `https://api.evoai.app` |
| **EvoNexus** | Orquestração multi-agente | `[não verificado]` | — |

⚠️ Se você achar uma página da doc falando em `api_access_token` ou `api.evoai.app`, **ela não é
sobre a Evolution API** — é sobre o SaaS. `[fonte: site]`

Confusão adicional: a Evolution API tem um endpoint `/evoai/...` que serve para **plugar** um bot
EvoAI numa instância. É integração entre os dois produtos, não é o mesmo produto.

## Arquitetura mental

```
   Seu app  ──── REST (apikey) ───────────►  Evolution API  ──── Baileys/Meta ────►  WhatsApp
      ▲                                       │        │
      │                                       │        ├── PostgreSQL  (mensagens, contatos, chats)
      └──── webhook HTTP POST ◄───────────────┘        ├── Redis       (cache/sessão)
            (event, instance, data)                    └── S3/MinIO    (mídia, opcional)
```

Pontos que definem o desenho do seu app:

1. **Multi-instância.** Um servidor hospeda N instâncias (N números). Quase todo endpoint leva o
   nome da instância no path: `/message/sendText/{instance}`. `[fonte: spec 2.1.1]`
2. **Envio é REST, recebimento é webhook.** Não existe long-poll de mensagens novas: você **precisa**
   de um endpoint HTTP público para receber. Alternativas ao webhook: WebSocket, RabbitMQ, SQS,
   Kafka, Pusher. `[fonte: env.example]`
3. **A API persiste estado.** Ela guarda mensagens/contatos/chats no Postgres dela e expõe via
   `/chat/findMessages` etc. Você **não é obrigado** a espelhar tudo no seu banco — mas o que é
   salvo é controlado por env (`DATABASE_SAVE_*`), então não assuma que o histórico existe.
   `[fonte: env.example]`
4. **Stateful de verdade.** Uma instância Baileys é uma sessão pareada com um celular. Ela cai,
   desconecta, precisa de re-scan. Trate `CONNECTION_UPDATE` como sinal de primeira classe.

## Integrações nativas embutidas

A API já traz plugues para chatbots/eventos, configuráveis por instância — útil saber que existem
antes de construir do zero `[fonte: spec 2.1.1 + env.example]`:

- **Chatbots:** Typebot, OpenAI, Dify, Flowise, n8n, EvoAI, Evolution Bot
- **Eventos/filas:** Webhook, WebSocket, RabbitMQ, SQS, Kafka, Pusher
- **Atendimento:** Chatwoot
- **Mídia:** S3/MinIO

Para este projeto (agente próprio via Claude), o caminho é **webhook + REST**; as integrações de
chatbot acima são alternativas concorrentes ao que vamos construir, não dependências.

## Requisitos de infraestrutura

- **PostgreSQL** — obrigatório (`DATABASE_PROVIDER=postgresql`)
- **Redis** — cache (`CACHE_REDIS_ENABLED=true` no exemplo padrão)
- **Node.js** ou **Docker**

Detalhes em [08-deploy-e-env.md](08-deploy-e-env.md). `[fonte: env.example]`
