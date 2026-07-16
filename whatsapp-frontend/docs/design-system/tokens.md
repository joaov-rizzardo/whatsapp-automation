# Tokens

Todos os tokens vivem em **`app/globals.css`**. Não existe `tailwind.config.js` — o Tailwind v4 é CSS-first.

## A arquitetura em uma frase

```
primitivas ZapBot  →  contrato shadcn  →  utilities do Tailwind
--purple-500          --primary           bg-primary
```

As **primitivas** (`--purple-*`, `--neutral-*`, `--success`…) são a fonte da verdade da marca. Os **tokens semânticos do shadcn** (`--primary`, `--background`, `--ring`…) apontam para elas. Os componentes consomem só as utilities.

Consequência prática: **mudar a marca é mudar a primitiva.** Trocar `--purple-500` repinta todo botão primário, todo foco, todo link, sem tocar em componente nenhum.

## Como consumir

Em ordem de preferência:

1. **Utility semântica do shadcn** — `bg-primary`, `text-muted-foreground`, `border-border`. É o caminho normal.
2. **Utility de marca** — `bg-brand`, `text-success`, `bg-warning-bg`. Quando precisar de um tom semântico que o contrato do shadcn não cobre.
3. **`var(--token)` direto** — só dentro de `components/ui/`, e só quando não há utility (ex.: o gradiente do botão primário).

**Nunca** escreva um valor cru (`#7c3aed`, `16px`) numa tela. Se não existe token para o que você precisa, o token é que está faltando.

## Cor

### Marca

`--purple-50` … `--purple-900`. O acento é o `--purple-500`.

Aliases: `--brand`, `--brand-hover`, `--brand-active`, `--brand-subtle`, `--brand-subtle-border`.
Utilities: `bg-brand`, `bg-brand-subtle`, `border-brand-subtle-border`…

### Neutros

`--neutral-0` … `--neutral-900`. Frios, levemente tonalizados (hue 260).

### Semânticos

Cada um tem o par cor + fundo: `--success` / `--success-bg`, e igual para `--warning`, `--danger`, `--info`.
Utilities: `text-success`, `bg-success-bg`, `text-danger`, `bg-warning-bg`…

### Superfícies

| Token | Aponta para | Uso |
| --- | --- | --- |
| `--surface-page` | `--neutral-25` | fundo da página (nunca branco puro) |
| `--surface-card` | `--neutral-0` | cards, popovers |
| `--surface-sunken` | `--neutral-50` | áreas rebaixadas |
| `--surface-overlay` | neutro a 40% | overlay de modal, sem blur |

### Texto e borda

`--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-brand`, `--text-link`, `--text-link-hover`.
`--border-subtle`, `--border-default`, `--border-strong`.

## O contrato do shadcn

| Token shadcn | Aponta para |
| --- | --- |
| `--background` | `--surface-page` |
| `--foreground` | `--text-primary` |
| `--card` / `--popover` | `--surface-card` |
| `--primary` | `--brand` |
| `--primary-foreground` | `--text-on-brand` |
| `--secondary` / `--muted` | `--surface-sunken` |
| `--muted-foreground` | `--text-secondary` |
| `--accent` | `--neutral-100` |
| `--destructive` | `--danger` |
| `--border` | `--border-subtle` |
| `--input` | `--border-default` |
| `--ring` | `--focus-ring` (`--purple-400`) |
| `--radius` | `16px` |

## Tipografia

`font-sans` → Inter (default do body). `font-heading` → Manrope.

Escala **redefinida para a do ZapBot** — `text-base` é 15px, não 16px:

| Utility | Tamanho |
| --- | --- |
| `text-xs` | 12px |
| `text-sm` | 13px |
| `text-base` | 15px |
| `text-lg` | 17px |
| `text-xl` | 20px |
| `text-2xl` | 24px |
| `text-3xl` | 30px |
| `text-4xl` | 38px |
| `text-5xl` | 48px |

## Espaçamento

A escala de 4px do ZapBot coincide com a do Tailwind — `p-4` = 16px = `--space-4`. Nenhuma redefinição foi necessária, use as utilities normais.

## Raios

`rounded-sm` 8px · `rounded-md` 12px · `rounded-lg` 16px · `rounded-xl` 20px · `rounded-2xl` 28px · `rounded-full` 999px.

## Sombras

A escala padrão do Tailwind foi substituída: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg` já são as sombras frias do ZapBot.

Dois tokens extras não têm utility e se usam via `var()`:

- `--shadow-inset-top` — o brilho interno do topo dos botões primários.
- `--shadow-focus` — anel de foco.

## Movimento

`ease-standard`, `ease-spring` — saem do namespace `--ease-*` do Tailwind.

`duration-fast` (120ms), `duration-base` (200ms), `duration-slow` (320ms) — **estas foram declaradas à mão** com `@utility`, porque o Tailwind v4 não tem namespace `--duration-*`: as utilities `duration-*` nativas só aceitam número. Se você adicionar uma duração nova ao design system, precisa declarar o `@utility` correspondente, senão a classe compila para nada — silenciosamente.
