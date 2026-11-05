# SGOA — Design System Master File (Light Clay)

> **LOGIC:** When building a specific page, first check `design-system/sgoa/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **Source of truth em código:** `dev/frontend/design/tokens.json` → regenerar com
> `node .opencode/skills/design-system/scripts/generate-tokens.cjs --config design/tokens.json -o dev/frontend/src/assets/css/tokens.css --cwd dev/frontend`.
> Este documento é a especificação legível; os tokens gerados são a implementação.

---

**Project:** SGOA — Sistema de Gerenciamento de Orientações Acadêmicas
**Estilo:** Claymorphism (light, contido — "clay institucional")
**Fonte de inspiração:** demo *educational-platform* (referência do cliente)
**Stack:** Vue 3 + Vite (SPA MVC), CSS puro tokenizado
**Dials:** Variance 4/10 | Motion 4/10 | Density 6/10
**Última atualização:** 2026-11-02 (Wave 0 implemented)

---

## 1. Global Rules

### 1.1 Cor — Light Clay (contrastes verificados AA)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background (cream) | `#FFF8EE` | `--color-bg` |
| Surface muted (canvas) | `#F4F1FA` | `--color-surface-muted` |
| Card | `#FFFFFF` | `--color-card` |
| Text (ink) | `#1B1B2F` | `--color-text` (16.0 : 1 no cream) |
| Text muted | `#5B6270` | `--color-text-muted` (5.8 : 1) |
| Primary | `#4F46E5` | `--color-primary` (6.3 : 1 branco) |
| Primary strong | `#4338CA` | `--color-primary-strong` |
| Primary soft (fundo) | `#EEF2FF` | `--color-primary-soft` |
| CTA | `#C2410C` | `--color-cta` (5.2 : 1 branco) |
| Brand accent (marca) | `#EA580C` | `--color-brand` (uso decorativo/tiles apenas) |
| Border (todos os bordões 2–3px) | `#1B1B2F` | `--color-border` |
| Divider/softline | `#CDC5B8` | `--color-border-soft` |
| Ring/foco | `#4F46E5` | `--color-ring` |
| Destructive | `#B91C1C` | `--color-destructive` (6.5 : 1 branco) |
| Success (mint) | `#A7E8C3` | `--color-success` |

**Tiles pastel** (ícones KPI, avatares, decorativos — sempre com ink em cima):
`--color-accent-sky #BFDBFE` · `--color-accent-amber #FDE68A` · `--color-accent-lilac #C4B5FD` · `--color-accent-mint #A7E8C3` · `--color-neutral-tint #E7E5E4`

**Anti-padrões de cor (proibido):**
- ❌ `#EA580C` como fundo com texto branco (3.56 : 1 — falha AA normal-text). Para CTA use `#C2410C`.
- ❌ Cor como único indicador de estado/status.
- ❌ Hex direto em qualquer CSS que não seja `tokens.css`.
- ❌ Dark mode nativo do demo (claymorphism light-first; dark é *conditional* e foi descartado pelo cliente).

### 1.2 Status (cor + ícone + rótulo — nunca só cor)

| Status | Token | Ícone |
|---|---|---|
| Em Andamento | `--color-status-andamento` (sky) | `circle-notch` |
| Pendente | `--color-status-pendente` (amber) | `clock` |
| Concluída | `--color-status-concluida` (mint) | `check` |
| Atrasada | `--color-status-atrasada` (red-700) | `warning` |
| Suspensa | `--color-status-suspensa` (lilac) | `pause` |
| Cancelada | `--color-status-cancelada` (neutral) | `x` |

Status fora do mapa conhecido → pílula neutra + ícone `tag`.

### 1.3 Tipografia

| Uso | Fonte | Peso | Token |
|---|---|---|---|
| Headings, botões, pílulas, números KPI | **Space Grotesk** | 600–700 | `--font-display` |
| Corpo, formulários, tabelas | **DM Sans** | 400–500 (700 para ênfase) | `--font-body` |

