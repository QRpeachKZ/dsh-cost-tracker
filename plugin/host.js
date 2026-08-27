// dsh-cost-tracker — Host half
// =============================
// This is the HOST half of the dynamic Cordis plugin. It is a plain-JavaScript
// function body that returns a Cordis Plugin. It is NOT compiled by TypeScript,
// JSX, or a bundler.
//
// It provides the model-cost RPC handlers used by the Client half:
//   cost:getPrices        — read the price config file
//   cost:setPrices        — write the price config file
//   cost:getSessionCost   — fold a session log into a $ total + per-model cost
//   cost:getFastPeak      — cheap peak check (cached session model + current selection)
//   cost:getPeakStatus    — peak status for a session or globally
//   cost:listModels       — list configured providers/models for the pricing page
//
// The price config lives at $HOME/.dsh-cost-prices.json (resolved via the
// sandboxPolicy.workspaceRoot, which for DSH resolves to $HOME).

const num = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null)
const isTime = (s) => typeof s === 'string' && /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s)
const timeZoneSec = (t, tz) => {
  const local = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  if (!tz || tz === 'local') return local(new Date(t))
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t))
    let h = 0, m = 0, s = 0
    for (const p of parts) { if (p.type === 'hour') h = Number(p.value); else if (p.type === 'minute') m = Number(p.value); else if (p.type === 'second') s = Number(p.value) }
    return h * 3600 + m * 60 + s
  } catch (e) {
    return local(new Date(t))
  }
}
const parseTime = (s) => { const m = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(s); if (!m) return null; const h = Number(m[1]), mi = Number(m[2]), se = m[3] ? Number(m[3]) : 0; if (h > 23 || mi > 59 || se > 59) return null; return h * 3600 + mi * 60 + se }
const inWindow = (start, end, sec) => {
  const s = parseTime(start); const e = parseTime(end)
  if (s === null || e === null) return false
  if (s === e) return true
  if (s < e) return sec >= s && sec < e
  return sec >= s || sec < e
}

function normalizeModel(v) {
  if (!v || typeof v !== 'object') return null
  const input = num(v.input), cacheHit = num(v.cacheHit), output = num(v.output)
  if (input === null || cacheHit === null || output === null) return null
  const tiers = []
  if (Array.isArray(v.tiers)) {
    for (const t of v.tiers) {
      if (!t || typeof t !== 'object' || !isTime(t.start) || !isTime(t.end)) continue
      const tier = { start: t.start, end: t.end }
      if (num(t.input) !== null) tier.input = num(t.input)
      if (num(t.cacheHit) !== null) tier.cacheHit = num(t.cacheHit)
      if (num(t.output) !== null) tier.output = num(t.output)
      tiers.push(tier)
    }
  }
  return { input, cacheHit, output, ...(tiers.length ? { tiers } : {}) }
}

function normalizePrices(input) {
  const models = {}
  const src = (input && input.models) || {}
  const list = Array.isArray(src) ? src : Object.keys(src).map((k) => ({ model: k, ...src[k] }))
  for (const item of list) {
    if (!item || !item.model) continue
    const m = normalizeModel(item)
    if (m) models[String(item.model)] = m
  }
  const tz = input && typeof input.timezone === 'string' && input.timezone ? input.timezone : undefined
  const opts = { flame: true, ring: true }
  if (input && input.opts) {
    if (typeof input.opts.flame === 'boolean') opts.flame = input.opts.flame
    if (typeof input.opts.ring === 'boolean') opts.ring = input.opts.ring
  }
  return { ...(tz ? { timezone: tz } : {}), opts, models }
}

function computePeakForModels(pm, modelIds, nowMs) {
  const models = (pm && pm.models) || {}
  const sec = timeZoneSec(nowMs, pm && pm.timezone)
  for (const model of modelIds || []) {
    const price = models[model]
    if (!price) continue
    if (!(price.input > 0 || price.cacheHit > 0 || price.output > 0)) continue
    const def = { input: price.input, cacheHit: price.cacheHit, output: price.output }
    for (const tier of (price.tiers || [])) {
      if (inWindow(tier.start, tier.end, sec)) {
        const rates = { input: num(tier.input) ?? def.input, cacheHit: num(tier.cacheHit) ?? def.cacheHit, output: num(tier.output) ?? def.output }
        const raised = rates.input > def.input || rates.cacheHit > def.cacheHit || rates.output > def.output
        if (raised) return { active: true, model, tier: { start: tier.start, end: tier.end } }
      }
    }
  }
  return { active: false }
}

