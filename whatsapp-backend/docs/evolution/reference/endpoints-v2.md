# Índice de endpoints — Evolution API v2

> **Gerado automaticamente** a partir de `reference/openapi-v2.1.1.json` (OpenAPI 3.0.3, `info.version: 2.1.1`).
> A spec está **defasada** em relação à release estável 2.3.7 — veja [07-armadilhas.md](../07-armadilhas.md).
> Todos os paths abaixo são relativos à base URL. Todos exigem o header `apikey`.

Nos paths, `{instance}` é o nome da instância. Alguns endpoints da spec usam a sintaxe Express `:id`
misturada com `{instance}` (ex.: `/typebot/fetch/:typebotId/{instance}`) — isso é fielmente reproduzido aqui.

**Total: 134 operações em 20 grupos.**

## Sumário

- [Instance Controller](#instance-controller) — 8 operações
- [Webhook Controller](#webhook-controller) — 3 operações
- [Settings Controller](#settings-controller) — 1 operações
- [Message Controller](#message-controller) — 11 operações
- [Chat Controller](#chat-controller) — 22 operações
- [Group Controller](#group-controller) — 17 operações
- [Update group picture](#update-group-picture) — 1 operações
- [Typebot Controller](#typebot-controller) — 11 operações
- [Chatwoot Controller](#chatwoot-controller) — 2 operações
- [SQS Controller](#sqs-controller) — 2 operações
- [RabbitMQ Controller](#rabbitmq-controller) — 2 operações
- [Websocket Controller](#websocket-controller) — 2 operações
- [OpenIA Controller](#openia-controller) — 9 operações
- [OpenAI Controller](#openai-controller) — 7 operações
- [Dify Controller](#dify-controller) — 10 operações
- [n8n Controller](#n8n-controller) — 8 operações
- [EvoAI Controller](#evoai-controller) — 8 operações
- [Flowise Controller](#flowise-controller) — 4 operações
- [Evolution Bot Controller](#evolution-bot-controller) — 5 operações
- [(sem tag)](#sem-tag) — 1 operações


## Instance Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/instance/create` | Create Instance |
| `GET` | `/instance/fetchInstances` | Fetch Instances |
| `GET` | `/instance/connect/{instance}` | Instances Connect |
| `PUT` | `/instance/restart/{instance}` | Restart Instance |
| `GET` | `/instance/connectionState/{instance}` | Connection State |
| `DELETE` | `/instance/logout/{instance}` | Logout Instance |
| `DELETE` | `/instance/delete/{instance}` | Delete Instance |
| `POST` | `/instance/setPresence/{instance}` | Set Presence |

## Webhook Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/webhook/set/{instance}` | Set Webhook |
| `GET` | `/webhook/find/{instance}` | Find Webhook |
| `GET` | `/settings/find/{instance}` | Find Webhook |

## Settings Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/settings/set/{instance}` | Set Settings |

## Message Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/message/sendText/{instance}` | Send Text |
| `POST` | `/message/sendMedia/{instance}` | Send Media |
| `POST` | `/message/sendWhatsAppAudio/{instance}` | Send WhatsApp Audio |
| `POST` | `/message/sendSticker/{instance}` | Send Sticker |
| `POST` | `/message/sendStatus/{instance}` | Send Status |
| `POST` | `/message/sendLocation/{instance}` | Send Location |
| `POST` | `/message/sendContact/{instance}` | Send Contact |
| `POST` | `/message/sendReaction/{instance}` | Send Reaction |
| `POST` | `/message/sendPoll/{instance}` | Send Poll |
| `POST` | `/message/sendList/{instance}` | Send List |
| `POST` | `/message/sendButtons/{instance}` | Send Buttons |

## Chat Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/chat/whatsappNumbers/{instance}` | WhatsApp Numbers |
| `POST` | `/chat/markMessageAsRead/{instance}` | Mark Message As Read |
| `POST` | `/chat/markChatUnread/{instance}` | Mark Message As Unread |
| `POST` | `/chat/archiveChat/{instance}` | Archive Chat |
| `DELETE` | `/chat/deleteMessageForEveryone/{instance}` | Delete Message For Everyone |
| `POST` | `/chat/sendPresence/{instance}` | Send Presence |
| `POST` | `/message/updateBlockStatus/{instance}` | Update block status |
| `POST` | `/chat/fetchProfilePictureUrl/{instance}` | Fetch Profile Picture URL |
| `POST` | `/chat/findContacts/{instance}` | Find Contacts |
| `POST` | `/chat/getBase64FromMediaMessage/{instance}` | Get Base64 From Media Message |
| `POST` | `/chat/findMessages/{instance}` | Find Messages |
| `POST` | `/chat/findStatusMessage/{instance}` | Find Status Message |
| `POST` | `/chat/updateMessage/{instance}` | Update Message |
| `POST` | `/chat/findChats/{instance}` | Find Chats |
| `POST` | `/chat/fetchBusinessProfile/{instance}` | Fetch Business Profile |
| `POST` | `/chat/fetchProfile/{instance}` | Fetch Business Profile |
| `POST` | `/chat/updateProfileName/{instance}` | Update Profile Name |
| `POST` | `/chat/updateProfileStatus/{instance}` | Update Profile Status |
| `POST` | `/chat/updateProfilePicture/{instance}` | Update Profile Picture |
| `DELETE` | `/chat/removeProfilePicture/{instance}` | Remove Profile Picture |
| `GET` | `/chat/fetchPrivacySettings/{instance}` | Fetch Privacy Settings |
| `POST` | `/chat/updatePrivacySettings/{instance}` | Update Privacy Settings |

## Group Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/group/create/{instance}` | Create Group |
| `POST` | `/group/updateGroupSubject/{instance}` | Update Group Subject |
| `POST` | `/group/updateGroupDescription/{instance}` | Update Group Description |
| `GET` | `/group/inviteCode/{instance}` | Fetch Group Invite Code |
| `GET` | `/group/acceptInviteCode/{instance}` | Fetch Group Invite Code |
| `POST` | `/group/revokeInviteCode/{instance}` | Fetch Group Invite Code |
| `POST` | `/group/sendInvite/{instance}` | Send Group Invite |
| `GET` | `/group/inviteInfo/{instance}` | Find Group By Invite Code |
| `GET` | `/group/findGroupInfos/{instance}` | Find Group By Remote JID |
| `GET` | `/group/fetchAllGroups/{instance}` | Fetch All Groups |
| `GET` | `/group/participants/{instance}` | Fetch All Group Members |
| `POST` | `/group/updateParticipant/{instance}` | Update Group Members |
| `POST` | `/group/updateSetting/{instance}` | Update Group Settings |
| `POST` | `/group/toggleEphemeral/{instance}` | Toggle Ephemeral Group Messages |
| `DELETE` | `/group/leaveGroup/{instance}` | Leave Group |
| `DELETE` | `/flowise/delete/:flowiseId/{instance}` | Delete Bot Flowise |
| `DELETE` | `/evolutionBot/delete/:evolutionBotId/{instance}` | Delete Bot Evolution |

## Update group picture

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/group/updateGroupPicture/{instance}` | Update group picture |

## Typebot Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/typebot/create/{instance}` | Create Typebot |
| `POST` | `/typebot/start/{instance}` | Start Typebot |
| `POST` | `/typebot/changeStatus/{instance}` | Change Session Status |
| `POST` | `/typebot/settings/{instance}` | Change Session Status |
| `GET` | `/typebot/fetchSettings/{instance}` | Find Typebot |
| `GET` | `/typebot/find/{instance}` | Find Typebot |
| `GET` | `/typebot/fetch/:typebotId/{instance}` | Find Typebot |
| `GET` | `/typebot/fetchSessions/:typebotId/{instance}` | Find session typebot |
| `POST` | `/typebot/update/:typebotId/{instance}` | Change Typebot Status |
| `DELETE` | `/typebot/delete/:typebotId/{instance}` | Delete Status |
| `POST` | `/evolutionBot/changeStatus/{instance}` | Change Session Status |

## Chatwoot Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/chatwoot/set/{instance}` | Set Chatwoot |
| `GET` | `/chatwoot/find/{instance}` | Find Chatwoot |

## SQS Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/sqs/set/{instance}` | Set SQS |
| `GET` | `/sqs/find/{instance}` | Find SQS |

## RabbitMQ Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/rabbitmq/set/{instance}` | Set RabbitMQ |
| `GET` | `/rabbitmq/find/{instance}` | Find RabbitMQ |

## Websocket Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/websocket/set/{instance}` | Set Websocket |
| `GET` | `/websocket/find/{instance}` | Find Websocket |

## OpenIA Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/openai/create/{instance}` | Create OpenAI |
| `GET` | `/openai/find/{instance}` | Find OpenAI Bots |
| `GET` | `/openai/find/:openaiBotId/{instance}` | Find OpenAI Bot |
| `DELETE` | `/openai/delete/:openaiBotId/{instance}` | Delete OpenAI Bot |
| `PUT` | `/openai/update/:openaiBotId/{instance}` | Update OpenAI Bot |
| `POST` | `/openai/creds/{instance}` | Creds OpenAI Bot |
| `GET` | `/openai/creds/{instance}` | Find OpenAI Creds |
| `DELETE` | `/openai/creds/:openaiCredsId/{instance}` | Delete OpenAI Creds |
| `GET` | `/openai/fetchSettings/{instance}` | Find OpenAI Settings |

## OpenAI Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/openai/settings/{instance}` | Set OpenAI Bot Settings |
| `POST` | `/openai/changeStatus/{instance}` | Change OpenAI Bot Status |
| `GET` | `/openai/fetchSessions/:openaiBotId/{instance}` | Fetch sessions of the OpenAI bot instance |
| `GET` | `/dify/find/{instance}` | Fetch Bot Dify |
| `GET` | `/dify/find/:difyId/{instance}` | Find Bot Dify |
| `GET` | `/evolutionBot/fetch/:evolutionBotId/{instance}` | Find Bot Evo |
| `GET` | `/evolutionBot/find/{instance}` | Find Bots Evo |

## Dify Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/dify/create/{instance}` | Create a new Dify bot instance |
| `PUT` | `/dify/update/:difyId/{instance}` | Create a new Dify bot instance |
| `POST` | `/dify/settings/{instance}` | Atualiza as configurações do bot Dify |
| `GET` | `/dify/fetchSettings/{instance}` | Find settings dify bot |
| `POST` | `/dify/changeStatus/{instance}` | Altera o status do bot Dify |
| `GET` | `/dify/fetchSessions/:difyId/{instance}` | Recupera as sessões ativas do bot Dify |
| `GET` | `/flowise/find/{instance}` | Recupera as sessões ativas do bot Flowise |
| `GET` | `/flowise/find/:flowiseId/{instance}` | Recupera as sessões ativas do bot Flowise |
| `GET` | `/flowise/fetchSessions/:flowiseId/{instance}` | Recupera as sessões ativas do bot Flowise |
| `GET` | `/flowise/fetchSettings/{instance}` | Recupera os configurações do bot flowise |

## n8n Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/n8n/create/{instance}` | Create a new n8n bot instance |
| `GET` | `/n8n/find/{instance}` | Fetch n8n Bot |
| `GET` | `/n8n/find/:n8nId/{instance}` | Find n8n Bot |
| `PUT` | `/n8n/update/:n8nId/{instance}` | Create a new n8n bot instance |
| `POST` | `/n8n/settings/{instance}` | Atualiza as configurações do bot n8n |
| `GET` | `/n8n/fetchSettings/{instance}` | Find settings n8n bot |
| `POST` | `/n8n/changeStatus/{instance}` | Altera o status do bot n8n |
| `GET` | `/n8n/fetchSessions/:n8nId/{instance}` | Recupera as sessões ativas do bot n8n |

## EvoAI Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/evoai/create/{instance}` | Create a new evoai bot instance |
| `GET` | `/evoai/find/{instance}` | Fetch EvoAI Bot |
| `GET` | `/evoai/find/:evoaiId/{instance}` | Find EvoAI Bot |
| `PUT` | `/evoai/update/:evoaiId/{instance}` | Create a new EvoAI bot instance |
| `POST` | `/evoai/settings/{instance}` | Atualiza as configurações do bot EvoAI |
| `GET` | `/evoai/fetchSettings/{instance}` | Find settings EvoAI bot |
| `POST` | `/evoai/changeStatus/{instance}` | Altera o status do bot EvoAI |
| `GET` | `/evoai/fetchSessions/:evoaiId/{instance}` | Recupera as sessões ativas do bot EvoAI |

## Flowise Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/flowise/create/{instance}` | Cria uma nova instância do Flowise |
| `POST` | `/flowise/update/:flowiseId/{instance}` | Atualiza uma instância do Flowise |
| `POST` | `/flowise/settings/{instance}` | Set as configurações do Flowise |
| `POST` | `/flowise/changeStatus/{instance}` | Atualiza o status de uma instância Flowise |

## Evolution Bot Controller

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/evolutionBot/create/{instance}` | Create Evolution Bot |
| `PUT` | `/evolutionBot/update/:evolutionBotId/{instance}` | Update Evolution Bot |
| `POST` | `/evolutionBot/settings/{instance}` | Create Evolution Bot Settings |
| `GET` | `/evolutionBot/fetchSettings/{instance}` | Find EvoBot |
| `GET` | `/evolutionBot/fetchSessions/:evolutionBotId/{instance}` | Find EvoBot session |

## (sem tag)

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/` | Get information about your EvolutionAPI |
