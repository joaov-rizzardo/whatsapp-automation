# 05 — Webhooks (núcleo da automação)

**É assim que você recebe mensagens.** Não há polling de mensagens novas. Este é o documento mais
importante do conjunto — e o que mais diverge entre a doc publicada e o código real.

Tudo aqui foi verificado no código-fonte da branch `main` (v2.3.7):
`src/api/integrations/event/webhook/` e `event.controller.ts`.

## ⚠️ O formato do corpo mudou — a doc online está errada

Três formatos diferentes circulam. **Só um funciona na v2 atual.**

| Origem | Formato | Situação |
|---|---|---|
| Site da doc (página de webhooks) | plano, snake_case: `webhook_by_events` | ❌ Padrão **v1** |
| Spec OpenAPI 2.1.1 | plano, camelCase: `webhookByEvents`, `webhookBase64` | ❌ Desatualizado |
| **Código `main` / v2.3.7** | **aninhado sob `webhook`**, campos `byEvents` / `base64` | ✅ **Correto** |

### Formato correto `[fonte: código: webhook.schema.ts]`

```json
{
  "webhook": {
    "enabled": true,
    "url": "https://seu-app.com/webhook",
    "headers": { "authorization": "Bearer meu-token" },
    "byEvents": false,
    "base64": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }
}
```

Schema real:

```ts
webhookSchema = {
  type: 'object',
  properties: {
    webhook: {
      type: 'object',
      properties: {
        enabled:  { type: 'boolean' },
        url:      { type: 'string'  },
        headers:  { type: 'object'  },
        byEvents: { type: 'boolean' },
        base64:   { type: 'boolean' },
        events:   { type: 'array', items: { enum: EventController.events } },
      },
      required: ['enabled', 'url'],
    },
  },
  required: ['webhook'],
}
```

- Obrigatórios: o objeto `webhook`, e dentro dele `enabled` + `url`.
- `headers` **existe na v2** e não está em spec nenhuma — é como você autentica o webhook (ver abaixo).
- `events: []` vazio ou ausente com `enabled: true` → o código **inscreve em TODOS os eventos**
  `[fonte: código: event.controller.ts]`. Isso é uma pegadinha de custo: você recebe tudo.