function computePeak(pm, nowMs) {
  return computePeakForModels(pm, Object.keys((pm && pm.models) || {}), nowMs)
}

return {
  apply(ctx) {
    const sessionQuery = ctx.get('sessionQuery')
    const fs = ctx.get('fs')
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const llm = ctx.get('llm')
    const agentDefaultModel = ctx.get('agentDefaultModel')
    const baseCwd = sandboxPolicy && typeof sandboxPolicy.workspaceRoot === 'string' ? sandboxPolicy.workspaceRoot : null
    const priceFile = '.dsh-cost-prices.json'
    let priceTarget = null
    const lastModelCache = {}

    const ensureTarget = async () => {
      if (!fs) return null
      if (priceTarget) return priceTarget
      priceTarget = await fs.resolve(priceFile, baseCwd ? { cwd: baseCwd } : {})
      return priceTarget
    }
    const loadPriceMap = async () => {
      if (!fs) return { models: {} }
      try {
        const t = await ensureTarget()
        if (!t) return { models: {} }
        const st = await fs.stat(t)
        if (!st) return { models: {} }
        return normalizePrices(JSON.parse(await fs.readText(t)))
      } catch (e) {
        return { models: {} }
      }
    }
    const savePriceMap = async (map) => {
      const next = normalizePrices(map)
      if (!fs) return
      const t = await ensureTarget()
      if (!t) return
      await fs.writeText(t, JSON.stringify(next, null, 2))
    }

    const resolvePrice = (pm, model, timeMs) => {
      const price = pm.models[model]
      if (!price) return null
      const sec = timeZoneSec(timeMs, pm.timezone)
      for (const tier of (price.tiers || [])) {
        if (inWindow(tier.start, tier.end, sec)) {
          return { input: num(tier.input) ?? price.input, cacheHit: num(tier.cacheHit) ?? price.cacheHit, output: num(tier.output) ?? price.output }
        }
      }
      return { input: price.input, cacheHit: price.cacheHit, output: price.output }
    }

    const foldCost = (pm, events) => {
      let currentProvider = null, currentModel = null, currentStepTime = null
      const models = {}
      let totalCost = 0
      for (const ev of events || []) {
        const d = ev.data || {}
        if (ev.type === 'step/start') { currentStepTime = ev.time; continue }
        if (ev.type === 'request/context') {
          if (typeof d.model === 'string') { currentModel = d.model; if (typeof d.provider === 'string') currentProvider = d.provider }
          continue
        }
        if (ev.type === 'request/header') {
          const cfg = d.header && d.header.config
          if (cfg && typeof cfg.model === 'string') { currentModel = cfg.model; if (typeof cfg.provider === 'string') currentProvider = cfg.provider }
          continue
        }
        if (ev.type === 'assistant/message' && d.usage) {
          const usage = d.usage
          const input = num(usage.inputTokens) ?? 0
          const cacheRead = num(usage.cacheReadTokens) ?? 0
          const cacheWrite = num(usage.cacheWriteTokens) ?? 0
          const output = num(usage.outputTokens) ?? 0
          const model = currentModel || 'unknown'
          const rate = resolvePrice(pm, model, currentStepTime ?? ev.time)
          const r = rate || { input: 0, cacheHit: 0, output: 0 }
          const cost = (input * r.input + cacheRead * r.cacheHit + cacheWrite * r.input + output * r.output) / 1e6
          const prev = models[model] || { provider: currentProvider, calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 }
          models[model] = { provider: currentProvider ?? prev.provider, calls: prev.calls + 1, input: prev.input + input, cacheRead: prev.cacheRead + cacheRead, cacheWrite: prev.cacheWrite + cacheWrite, output: prev.output + output, cost: prev.cost + cost }
          totalCost += cost
        }
      }
      return { totalCost, models: Object.keys(models).map((model) => ({ model, ...models[model] })), lastModel: currentModel }
    }

    const sessionModelIds = function (folded) {
      const ids = []
      if (folded.lastModel) ids.push(folded.lastModel)
      folded.models.forEach(function (m) { if (!ids.includes(m.model)) ids.push(m.model) })
      return ids
    }

    harness.handle('cost:getPrices', async () => {
      const pm = await loadPriceMap()
      return { models: Object.keys(pm.models).map((model) => ({ model, ...pm.models[model] })), unit: 'per1M', timezone: pm.timezone || 'local', opts: pm.opts }
    })
    harness.handle('cost:setPrices', async (args) => {
      const input = args && args.models
      if (!input) throw new Error('models required')
      await savePriceMap({ models: input, timezone: args && args.timezone, opts: args && args.opts })
      return { ok: true }
    })
    harness.handle('cost:getSessionCost', async (args) => {
      if (!sessionQuery) return null
      const sessionId = args && args.sessionId
      if (!sessionId) return null
      const pm = await loadPriceMap()
      try {
        const log = await sessionQuery.readSession(sessionId)
        const folded = foldCost(pm, log.events)
        lastModelCache[sessionId] = folded.lastModel
        const peak = computePeakForModels(pm, sessionModelIds(folded), Date.now())
        return { totalCost: folded.totalCost, models: folded.models, peak, opts: pm.opts }
      } catch (e) {
        return { totalCost: 0, models: [], peak: { active: false }, opts: pm.opts }
      }
    })
    harness.handle('cost:getFastPeak', async (args) => {
      const pm = await loadPriceMap()
      const ids = []
      if (args && args.sessionId && lastModelCache[args.sessionId]) ids.push(lastModelCache[args.sessionId])
      let sel = null
      try { sel = agentDefaultModel && agentDefaultModel.currentSelection(); if (sel && sel.model && !ids.includes(sel.model)) ids.push(sel.model) } catch (e) {}
      const res = computePeakForModels(pm, ids, Date.now())
      if (!res.active) return { active: false, opts: pm.opts }
      const out = { active: true, model: String(res.model), opts: pm.opts }
      if (res.tier) out.tier = { start: String(res.tier.start), end: String(res.tier.end) }
      return out
    })
    harness.handle('cost:getPeakStatus', async (args) => {
      const pm = await loadPriceMap()
      if (args && args.sessionId && sessionQuery) {
        try {
          const log = await sessionQuery.readSession(args.sessionId)
          const folded = foldCost(pm, log.events)
          return { active: false, ...computePeakForModels(pm, sessionModelIds(folded), Date.now()) }
        } catch (e) { return { active: false } }
      }
      return computePeak(pm, Date.now())
    })
    harness.handle('cost:listModels', async () => {
      const byId = new Map()
      const add = (model, provider, name) => { if (model) byId.set(model, { id: model, provider: provider || '', name: name || model }) }
      try { const sel = agentDefaultModel && agentDefaultModel.currentSelection(); if (sel) add(sel.model, sel.provider, sel.model) } catch (e) {}
      const providers = []
      const seen = new Set()
      const addProvider = (id, name) => { if (!id || seen.has(id)) return; seen.add(id); providers.push({ id, name: name || id }) }
      const providerIds = new Set()
      if (llm) {
        try { const list = llm.listProviders() || []; for (const p of list) { providerIds.add(p.id); addProvider(p.id, p.name) } } catch (e) {}
        try { const list = llm.listConfigurableProviders() || []; for (const p of list) { providerIds.add(p.provider); addProvider(p.provider, p.displayName || p.provider) } } catch (e) {}
      }
      for (const pid of providerIds) {
        try { const list = await llm.listModels(pid); for (const m of list || []) add(m.id, m.provider || pid, m.name || m.id) } catch (e) {}
      }
      return { models: Array.from(byId.values()), providers }
    })
  },
}