# 07 — Armadilhas

Leia **antes** de debugar um 400. Cada item aqui foi verificado; a maioria custa horas se descoberta
na marra.

## 1. 🔴 A documentação publicada está atrás do código

| Artefato | Versão |
|---|---|
| Release estável | **2.3.7** (2025-12-05) |
| Pré-release | 2.4.0-rc2 (2026-05-17) |
| Spec OpenAPI publicada | **2.1.1** ← duas minor atrás |
| Site da doc | mistura v1 e v2 |

**Regra:** onde a spec/site divergir do código, **o código vence**. Fonte:
`github.com/EvolutionAPI/evolution-api`, branch `main`.

## 2. 🔴 O corpo do `POST /webhook/set` é aninhado (a doc mostra plano)

O erro mais provável do projeto inteiro. Três formatos circulam; **só o terceiro funciona**:

```jsonc
// ❌ Site da doc — padrão v1
{ "url": "...", "webhook_by_events": false, "events": [...] }

// ❌ Spec OpenAPI 2.1.1
{ "url": "...", "webhookByEvents": false, "webhookBase64": false, "events": [...] }

// ✅ Código v2.3.7
{ "webhook": { "enabled": true, "url": "...", "byEvents": false, "base64": false,
               "headers": {}, "events": [...] } }
```

Note que os campos também **renomearam**: `webhookByEvents` → `byEvents`, `webhookBase64` → `base64`.
E `headers` só existe na v2 — não está em spec nenhuma.
`[fonte: código: webhook.schema.ts]` — ver [05-webhooks.md](05-webhooks.md).

## 3. 🔴 `events: []` significa "todos os eventos"

Com `enabled: true` e a lista vazia/ausente, o código preenche com `EventController.events` inteiro
— os 31. Numa instância movimentada, seu webhook toma milhares de requests logo após conectar
(`*_SET` despeja histórico, `PRESENCE_UPDATE` dispara a cada "digitando").

```ts
if (0 === data[this.name].events.length) {
  data[this.name].events = EventController.events;  // TODOS
}
```
`[fonte: código: event.controller.ts]`

**Sempre liste os eventos explicitamente.**

## 4. 🔴 `MESSAGES_UPSERT` inclui as mensagens que você mesmo enviou

Um bot que responde a todo `MESSAGES_UPSERT` responde a si mesmo — **loop infinito**, cobrando tokens
e queimando o número. Filtre por `data.key.fromMe`.
`[não verificado — confirmar o nome exato do campo numa amostra real]`

## 5. 🔴 Retry agressivo: handler lento gera duplicata

Padrão: **10 tentativas**, backoff exponencial até 300s, timeout de 60s por tentativa.

- Handler demora >60s → timeout → **reenvio do mesmo evento** (mesmo você já tendo processado).
- Devolva **2xx rápido** e processe assíncrono.
- Para falha permanente devolva **400/401/403/404/422** — são os `NON_RETRYABLE_STATUS_CODES`, e
  param o retry. Um 500 rende 10 tentativas.
- **Não existe idempotency key.** Deduplique por `data.key.id`.

`[fonte: código: retryWebhookRequest + env.example]`

## 6. 🟠 Envelope do webhook é snake_case; a config é camelCase

Você **configura** `byEvents`, mas **recebe** `date_time` e `server_url`. Inconsistente, mas é assim.
`[fonte: código: webhook.controller.ts]`

## 7. 🟠 Nome de evento: configura em MAIÚSCULA, recebe em minúscula

Configura `MESSAGES_UPSERT`, chega `"event": "messages.upsert"`. Normalize antes de comparar:

```ts
const normalized = event.replace(/[.-]/gm, '_').toUpperCase();
```
`[fonte: código]`

## 8. 🟠 `GROUP_UPDATE` (API) vs `GROUPS_UPDATE` (env)

Enum da API: `GROUP_UPDATE` (singular). Env var: `WEBHOOK_EVENTS_GROUPS_UPDATE` (plural). Ao
inscrever via API use o **singular** — o plural não está no enum e deve dar erro de validação.
`[fonte: código + env.example]`

## 9. 🔴 O nono dígito brasileiro é reescrito pela API

Para DDI 55, número de 13 dígitos, DDD ≥ 31 e primeiro dígito do bloco ≥ 7, a API **remove o nono
dígito** antes de enviar.

**O número que você manda pode não ser o JID que volta no webhook.** Nunca case mensagem com contato
por comparação literal — use o `remoteJid` devolvido pela API como chave canônica, ou resolva antes
via `POST /chat/whatsappNumbers`. Há tratamento parecido para México (52) e Argentina (54).
`[fonte: código: createJid.ts]` — ver [02](02-autenticacao-e-jid.md).

