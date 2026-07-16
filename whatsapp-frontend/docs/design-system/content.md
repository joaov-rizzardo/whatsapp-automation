# Fundamentos de conteúdo

Como escrever a UI do ZapBot. Isto é parte do design system, não preferência de quem está escrevendo a tela.

## Idioma

**Português do Brasil**, direto e objetivo.

## Tom

Profissional, mas caloroso. Você está falando com o **dono do negócio que usa o WhatsApp para vender** — não com um departamento de TI.

Evite jargão técnico excessivo. "Automação", "fluxo" e "disparo" são termos aceitos: o público já convive com eles.

## Voz

Segunda pessoa direta:

> "Seu fluxo está ativo"
> "Você tem 3 automações pausadas"

## CTAs de botão

Verbo no infinitivo ou imperativo curto. Nunca frases longas.

| Bom | Ruim |
| --- | --- |
| Criar fluxo | Clique aqui para criar um novo fluxo |
| Publicar | Publicar automação agora |
| Excluir automação | Tem certeza que deseja excluir? |

## Números

Separador de milhar brasileiro: **1.284**, nunca `1,284` nem `1284`.

Não arredonde sem necessidade — `8.472` envios, não "~8 mil envios".

```ts
new Intl.NumberFormat("pt-BR").format(1284) // "1.284"
```

## Emoji

**Não use em UI de produto**: botões, títulos, status, labels.

A única exceção é copy de exemplo dentro de mensagens de WhatsApp simuladas — ali o emoji é natural, porque é assim que o canal funciona de verdade.