```bash
curl -X POST "$BASE/webhook/set/vendas" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://seu-app.com/webhook",
      "headers": { "authorization": "Bearer meu-token" },
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

Consultar: `GET /webhook/find/{instance}`.

## Payload que chega no seu endpoint

`POST` com este corpo `[fonte: código: webhook.controller.ts]`:

```json
{
  "event": "messages.upsert",
  "instance": "vendas",
  "data": { },
  "destination": "https://seu-app.com/webhook",
  "date_time": "2026-07-14T22:00:00.000Z",
  "sender": "5511999998888@s.whatsapp.net",
  "server_url": "https://sua-instancia.com",
  "apikey": "..."
}
```

Construção literal no código:

```ts
const webhookData = {
  ...(extra ?? {}),
  event,
  instance: instanceName,
  data,
  destination: instance?.url || `${webhookConfig.GLOBAL.URL}/${transformedWe}`,
  date_time: dateTime,
  sender,
  server_url: serverUrl,
  apikey: apiKey,
};
```

Observações que importam:

- **As chaves do envelope são `snake_case`** (`date_time`, `server_url`) — mesmo o corpo de
  configuração sendo camelCase. Inconsistente, mas é assim.
- **`event` chega em minúsculas com ponto** (`messages.upsert`), enquanto você **configura** em
  maiúsculas com underscore (`MESSAGES_UPSERT`). O código normaliza com
  `event.replace(/[.-]/gm,'_').toUpperCase()`. Normalize antes de comparar.
- **`apikey` vem no corpo.** Não use isso como autenticação (ver abaixo).
- `data` é o payload cru do evento — a forma **varia por evento** e não está documentada em lugar
  nenhum de forma completa. `[não verificado — capturar amostras reais]`

## Segurança do endpoint

Seu webhook é um endpoint público que recebe mensagens de clientes. O modelo aqui é fraco — não há
assinatura HMAC como Stripe/GitHub. Você tem duas defesas `[fonte: código]`:

1. **`headers` na configuração** — a API repassa os headers que você definir. É o mecanismo
   pretendido: configure `{"authorization": "Bearer <segredo>"}` e valide no seu lado.
2. **`apikey` no corpo** — comparação de segredo, mas viaja no payload e aparece em qualquer log.
   Use como reforço, nunca como defesa única.

> **Não confie no campo `apikey` do corpo como autenticação primária.** Prefira `headers` +
> HTTPS + (se possível) allowlist de IP. Trate tudo dentro de `data` como entrada hostil: são
> mensagens que qualquer pessoa pode mandar para o seu número.

O código remove `jwt_key` dos headers antes de enviar. `[fonte: código]`

## ⚠️ Retry: o comportamento que vai te morder

O código faz retry agressivo `[fonte: código: retryWebhookRequest + env.example]`:

| Env | Padrão | Efeito |
|---|---|---|
| `WEBHOOK_RETRY_MAX_ATTEMPTS` | `10` | Até 10 tentativas |
| `WEBHOOK_RETRY_INITIAL_DELAY_SECONDS` | `5` | Primeiro retry em 5s |
| `WEBHOOK_RETRY_USE_EXPONENTIAL_BACKOFF` | `true` | Backoff exponencial |
| `WEBHOOK_RETRY_MAX_DELAY_SECONDS` | `300` | Teto de 5 min entre tentativas |
| `WEBHOOK_RETRY_JITTER_FACTOR` | `0.2` | Jitter de 20% |
| `WEBHOOK_RETRY_NON_RETRYABLE_STATUS_CODES` | `400,401,403,404,422` | **Não** repete nesses códigos |
| `WEBHOOK_REQUEST_TIMEOUT_MS` | `60000` | Timeout de 60s por tentativa |

Três consequências diretas de projeto:

1. **Seu handler tem que ser idempotente.** Se ele demora e dá timeout, você recebe o mesmo evento
   de novo — depois de já ter processado. Deduplique por `data.key.id` (mensagens) e guarde o que já
   foi visto.
2. **Responda 2xx rápido; processe depois.** Enfileire e devolva 200 imediatamente. Processar de forma
   síncrona e demorar >60s garante duplicata.
3. **Falha permanente → devolva 400/401/403/404/422.** Esses códigos param o retry. Um 500 numa
   mensagem que seu app nunca vai conseguir processar gera 10 tentativas com backoff até 5 min.

## Eventos (lista canônica)

31 eventos, direto do código `[fonte: código: EventController.events]`:

```
APPLICATION_STARTUP      MESSAGES_SET             CHATS_SET
QRCODE_UPDATED           MESSAGES_UPSERT          CHATS_UPSERT
CONNECTION_UPDATE        MESSAGES_EDITED          CHATS_UPDATE
                         MESSAGES_UPDATE          CHATS_DELETE
INSTANCE_CREATE          MESSAGES_DELETE
INSTANCE_DELETE          SEND_MESSAGE             GROUPS_UPSERT
STATUS_INSTANCE          SEND_MESSAGE_UPDATE      GROUP_UPDATE
REMOVE_INSTANCE                                   GROUP_PARTICIPANTS_UPDATE
LOGOUT_INSTANCE          CONTACTS_SET
                         CONTACTS_UPSERT          LABELS_EDIT
