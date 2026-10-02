'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { addSubscription, killSwitch, undoKill, markUsed, updateCap, simulateHike, signOut } from './actions'
import './dashboard.css'

interface Subscription {
  id: string; name: string; category: string; cost: number; cap: number
  last_used_at: string; status: string; blocked_total: number | null
}
interface ActivityItem { id: string; message: string; kind: string; created_at: string }

const CATEGORY_BENCHMARK: Record<string, number> = { Entertainment: 350, Software: 900, Fitness: 700, Shopping: 300, 'News & Media': 200, Other: 400 }
const CATEGORY_DECAY: Record<string, number> = { Entertainment: 10, Fitness: 12, Shopping: 4, Software: -6, 'News & Media': 6, Other: 2 }
const HIDDEN_CHARGES = [{ name: 'CloudBackup Pro', category: 'Software', cost: 199 }, { name: 'PhotoEditor+', category: 'Software', cost: 349 }]
const LOGO_COLORS: Record<string, string> = { Netflix: '#B3231C', 'Amazon Prime': '#1C6E8C', 'Adobe Creative Cloud': '#D6262A', 'Spotify Premium': '#1DB954', 'Google Workspace': '#4285F4', 'Disney+ Hotstar': '#6C5CE7', 'Cult.fit': '#F0685C' }

function colorFor(name: string) {
  if (LOGO_COLORS[name]) return LOGO_COLORS[name]
  const palette = ['#35D399', '#A98BFA', '#F0B84B', '#4285F4', '#F0685C', '#1DB954', '#6C5CE7']
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i)
  return palette[h % palette.length]
}
function fmt(n: number) { return Math.round(n).toLocaleString('en-IN') }
function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}
function isZombie(sub: Subscription) { return sub.status === 'active' && daysSince(sub.last_used_at) >= 30 }
function computeRisk(sub: Subscription) {
  const lastUsed = daysSince(sub.last_used_at)
  const factors: { label: string; pts: number }[] = []
  const base = Math.min(60, Math.round((lastUsed / 30) * 60))
  factors.push({ label: 'Approaching 30-day zombie cliff', pts: base })
  const costFactor = sub.cost >= 800 ? 15 : sub.cost >= 300 ? 8 : 3
  factors.push({ label: 'Cost tier', pts: costFactor })
  const catFactor = CATEGORY_DECAY[sub.category] || 0
  factors.push({ label: `${sub.category} category decay rate`, pts: catFactor })
  const capFactor = sub.cap && sub.cost >= sub.cap * 0.9 ? 8 : 0
  if (capFactor) factors.push({ label: 'Near spending cap', pts: capFactor })
  const score = Math.max(0, Math.min(100, base + costFactor + catFactor + capFactor))
  return { score, factors, daysToZombie: Math.max(0, 30 - lastUsed) }
}
function riskBand(score: number) {
  if (score < 25) return { label: 'Healthy', color: 'var(--mint)' }
  if (score < 55) return { label: 'Watch', color: 'var(--amber)' }
  return { label: 'High risk', color: 'var(--coral)' }
}

