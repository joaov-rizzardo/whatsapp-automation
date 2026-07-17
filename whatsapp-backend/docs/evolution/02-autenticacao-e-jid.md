# 02 — Autenticação, base URL e JID

## Autenticação

Uma única forma: header **`apikey`**. `[fonte: spec 2.1.1 + site]`

```yaml
# components.securitySchemes da spec
ApiKeyAuth:
  type: apiKey
  in: header
  name: apikey
  description: Your authorization key header
```

```bash
curl -H "apikey: SEU_TOKEN" https://sua-instancia.com/instance/fetchInstances
```

Não é `Authorization`, não é `Bearer`, não é `X-Api-Key`. É literalmente `apikey`. `[fonte: spec 2.1.1]`

### Dois níveis de chave

| Nível | Origem | Alcance |
|---|---|---|
| **Global** | env `AUTHENTICATION_API_KEY` | Tudo, inclusive criar/deletar instâncias |
| **Da instância** | campo `token` no `POST /instance/create`, ou gerada automaticamente | Só aquela instância |

`[fonte: env.example + spec 2.1.1]`

O `.env.example` traz uma chave global de exemplo (`429683C4C977415CAAFCCE10F7D57E11`) — **é pública,
está no GitHub**. Trocar isso é o passo zero de qualquer deploy.

`AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true` faz o `GET /instance/fetchInstances` devolver os
tokens das instâncias no corpo da resposta. `[fonte: env.example]`

> **Modelo de segurança:** a chave global é efetivamente root do servidor inteiro. Num app
> multi-tenant, nunca deixe a chave global chegar ao cliente — o backend usa a global, e cada tenant,
> no máximo, o token da própria instância.

## Base URL

A spec define a base URL como uma variável — **não existe URL pública canônica**, é o seu servidor
`[fonte: spec 2.1.1]`:

```json
{ "url": "https://{server-url}", "description": "Your instance domain" }
```

Valores que aparecem na doc `[fonte: site]`:

- `http://localhost:8080` — padrão local (`SERVER_PORT=8080`)
- `https://api.evolution-api.com` — instância de demonstração/cloud
- a sua

⚠️ A env `SERVER_URL` **não** muda a porta em que o servidor escuta: ela é a URL que a API anuncia
sobre si mesma (aparece como `server_url` no payload de webhook e é usada para montar links de
mídia). Se estiver errada atrás de proxy, webhooks e URLs de mídia saem quebrados.
`[fonte: env.example + código do webhook.controller]`

### Health check / versão

`GET /` devolve informação sobre o servidor (sem `{instance}`). É o jeito de descobrir com que versão
você está falando — faça isso antes de confiar nesta documentação. `[fonte: spec 2.1.1]`

## Formato de número (JID)

O WhatsApp endereça tudo por **JID**. A API normaliza o que você manda no campo `number` através da
função `createJid` — a lógica abaixo é lida direto do código `[fonte: código: src/utils/createJid.ts]`:

| Entrada | Vira | Regra |
|---|---|---|
| Já tem `@g.us`, `@s.whatsapp.net`, `@lid` ou `@broadcast` | inalterado | Passa direto |
| Contém `-` **e** tem ≥ 24 caracteres | `<numero>@g.us` | Grupo (formato antigo `<criador>-<timestamp>`) |
| Tem ≥ 18 caracteres | `<numero>@g.us` | Grupo (ID novo) |
| Qualquer outro | `<numero>@s.whatsapp.net` | Contato individual |

Antes disso, a limpeza remove espaços, `+`, `(`, `)`, sufixo `:device` e qualquer coisa após `@`.

Sufixos:

- `@s.whatsapp.net` — contato individual
- `@g.us` — grupo
- `@lid` — identificador anônimo/privado (aparece em cenários mais novos) `[não verificado — comportamento exato]`
- `@broadcast` — listas de transmissão / status

Na prática: **mande só dígitos com DDI** (`5511999998888`) e deixe a API montar o JID.

### ⚠️ Números brasileiros e o nono dígito

O código tem tratamento **específico para o Brasil** que pode reescrever o número que você mandou
`[fonte: código: formatBRNumber em createJid.ts]`:

```
regex: ^(\d{2})(\d{2})\d{1}(\d{8})$     →  DDI(2) + DDD(2) + 1 dígito + 8 dígitos = 13 dígitos
se DDI == 55:
    joker = primeiro dígito do bloco de 8
    ddd   = o DDD
    se joker < 7 OU ddd < 31  →  mantém o número inteiro (13 dígitos, com o 9)
    senão                     →  remove o dígito do meio (fica com 12, sem o 9)
```

Ou seja: para DDD ≥ 31 com número começando em 7–9, a API **remove o nono dígito** antes de enviar.
Isso reflete a bagunça histórica do WhatsApp brasileiro, onde números antigos de DDDs maiores estão
registrados sem o 9.

**Consequência para o seu app:** o número que você envia pode **não** ser o JID que volta nos
webhooks. Nunca case mensagem recebida com contato por comparação literal do que você enviou —
normalize dos dois lados, ou use o `remoteJid` que a própria API devolve como chave. Há também
tratamento especial para México (52) e Argentina (54). `[fonte: código]`

### Descobrir se um número existe

`POST /chat/whatsappNumbers/{instance}` verifica se números têm WhatsApp e devolve o JID real.
`[fonte: spec 2.1.1]`

É a forma correta de resolver "esse número existe e qual o JID canônico dele?" antes de gravar
contato — em vez de adivinhar a normalização.
