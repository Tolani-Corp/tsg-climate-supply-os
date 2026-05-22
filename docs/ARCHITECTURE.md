# Architecture

## Current MVP

The current app is a static, dependency-free decision surface:

- `src/data.js` contains the planning catalog.
- `src/engine.js` contains deterministic calculations and can run in Node or the browser.
- `src/app.js` binds the engine to the DOM.
- `test/engine.test.mjs` validates the scoring and manifest contract.

This shape keeps the first repo simple, inspectable, and portable. The engine is separated from the UI so it can later move behind an API or be imported into the existing TSG web platform.

## Production Platform Shape

```text
Client UI
  -> Scenario service
  -> Supplier registry
  -> Trade intelligence adapter
  -> Compliance workflow
  -> Sync bus
  -> Telemetry and ESG ledger
```

### Scenario service

Stores demand plans, product mixes, routes, costs, and assumptions. It should version every scenario because freight rates, tariffs, exchange rates, and supplier quotes change.

### Supplier registry

Tracks suppliers, certifications, MOQ, lead times, inspections, factory capacity, warranty outcomes, and sanctions/compliance flags. Scoring should be explainable and auditable.

### Trade intelligence adapter

Connects to TSG China Logistics MCP for ports, routes, tariffs, regulations, customs brokers, and trade alerts. Production should persist snapshots so old decisions remain explainable.

### Compliance workflow

Turns HS classification, documentation, QA, energy performance, cybersecurity, and Panama import requirements into tracked tasks with owners and evidence.

### Sync bus

Publishes normalized events for:

- TCCG.work project tracking
- Tolani Lab engineering review
- TSG procurement execution
- Device telemetry after deployment

The MVP sync manifest in `src/engine.js` is the seed contract.

### Telemetry and ESG ledger

For deployed smart HVAC systems and ESG devices, ingest energy, runtime, comfort, IAQ, and fault data. Link actual operating data back to the procurement scenario to measure whether the sourcing decision delivered its promised impact.