CALL                     CONTACTS_UPDATE          LABELS_ASSOCIATION
PRESENCE_UPDATE
TYPEBOT_START            TYPEBOT_CHANGE_STATUS
```

Os que importam para automação:

| Evento | Quando | Uso |
|---|---|---|
| **`MESSAGES_UPSERT`** | **Mensagem nova (recebida ou enviada)** | **O gatilho principal do bot** |
| `SEND_MESSAGE` | Você enviou algo | Confirmação de envio |
| `MESSAGES_UPDATE` | Status mudou (entregue/lido) | Rastrear entrega |
| `MESSAGES_EDITED` | Mensagem editada | Reprocessar |
| `MESSAGES_DELETE` | Apagada | Compliance |
| `CONNECTION_UPDATE` | Conexão mudou | **Alertar quando cair** |
| `QRCODE_UPDATED` | QR rotacionado | Atualizar a UI de pareamento |
| `CALL` | Chamada recebida | Rejeitar/responder |
| `PRESENCE_UPDATE` | online/digitando | **Alto volume — evite** |

> **Cuidado com volume:** `PRESENCE_UPDATE`, `CHATS_SET`, `CONTACTS_SET` e `MESSAGES_SET` são
> ruidosos — `*_SET` despeja o histórico na sincronização inicial. Inscrever-se em tudo (ou deixar
> `events: []`) numa instância movimentada faz seu webhook levar milhares de requests logo após conectar.
> **Inscreva-se só no que você usa.**

### ⚠️ `MESSAGES_UPSERT` inclui as suas próprias mensagens

Como cobre enviadas *e* recebidas, um bot que responde a todo `MESSAGES_UPSERT` **responde a si
mesmo, em loop**. Filtre por `data.key.fromMe` (esperado `true` para mensagens suas)
`[não verificado — confirmar o campo exato numa amostra real antes de confiar]`.

### Inconsistência de nome: `GROUP_UPDATE` vs `GROUPS_UPDATE`

- Enum da API (`EventController.events`): **`GROUP_UPDATE`** (singular)
- Env var: **`WEBHOOK_EVENTS_GROUPS_UPDATE`** (plural)

Ao inscrever via API, use `GROUP_UPDATE`. `[fonte: código + env.example]`

## `byEvents` — uma URL por evento

Com `byEvents: true`, a API acrescenta o nome do evento à URL, em minúsculas com hífen
`[fonte: código + site]`:

```ts
const transformedWe = we.replace(/_/gm, '-').toLowerCase();
baseURL = `${instance?.url}/${transformedWe}`;
```

`https://app.com/webhook` + `QRCODE_UPDATED` → `https://app.com/webhook/qrcode-updated`

Útil para rotear no proxy/framework em vez de um `switch` gigante. Com `false` (padrão), tudo cai
numa URL só.

## `base64`

`base64: true` faz a API mandar arquivos em base64 no payload quando disponível. `[fonte: spec 2.1.1]`

O site menciona o parâmetro mas **não documenta o comportamento**. `[não verificado — quais eventos, e como o campo aparece em `data`]`

Alternativa: manter `false` e buscar a mídia sob demanda com
`POST /chat/getBase64FromMediaMessage/{instance}`. Melhor para volume — evita inflar todo payload de
imagem em ~33% e estourar limite de corpo do seu servidor.

## Webhook global vs por instância

Dois níveis `[fonte: env.example + código]`:

| Nível | Config | Alcance |
|---|---|---|
| **Por instância** | `POST /webhook/set/{instance}` | Só aquela instância |
| **Global** | env `WEBHOOK_GLOBAL_ENABLED` + `WEBHOOK_GLOBAL_URL` | Todas as instâncias |

`WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS` faz o mesmo que `byEvents`, no nível global.

As envs `WEBHOOK_EVENTS_*` (`true`/`false`) definem quais eventos o servidor emite **globalmente** —
funcionam como filtro geral. Se um evento está `false` ali, `[não verificado — confirmar se isso bloqueia também os webhooks por instância]`.

## Alternativas ao webhook

Mesmo modelo de eventos, transportes diferentes `[fonte: env.example]`:

| Transporte | Env | Quando usar |
|---|---|---|
| **WebSocket** | `WEBSOCKET_ENABLED` | UI em tempo real, sem endpoint público |
| **RabbitMQ** | `RABBITMQ_ENABLED` | Fila durável, alto volume |
| **Kafka** | `KAFKA_ENABLED` | Streaming/event sourcing |
| **SQS** | `SQS_ENABLED` | AWS |
| **Pusher** | `PUSHER_ENABLED` | Push gerenciado |

> Para produção séria, **RabbitMQ/Kafka > webhook**: você ganha durabilidade e backpressure de graça,
> e some com o problema de idempotência-por-timeout descrito acima. Webhook é o caminho mais simples
> para começar.