export default function ShieldDashboard({ initialSubscriptions, initialActivity, userEmail }: {
  initialSubscriptions: Subscription[]; initialActivity: ActivityItem[]; userEmail: string
}) {
  const router = useRouter()
  const [subs, setSubs] = useState<Subscription[]>(initialSubscriptions)
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity)
  useEffect(() => setSubs(initialSubscriptions), [initialSubscriptions])
  useEffect(() => setActivity(initialActivity), [initialActivity])

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const saved = (localStorage.getItem('ghost-shield-theme') as 'dark' | 'light') || 'dark'
    setTheme(saved); document.documentElement.setAttribute('data-theme', saved)
  }, [])
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ghost-shield-theme', next)
  }

  const [filter, setFilter] = useState<'all' | 'active' | 'zombie' | 'killed'>('all')
  const [sortMode, setSortMode] = useState<'default' | 'risk' | 'cost' | 'unused' | 'name'>('default')
  const [killTarget, setKillTarget] = useState<Subscription | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [addedHidden, setAddedHidden] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; actionLabel?: string; onAction?: () => void } | null>(null)

  function showToast(msg: string, opts?: { actionLabel?: string; onAction?: () => void }) {
    setToast({ msg, ...opts }); setTimeout(() => setToast(null), 5000)
  }

  const activeSubs = subs.filter(s => s.status === 'active')
  const monthly = activeSubs.reduce((a, s) => a + s.cost, 0)
  const zombies = activeSubs.filter(isZombie)
  const watchCt = activeSubs.filter(s => !isZombie(s) && computeRisk(s).score >= 25).length
  const savedFromKills = subs.filter(s => s.status === 'killed').reduce((a, s) => a + s.cost, 0)
  const savedFromBlocks = subs.reduce((a, s) => a + (s.blocked_total || 0), 0)
  const totalActive = subs.filter(s => s.status !== 'killed').length || 1
  const capPct = Math.round((subs.filter(s => s.status === 'active' && s.cap).length / totalActive) * 100)

  const visibleSubs = useMemo(() => {
    let list = subs.filter(s => {
      if (filter === 'all') return true
      if (filter === 'zombie') return isZombie(s)
      if (filter === 'killed') return s.status === 'killed'
      if (filter === 'active') return s.status === 'active' && !isZombie(s)
      return true
    })
    list = [...list]
    if (sortMode === 'risk') list.sort((a, b) => computeRisk(b).score - computeRisk(a).score)
    else if (sortMode === 'cost') list.sort((a, b) => b.cost - a.cost)
    else if (sortMode === 'unused') list.sort((a, b) => daysSince(b.last_used_at) - daysSince(a.last_used_at))
    else if (sortMode === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [subs, filter, sortMode])

  async function handleKillConfirm() {
    if (!killTarget) return
    const s = killTarget; setKillTarget(null)
    await killSwitch(s.id, s.name, s.cost); router.refresh()
    showToast(`${s.name} cancelled · saved ₹${fmt(s.cost)}/mo`, {
      actionLabel: 'Undo',
      onAction: async () => { await undoKill(s.id, s.name); router.refresh() }
    })
  }
  async function handleMarkUsed(s: Subscription) {
    const wasZombie = isZombie(s)
    await markUsed(s.id, s.name, wasZombie); router.refresh()
    showToast(`Marked ${s.name} as used today ✓`)
  }
  async function handleHike(s: Subscription) { await simulateHike(s.id, s.name, s.cost, s.cap); router.refresh() }
  async function handleCapChange(s: Subscription, val: number) {
    if (isNaN(val) || val < 0) return
    await updateCap(s.id, s.name, val); router.refresh()
  }
  function runScan() { setScanState('scanning'); setTimeout(() => setScanState('done'), 900) }
  async function addHiddenCharge(h: typeof HIDDEN_CHARGES[0]) {
    await addSubscription({ name: h.name, category: h.category, cost: h.cost, lastUsed: 35 })
    setAddedHidden(prev => [...prev, h.name]); router.refresh()
    showToast(`${h.name} added from bank scan`)
  }

  const [fName, setFName] = useState('')
  const [fCategory, setFCategory] = useState('Entertainment')
  const [fCost, setFCost] = useState('')
  const [fLastUsed, setFLastUsed] = useState('0')
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = Number(fCost)
    if (!fName.trim() || !cost || cost <= 0) { showToast('Add a name and a monthly cost first.'); return }
    await addSubscription({ name: fName.trim(), category: fCategory, cost, lastUsed: Number(fLastUsed) || 0 })
    setShowAddModal(false); setFName(''); setFCost(''); setFLastUsed('0'); setFCategory('Entertainment')
    router.refresh(); showToast(`${fName} added to your Shield`)
  }

  const [chatLog, setChatLog] = useState<{ who: 'user' | 'bot'; text: string }[]>([
    { who: 'bot', text: 'Ask me about your data ("what should I cancel?") or about the app itself ("how does the kill switch work?").' }
  ])
  const [chatInput, setChatInput] = useState('')

  function findSubsByName(ql: string) {
    return subs.filter(s => {
      const words = s.name.toLowerCase().split(/[\s.+]+/).filter(w => w.length > 2)
      return ql.includes(s.name.toLowerCase()) || words.some(w => ql.includes(w))
    })
  }
  function describeSub(s: Subscription) {
    if (s.status === 'killed') return `${s.name} is already cancelled.`
    const bits: string[] = [`${s.name} costs ₹${fmt(s.cost)}/mo (₹${fmt(s.cost * 12)}/yr), cap set at ₹${fmt(s.cap)}.`]
    const lastUsed = daysSince(s.last_used_at)
    bits.push(`Last used ${lastUsed} day${lastUsed === 1 ? '' : 's'} ago.`)
    if (isZombie(s)) bits.push("It's currently flagged as a Zombie subscription.")
    else {
      const r = computeRisk(s)
      bits.push(r.score >= 25 ? `Zombie risk is ${r.score}/100 — predicted zombie in ~${r.daysToZombie}d if unused.` : `Zombie risk is low (${r.score}/100).`)
    }
    return bits.join(' ')
  }
  const APP_FAQ: { test: RegExp; reply: string }[] = [
    { test: /what is (this app|ghost|the shield)|about this app/, reply: 'Ghost Subscription Shield sits between you and your subscriptions — flagging unused ones, blocking price hikes past your cap, and cancelling in one tap.' },
    { test: /kill switch|how (does|do i) cancel/, reply: 'The Kill Switch revokes the mandate, moves the subscription to Cancelled, and logs it — with a short Undo window after.' },
    { test: /what.{0,3}s? a zombie/, reply: "A Zombie Subscription is one you're still paying for but haven't used in 30+ days." },
    { test: /risk score|how is risk/, reply: 'The Risk Score (0-100) predicts a coming zombie before the 30-day cliff, weighing usage recency, cost tier, category decay rate, and cap proximity.' },
    { test: /spending cap|what.{0,3}s? a cap/, reply: "A spending cap is the max price you'll accept — a price hike above it gets blocked automatically." },
    { test: /real money|is this real/, reply: 'No real money moves here — this build is a proof-of-concept.' },
    { test: /privacy|my data/, reply: 'Your data lives in Supabase, protected by Row Level Security — only you can read or write your own rows.' }
  ]
  function answerQuery(q: string): string {
    const ql = q.toLowerCase().trim()
    if (/^(hi|hello|hey|yo)\b/.test(ql)) return 'Hey! Ask me about any subscription by name, how a feature works, or what to cancel.'
    if (ql.includes('thank')) return "Anytime — that's what the Shield's here for. 👻"
    if (ql.includes('help')) return 'Ask about your data (what to cancel, riskiest, cheapest) or about the app (how the kill switch works, what a zombie is, how risk is calculated).'
    for (const f of APP_FAQ) if (f.test.test(ql)) return f.reply
    const mentioned = findSubsByName(ql)
    if (mentioned.length === 1) return describeSub(mentioned[0])
    if (mentioned.length >= 2) return mentioned.map(describeSub).join(' ')
    if (ql.includes('how many')) return `You have ${activeSubs.length} active, ${zombies.length} zombie, ${subs.filter(s => s.status === 'killed').length} cancelled.`
    if (ql.includes('cheap') && activeSubs.length) { const m = [...activeSubs].sort((a, b) => a.cost - b.cost)[0]; return `Your cheapest is ${m.name} at ₹${fmt(m.cost)}/mo.` }
    if ((ql.includes('expensive') || ql.includes('priciest')) && activeSubs.length) { const m = [...activeSubs].sort((a, b) => b.cost - a.cost)[0]; return `Your priciest is ${m.name} at ₹${fmt(m.cost)}/mo.` }
    if (ql.includes('cancel')) {
      if (!zombies.length) return "Nothing's flagged as a zombie right now."
      const top = [...zombies].sort((a, b) => b.cost - a.cost).slice(0, 3)
      return `I'd start with ${top.map(s => `${s.name} (₹${fmt(s.cost)}/mo)`).join(', ')}.`
    }
    if (ql.includes('wast') || ql.includes('leak')) {
      const zAmt = zombies.reduce((a, s) => a + s.cost, 0)
      return zombies.length ? `You're leaking ₹${fmt(zAmt)}/mo on ${zombies.length} unused subscription(s).` : 'No active leakage right now.'
    }
    if (ql.includes('spend') || ql.includes('total')) return `You're paying ₹${fmt(monthly)}/mo (₹${fmt(monthly * 12)}/yr) across ${activeSubs.length} active subscriptions.`
    return "Try naming a subscription directly, or ask what to cancel, what's risky, or your total spend."
  }
  function sendChat(q: string) {
    if (!q.trim()) return
    setChatLog(prev => [...prev, { who: 'user', text: q }]); setChatInput('')
    setTimeout(() => setChatLog(prev => [...prev, { who: 'bot', text: answerQuery(q) }]), 200)
  }

  return (
    <div>
      <header className="top">
        <div className="top-inner">
          <div className="brand">
            <div className="brand-mark">👻</div>
            <div><div className="brand-name">Ghost Subscription Shield</div><div className="brand-sub">{userEmail}</div></div>
          </div>
          <div className="top-actions">
            <button className="btn btn-ghost btn-sm" onClick={runScan}>🔍 Scan bank feed</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add subscription</button>
            <button className="icon-btn" onClick={toggleTheme}>{theme === 'light' ? '☀️' : '🌙'}</button>
            <button className="icon-btn" title="Sign out" onClick={async () => { await signOut(); router.push('/login') }}>⎋</button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div className="hero-grid">
            <div className="leak-card">
              <div className="leak-label">Monthly subscription leakage</div>
              <div className="leak-figure"><small>₹</small>{fmt(monthly)}</div>
              <div className="leak-note">Total you're paying right now across every tracked subscription.</div>
              <div className="leak-stats">
                <div><div className="leak-stat-val">₹{fmt(monthly * 12)}</div><div className="leak-stat-lbl">Projected this year</div></div>
                <div><div className="leak-stat-val" style={{ color: 'var(--spectre)' }}>{zombies.length}</div><div className="leak-stat-lbl">Zombie subscriptions</div></div>
                <div><div className="leak-stat-val" style={{ color: 'var(--amber)' }}>{watchCt}</div><div className="leak-stat-lbl">Trending toward zombie</div></div>
                <div><div className="leak-stat-val" style={{ color: 'var(--mint)' }}>₹{fmt(savedFromKills + savedFromBlocks)}</div><div className="leak-stat-lbl">Reclaimed by the Shield</div></div>
              </div>
            </div>
            <div className="shield-card">
              <div className="shield-ring">
                <svg width="118" height="118" viewBox="0 0 118 118">
                  <circle cx="59" cy="59" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
                  <circle cx="59" cy="59" r="50" fill="none" stroke={capPct >= 60 ? 'var(--mint)' : capPct >= 30 ? 'var(--amber)' : 'var(--coral)'} strokeWidth="10"
                    strokeLinecap="round" strokeDasharray="314" strokeDashoffset={314 - (capPct / 100) * 314}
                    style={{ transition: 'stroke-dashoffset .6s ease', transform: 'rotate(-90deg)', transformOrigin: '59px 59px' }} />
                </svg>
                <div className="pct">{capPct}%</div>
              </div>
              <div className="shield-title">Portfolio under active protection</div>
              <div className="shield-sub">Subscriptions with a spending cap set</div>
            </div>
          </div>
        </section>

        <div className="main-grid">
          <div>
            <div className="sec-head">
              <div><div className="sec-title">Your subscriptions</div><div className="sec-desc">Risk score predicts a coming zombie before the 30-day cliff.</div></div>
              <div className="sec-controls">
                <select className="sort-select" value={sortMode} onChange={e => setSortMode(e.target.value as any)}>
                  <option value="default">Sort: default</option><option value="risk">Sort: highest risk</option>
                  <option value="cost">Sort: cost, high→low</option><option value="unused">Sort: days unused</option>
                  <option value="name">Sort: name A→Z</option>
                </select>
                <div className="filter-tabs">
                  {(['all', 'active', 'zombie', 'killed'] as const).map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sub-list">
              {visibleSubs.length === 0 && <div className="empty-note">Nothing here yet.</div>}
              {visibleSubs.map(s => {
                const lastUsed = daysSince(s.last_used_at)
                const zombie = isZombie(s)
                const label = s.status === 'killed' ? 'Cancelled' : zombie ? 'Zombie' : 'Active'
                const badgeClass = label === 'Zombie' ? 'badge-zombie' : label === 'Cancelled' ? 'badge-killed' : 'badge-active'
                const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const bench = CATEGORY_BENCHMARK[s.category] || 400
                const aboveBench = s.cost > bench * 1.15
                const suggestedCap = Math.round(Math.max(s.cost * 1.08, bench * 1.15) / 10) * 10
                const showAdvisor = s.status === 'active' && Math.abs(suggestedCap - s.cap) / s.cap > 0.12
                let riskBlock = null
                if (s.status === 'active' && !zombie) {
                  const r = computeRisk(s); const band = riskBand(r.score)
                  riskBlock = (
                    <div className="risk-wrap" title={r.factors.map(f => `${f.label}: +${f.pts}`).join(' · ')}>
                      <div className="risk-bar-track"><div className="risk-bar-fill" style={{ width: `${r.score}%`, background: band.color }} /></div>
                      <div className="risk-caption">Zombie risk {r.score}/100 — {r.score >= 25 ? `${band.label} — predicted zombie in ~${r.daysToZombie}d` : `${band.label} usage pattern`}</div>
                    </div>
                  )
                }
                return (
                  <div key={s.id} className={`sub-row ${zombie ? 'is-zombie' : ''} ${s.status === 'killed' ? 'is-killed' : ''}`}>
                    <div className="sub-logo" style={{ background: colorFor(s.name) }}>{initials}</div>
                    <div>
                      <div className="sub-name">{s.name}</div>
                      <div className="sub-meta">
                        <span className={`badge ${badgeClass}`}>{label}</span>
                        {s.status === 'active' && s.cost > s.cap && <span className="badge badge-blocked">over cap</span>}
                        {aboveBench && <span className="badge badge-benchmark">{Math.round((s.cost / bench - 1) * 100)}% above avg</span>}
                        <span>{s.category}</span>
                        {s.status !== 'killed' && <span>· last used {lastUsed}d ago</span>}
                      </div>
                      {riskBlock}
                    </div>
                    <div className="sub-right">
                      <div className="sub-cost">
                        <div className="amt">₹{fmt(s.cost)}/mo</div>
                        <div className="cap-row">cap ₹<input type="number" className="cap-input" defaultValue={s.cap} onBlur={e => handleCapChange(s, Number(e.target.value))} /></div>
                        {showAdvisor && <div className="advisor-line">Advisor suggests ₹{fmt(suggestedCap)} <button onClick={() => handleCapChange(s, suggestedCap)}>apply</button></div>}
                      </div>
                      <div className="sub-actions">
                        {s.status !== 'killed' && <button className="btn btn-ghost btn-icon-sm" title="Used today" onClick={() => handleMarkUsed(s)}>👍</button>}
                        {s.status !== 'killed' && <button className="btn btn-ghost btn-icon-sm" title="Simulate hike" onClick={() => handleHike(s)}>📈</button>}
                        {s.status !== 'killed' ? <button className="btn btn-danger btn-sm" onClick={() => setKillTarget(s)}>Kill switch</button> : <span className="badge badge-killed">Revoked</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="side-panel">
              <h3>👋 Shield Assistant</h3>
              <p className="desc">Ask about your subscriptions in plain language.</p>
              <div className="assistant-log">{chatLog.map((m, i) => <div key={i} className={`chat-msg ${m.who}`}>{m.text}</div>)}</div>
              <div className="chip-row">
                <button className="chip" onClick={() => sendChat('What should I cancel?')}>What should I cancel?</button>
                <button className="chip" onClick={() => sendChat('How does the kill switch work?')}>Kill switch?</button>
                <button className="chip" onClick={() => sendChat("What's a zombie subscription?")}>Zombie?</button>
              </div>
              <div className="assistant-input-row">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChat(chatInput) }} placeholder="Ask the Shield…" />
                <button className="btn btn-primary btn-sm" onClick={() => sendChat(chatInput)}>Ask</button>
              </div>
            </div>

            <div className="side-panel">
              <h3>Bank feed scanner</h3>
              <p className="desc">Simulates parsing your statement for recurring debits you never registered.</p>
              <button className="btn btn-ghost scan-btn" onClick={runScan}>🔍 Scan for hidden charges</button>
              {scanState === 'scanning' && <div className="scan-result">Scanning simulated statement…</div>}
              {scanState === 'done' && (
                <div className="scan-result">
                  <strong>{HIDDEN_CHARGES.filter(h => !addedHidden.includes(h.name)).length} unregistered debits found:</strong>
                  {HIDDEN_CHARGES.filter(h => !addedHidden.includes(h.name)).map(h => (
                    <div className="scan-result-row" key={h.name}>
                      <span>{h.name} · ₹{fmt(h.cost)}/mo</span>
                      <button className="btn btn-sm btn-primary" onClick={() => addHiddenCharge(h)}>Add to Shield</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="side-panel">
              <h3>Activity</h3>
              <p className="desc">What the Shield has caught, in real time.</p>
              {activity.length === 0 && <div className="empty-note">No activity yet.</div>}
              {activity.map(f => (
                <div className="feed-item" key={f.id}>
                  <div className="feed-dot" style={{ background: f.kind === 'danger' ? 'var(--coral)' : f.kind === 'warn' ? 'var(--amber)' : f.kind === 'good' ? 'var(--mint)' : 'var(--spectre)' }} />
                  <div><div className="feed-text">{f.message}</div><div className="feed-time">{new Date(f.created_at).toLocaleString()}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {killTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setKillTarget(null) }}>
          <div className="modal">
            <h2>Cancel {killTarget.name}?</h2>
            <p className="desc">The Shield revokes the payment mandate directly. No login, no retention screen.</p>
            <div className="kill-steps">
              <div className="kill-step"><span className="n">1</span> Revoke standing payment mandate</div>
              <div className="kill-step"><span className="n">2</span> Remove from active billing</div>
              <div className="kill-step"><span className="n">3</span> Log to your activity feed</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setKillTarget(null)}>Keep it</button>
              <button className="btn btn-danger" onClick={handleKillConfirm}>Confirm &amp; cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div className="modal">
            <h2>Add a subscription</h2>
            <p className="desc">Bring it under the Shield so it's tracked and cancellable.</p>
            <form onSubmit={handleAddSubmit}>
              <div className="field"><label>Name</label><input value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. YouTube Premium" /></div>
              <div className="field-row">
                <div className="field"><label>Category</label>
                  <select value={fCategory} onChange={e => setFCategory(e.target.value)}>
                    <option>Entertainment</option><option>Software</option><option>Fitness</option><option>Shopping</option><option>News &amp; Media</option><option>Other</option>
                  </select>
                </div>
                <div className="field"><label>Monthly cost (₹)</label><input type="number" value={fCost} onChange={e => setFCost(e.target.value)} placeholder="299" /></div>
              </div>
              <div className="field"><label>Days since last used</label><input type="number" value={fLastUsed} onChange={e => setFLastUsed(e.target.value)} placeholder="0" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Shield</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>{toast.msg}</span>
          {toast.actionLabel && toast.onAction && <button className="toast-action" onClick={() => { toast.onAction!(); setToast(null) }}>{toast.actionLabel}</button>}
        </div>
      )}
    </div>
  )
}