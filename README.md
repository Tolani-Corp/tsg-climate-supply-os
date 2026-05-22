# TSG Climate Supply OS

TSG Climate Supply OS is a lightweight planning platform for sourcing smart HVAC systems and ESG-capable devices from China into Panama. It helps operators compare suppliers, estimate landed cost, model energy and carbon impact, and generate a synchronization packet for TCCG.work and Tolani Lab.

The app uses the shared Tolani Supply Group identity: TSG ocean/steel brand colors, the TSG logistics mark, and a platform handoff model that keeps TSG Operations, TCCG.work, and Tolani Lab aligned in every sync manifest.

This first repo is intentionally dependency-free: open `index.html` directly or run the included Node static server.

## Why this exists

Buildings need efficient cooling, transparent procurement, and credible ESG data. Small teams often make sourcing decisions with scattered spreadsheets, outdated rate assumptions, and no clean handoff between procurement, engineering, compliance, and field deployment. This project turns those decisions into a repeatable workflow.

## MVP capabilities

- Supplier scoring for smart HVAC, IAQ sensors, smart meters, and ESG kits
- China-to-Panama route and landed-cost scenario modeling
- Cooling energy savings and estimated avoided carbon
- Compliance and QA checklist generation
- TCCG.work and Tolani Lab sync manifest export
- Offline-friendly static app with no vendor lock-in

## Run locally

```bash
npm test
npm run dev
```

Then open `http://localhost:4173`.

You can also open `index.html` in a browser without running a server.

For live China MCP enrichment, start `TSG-China-Logistics-MCP` on port `3001` and run this app server with:

```bash
$env:CHINA_MCP_BASE_URL="http://localhost:3001"
$env:CHINA_MCP_API_KEY="dev-key-local"
npm run dev
```

The browser calls the local `/api/mcp` proxy by default, so the MCP API key stays server-side. Direct browser-to-MCP mode is still available by entering the MCP URL and API key in the app settings for private local testing.

## Repository layout

```text
index.html              App shell
styles.css              Visual system
src/data.js             Catalog, suppliers, routes, compliance defaults
src/engine.js           Scenario scoring and sync manifest logic
src/app.js              Browser UI controller
test/engine.test.mjs    Node tests for the planning engine
docs/ARCHITECTURE.md    Platform design notes
docs/ROADMAP.md         Build-out plan toward a dynamic supply platform
```

## Important assumptions

All rates, suppliers, duty values, and compliance items in this MVP are sample planning data. They are not live quotes or customs advice. Production use should connect to verified customs, freight, inspection, vendor, and telemetry sources.

## Next build targets

1. Connect live tariff, route, and port data from the TSG China Logistics MCP.
2. Add authenticated workspaces for TCCG.work, Tolani Lab, suppliers, and clients.
3. Replace sample suppliers with a vetted vendor registry and audit trail.
4. Add telemetry ingestion from deployed HVAC and ESG devices.
5. Create RFQ, PO, inspection, and installation workflows.
