# 08 — Deploy e variáveis de ambiente

Referência completa: [reference/env.example.v2.3.7](reference/env.example.v2.3.7) (403 linhas, cópia
literal do `.env.example` da branch `main`). Abaixo, o que importa. `[fonte: env.example]`

## Formas de instalação `[fonte: site]`

| Método | Nota |
|---|---|
| **Docker** | Caminho recomendado |
| **NVM** (Node direto) | Desenvolvimento |
| **Nginx + SSL** | Proxy reverso na frente |
| Easypanel / SetupOrion | Instaladores automatizados de terceiros |
| VPS pré-configurada (HostGator) | Bundle comercial |

Requisitos: **PostgreSQL** e **Redis**.

## Servidor

```bash
SERVER_NAME=evolution
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://localhost:8080   # ⚠️ URL anunciada, NÃO a porta de escuta
```

⚠️ `SERVER_URL` é o que a API fala sobre si mesma: vira `server_url` no payload de webhook e monta
links de mídia. Atrás de proxy, tem que ser a URL **pública** — ver [armadilha #17](07-armadilhas.md).

## Autenticação

```bash
AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11   # 🔴 TROQUE — é pública
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true            # expõe tokens no fetchInstances
```

## Banco e persistência

```bash
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI='postgresql://user:pass@postgres:5432/evolution_db?schema=evolution_api'
DATABASE_CONNECTION_CLIENT_NAME=evolution_exchange

# O que é gravado — controla o que findMessages/findChats conseguem devolver
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_LABELS=true
DATABASE_SAVE_DATA_HISTORIC=true
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7
DATABASE_DELETE_MESSAGE=true
```

Trade-off: gravar tudo dá histórico consultável e faz o banco crescer rápido (mídia + metadata de
cada mensagem). Se o seu app tem banco próprio, considere desligar o que duplica — mas aí
`findMessages` fica vazio. **Decida antes**, migrar depois é retrabalho.

## Cache

```bash
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379/6
CACHE_REDIS_TTL=604800          # 7 dias
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_REDIS_SAVE_INSTANCES=false
CACHE_LOCAL_ENABLED=false
```

## Webhook

```bash
WEBHOOK_GLOBAL_ENABLED=false
WEBHOOK_GLOBAL_URL=''
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false

# Filtro global de eventos (amostra — 30 no total)
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
WEBHOOK_EVENTS_PRESENCE_UPDATE=true    # 🔊 alto volume
WEBHOOK_EVENTS_APPLICATION_STARTUP=false

# Retry — ver 05-webhooks.md
WEBHOOK_REQUEST_TIMEOUT_MS=60000
WEBHOOK_RETRY_MAX_ATTEMPTS=10
WEBHOOK_RETRY_INITIAL_DELAY_SECONDS=5
WEBHOOK_RETRY_USE_EXPONENTIAL_BACKOFF=true
WEBHOOK_RETRY_MAX_DELAY_SECONDS=300
WEBHOOK_RETRY_JITTER_FACTOR=0.2
WEBHOOK_RETRY_NON_RETRYABLE_STATUS_CODES=400,401,403,404,422
```

## Transportes alternativos de evento

```bash
WEBSOCKET_ENABLED=false
WEBSOCKET_GLOBAL_EVENTS=false
WEBSOCKET_ALLOWED_HOSTS=127.0.0.1,::1,::ffff:127.0.0.1

RABBITMQ_ENABLED=false
RABBITMQ_URI=amqp://localhost
RABBITMQ_EXCHANGE_NAME=evolution
RABBITMQ_GLOBAL_ENABLED=false

KAFKA_ENABLED=false
KAFKA_BROKERS=localhost:9092
KAFKA_CONSUMER_GROUP_ID=evolution-api-consumers
KAFKA_TOPIC_PREFIX=evolution
```

Cada transporte tem seu próprio conjunto `*_EVENTS_*`, independente do webhook. Ver
[05-webhooks.md](05-webhooks.md#alternativas-ao-webhook).

## Mídia (S3/MinIO)

```bash
S3_ENABLED=false
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=evolution
S3_ENDPOINT=s3.domain.com
S3_REGION=eu-west-3
S3_PORT=443
S3_USE_SSL=true
```

Sem S3, a mídia fica no disco/banco do servidor. Para qualquer volume real, ligue.

## Sessão e QR

```bash
CONFIG_SESSION_PHONE_CLIENT=Evolution API   # nome exibido nos dispositivos conectados do usuário
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=30
QRCODE_COLOR='#175197'
DEL_INSTANCE=false                          # false = não apaga instância automaticamente
```

## Observabilidade

```bash
LOG_LEVEL=ERROR,WARN,DEBUG,INFO,LOG,VERBOSE,DARK,WEBHOOKS,WEBSOCKET
LOG_COLOR=true
LOG_BAILEYS=error

SENTRY_DSN=
PROMETHEUS_METRICS=false
METRICS_AUTH_REQUIRED=true
METRICS_USER=prometheus
METRICS_PASSWORD=secure_random_password_here
METRICS_ALLOWED_IPS=127.0.0.1,10.0.0.100,192.168.1.50
```

`WEBHOOKS` no `LOG_LEVEL` liga o log de entrega de webhook — primeira coisa a ativar quando o
webhook "não chega". `[fonte: código: enabledLog em webhook.controller.ts]`

## Rede e diversos

```bash
CORS_ORIGIN=*                    # 🔴 restrinja em produção
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

PROXY_HOST=                      # proxy de saída para a conexão WhatsApp
PROXY_PORT=
PROXY_PROTOCOL=
PROXY_USERNAME=
PROXY_PASSWORD=

LANGUAGE=en
WA_BUSINESS_LANGUAGE=en_US
TELEMETRY_ENABLED=true           # telemetria de uso — ligada por padrão
EVENT_EMITTER_MAX_LISTENERS=50
```

`TELEMETRY_ENABLED=true` por padrão: a instância reporta métricas de uso para a Evolution Foundation.
A doc tem uma seção de licenciamento/telemetria descrevendo o payload. Avalie conforme sua política.
`[fonte: site + env.example]`

## Checklist de hardening

- [ ] `AUTHENTICATION_API_KEY` trocada (a padrão é pública)
- [ ] `SERVER_URL` = URL pública real (senão webhook/mídia quebram)
- [ ] `CORS_ORIGIN` restrito
- [ ] HTTPS via Nginx/proxy
- [ ] Endpoint de webhook validando o header configurado em `webhook.headers`
- [ ] `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES` avaliado
- [ ] Postgres e Redis **não** expostos publicamente
- [ ] `TELEMETRY_ENABLED` decidido conscientemente
- [ ] Backup do Postgres (as sessões do WhatsApp vivem nele — perder = re-scan de tudo)
