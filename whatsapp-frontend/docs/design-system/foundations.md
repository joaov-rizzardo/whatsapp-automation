# Fundamentos visuais

A estética do ZapBot é **macOS**: superfícies claras e levemente frias, cantos arredondados, sombras difusas, movimento curto. Um único acento de marca.

## Cor

Um acento só: **roxo** (`--purple-500`, `oklch(0.55 0.24 300)`). **No máximo uma cor de destaque por tela.**

Os estados semânticos (sucesso, aviso, erro, info) usam hues distintos com a mesma luminosidade e chroma do roxo — é isso que faz a paleta parecer um sistema, e não cores avulsas.

O fundo da página é `--neutral-25`, um branco sutilmente frio — **nunca branco puro em áreas grandes**. Cards são branco puro (`--neutral-0`) por cima. Esse contraste discreto entre página e card é o que dá a leitura macOS; se a página fosse branca, os cards sumiriam.

- Sem gradientes decorativos, sem texturas, sem ilustrações genéricas de IA.
- Gradiente existe num lugar só: o brilho vertical sutil dentro de botões primários, imitando controles do macOS. Nunca como fundo de página.

## Tipografia

- **Manrope** — display, títulos, números grandes. Utility: `font-heading`.
- **Inter** — corpo, formulários, UI. É o default do `body`, via `font-sans`.

Ambas geométricas e muito legíveis, com personalidade discreta. Hierarquia vem de **peso** (semibold/bold), nunca de itálico.

A escala base é **15px**, não os 16px padrão do Tailwind — `text-base` já está redefinido para 15px, então use as utilities normalmente (`text-sm`, `text-lg`…) e a escala do ZapBot sai de graça.

## Espaçamento

Escala de 4px — que coincide com a do Tailwind, então `p-4` = 16px = `--space-4`. Não há conversão a fazer.

O ponto não é a escala, é a **generosidade**: respiros de 24–32px entre blocos, cards nunca apertados (padding mínimo 16px, ideal 24px). O `Card` já vem com 24px por padrão.

## Cantos

Sempre arredondados. **Nunca canto reto.**

| Utility | Valor | Uso |
| --- | --- | --- |
| `rounded-sm` | 8px | controles pequenos |
| `rounded-md` | 12px | botões, inputs |
| `rounded-lg` | 16px | cards |
| `rounded-xl` | 20px | janelas, modais |
| `rounded-2xl` | 28px | janelas grandes |
| `rounded-full` | 999px | tags, badges, switches, tabs |

## Sombras

Suaves, difusas, de tom **frio** — nunca preto puro. Inspiradas na elevação de janelas do macOS. Sem neumorphism, sem sombras duras.

A escala do Tailwind (`shadow-xs`/`sm`/`md`/`lg`) já foi substituída pelos valores do ZapBot.

## Bordas

1px, sutis (`--border-subtle` / `--border-default`). Servem para separar superfícies claras entre si onde a sombra não basta.

Nunca use borda como único acento decorativo de um card — nada de "borda colorida à esquerda".

## Movimento

Transições curtas e suaves: 120–200ms com `ease-standard`. Sem bounce exagerado, sem fade longo.

- `duration-fast` (120ms), `duration-base` (200ms), `duration-slow` (320ms)
- `ease-standard` para tudo; `ease-spring` só no thumb do Switch, para um toque "vivo" sem exagero.

## Estados de interação

| Estado | Comportamento |
| --- | --- |
| Hover (botão) | `brightness(1.06)` e/ou elevação de 1px |
| Hover (item de lista) | fundo sutilmente mais escuro |
| Press / active | `scale(0.97)` — feedback tátil rápido |
| Foco | anel roxo de 4px a ~20% de opacidade |
| Disabled | opacidade 0.45 |
| Cursor | `pointer` em tudo que é clicável |

### Cursor

O Tailwind v4 mudou o cursor padrão de botão de `pointer` para `default`. O `globals.css` restaura isso no `@layer base` com a receita oficial do shadcn:

```css
button:not(:disabled),
[role="button"]:not(:disabled) { cursor: pointer; }
```

Casar por **tag** `button` cobre mais do que parece: Checkbox, Radio, Switch, Tab e SelectTrigger são todos `<button>` por baixo do Radix, cada um com seu próprio `role`. A regra pega todos.

**A pegadinha**: utilities do Tailwind vencem o `@layer base`, e alguns componentes do shadcn trazem `cursor-default` explícito em itens clicáveis — imitando menus nativos do macOS. O `SelectItem` era um desses e foi corrigido para `cursor-pointer`. **Ao instalar `dropdown-menu`, `context-menu`, `command` ou `menubar`, confira os itens**: se vierem com `cursor-default`, a regra base não vai salvar você, e o item precisa ser corrigido no componente.

Elementos desabilitados ficam com o cursor padrão, não `not-allowed`: os componentes do shadcn usam `disabled:pointer-events-none`, que impede o hover de chegar ao elemento. Os specimens originais do design system pediam `not-allowed`, mas isso é incompatível com a convenção do shadcn — e `pointer-events-none` também é o que permite tooltip em botão desabilitado funcionar via wrapper.

## Superfícies e transparência

O overlay de modais é preto translúcido a 40% (`--surface-overlay`), **sem blur** — o design system opta por simplicidade e legibilidade em vez do efeito.

Cards: fundo branco puro, raio 16px, borda 1px sutil, `shadow-sm`. Sem headers coloridos.

## Iconografia

**Lucide**, via `lucide-react`. Traço fino (stroke, nunca fill), consistente com a estética neutra do sistema.

Componentes recebem ícones como `ReactNode` — são agnósticos à biblioteca, mas Lucide é o padrão. **Não use emoji como ícone de produto.**

## Motivo de marca: janela macOS

O chrome de janela estilo macOS (barra de título com três pontos coloridos, título centralizado) é o motivo de marca do sistema. Aparece nos specimens e pode ser reaproveitado como moldura de screenshots do produto.