## 10. 🟠 As consultas são POST, não GET

`findContacts`, `findChats`, `findMessages` são todos **POST** com filtro no corpo. Não existe
`GET /chat/findMessages?...`. `[fonte: spec 2.1.1]`

## 11. 🟠 `caption` obrigatório no `sendMedia`

A spec 2.1.1 marca `caption` como **required** junto de `number`, `mediatype`, `mimetype`, `media`,
`fileName` — mesmo sendo semanticamente opcional. Se der 400 sem legenda, mande `""`.
`[fonte: spec 2.1.1]` `[não verificado na 2.3.7]`

## 12. 🟠 A spec não documenta as respostas dos envios

O `responses` de `sendText` na spec vem **vazio**. Você precisa do `key.id` da resposta para
correlacionar com `SEND_MESSAGE`/`MESSAGES_UPDATE`. **Capture uma resposta real antes de desenhar
essa correlação.** `[fonte: spec 2.1.1]`

## 13. 🟡 A spec tem endpoints com tag errada e sintaxe misturada

Qualidade da spec 2.1.1 é irregular:

- `DELETE /flowise/delete/:flowiseId/{instance}` está sob **"Group Controller"**
- `GET /settings/find/{instance}` está sob "Webhook Controller", descrito como "Find Webhook"
- Existem **"OpenIA Controller"** e **"OpenAI Controller"** como grupos separados
- Paths misturam Express (`:typebotId`) e OpenAPI (`{instance}`): `/typebot/fetch/:typebotId/{instance}`
- Várias descrições em português no meio de uma spec em inglês

Os **paths funcionam**; o agrupamento é que não é confiável. Não deduza comportamento a partir da tag.
`[fonte: spec 2.1.1]`

## 14. 🔴 A API key de exemplo é pública

`AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11` está no `.env.example` no GitHub.
Instância exposta com essa chave = qualquer pessoa controla seu WhatsApp. Passo zero de todo deploy.
`[fonte: env.example]`

## 15. 🟠 A chave global é root

Não há escopo/permissão granular: a chave global cria, apaga e opera **qualquer** instância. Nunca
mande a global para o cliente. Multi-tenant: backend segura a global; cliente, no máximo, o token da
instância.

## 16. 🟠 O webhook não tem assinatura HMAC

Sem `X-Signature`. As defesas são o `headers` configurável e o campo `apikey` no corpo — que **viaja
no payload e vaza em log**. Use `headers` + HTTPS (+ allowlist de IP). Trate `data` como entrada
hostil: é conteúdo que qualquer pessoa pode enviar ao seu número.

## 17. 🟠 `SERVER_URL` não é a porta

`SERVER_PORT` define onde escuta; `SERVER_URL` é a URL que a API anuncia sobre si (vai como
`server_url` no webhook e monta links de mídia). Errada atrás de proxy = webhooks e mídia quebrados.
`[fonte: env.example + código]`

## 18. 🟠 O histórico depende de env — pode não existir

`findMessages` lê o Postgres da própria API. As envs `DATABASE_SAVE_*` controlam o que é gravado.
Com `DATABASE_SAVE_DATA_NEW_MESSAGE=false`, não há histórico. Não assuma persistência.
`[fonte: env.example]`

## 19. 🟡 Baileys não é oficial

`WHATSAPP-BAILEYS` é engenharia reversa do WhatsApp Web. Implicações: risco de ban (principalmente
disparo em massa), quebra quando o WhatsApp muda o protocolo, número precisa de celular pareado, e
a sessão cai sozinha. Trate desconexão como estado normal, não exceção.

## 20. 🟡 Sucesso HTTP ≠ mensagem entregue

2xx = a API aceitou. Entrega/leitura chegam depois via `MESSAGES_UPDATE`. Não reporte "enviado" ao
usuário final com base no código HTTP.

---

## Checklist antes de escrever código novo

1. `GET /` — confirme a versão da instância (esta doc = 2.3.7)
2. Se ≠ 2.3.7, revalide os itens 2, 3, 5 e 9 acima contra o código dessa versão
3. Endpoint novo: confira em [reference/endpoints-v2.md](reference/endpoints-v2.md) e trate a
   spec como aproximada
4. Formato de resposta: **capture um exemplo real**, não confie na spec
5. Divergiu do que está escrito aqui? **Atualize este arquivo** — é a razão dele existir
