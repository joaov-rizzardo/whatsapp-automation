# 06 — Chats, contatos e grupos

Consulta de estado e operações de grupo. Índice completo em
[reference/endpoints-v2.md](reference/endpoints-v2.md). `[fonte: spec 2.1.1]`

## Chat Controller

⚠️ Repare: quase tudo é **`POST`**, inclusive as consultas (`findContacts`, `findMessages`,
`findChats`). Os filtros vão no corpo, não em query string. Não tente `GET /chat/findMessages?...`.

### Consulta

| Método | Path | O que faz |
|---|---|---|
| `POST` | `/chat/whatsappNumbers/{instance}` | **Verifica se números têm WhatsApp** — resolve o JID canônico |
| `POST` | `/chat/findContacts/{instance}` | Busca contatos |
| `POST` | `/chat/findChats/{instance}` | Busca chats |
| `POST` | `/chat/findMessages/{instance}` | **Busca mensagens** (histórico) |
| `POST` | `/chat/findStatusMessage/{instance}` | Busca status |
| `POST` | `/chat/getBase64FromMediaMessage/{instance}` | **Baixa a mídia de uma mensagem** em base64 |
| `POST` | `/chat/fetchProfilePictureUrl/{instance}` | URL da foto de perfil |
| `POST` | `/chat/fetchProfile/{instance}` | Perfil |
| `POST` | `/chat/fetchBusinessProfile/{instance}` | Perfil comercial |

> `findMessages` lê o **banco da própria Evolution API**, não o WhatsApp. O que existe ali depende
> das envs `DATABASE_SAVE_*` (ver [08](08-deploy-e-env.md)). Com `DATABASE_SAVE_DATA_NEW_MESSAGE=false`
> não há histórico para buscar. `[fonte: env.example]` `[não verificado — formato de filtro/paginação]`

### Ações

| Método | Path | O que faz |
|---|---|---|
| `POST` | `/chat/markMessageAsRead/{instance}` | Marca como lida |
| `POST` | `/chat/markChatUnread/{instance}` | Marca como não lida |
| `POST` | `/chat/archiveChat/{instance}` | Arquiva |
| `POST` | `/chat/sendPresence/{instance}` | Envia presença ("digitando...") |
| `POST` | `/chat/updateMessage/{instance}` | Edita mensagem |
| `DELETE` | `/chat/deleteMessageForEveryone/{instance}` | Apaga para todos |
| `POST` | `/message/updateBlockStatus/{instance}` | **Bloqueia/desbloqueia** (repare: prefixo `/message`) |

### Perfil e privacidade

| Método | Path |
|---|---|
| `POST` | `/chat/updateProfileName/{instance}` |
| `POST` | `/chat/updateProfileStatus/{instance}` |
| `POST` | `/chat/updateProfilePicture/{instance}` |
| `DELETE` | `/chat/removeProfilePicture/{instance}` |
| `GET` | `/chat/fetchPrivacySettings/{instance}` |
| `POST` | `/chat/updatePrivacySettings/{instance}` |

## Group Controller

| Método | Path | O que faz |
|---|---|---|
| `POST` | `/group/create/{instance}` | Cria grupo |
| `GET` | `/group/fetchAllGroups/{instance}` | Lista todos os grupos |
| `GET` | `/group/findGroupInfos/{instance}` | Info por JID |
| `GET` | `/group/participants/{instance}` | Lista participantes |
| `POST` | `/group/updateParticipant/{instance}` | **Adiciona/remove/promove/rebaixa** |
| `POST` | `/group/updateGroupSubject/{instance}` | Muda o nome |
| `POST` | `/group/updateGroupDescription/{instance}` | Muda a descrição |
| `POST` | `/group/updateGroupPicture/{instance}` | Muda a foto |
| `POST` | `/group/updateSetting/{instance}` | Config (quem pode mandar msg, etc.) |
| `POST` | `/group/toggleEphemeral/{instance}` | Mensagens temporárias |
| `GET` | `/group/inviteCode/{instance}` | Pega o código de convite |
| `POST` | `/group/revokeInviteCode/{instance}` | Revoga o convite |
| `GET` | `/group/acceptInviteCode/{instance}` | Entra via convite |
| `GET` | `/group/inviteInfo/{instance}` | Info a partir do convite |
| `POST` | `/group/sendInvite/{instance}` | Envia convite |
| `DELETE` | `/group/leaveGroup/{instance}` | Sai do grupo |

Notas:

- Grupos usam JID `@g.us` — ver [02](02-autenticacao-e-jid.md).
- `updateParticipant` cobre add/remove/promote/demote via um campo de ação. `[não verificado — valores exatos do enum]`
- Adicionar gente em grupo sem consentimento é caminho rápido para denúncia e ban. Prefira link de convite.

## Configurações da instância

| Método | Path |
|---|---|
| `POST` | `/settings/set/{instance}` |
| `GET` | `/settings/find/{instance}` |

Cobre coisas como rejeitar chamadas, ignorar grupos, sempre online, ler mensagens automaticamente.
`[não verificado — campos exatos; conferir na spec ou na instância]`

⚠️ Na spec 2.1.1, `GET /settings/find/{instance}` está classificado dentro do "Webhook Controller" e
descrito como "Find Webhook" — erro de tagging da spec, não do comportamento. `[fonte: spec 2.1.1]`

## Catálogo (WhatsApp Business)

A doc menciona operações de catálogo/produtos para contas Business. Não aparecem na spec 2.1.1.
`[fonte: site]` `[não verificado]`