Escala: `--size-2xs .72rem` · `xs .78` · `sm .85` · `base .95` (corpo) · `md 1` · `lg 1.15` (h2) · `xl 1.45` (h1 mobile) · `2xl 1.85` (h1) · `hero 2.3` (login).

Carregamento: `<link>` no `index.html` com `preconnect` + `display=swap` (nunca `@import url(...)` — render blocking).

### 1.4 Espaçamento / Radios / Sombra

- Ritmo 4/8: `--spacing-1..7` = 8/12/16/24/32/48/64px. Tiers de seção 16/24/32/48.
- Radii: `--radius-sm 14px` (inputs, alertas, chat) · `--radius-md 20px` (cards, nav) · `--radius-lg 26px` · `--radius-pill` (botões, pílulas, abas, links de nav).
- Assinatura clay: `border: 2–3px solid var(--color-border)`, **double shadow** `inset -2px -2px 6-8px rgba(ink,.04-.06), 3-6px 3-6px 10-16px rgba(ink,.10-.14)`.
- Botões: offset shadow dura `0 4px 0 ink` → no press `translateY(3px)` + `0 1px 0`.
- Touch target mínimo: 44px (`--touch-min-target`).

### 1.5 Movimento

| Início → meio | Redução |
|---|---|
| Foco/hover | `180ms ease-out` |
| Press (squish) | `200ms cubic-bezier(.34,1.56,.64,1)` |
| Entrada (menu, painel) | `220ms` clay |
| Saída | `150ms` (exit faster than enter) |
| Spinner | `0.9s ease-in-out` |

Bounce/clay-easing apenas onde agrega (botões, menu mobile, KPIs). **Regra:** transições sem transform de layout; press por `translateY` + sombra.

**`@media (prefers-reduced-motion: reduce)`:** obrigatório — anula animações/transições (ver `base.css`).

### 1. Ícones

- Biblioteca: **`@phosphor-icons/vue`**, componente `Icon.vue` (mapa nomeado, tree-shaken; ampliar aditivamente por onda).
- Escalas fixas: 14 | 16 | 20 | 24. Peso `bold` como padrão a partir de 16px; nunca misturar pesos no mesmo nível.
- Sempre `aria-hidden` (decorativos); a informação vai no rótulo. Emoji como ícone é proibido.
- Peso visual: botões/CTA `bold`; pílulas de status `bold` 14px.

---

## 2. Regras de Componente (fase global)

| Componente | Assinatura clay |
|---|---|
| `.cartao` | bg card, border-3 ink, radius-md 20, shadow flat, padding 16/24 |
| `.botao` | pill, border 2.5px ink, offset shadow `0 4px 0`; `primario` bg CTA; hover: mint-primary-soft (secundário) ou cta-hover (primário); press `translateY(3px)` |
| `.campo` | bg card, border-2 soft → 2px ink no foco + ring primário rgba indigo .25; radius-sm |
| `.pilula` | bg tingida por status, border-2 ink, ícone 14px + rótulo |
| `.alerta` | flex com ícone 20px; erro = red-100/red-800; sucesso = mint; dica = canvas |
| `.tabela` | th com bg canvas + upper-case; hairline `border-soft`; hover indigo .06 |
| `.abas` | pílulas com border soft → border ink + shadow flat na ativa |
| `.mensagem-balao` | clay bubble, border-2.5; "minha" = sky |
| `.navbar` | **floating clay card** (sticky top 12px), bg card, border-3, nav items pill; ativo = primary-soft + border primary. **Teto de largura**: `calc(--content-max-width + 2×--spacing-6)`, centralizado — alinha com o conteúdo em vez de esticar até a tela |
| `.conteudo` | coluna central limitada pelo mesmo teto. `--content-max-width` = soma dos componentes da linha mais larga do dashboard: 2 cartões de 480 + 1 gap de 16 = **976** (+ padding 2×48). Login fica fora do teto (split hero + caixa) |
| `.pilula-flutuante` | pílula CTA **fixa à esquerda** (centro vertical; canto inferior em ≤767 px), ícone 24 + rótulo — o ícone nunca é o único portador de informação. Dimensões de token, sem px cru fora de `@media` |
| `.linha-tempo` | diamantes primário com border ink |
| `.medidores` | bullet bar clay: trilha 16px border-2 ink + fill do token de status; **valor numérico sempre ao lado** (cor nunca é o único portador); trilha com `role="meter"` + `aria-valuenow/max`. Largura do fill vem de `:style` dinâmico (percentual de dados) — única exceção aceita a style inline |
| `.pagina-login` | split: hero com trama weave decorativa + `caixa-login` clay |

