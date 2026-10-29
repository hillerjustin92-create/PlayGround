import React, { useMemo, useState } from 'react'
import { Panel, Badge, Dot, Icon, Sparkline } from './ui.jsx'
import { DRIFT_REFERENCE, DRIFT_LIVE } from '../data.js'
import { calculatePSI, driftVerdict } from '../engine.js'

function DualChart({ reference, live }) {
  const width = 680
  const height = 240
  const padX = 26
  const padY = 22
  const max = Math.max(...reference, ...live, 1)
  const min = 0
  const toPoints = (data) =>
    data.map((value, index) => {
      const x = padX + (index / Math.max(1, data.length - 1)) * (width - padX * 2)
      const y = height - padY - ((value - min) / (max - min || 1)) * (height - padY * 2)
      return [x, y]
    })
  const refPoints = toPoints(reference)
  const livePoints = toPoints(live)
  const toPath = (points) => points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const liveArea = `${toPath(livePoints)} L${livePoints[livePoints.length - 1][0]},${height - padY} L${livePoints[0][0]},${height - padY} Z`

  return (
    <svg className="dual-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Referenz- und Live-Verteilung">
      <defs>
        <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = padY + (i / 4) * (height - padY * 2)
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} className="dual-chart__grid" />
            <text x={padX - 8} y={y + 4} className="dual-chart__axis" textAnchor="end">{Math.round(max - (i / 4) * max)}</text>
          </g>
        )
      })}
      <path d={liveArea} fill="url(#liveFill)" />
      <path d={toPath(refPoints)} className="dual-chart__ref" />
      <path d={toPath(livePoints)} className="dual-chart__live" />
      {livePoints.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="2.2" className="dual-chart__dot" />
      ))}
      {['00:00', '06:00', '12:00', '18:00', '24:00'].map((label, index) => (
        <text
          key={label}
          x={padX + (index / 4) * (width - padX * 2)}
          y={height - 4}
          className="dual-chart__axis"
          textAnchor={index === 0 ? 'start' : index === 4 ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

export default function Monitoring({ lab, addEvent }) {
  const [shift, setShift] = useState(0)
  const live = useMemo(
    () =>
      DRIFT_LIVE.map((value, index) => {
        const factor = 1 + (shift / 100) * 0.85 * Math.sin((index + 2) / 2.4) + (shift / 100) * 0.18
        return Math.max(1, Math.round(value * factor))
      }),
    [shift]
  )
  const psi = useMemo(() => calculatePSI(DRIFT_REFERENCE, live), [live])
  const verdict = driftVerdict(psi)

  const latency = 396 + Math.round(shift * 1.4)
  const success = Math.max(93, 99.4 - shift * 0.04).toFixed(1)
  const latencySeries = DRIFT_LIVE.map((value, index) => 340 + value * 3 + Math.sin(index / 2) * 24 + shift)
  const successSeries = DRIFT_LIVE.map((value, index) => 100 - (value / 40) - shift * 0.05 - Math.cos(index) * 0.3)
  const tokenSeries = DRIFT_LIVE.map((value, index) => 600 + value * 18 + Math.sin(index / 3) * 60)

  const features = [
    { name: 'Prompt-Länge', psi: 0.04 + shift * 0.0018 },
    { name: 'Sprache', psi: 0.02 + shift * 0.0009 },
    { name: 'Thema', psi: 0.06 + shift * 0.0024 },
    { name: 'Antwortzeit', psi: 0.03 + shift * 0.0015 }
  ]

  const inferences = [
    { time: '05:44', prompt: 'Fasse den Laborstatus zusammen', model: 'qwen2.5:7b', ms: 412, drift: 'stabil' },
    { time: '05:41', prompt: 'Welche Modelle laufen lokal?', model: 'llama3.2:3b', ms: 188, drift: 'stabil' },
    { time: '05:38', prompt: 'Erkläre die RAG-Pipeline', model: 'qwen2.5:7b', ms: 534, drift: 'beobachten' },
    { time: '05:31', prompt: 'Prüfe den Drift-Report', model: 'qwen2.5:7b', ms: 486, drift: 'beobachten' },
    { time: '05:24', prompt: 'Ist das Büro intakt?', model: 'llama3.2:3b', ms: 162, drift: 'stabil' }
  ]

  function simulate() {
    setShift(78)
    addEvent('Drift-Simulation gestartet · Live-Verteilung verschoben', 'warn')
  }

  return (
    <div className="stack">
      <section className="section-head">
        <div>
          <div className="eyebrow">Monitoring · Drift</div>
          <h1>Das Modell im Blick.</h1>
          <p>Referenz und Live-Daten werden verglichen. Der PSI zeigt, wann ein Modell nicht mehr zur Welt passt.</p>
        </div>
        <div className="section-head__stats">
          <div><strong>{psi.toFixed(2)}</strong><span>PSI</span></div>
          <div><strong>{success}%</strong><span>Erfolgsrate</span></div>
          <div><strong>0 €</strong><span>Kosten</span></div>
        </div>
      </section>

      <div className={`alert-banner alert-banner--${verdict.tone}`}>
        <span className="alert-banner__icon"><Icon name={verdict.tone === 'ok' ? 'check' : 'alert'} size={18} /></span>
        <div>
          <strong>Drift-Status: {verdict.level}</strong>
          <span>{verdict.text}</span>
        </div>
        <Badge tone={verdict.tone} dot>{psi.toFixed(3)} PSI</Badge>
      </div>

      <div className="monitor-grid">
        <Panel
          eyebrow="Verteilung · 24 h"
          title="Referenz vs. Live"
          className="monitor-chart-panel"
          actions={
            <div className="chart-legend">
              <span><i className="legend-line legend-line--ref" />Referenz</span>
              <span><i className="legend-line legend-line--live" />Live</span>
            </div>
          }
        >
          <DualChart reference={DRIFT_REFERENCE} live={live} />
          <div className="drift-control">
            <div className="drift-control__head">
              <span><Icon name="monitor" size={14} /> Live-Verteilung verschieben</span>
              <strong>{shift}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={shift}
              onChange={(event) => setShift(Number(event.target.value))}
              aria-label="Drift-Simulation"
            />
            <div className="drift-control__actions">
              <button type="button" className="btn btn--soft btn--tiny" onClick={simulate}><Icon name="bolt" size={13} /> Drift simulieren</button>
              <button type="button" className="btn btn--ghost btn--tiny" onClick={() => setShift(0)}><Icon name="refresh" size={13} /> Zurücksetzen</button>
              <span className="drift-control__hint">Alarm ab PSI 0,20 · Retraining nur mit Freigabe</span>
            </div>
          </div>
        </Panel>

        <div className="monitor-kpis">
          <article className="kpi-card">
            <div className="kpi-card__head"><span>Latenz p95</span><Icon name="clock" size={15} /></div>
            <strong>{latency} <small>ms</small></strong>
            <Sparkline data={latencySeries} tone="teal" height={40} />
          </article>
          <article className="kpi-card">
            <div className="kpi-card__head"><span>Erfolgsrate</span><Icon name="check" size={15} /></div>
            <strong>{success} <small>%</small></strong>
            <Sparkline data={successSeries} tone="lime" height={40} />
          </article>
          <article className="kpi-card">
            <div className="kpi-card__head"><span>Tokens / 24 h</span><Icon name="spark" size={15} /></div>
            <strong>{(tokenSeries.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}k</strong>
            <Sparkline data={tokenSeries} tone="violet" height={40} />
          </article>
          <article className="kpi-card">
            <div className="kpi-card__head"><span>Kosten / 24 h</span><Icon name="euro" size={15} /></div>
            <strong>0,00 <small>€</small></strong>
            <div className="kpi-card__free"><Dot tone="ok" pulse /> lokal · keine Cloud</div>
          </article>
        </div>
      </div>

      <div className="grid grid--2">
        <Panel eyebrow="Merkmale" title="Feature-Drift" actions={<Badge tone={verdict.tone}>{features.filter((f) => f.psi >= 0.2).length} Alarm</Badge>}>
          <div className="feature-list">
            {features.map((feature) => {
              const tone = feature.psi >= 0.2 ? 'danger' : feature.psi >= 0.1 ? 'warn' : 'ok'
              return (
                <div className="feature-row" key={feature.name}>
                  <div className="feature-row__head">
                    <span>{feature.name}</span>
                    <strong>{feature.psi.toFixed(3)}</strong>
                  </div>
                  <div className={`meter meter--thin meter--${tone}`}><span style={{ width: `${Math.min(100, feature.psi * 320)}%` }} /></div>
                  <div className="feature-row__foot">
                    <span>0,00</span>
                    <span>Schwelle 0,20</span>
                    <Badge tone={tone}>{tone === 'ok' ? 'stabil' : tone === 'warn' ? 'beobachten' : 'alarm'}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel eyebrow="Inferenz-Log" title="Letzte Anfragen" actions={<Badge tone="teal">24 h</Badge>}>
          <div className="inference-list">
            <div className="inference-row inference-row--head">
              <span>Zeit</span><span>Prompt</span><span>Modell</span><span>ms</span><span>Drift</span>
            </div>
            {inferences.map((row) => (
              <div className="inference-row" key={row.time}>
                <span className="mono">{row.time}</span>
                <span className="inference-row__prompt">{row.prompt}</span>
                <span className="mono">{row.model}</span>
                <span className="mono">{row.ms}</span>
                <span><Badge tone={row.drift === 'stabil' ? 'ok' : 'warn'}>{row.drift}</Badge></span>
              </div>
            ))}
          </div>
          <div className="monitor-note">
            <Icon name="shield" size={14} />
            <span>Bei Alarm wird ein Retraining <strong>vorgeschlagen</strong>, nie automatisch ausgerollt.</span>
          </div>
        </Panel>
      </div>
    </div>
  )
}
