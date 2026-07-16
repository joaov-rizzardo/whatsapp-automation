# Design System — ZapBot

Design system do **ZapBot** (nome provisório), o SaaS de automação de WhatsApp: fluxos de mensagem, CRM de contatos e campanhas em massa.

**Fonte**: projeto Claude Design `Design system WhatsApp automação`
(`4ca4752d-7654-4b30-a7e3-53979a1a69c9`). Esta pasta é a cópia de trabalho, portada em 15/07/2026. O design system original foi criado do zero — não existe Figma, marca ou codebase anterior por trás dele.

## Índice

| Documento | Conteúdo |
| --- | --- |
| [foundations.md](./foundations.md) | Cor, tipografia, espaçamento, raios, sombras, movimento |
| [content.md](./content.md) | Idioma, tom, voz, CTAs, números — como escrever a UI |
| [tokens.md](./tokens.md) | Referência dos tokens e das utilities do Tailwind |
| [components.md](./components.md) | Inventário e o mapeamento ZapBot → shadcn/ui |

## Como isto vive no código

O design system **não** é uma pasta de componentes copiados. Ele está implementado assim:

- **`app/globals.css`** — todos os tokens. As primitivas do ZapBot (`--purple-500`, `--neutral-*`, `--success`…) são a fonte da verdade, e os tokens semânticos do shadcn (`--primary`, `--background`, `--ring`…) apontam para elas. Mexer na marca = mexer nas primitivas; os componentes seguem junto.
- **`components/ui/`** — componentes shadcn/ui (base Radix) já ajustados aos tokens.
- **`app/design-system/page.tsx`** — página de verificação visual. Rode `npm run dev` e abra `/design-system` para conferir o sistema inteiro numa tela.

**A regra de ouro**: use o componente do shadcn/ui quando ele existir. Só escreva um componente próprio quando o shadcn não tiver equivalente (hoje: só o `Tag`). Detalhes em [components.md](./components.md).

## O que mudou em relação ao design system original

Os specimens originais são React puro com estilos inline — bons para prototipar, inadequados para produção. Ao portar:

- Os estilos inline viraram utilities do Tailwind sobre os tokens.
- As props de variante seguem a convenção do shadcn (`variant`), não a original (`tone`).
- As fontes vêm de `next/font/google`, não do `@import` de CDN do Google Fonts.
- Os ícones vêm de `lucide-react`, não do CDN da Lucide.

O mapeamento completo, item a item, está em [components.md](./components.md).

## Limites conhecidos

- **Tema escuro não faz parte do design system.** O ZapBot é explicitamente light-first. O bloco `.dark` no `globals.css` existe só para os componentes shadcn não quebrarem sob `.dark` — é uma inversão coerente dos neutros, não uma paleta desenhada. Especifique o dark no design system antes de usá-lo em produção.
- **Cores de gráfico** (`--chart-1..5`) foram derivadas da marca e dos hues semânticos. O design system não as especifica.
- **Dimensões do Switch** seguem o padrão do shadcn; o design system só especifica o comportamento do thumb (mola), não o tamanho.
