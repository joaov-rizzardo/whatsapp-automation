# 04 — Enviar mensagens

Todos os endpoints: `POST /message/<tipo>/{instance}`, header `apikey`. `[fonte: spec 2.1.1]`

| Endpoint | Envia |
|---|---|
| `/message/sendText/{instance}` | Texto |
| `/message/sendMedia/{instance}` | Imagem / vídeo / documento |
| `/message/sendWhatsAppAudio/{instance}` | Áudio (nota de voz) |
| `/message/sendSticker/{instance}` | Figurinha |
| `/message/sendLocation/{instance}` | Localização |
| `/message/sendContact/{instance}` | Contato (vCard) |
| `/message/sendReaction/{instance}` | Reação (emoji) a uma mensagem |
| `/message/sendPoll/{instance}` | Enquete |
| `/message/sendList/{instance}` | Lista interativa |
| `/message/sendButtons/{instance}` | Botões |
| `/message/sendStatus/{instance}` | Status ("stories") |

> `sendButtons` e `sendList` dependem de suporte do WhatsApp, que mudou várias vezes e varia entre
> Baileys e Business API. Não assuma que funciona — teste antes de desenhar um fluxo em cima disso.
> `[não verificado]`

## Texto

`POST /message/sendText/{instance}` `[fonte: spec 2.1.1]`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `number` | string | ✅ | Destino com DDI — ver [JID](02-autenticacao-e-jid.md) |
| `text` | string | ✅ | Conteúdo |
| `delay` | integer | — | Milissegundos de "digitando..." antes de enviar |
| `linkPreview` | boolean | — | Preview de link |
| `mentionsEveryOne` | boolean | — | Menciona todos (grupo) |
| `mentioned` | string[] | — | JIDs a mencionar |
| `quoted` | object | — | Responde a uma mensagem: `{ key: { id }, message: { conversation } }` |

```bash
curl -X POST "$BASE/message/sendText/vendas" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{
    "number": "5511999998888",
    "text": "Olá!",
    "delay": 1200
  }'
```

O `delay` simula digitação — útil para automação parecer humana e evitar rate-limit agressivo.

## Mídia

`POST /message/sendMedia/{instance}` `[fonte: spec 2.1.1]`

Obrigatórios na spec: **`number`, `mediatype`, `mimetype`, `caption`, `media`, `fileName`**.

| Campo | Descrição |
|---|---|
| `mediatype` | `image`, `video` ou `document` |
| `mimetype` | Ex.: `image/png` |
| `media` | **URL ou base64** |
| `fileName` | Ex.: `Image.png` |
| `caption` | Legenda |

Aceita também `delay`, `linkPreview`, `mentionsEveryOne`, `mentioned`, `quoted`.

> ⚠️ `caption` está marcado como **obrigatório** na spec 2.1.1 mesmo sendo semanticamente opcional.
> Se der 400 sem legenda, mande `""`. `[fonte: spec 2.1.1]` `[não verificado se ainda é assim na 2.3.7]`

`media` por **URL** é preferível a base64 para arquivos grandes: base64 infla ~33% e o payload
inteiro vai pela sua rede e pela memória do servidor.

## Resposta

⚠️ A spec 2.1.1 **não documenta o corpo de resposta** dos endpoints de envio (o objeto de `responses`
vem vazio). `[fonte: spec 2.1.1]`

Na prática o retorno traz a chave da mensagem (`key.id`, `key.remoteJid`) e status — mas o **formato
exato precisa ser confirmado contra uma instância real**. `[não verificado]`

Isso importa: para correlacionar um envio com o `SEND_MESSAGE`/`MESSAGES_UPDATE` que volta no webhook,
você precisa do `key.id`. **Registre uma resposta real de `sendText` antes de desenhar essa correlação.**

## Ordem, entrega e idempotência

Pontos que a doc não cobre e que definem a qualidade de um app de automação:

- **Não há idempotency key.** Reenviar o mesmo POST manda a mensagem de novo. Se sua fila tem retry,
  a deduplicação é responsabilidade sua.
- **Sucesso HTTP ≠ entregue.** 2xx significa que a API aceitou; a entrega real chega depois como
  evento (`MESSAGES_UPDATE` com status). Confirmação de leitura idem.
- **Rate limit é do WhatsApp, não da API.** Enviar em massa por Baileys é caminho conhecido de ban.
  `delay`, espaçamento e volume são decisão de produto. `[não verificado — não há limites documentados na API]`

## Referência completa

Todos os campos de todos os endpoints estão na spec:
[reference/openapi-v2.1.1.json](reference/openapi-v2.1.1.json) — busque por `/message/send`.
Índice legível em [reference/endpoints-v2.md](reference/endpoints-v2.md).
