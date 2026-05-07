# Screenshot Mapping

No screenshot images were found in the incoming `.locofy` folder (no `.png`, `.jpg`, `.jpeg`, `.webp` files). The only file in `.locofy/` was `screen-737` which is an empty 0-byte marker file.

## Screen → File Mapping

| Screen ID | Screen Description | Source File |
|-----------|-------------------|-------------|
| screen-737 | Dashboard (Desktop) | `src/pages/Desktop.tsx` |

## Screen Description (from source code analysis)

**Desktop (screen-737):** A full dashboard page with:
- **Top navigation bar** (`Component6` / `FrameComponent11`): Logo (Union.svg), side navigation pills (Catálogo, Pedidos, Clientes, Tickets), search bar, notification bell, user avatar.
- **Page title:** "Dashboard" (48px, brand-dark-blue)
- **Filter buttons row** (6 PieChart/ButtonSmall items): "Visão Geral", "Este Mês", "Últimos 30 Dias", "Trimestre", "Por Categoria", "Escolher outros"
- **KPI cards row** (`FrameComponent1`): 5 metric cards showing:
  - Receita total: R$ 4,82M (+12.6% mês passado)
  - Pedidos: 1,45M (+3.4% mês passado)
  - CSTA Promotores: 70% (+12.6% mês passado)
  - Clientes Ativos: 50.859 (+12.6% mês passado)
  - Entregas no Prazo: 87,6% (+12.6% mês passado)
- **Trends chart card** (`TendnciasCards`): "TENDÊNCIAS" / "Média de Receita por Mês" bar chart with monthly axis (Jan–Dez) and value axis (0k–720k)
- **Customer satisfaction card**: "CLIENTE" / "Taxa de Satisfação" / "Evolução de faturamento — clique para detalhar", NPS chart with Detratores 12%, Neutros 18%, Promotores 70%
- **Operations/orders distribution card** (`Container`): "OPERAÇÕES" / "Distribuição de Pedidos" bar chart with statuses: Entregues, Em Processamento, Comprados, Em Trânsito, Enviados; legend: Dentro do prazo / Fora do prazo; CTA: "Acessar pedidos críticos"
- **Quick actions panel** (`TittleInfoLightPopover` ×4): "AÇÕES RÁPIDAS" / "Atalhos contextuais"
  - Pedidos atrasados: 655 (red icon, late-package.svg)
  - Clientes com Tickets Abertos: 42 (yellow icon, Users.svg)
  - Exportar CSV: Mês atual (blue icon, Download.svg)
  - Insights da IA: Info explaining more (sparkle.svg)
- **AI Button** (`ButtonIA` / `ButtonLarge`): floating AI action button with sparkle icon

## Navigation Elements

The navigation bar is embedded in `Component6` → `FrameComponent11` → `FrameComponent`. It contains:
- Left: Logo (Union.svg) + nav items (Catálogo, Pedidos, Clientes, Tickets)
- Center: Search bar with "Pesquise na plataforma..."
- Right: Notification bell + user avatar

There is NO bottom tab bar or mobile navigation. This is a desktop dashboard application.

## Navigation Assets

No bottom tab bar exists in the incoming code — this is a desktop web app with a top navigation bar only.
No STRIP_NAV scenarios apply.
