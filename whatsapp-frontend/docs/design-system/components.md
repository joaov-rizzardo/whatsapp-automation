# Componentes

## A regra

**Se o shadcn/ui tem o componente, use o do shadcn.** Instale com `npx shadcn@latest add <nome>` e ajuste aos tokens se precisar.

Só escreva um componente próprio quando o shadcn **não** tiver equivalente. Hoje isso vale para exatamente um: o `Tag`.

O motivo é manutenção, não preguiça: um componente shadcn é acessível por padrão (Radix por baixo), já entende os tokens, e recebe correções upstream. Um componente escrito à mão é acessibilidade que alguém vai ter que reimplementar — e esquecer.

## Como os componentes foram adaptados

Os componentes do shadcn foram ajustados no lugar, dentro de `components/ui/`. Dois princípios guiaram isso:

**Nomes do shadcn, estilo do ZapBot.** As variantes mantêm os nomes do shadcn (`default`, `secondary`, `ghost`, `destructive`), não os do design system original (`primary`, `danger`). Isso é deliberado: blocos do shadcn e componentes como `AlertDialog` consomem `buttonVariants` por esses nomes. Renomear quebraria tudo que vem de fora.

**Tokens, não valores.** Nenhum valor cru entrou nos componentes. O gradiente do botão primário referencia `var(--purple-500)`, não um hex.

## Inventário

| ZapBot | shadcn | Arquivo | Observação |
| --- | --- | --- | --- |
| Button | `button` | `components/ui/button.tsx` | variantes e tamanhos reescritos |
| IconButton | `button` | — | é `<Button size="icon">`, não um componente separado |
| Input | `input` | `components/ui/input.tsx` | altura 40px, raio 12px, foco roxo |
| Select | `select` | `components/ui/select.tsx` | herda os tokens |
| Checkbox | `checkbox` | `components/ui/checkbox.tsx` | herda os tokens |
| Radio | `radio-group` | `components/ui/radio-group.tsx` | herda os tokens |
| Switch | `switch` | `components/ui/switch.tsx` | thumb com `ease-spring` |
| Card | `card` | `components/ui/card.tsx` | raio 16px, padding 24px, `shadow-sm` |
| Badge | `badge` | `components/ui/badge.tsx` | tons semânticos + prop `dot` |
| Tag | — | `components/ui/tag.tsx` | **próprio** — sem equivalente no shadcn |
| Avatar | `avatar` | `components/ui/avatar.tsx` | herda os tokens |
| Tabs | `tabs` | `components/ui/tabs.tsx` | herda os tokens |
| Dialog | `dialog` | `components/ui/dialog.tsx` | overlay sem blur, padding 24px |
| Toast | `sonner` | `components/ui/sonner.tsx` | `<Toaster />` montado no RootLayout |
| Tooltip | `tooltip` | `components/ui/tooltip.tsx` | `TooltipProvider` no RootLayout |

## Button

```tsx
<Button><Plus />Criar fluxo</Button>          {/* primário */}
<Button variant="secondary">Cancelar</Button>
<Button variant="ghost">Ver detalhes</Button>
<Button variant="destructive">Excluir automação</Button>
<Button size="icon" aria-label="Buscar"><Search /></Button>
<Button fullWidth>Publicar</Button>
```

**No máximo um botão `default` (primário) por tela.**

Tamanhos: `sm` (32px), `default` (40px), `lg` (48px) — mais generosos que o padrão do shadcn, conforme o design system. Os equivalentes de ícone: `icon-sm`, `icon`, `icon-lg`.

## Badge

O design system original usava `tone`; aqui é `variant`, pela convenção do shadcn.

```tsx
<Badge variant="success" dot>Ativo</Badge>
<Badge variant="warning" dot>Pendente</Badge>
<Badge variant="danger">Erro</Badge>
<Badge variant="brand">Novo</Badge>
```

Badge comunica **status** e anda sempre com um tom semântico. A prop `dot` adiciona o ponto colorido.

## Tag

Chip de rótulo removível, para filtros e segmentos de contato. Sem `onRemove`, vira um chip estático.

```tsx
<Tag onRemove={() => removeTag(id)}>Cliente VIP</Tag>
<Tag>Lead frio</Tag>
```

## Avatar

Foto quando existir, iniciais quando não.

```tsx
<Avatar>
  <AvatarImage src={contato.foto} alt="" />
  <AvatarFallback>MS</AvatarFallback>
</Avatar>
```

Nota de origem: o Avatar é uma **adição intencional** do design system — não veio de nenhuma fonte, foi criado porque as telas de Contatos/CRM não funcionam sem ele.

## Verificação visual

`npm run dev` e abra **`/design-system`** (`app/design-system/page.tsx`). É a tela que mostra o sistema inteiro de uma vez.

Ao mexer em token ou componente, confira ali antes de dar por pronto — este projeto não tem testes unitários, a validação é rodar o app.
