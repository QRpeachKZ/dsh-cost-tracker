// dsh-cost-tracker — Client half
// ===============================
// This is the CLIENT half of the dynamic Cordis plugin. It is a plain-JavaScript
// function body that returns a Cordis Plugin. It is NOT compiled by TypeScript,
// JSX, or a bundler. Client React code must use React.createElement(...).
//
// It registers two UI slots:
//   conversation.composer.dock  — the "Cost $…" line + 🔥 flame + fire ring
//   settings.section            — the "Model pricing" settings page
//
// It talks to the Host half over Package-private JSON RPC (host.call / harness.handle).

return {
  inject: ['timer'],
  apply(ctx) {
    const TZ_OPTIONS = [
      ['local', 'Local machine'], ['UTC', 'UTC'], ['Europe/Moscow', 'Europe/Moscow'],
      ['Europe/Kaliningrad', 'Europe/Kaliningrad'], ['Europe/Samara', 'Europe/Samara'],
      ['Asia/Yekaterinburg', 'Asia/Yekaterinburg'], ['Asia/Omsk', 'Asia/Omsk'],
      ['Asia/Novosibirsk', 'Asia/Novosibirsk'], ['Asia/Krasnoyarsk', 'Asia/Krasnoyarsk'],
      ['Asia/Irkutsk', 'Asia/Irkutsk'], ['Asia/Yakutsk', 'Asia/Yakutsk'],
      ['Asia/Vladivostok', 'Asia/Vladivostok'], ['Asia/Magadan', 'Asia/Magadan'],
      ['Asia/Kamchatka', 'Asia/Kamchatka'], ['Asia/Almaty', 'Asia/Almaty'],
      ['Asia/Tashkent', 'Asia/Tashkent'], ['Asia/Tbilisi', 'Asia/Tbilisi'],
      ['Asia/Baku', 'Asia/Baku'], ['Asia/Yerevan', 'Asia/Yerevan'],
      ['Asia/Bishkek', 'Asia/Bishkek'], ['Asia/Dushanbe', 'Asia/Dushanbe'],
      ['Asia/Ashgabat', 'Asia/Ashgabat'], ['Europe/London', 'Europe/London'],
      ['Europe/Berlin', 'Europe/Berlin'], ['America/New_York', 'America/New_York'],
      ['America/Los_Angeles', 'America/Los_Angeles']
    ]
    const slots = ctx.get('slots')
    if (slots === undefined) return
    styles.insert('.dshCostLine{font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary);text-align:center;padding:2px 0}' +
      '.dshCostFlame{display:inline-block;margin-right:4px;animation:dshCostFlame 1.2s ease-in-out infinite}' +
      '@keyframes dshCostFlame{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.2);opacity:1}}' +
      '.dshDockRoot{position:relative}' +
      '.dshCostFireWrap{pointer-events:none}' +
      '.dshCostFireGlow{position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse at 50% 100%,rgba(255,120,0,.30),rgba(255,60,0,.08) 50%,transparent 78%);filter:blur(8px);animation:dshCostFireGlow 2.4s ease-in-out infinite}' +
      '@keyframes dshCostFireGlow{0%,100%{opacity:.6}50%{opacity:1}}' +
      '.dshCostFireRing{position:absolute;inset:0;border:2px solid rgba(255,110,0,.55);border-radius:inherit;box-shadow:0 -8px 28px -8px rgba(255,90,0,.5), inset 0 0 18px rgba(255,120,0,.18);animation:dshCostFire 2.4s ease-in-out infinite}' +
      '@keyframes dshCostFire{0%,100%{box-shadow:0 -8px 28px -8px rgba(255,90,0,.45), inset 0 0 18px rgba(255,120,0,.15)}50%{box-shadow:0 -12px 42px -8px rgba(255,70,0,.8), inset 0 0 26px rgba(255,140,0,.3)}}' +
      '.dshPricing{display:flex;flex-direction:column;gap:14px;padding:4px 0}' +
      '.dshPricingHead{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
      '.dshPricingTitle{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}' +
      '.dshPricingSub{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0}' +
      '.dshPGroupHead{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:16px 0 6px}' +
      '.dshPField{display:flex;flex-direction:column;gap:4px;min-width:0}' +
      '.dshPFieldLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}' +
      '.dshPInput{box-sizing:border-box;width:100%;height:32px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:0 10px;color:var(--dsw-alias-label-primary);font-size:13px;min-width:0}' +
      '.dshPInput:focus{outline:2px solid var(--dsw-alias-border-l2);border-color:transparent}' +
      '.dshPTime{box-sizing:border-box;width:118px;height:32px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:0 8px;color:var(--dsw-alias-label-primary);font-size:13px}' +
      '.dshPTierNum{width:64px}' +
      '.dshPCard{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:10px 14px}' +
      '.dshPCardHead{display:flex;align-items:center;gap:8px}' +
      '.dshPDot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}' +
      '.dshPCardName{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary);flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.dshPBadge{box-sizing:border-box;height:28px;line-height:26px;font-size:11px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:0 8px;flex:none}' +
      '.dshPBtn{box-sizing:border-box;height:28px;line-height:26px;border:1px solid var(--dsw-alias-border-l2);background:transparent;border-radius:8px;padding:0 12px;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;white-space:nowrap}' +
      '.dshPBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}' +
      '.dshPBtnDanger{color:var(--dsw-alias-state-error-primary)}' +
      '.dshPBody{margin-top:12px;display:flex;flex-direction:column;gap:12px}' +
      '.dshPFieldGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px}' +
      '.dshPTierHead{font-size:12px;color:var(--dsw-alias-label-secondary)}' +
      '.dshPTier{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px}' +
      '.dshPTierField{display:flex;flex-direction:column;gap:4px;min-width:0}' +
      '.dshPAdd{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:14px;text-align:center;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px}' +
      '.dshPAdd:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.dshPSelect{box-sizing:border-box;height:32px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:13px;padding:0 10px;flex:1 1 auto;min-width:0}' +
      '.dshPTzRow{display:flex;align-items:flex-end;gap:10px}' +
      '.dshPTzSelect{box-sizing:border-box;height:32px;width:260px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;color:var(--dsw-alias-label-primary);font-size:13px;padding:0 10px}')

    function CostLine(props) {
      const sessionId = props && props.sessionId
      const useSession = props && props.useSession
      const rootRef = React.useRef(null)
      const [cost, setCost] = React.useState(null)
      const [fastPeak, setFastPeak] = React.useState(null)
      const [rect, setRect] = React.useState(null)
      React.useEffect(function () {
        let cancelled = false
        let loadPeak = null
        const loadCost = function () { if (!sessionId) return; host.call('cost:getSessionCost', { sessionId }).then(function (r) { if (!cancelled) { setCost(r); loadPeak() } }).catch(function () {}) }
        loadPeak = function () { if (!sessionId) return; host.call('cost:getFastPeak', { sessionId }).then(function (r) { if (!cancelled) setFastPeak(r) }).catch(function () {}) }
        loadCost(); loadPeak()
        const ivCost = ctx.interval(loadCost, 30000)
        const ivPeak = ctx.interval(loadPeak, 1500)
        return function () { cancelled = true; if (ivCost) ivCost(); if (ivPeak) ivPeak() }
      }, [sessionId])
      React.useEffect(function () {
        let cancelled = false
        let ro = null
        let cardEl = null
        let layoutEl = null
        const ensureRo = function () { if (!ro && typeof ResizeObserver !== 'undefined') ro = new ResizeObserver(function () { measure() }) }
        const swap = function (prev, next) {
          try {
            ensureRo()
            if (prev && next !== prev) { try { ro.unobserve(prev) } catch (e) {} }
            if (next && next !== prev) ro.observe(next)
          } catch (e) {}
        }
        const reobserve = function (card) {
          swap(cardEl, card); cardEl = card
          const seat = (card && card.offsetParent) || null
          swap(layoutEl, seat); layoutEl = seat
        }
        const measure = function () {
          try {
            const el = rootRef.current
            if (!el) return
            let card = el
            let node = el
            let hops = 0
            while (node.parentElement && hops < 10) {
              node = node.parentElement
              const prev = node.previousElementSibling
              if (prev) {
                const pr = prev.getBoundingClientRect()
                if (pr.width > 300 && pr.height > 60) { card = prev; break }
              }
              hops += 1
            }
            reobserve(card)
            let radius = '18px'
            try { radius = getComputedStyle(card).borderRadius || radius } catch (e) {}
            const r = card.getBoundingClientRect()
            if (!cancelled && r.width > 0 && r.height > 0) setRect({ left: r.left, top: r.top, width: r.width, height: r.height, radius: radius })
          } catch (e) {}
        }
        measure()
        const onResize = function () { measure() }
        if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
        const iv = ctx.interval(function () { measure() }, 1000)
        return function () {
          cancelled = true
          if (ro) { try { ro.disconnect() } catch (e) {} }
          if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
          if (iv) iv()
        }
      }, [sessionId])
      const isPeak = fastPeak && fastPeak.active
      const opts = (cost && cost.opts) || (fastPeak && fastPeak.opts) || { flame: true, ring: true }
      const showFlame = opts.flame !== false
      const showRing = opts.ring !== false
      const peakTip = isPeak ? `Peak ${fastPeak.tier && fastPeak.tier.start}–${fastPeak.tier && fastPeak.tier.end} · ${fastPeak.model}` : null
      const flame = (isPeak && showFlame) ? React.createElement('span', { className: 'dshCostFlame', title: peakTip || undefined }, '🔥') : null
      const ring = (isPeak && showRing && rect)
        ? React.createElement('div', { className: 'dshCostFireWrap', 'aria-hidden': true, style: { position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex: 9999, pointerEvents: 'none', borderRadius: rect.radius || '18px' } },
            React.createElement('div', { className: 'dshCostFireGlow' }),
            React.createElement('div', { className: 'dshCostFireRing' }))
        : null
      let costLine
      if (cost) {
        const total = cost.totalCost || 0
        const text = '$' + (total >= 1 ? total.toFixed(2) : total.toFixed(4))
        const breakdown = (cost.models || []).map((m) => `${m.model}: $${(m.cost || 0).toFixed(4)}`).join(' · ') || 'No model prices configured'
        costLine = React.createElement('div', { className: 'dshCostLine', title: breakdown }, flame, 'Cost ' + text)
      } else {
        costLine = React.createElement('div', { className: 'dshCostLine', title: peakTip || 'Loading cost…' }, flame, 'Cost …')
      }
      return React.createElement('div', { ref: rootRef, className: 'dshDockRoot' }, ring, costLine)
    }

    function PricingPage(props) {
      const [providers, setProviders] = React.useState([])
      const [models, setModels] = React.useState([])
      const [entries, setEntries] = React.useState([])
      const [timezone, setTimezone] = React.useState('local')
      const [loading, setLoading] = React.useState(true)
      const [status, setStatus] = React.useState('')
      const [addOpen, setAddOpen] = React.useState(false)
      const [addSel, setAddSel] = React.useState('')
      const [flame, setFlame] = React.useState(true)
      const [ring, setRing] = React.useState(true)
      React.useEffect(function () {
        Promise.all([
          host.call('cost:getPrices').then((r) => r || {}, function () { return {} }),
          host.call('cost:listModels').then((r) => r || {}, function () { return {} })
        ]).then(function (res) {
          const pr = res[0]
          const lm = res[1] || {}
          const avModels = Array.isArray(lm.models) ? lm.models : []
          const avProviders = Array.isArray(lm.providers) ? lm.providers : []
          const priceModels = Array.isArray(pr.models) ? pr.models : []
          setEntries(priceModels.map((m) => ({ ...m, input: String(m.input ?? ''), cacheHit: String(m.cacheHit ?? ''), output: String(m.output ?? ''), tiers: (m.tiers || []).map((t) => ({ ...t, start: padTime(t.start), end: padTime(t.end), input: String(t.input ?? ''), cacheHit: String(t.cacheHit ?? ''), output: String(t.output ?? '') })) })))
          setTimezone(pr.timezone || 'local')
          setFlame(!(pr.opts && pr.opts.flame === false))
          setRing(!(pr.opts && pr.opts.ring === false))
          setModels(avModels)
          setProviders(avProviders)
          setLoading(false)
        })
      }, [])
      const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
      const padTime = (v) => { if (!v) return ''; const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(String(v)); return m ? String(v) + ':00' : String(v) }
      const providerName = (id) => { if (!id || id === '__other__') return 'Other'; const p = providers.find((x) => x.id === id); return (p && p.name) || id }
      const modelProvider = {}
      models.forEach((m) => { if (m) modelProvider[m.id] = m.provider })
      const upd = function (i, field, value) { setEntries((prev) => { const next = prev.slice(); next[i] = { ...next[i], [field]: value }; return next }) }
      const updTier = function (mi, ti, field, value) { setEntries((prev) => { const next = prev.slice(); const m = { ...next[mi] }; const t = (m.tiers || []).slice(); t[ti] = { ...t[ti], [field]: value }; m.tiers = t; next[mi] = m; return next }) }
      const beginEdit = function (i) { setEntries((prev) => prev.map((e, x) => ({ ...e, editing: x === i }))) }
      const removeEntry = function (i) { setEntries((prev) => prev.filter((_, x) => x !== i)) }
      const addTier = function (mi) { setEntries((prev) => { const next = prev.slice(); const m = { ...next[mi] }; m.tiers = (m.tiers || []).concat([{ start: '00:00:00', end: '23:59:59', input: '', cacheHit: '', output: '' }]); next[mi] = m; return next }) }
      const removeTier = function (mi, ti) { setEntries((prev) => { const next = prev.slice(); const m = { ...next[mi] }; m.tiers = (m.tiers || []).filter((_, x) => x !== ti); next[mi] = m; return next }) }
      const confirmAdd = function () { const id = addSel; if (!id) return; if (entries.some((e) => e.model === id)) { setAddOpen(false); setAddSel(''); return } setEntries((prev) => prev.concat([{ model: id, input: '', cacheHit: '', output: '', tiers: [], editing: true }])); setAddOpen(false); setAddSel('') }
      const save = async function () {
        setStatus('saving…')
        try {
          const payload = entries.map((m) => {
            const tiers = (m.tiers || []).map((t) => { const o = { start: t.start, end: t.end }; if (t.input !== '') o.input = toNum(t.input); if (t.cacheHit !== '') o.cacheHit = toNum(t.cacheHit); if (t.output !== '') o.output = toNum(t.output); return o }).filter((t) => t.start && t.end)
            return { model: String(m.model || '').trim(), input: toNum(m.input), cacheHit: toNum(m.cacheHit), output: toNum(m.output), tiers }
          }).filter((m) => m.model && (m.input !== 0 || m.cacheHit !== 0 || m.output !== 0 || (m.tiers && m.tiers.length > 0)))
          await host.call('cost:setPrices', { models: payload, timezone: timezone, opts: { flame: !!flame, ring: !!ring } })
          setStatus('saved ✓')
          setEntries((prev) => prev.map((e) => ({ ...e, editing: false })))
        } catch (e) { setStatus('error') }
      }
      const btn = (txt, on, danger) => React.createElement('button', { className: 'dshPBtn' + (danger ? ' dshPBtnDanger' : ''), onClick: on }, txt)
      const textField = (label, value, on) => React.createElement('div', { className: 'dshPField' }, React.createElement('label', { className: 'dshPFieldLabel' }, label), React.createElement('input', { className: 'dshPInput', value, onChange: (e) => on(e.target.value) }))
      if (loading) return React.createElement('div', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: '13px' } }, 'Loading…')
      const groups = {}
      const order = []
      entries.forEach((e, idx) => { const pid = modelProvider[e.model] || '__other__'; if (!groups[pid]) { groups[pid] = []; order.push(pid) } groups[pid].push({ e, idx }) })
      const renderCard = function (item) {
        const idx = item.idx
        const m = item.e
        const head = React.createElement('div', { className: 'dshPCardHead' }, React.createElement('span', { className: 'dshPDot' }), React.createElement('span', { className: 'dshPCardName', title: m.model }, m.model), React.createElement('span', { className: 'dshPBadge' }, 'Custom'), btn(m.editing ? 'Done' : 'Edit', function () { if (m.editing) { save() } else { beginEdit(idx) } }), btn('✕', function () { removeEntry(idx) }, true))
        let body = null
        if (m.editing) {
          const tierFields = (m.tiers || []).map(function (t, ti) {
            return React.createElement('div', { className: 'dshPTier', key: 't' + ti },
              React.createElement('div', { className: 'dshPTierField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'From'), React.createElement('input', { type: 'time', step: '1', className: 'dshPTime', value: t.start, onChange: (e) => updTier(idx, ti, 'start', e.target.value) })),
              React.createElement('div', { className: 'dshPTierField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'To'), React.createElement('input', { type: 'time', step: '1', className: 'dshPTime', value: t.end, onChange: (e) => updTier(idx, ti, 'end', e.target.value) })),
              React.createElement('div', { className: 'dshPTierField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'In'), React.createElement('input', { className: 'dshPInput dshPTierNum', value: t.input, onChange: (e) => updTier(idx, ti, 'input', e.target.value) })),
              React.createElement('div', { className: 'dshPTierField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'Ch'), React.createElement('input', { className: 'dshPInput dshPTierNum', value: t.cacheHit, onChange: (e) => updTier(idx, ti, 'cacheHit', e.target.value) })),
              React.createElement('div', { className: 'dshPTierField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'Out'), React.createElement('input', { className: 'dshPInput dshPTierNum', value: t.output, onChange: (e) => updTier(idx, ti, 'output', e.target.value) })),
              btn('✕', function () { removeTier(idx, ti) }, true))
          })
          body = React.createElement('div', { className: 'dshPBody' },
            React.createElement('div', { className: 'dshPFieldGrid' }, textField('Input ($/1M)', m.input, (v) => upd(idx, 'input', v)), textField('Cache-hit ($/1M)', m.cacheHit, (v) => upd(idx, 'cacheHit', v)), textField('Output ($/1M)', m.output, (v) => upd(idx, 'output', v))),
            React.createElement('div', { className: 'dshPTierHead' }, 'Time windows (override defaults, HH:MM:SS)'), tierFields,
            React.createElement('button', { className: 'dshPBtn', onClick: function () { addTier(idx) } }, '+ Add time window'))
        }
        return React.createElement('div', { className: 'dshPCard' }, head, body)
      }
      const groupsEl = order.map(function (pid) { return React.createElement('div', { key: pid }, React.createElement('div', { className: 'dshPGroupHead' }, providerName(pid)), groups[pid].map(renderCard)) })
      const addOptionGroups = []
      const byProv = {}
      models.forEach((m) => { const pid = m.provider || '__other__'; (byProv[pid] = byProv[pid] || []).push(m) })
      Object.keys(byProv).forEach((pid) => { addOptionGroups.push(React.createElement('optgroup', { label: providerName(pid), key: pid }, byProv[pid].map((a) => React.createElement('option', { value: a.id, key: a.id }, a.name || a.id)))) })
      const optsRow = React.createElement('div', { className: 'dshPTzRow', style: { gap: '24px' } },
        React.createElement('label', { className: 'dshPFieldLabel', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, React.createElement('input', { type: 'checkbox', checked: flame, onChange: (e) => setFlame(e.target.checked) }), '🔥 flame'),
        React.createElement('label', { className: 'dshPFieldLabel', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, React.createElement('input', { type: 'checkbox', checked: ring, onChange: (e) => setRing(e.target.checked) }), 'Border ring'))
      const addArea = addOpen
        ? React.createElement('div', { className: 'dshPCard', style: { display: 'flex', alignItems: 'center', gap: '8px' } }, React.createElement('select', { className: 'dshPSelect', value: addSel, onChange: (e) => setAddSel(e.target.value) }, React.createElement('option', { value: '' }, 'Select a model…'), addOptionGroups), btn('Add', function () { confirmAdd() }), btn('Cancel', function () { setAddOpen(false); setAddSel('') }))
        : React.createElement('div', { className: 'dshPAdd', onClick: function () { setAddOpen(true) } }, '+ Add model')
      const tzRow = React.createElement('div', { className: 'dshPTzRow' }, React.createElement('div', { className: 'dshPField' }, React.createElement('label', { className: 'dshPFieldLabel' }, 'Timezone for peak windows'), React.createElement('select', { className: 'dshPTzSelect', value: timezone, onChange: (e) => setTimezone(e.target.value) }, TZ_OPTIONS.map((opt) => React.createElement('option', { value: opt[0], key: opt[0] }, opt[1])))))
      return React.createElement('div', { className: 'dshPricing' },
        React.createElement('div', { className: 'dshPricingHead' }, React.createElement('div', null, React.createElement('h3', { className: 'dshPricingTitle' }, 'Model pricing'), React.createElement('p', { className: 'dshPricingSub' }, 'Prices are in $ per 1M tokens. Time windows override the default price during peak hours.')), btn('Save', function () { save() })),
        React.createElement('p', { className: 'dshPricingSub' }, entries.length === 0 ? 'No prices yet — add a model below.' : entries.length + ' model(s) priced'), tzRow, optsRow, groupsEl, addArea,
        React.createElement('span', { style: { color: status === 'saved ✓' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)', fontSize: '12px' } }, status))
    }

    slots.inject('conversation.composer.dock', function () { return slots.register({ name: 'conversation.composer.dock', id: 'cost', order: 1 }, function (props) { return React.createElement(CostLine, props) }) })
    slots.inject('settings.section', function () { return slots.register({ name: 'settings.section', id: 'model-pricing', order: 12, label: 'Model pricing' }, function (props) { return React.createElement(PricingPage, props) }) })
  },
}