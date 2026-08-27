# dsh-cost-tracker

A **DeepSeek Harness** plugin that shows per-session model **cost in $** right under the composer, with configurable model prices (Input / Input-cache-hit / Output, in $ per 1M tokens) and **time-of-day peak windows**. When a model is inside a peak window with a rate strictly higher than its default, a 🔥 flame appears next to the cost line and an animated **fire ring** glows around the composer.

## Features

- **Cost line** — `Cost $0.0123` under the composer, with a per-model breakdown on hover.
- **Peak detection** — per-model time windows (e.g. `10:00:00–16:59:59`) that override the default price. Peak is shown only when:
  1. the model has a default price, **and**
  2. a time window is currently active, **and**
  3. the active window's rate is **strictly higher** than the default.
- **Peak visuals** — 🔥 flame next to `Cost $…` and a fire ring around the composer card. Both can be toggled independently (checkboxes in Settings → Model pricing).
- **Session-scoped** — peak is computed for the model(s) actually used in the current session (not any configured model), so e.g. `deepseek-v4-flash-vision-exp` triggers it while a generic `Deepseek V4 Flash` does not.
- **Fast peak endpoint** — the ring/flame update from a cheap `cost:getFastPeak` RPC (cached session model + current selection), so they appear near-instantly on chat switch instead of waiting for the full session-log fold.
- **Settings page** — Settings → **Model pricing**: group models by vendor, set Input/Cache-hit/Output prices, add time windows with `00:00:00–23:59:59` inputs, pick a timezone, and toggle flame/ring.

## Requirements

- DeepSeek Harness (`dsh`) with the **`cordis` agent preset** (the preset that exposes the dynamic-plugin toolset: `cordis_define` / `cordis_run`).
- The plugin is a **dynamic Cordis plugin** — it is installed per-session through the cordis toolset and lives for the lifetime of that session (it is not a persistent npm bundle).

## Installation

The plugin has two halves — `plugin/host.js` (Host RPC + cost folding) and `plugin/client.js` (composer cost line + fire ring + settings page). Both are plain-JavaScript Cordis plugin bodies.

### 1. Validate and prepare the payload

```sh
node plugin/install.js          # validates syntax and prints the cordis_define payload
node plugin/install.js --json   # prints only the JSON payload
```

### 2. Install in the harness

In a session running on the **`cordis`** preset, ask the agent to install the plugin from this repo. The agent will:

1. Read `plugin/host.js` and `plugin/client.js`.
2. Call `cordis_define` with `plugin.kind: 'new'`, `idPrefix: 'cost'`, and the two halves as `code.host` / `code.client`.
3. Call `cordis_run` with the returned `pluginId` / `packageId` (mode `run` for first install).

Or, if you already have the JSON payload from `install.js`, hand it to the agent and ask it to run `cordis_define` + `cordis_run` with it.

### 3. Configure prices

Open **Settings → Model pricing** and add your models:

- **Input / Cache-hit / Output** — price in **$ per 1M tokens**.
- **Time windows** — `From` / `To` in `HH:MM:SS` (e.g. `10:00:00` → `16:59:59`), with optional per-window Input/Cache-hit/Output overrides.
- **Timezone** — the timezone used to evaluate the windows (defaults to your local machine).
- **🔥 flame / Border ring** — enable or disable each peak visual independently.

Prices are saved to `$HOME/.dsh-cost-prices.json` and re-read on every request, so edits apply without a restart.

## Configuration file

The plugin reads/writes `$HOME/.dsh-cost-prices.json`:

```json
{
  "timezone": "Asia/Novosibirsk",
  "opts": { "flame": true, "ring": true },
  "models": {
    "deepseek-v4-flash-vision-exp": {
      "input": 1,
      "cacheHit": 0.1,
      "output": 2,
      "tiers": [
        { "start": "10:00:00", "end": "16:59:59", "input": 2, "cacheHit": 1, "output": 3 }
      ]
    }
  }
}
```

## Repository layout

```
dsh-cost-tracker/
├── LICENSE
├── README.md
└── plugin/
    ├── host.js       # Host half: RPC handlers, price config, session cost fold, peak logic
    ├── client.js     # Client half: composer cost line, fire ring, settings page
    └── install.js    # Validates both halves and prints the cordis_define payload
```

## Notes

- The plugin is **process-local**: it is removed when the session ends or the harness restarts. Reinstall it per session.
- The fire ring is measured from the composer card via a React ref + `ResizeObserver`; it adapts to sidebar/layout/window changes.
- Peak is scoped to the session's actual model(s) — a model that is priced but not used in the session will not trigger the ring.