---

## 3. Pre-Delivery Checklist (por onda) — resultado da Wave 6

- [x] Nenhum hex fora de `tokens.css` (verificado: zero ocorrências em `src/`).
      Exceções aceitas e registradas: constantes de layout não-tokens — breakpoints
      (767/1023px), container `max-width: 1280px`, paddings de nav/célula (10/12/16px),
      micro-radios de detalhes (3/4/6px), larguras de hero/caixa (520/480/380/560px) e
      `:style` dinâmico de percentual nos medidores. Dimensões de componente foram
      promovidas a tokens (`spinner.size`, `meter.height`, `checkbox.*`, `clear.size`,
      `avatar.size`, `scroll.*`, `input.width-inline`, `navbar.height`).
- [x] Contraste ≥ 4.5:1 de texto — ink no cream 16.0, muted 5.81, CTA branco 5.2,
      destructive branco 6.47; tiles: ink 9.1–13.8.
- [x] Foco visível em todos os controles (`:focus-visible`, ring indigo).
- [x] `prefers-reduced-motion` respeitado (base.css, duas coberturas).
- [~] Touch targets ≥ 44px em controles primários. Exceções documentadas (controles
      secundários de listas densas): `.botao-mini` 32px, `.limpar-data` 32px,
      checkbox 20px/18px, `.caixa-check` 22px, pílula 26px.
- [x] Ícones Phosphor; nenhum emoji estrutural (verificado em `src/`).
- [ ] Testado visualmente em 375 / 768 / 1024 / 1440 px — cobertura de breakpoints
      verificada estaticamente (767, 1023, container 1280); falta o teste visual em
      navegador, que não há ambiente headless aqui.
- [x] States disabled/loading/empty estilizados (`:disabled`, `.spinner`, `.linha-vazia`).

Pendência de ambiente: verificação visual por navegador (browser-qa) quando houver
Playwright/chromium disponível — o checklist acima é a lista a confirmar visualmente.

---

## 4. Migrações em curso (.Tags por onda)

- **Wave 0 (done):** tokens 3 camadas, base/componentes clay, ícones, StatusPill/AlertMessage com ícone, aliases legados `--spark/--offline/...` (deprecated, remover na wave 6).
- **Wave 1 (done):** shell — nav clay, ícones Phosphor no menu/sair, aria-states.
- **Wave 2 (done):** auth — hero com chips, caixa demo, passos em pílulas, OTP tipografado.
- **Wave 3 (done):** núcleo — dashboard, listas, detalhe (736 linhas), notificações; zero style inline, zero emoji.
- **Wave 4 (done):** forms/admin — radios, tabela de usuários, categorias, parâmetros de prazo, CampoData.
- **Wave 5 (done):** métricas — medidores bullet no dashboard do Coordenador (composição por status/tipo e carga por professor) com valor textual + `role="meter"`; sem biblioteca de gráficos.
- **Wave 6 (done):** QA — aliases legados removidos de `main.css` (nenhum uso restava);
  `--nav-h` promovido a token (`component.navbar.height`); correção de bug de nomes:
  `base.css`/`components.css` usavam `--dur-*`/`--ease-*` enquanto o gerador emite
  `--duration-*`/`--easing-*` (transições ficavam inválidas); dimensões de componente
  promovidas a tokens; `--neutral-tint` → `--color-neutral-tint`; tabelas com
  `.cartao-tabela` (scroll em telas estreitas); `.pilula` ganhou `min-height` do token.
