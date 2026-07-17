# Evolution API — base de conhecimento

Documentação de referência da **Evolution API** (API REST open-source para WhatsApp) montada para dar
contexto preciso ao desenvolvimento deste projeto, sem depender de memória de treinamento do modelo.

Criado em **2026-07-14**.

## Por onde começar

| Arquivo | O que tem | Leia quando |
|---|---|---|
| [01-fundamentos.md](01-fundamentos.md) | O que é, versões, produtos que **não** confundir, arquitetura | Primeira leitura, sempre |
| [02-autenticacao-e-jid.md](02-autenticacao-e-jid.md) | Header `apikey`, base URL, formato de número/JID | Antes da primeira chamada |
| [03-instancias.md](03-instancias.md) | Ciclo de vida: criar, conectar (QR), estado, deletar | Ao subir uma conexão WhatsApp |
| [04-mensagens.md](04-mensagens.md) | Enviar texto, mídia, áudio, botões, listas | Ao enviar qualquer mensagem |
| [05-webhooks.md](05-webhooks.md) | **Eventos, payload recebido, retries** | Ao receber mensagens — núcleo de automação |
| [06-chats-e-grupos.md](06-chats-e-grupos.md) | Consultar chats/contatos/mensagens, grupos | Ao ler estado ou operar grupos |
| [07-armadilhas.md](07-armadilhas.md) | **Divergências entre doc/spec/código e pegadinhas** | **Antes de debugar qualquer 400** |
| [08-deploy-e-env.md](08-deploy-e-env.md) | Docker, Postgres/Redis, variáveis de ambiente | Ao subir/configurar o servidor |

**Referência bruta** (não editar — são artefatos originais):

| Arquivo | Origem |
|---|---|
| [reference/openapi-v2.1.1.json](reference/openapi-v2.1.1.json) | Spec OpenAPI 3.0.3 oficial, `info.version: 2.1.1` |
| [reference/endpoints-v2.md](reference/endpoints-v2.md) | Índice de 134 operações, gerado da spec acima |
| [reference/env.example.v2.3.7](reference/env.example.v2.3.7) | `.env.example` do código-fonte, branch `main` |

## Procedência (importante)

Esta documentação foi montada a partir de **quatro fontes de confiabilidade diferente**. Onde elas
divergem, o código-fonte vence — e as divergências reais estão catalogadas em
[07-armadilhas.md](07-armadilhas.md).

| Fonte | Confiabilidade | Observação |
|---|---|---|
| **Código-fonte** `EvolutionAPI/evolution-api` branch `main` (v2.3.7) | 🟢 Autoritativa | Verdade final. Usada para webhooks, eventos e JID |
| **Spec OpenAPI** do repo `docs-evolution` | 🟡 Boa, mas **defasada** | `info.version: 2.1.1` vs. release estável 2.3.7 |
| **Site** `docs.evolutionfoundation.com.br` | 🟠 Mistura v1 e v2 | Algumas páginas ainda descrevem v1 (snake_case) |
| Memória de treinamento do modelo | 🔴 Não usada | Projeto muda rápido; assumir que está errada |

Cada afirmação não trivial nestes documentos traz a marcação da origem:
`[fonte: código]`, `[fonte: spec 2.1.1]`, `[fonte: site]` ou `[não verificado]`.

**`[não verificado]` significa: confirme contra uma instância real antes de escrever código que dependa disso.**

## Estado de versão (em 2026-07-14)

- **Release estável:** `2.3.7` (publicada 2025-12-05)
- **Pré-release:** `2.4.0-rc2` (2026-05-17)
- **Repositório:** ativo (último push em 2026-07-14) — `github.com/EvolutionAPI/evolution-api` (redireciona para a org `evolution-foundation`)
- **Spec OpenAPI publicada:** `2.1.1` — **atrás do código**

⚠️ Estes documentos são um retrato de 2026-07-14. Antes de um trabalho grande, confirme a versão da
sua instância com `GET /` (ver [03-instancias.md](03-instancias.md)) e, se ela for ≠ 2.3.7,
revalide o que está em [07-armadilhas.md](07-armadilhas.md).

## Links canônicos

- Documentação: https://docs.evolutionfoundation.com.br/evolution-api
- Índice para LLMs: https://docs.evolutionfoundation.com.br/llms.txt
- Código: https://github.com/EvolutionAPI/evolution-api
- Repo da documentação: https://github.com/evolution-foundation/docs-evolution
