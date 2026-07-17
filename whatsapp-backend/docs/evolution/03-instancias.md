# 03 — Instâncias (ciclo de vida)

Uma **instância** = uma conexão com um número de WhatsApp. Tudo mais depende dela existir e estar
conectada.

## Endpoints `[fonte: spec 2.1.1]`

| Método | Path | O que faz |
|---|---|---|
| `POST` | `/instance/create` | Cria a instância |
| `GET` | `/instance/fetchInstances` | Lista instâncias (e tokens, se exposto) |
| `GET` | `/instance/connect/{instance}` | Devolve QR Code / pairing code para conectar |
| `GET` | `/instance/connectionState/{instance}` | Estado da conexão |
| `PUT` | `/instance/restart/{instance}` | Reinicia |
| `POST` | `/instance/setPresence/{instance}` | Define presença (online/offline) |
| `DELETE` | `/instance/logout/{instance}` | Desconecta (despareia), mantém a instância |
| `DELETE` | `/instance/delete/{instance}` | Apaga a instância |

`logout` vs `delete`: `logout` derruba a sessão do WhatsApp mas preserva o registro (dá para
reconectar com novo QR); `delete` remove a instância. `[não verificado — confirmar o que sobrevive a cada um]`

## Criar

`POST /instance/create` — corpo `[fonte: spec 2.1.1]`:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `instanceName` | string | ✅ | Nome/ID da instância. É a chave usada em todos os outros paths |
| `integration` | enum | ✅ | `WHATSAPP-BAILEYS` ou `WHATSAPP-BUSINESS` |
| `token` | string | — | apikey da instância. Vazio = gerada dinamicamente |
| `qrcode` | boolean | — | Já gera o QR Code na criação |
| `number` | string | — | Número do dono, com DDI (ex.: `559999999999`) |
| `rejectCall` | boolean | — | Rejeita chamadas automaticamente |
| `msgCall` | string | — | Mensagem enviada ao rejeitar chamada |

> A spec 2.1.1 lista só `instanceName` + `integration` como obrigatórios. Versões mais novas aceitam
> mais campos (webhook, settings e integrações inline na criação). `[não verificado na 2.3.7 — conferir com a instância]`

```bash
curl -X POST "$BASE/instance/create" \
  -H "apikey: $GLOBAL_KEY" -H "Content-Type: application/json" \
  -d '{
    "instanceName": "vendas",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

## Conectar (QR Code)

`GET /instance/connect/{instance}` — resposta 200 `[fonte: site]`:

```json
{
  "pairingCode": null,
  "code": "2@exemple",
  "base64": "data:image/png;base64,exemple",
  "count": 1
}
```

- `base64` — imagem do QR pronta para renderizar num `<img src>`
- `code` — conteúdo bruto do QR (para gerar você mesmo)
- `pairingCode` — código de pareamento por número, alternativa ao QR `[não verificado — como acionar]`
- `count` — tentativas de QR geradas

**O QR expira e é rotacionado.** A cada rotação sai um evento `QRCODE_UPDATED` no webhook, e
`QRCODE_LIMIT` (padrão `30`) limita quantos são gerados antes de desistir. `[fonte: env.example]`

Numa UI, não trate conectar como request/response: renderize o QR e **escute `QRCODE_UPDATED` +
`CONNECTION_UPDATE`** para atualizar a imagem e detectar sucesso.

## Estado da conexão

`GET /instance/connectionState/{instance}` `[fonte: spec 2.1.1]`

Os estados vêm do Baileys: tipicamente `open` (conectado), `connecting`, `close`.
`[não verificado — confirmar os valores exatos e o formato do envelope da resposta]`

O mesmo estado chega, de forma assíncrona, no evento `CONNECTION_UPDATE`.

## Ciclo de vida real

```
create ──► connect (QR) ──► [scan no celular] ──► open ──► operando
   │                            │                   │
   │                            │ QR expira         │ queda de rede/celular
   │                            ▼                   ▼
   │                       QRCODE_UPDATED      CONNECTION_UPDATE (close)
   │                                                │
   │                                                ├─► reconecta sozinho, ou
   │                                                └─► exige novo QR
   ▼
delete / logout
```

> **Regra de projeto:** um app de automação **precisa** tratar desconexão como estado normal, não como
> exceção. Sessão Baileys cai (celular sem bateria, WhatsApp Web deslogado noutro lugar, rede). O app
> deve persistir o estado por instância, alertar quando cair e ter caminho de re-scan.

## Notas operacionais

- `DEL_INSTANCE=false` (env) — se `false`, instâncias não são apagadas automaticamente. Aceita
  também um número de minutos para limpar instâncias desconectadas. `[fonte: env.example]` `[não verificado — semântica exata do valor numérico]`
- `CONFIG_SESSION_PHONE_CLIENT` / `CONFIG_SESSION_PHONE_NAME` — nome/navegador que aparece na lista
  de dispositivos conectados no celular do usuário. `[fonte: env.example]`
- `CACHE_REDIS_SAVE_INSTANCES=false` — se as instâncias vão pro Redis. `[fonte: env.example]`
