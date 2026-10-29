import React, { useMemo, useState } from 'react'
import { Panel, Badge, Dot, Icon, BotAvatar } from './ui.jsx'
import { ROOMS, OFFICE_CHECKS, NODES } from '../data.js'

function Furniture({ room }) {
  if (room.id === 'leitstand') {
    return (
      <g className="furniture">
        <rect x={room.x + 60} y={room.y + 92} width="120" height="34" rx="4" />
        <rect x={room.x + 72} y={room.y + 70} width="34" height="22" rx="2" />
        <rect x={room.x + 116} y={room.y + 70} width="34" height="22" rx="2" />
        <circle cx={room.x + 120} cy={room.y + 146} r="12" />
        <rect x={room.x + 210} y={room.y + 96} width="44" height="26" rx="4" />
        <path d={`M${room.x + 232} ${room.y + 96} v-18`} />
      </g>
    )
  }
  if (room.id === 'serverraum') {
    return (
      <g className="furniture">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={room.x + 42 + i * 58} y={room.y + 84} width="40" height="94" rx="4" />
            <line x1={room.x + 50 + i * 58} y1={room.y + 104} x2={room.x + 74 + i * 58} y2={room.y + 104} />
            <line x1={room.x + 50 + i * 58} y1={room.y + 120} x2={room.x + 74 + i * 58} y2={room.y + 120} />
            <line x1={room.x + 50 + i * 58} y1={room.y + 136} x2={room.x + 74 + i * 58} y2={room.y + 136} />
            <circle cx={room.x + 62 + i * 58} cy={room.y + 160} r="2.5" />
          </g>
        ))}
        <rect x={room.x + 190} y={room.y + 96} width="30" height="72" rx="3" />
      </g>
    )
  }
  if (room.id === 'sandbox') {
    return (
      <g className="furniture">
        <rect x={room.x + 50} y={room.y + 82} width="120" height="100" rx="8" className="furniture--dashed" />
        <rect x={room.x + 68} y={room.y + 100} width="84" height="12" rx="2" />
        <rect x={room.x + 68} y={room.y + 122} width="54" height="8" rx="2" />
        <rect x={room.x + 68} y={room.y + 140} width="70" height="8" rx="2" />
        <circle cx={room.x + 226} cy={room.y + 132} r="20" />
        <path d={`M${room.x + 226} ${room.y + 112} v40 M${room.x + 206} ${room.y + 132} h40`} />
      </g>
    )
  }
  if (room.id === 'werkstatt') {
    return (
      <g className="furniture">
        <rect x={room.x + 40} y={room.y + 92} width="110" height="42" rx="4" />
        <rect x={room.x + 58} y={room.y + 108} width="22" height="10" rx="2" />
        <rect x={room.x + 92} y={room.y + 108} width="34" height="10" rx="2" />
        <rect x={room.x + 170} y={room.y + 72} width="58" height="84" rx="3" className="furniture--board" />
        <line x1={room.x + 182} y1={room.y + 92} x2={room.x + 216} y2={room.y + 92} />
        <line x1={room.x + 182} y1={room.y + 108} x2={room.x + 208} y2={room.y + 108} />
        <line x1={room.x + 182} y1={room.y + 124} x2={room.x + 220} y2={room.y + 124} />
      </g>
    )
  }
  if (room.id === 'archiv') {
    return (
      <g className="furniture">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={room.x + 40 + i * 52} y={room.y + 86} width="36" height="96" rx="3" />
        ))}
        <rect x={room.x + 190} y={room.y + 112} width="42" height="52" rx="4" />
      </g>
    )
  }
  return (
    <g className="furniture">
      <ellipse cx={room.x + 160} cy={room.y + 128} rx="76" ry="38" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        return <circle key={i} cx={room.x + 160 + Math.cos(angle) * 96} cy={room.y + 128 + Math.sin(angle) * 58} r="9" />
      })}
      <rect x={room.x + 270} y={room.y + 92} width="34" height="24" rx="3" />
    </g>
  )
}

export default function Office({ lab }) {
  const [selected, setSelected] = useState('leitstand')
  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState(null)
  const room = useMemo(() => ROOMS.find((item) => item.id === selected) || ROOMS[0], [selected])

  function runCheck() {
    if (checking) return
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setCheckedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
    }, 1300)
  }

  return (
    <div className="stack">
      <section className="office-hero">
        <div>
          <div className="eyebrow">Grundriss · 10.77.0.0/24</div>
          <h1>Voll intaktes Büro.</h1>
          <p>
            Sechs Räume, zwei Nodes, ein Agent. Der Leitstand plant, der Serverraum führt aus, die Sandbox
            isoliert, das Archiv erinnert sich. Alles verbunden, alles geprüft.
          </p>
          <div className="office-hero__badges">
            <Badge tone="ok" dot>6/6 Räume intakt</Badge>
            <Badge tone="teal">A01 ↔ B02 bestätigt</Badge>
            <Badge tone="lime">0 offene Alarme</Badge>
          </div>
        </div>
        <div className="office-hero__side">
          <BotAvatar size={92} active />
          <div>
            <strong>Büro-Check</strong>
            <span>{checking ? 'Prüfung läuft …' : checkedAt ? `Zuletzt ${checkedAt}` : 'Bereit zur Prüfung'}</span>
          </div>
          <button type="button" className="btn btn--primary" onClick={runCheck} disabled={checking}>
            <Icon name={checking ? 'refresh' : 'shield'} size={16} /> {checking ? 'Prüfe …' : 'Jetzt prüfen'}
          </button>
        </div>
      </section>

      <div className="office-layout">
        <Panel
          eyebrow="Interaktiv"
          title="Labor-Grundriss"
          actions={<Badge tone="ok" dot>voll intakt</Badge>}
          className="office-panel"
        >
          <div className="floorplan">
            <svg viewBox="0 0 1000 560" role="img" aria-label="Grundriss des KI-Labors">
              <defs>
                <pattern id="floorGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M28 0H0V28" fill="none" stroke="var(--line-soft)" strokeWidth="0.6" />
                </pattern>
                <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
                  <stop offset="0.5" stopColor="var(--accent)" stopOpacity="0.5" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="1000" height="560" rx="20" className="floorplan__base" />
              <rect x="0" y="0" width="1000" height="560" rx="20" fill="url(#floorGrid)" />
              <rect x="0" y="250" width="1000" height="30" className="floorplan__corridor" />
              <text x="18" y="270" className="floorplan__corridor-label">KORRIDOR · 10.77.0.0/24</text>

              {ROOMS.map((item) => (
                <g
                  key={item.id}
                  className={`room room--${item.color} ${selected === item.id ? 'is-selected' : ''}`}
                  onClick={() => setSelected(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(item.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.name} auswählen`}
                  aria-pressed={selected === item.id}
                >
                  <rect x={item.x} y={item.y} width={item.w} height={item.h} rx="14" className="room__floor" />
                  <rect x={item.x + 10} y={item.y + 10} width={item.w - 20} height={item.h - 20} rx="10" className="room__outline" />
                  <text x={item.x + 24} y={item.y + 34} className="room__name">{item.name}</text>
                  <text x={item.x + 24} y={item.y + 52} className="room__node">{item.node} · {item.status}</text>
                  <circle cx={item.x + item.w - 26} cy={item.y + 30} r="5" className="room__dot" />
                  <Furniture room={item} />
                  <rect x={item.x + 14} y={item.y + item.h - 32} width={item.w - 28} height="18" rx="4" className="room__labelbar" />
                  <text x={item.x + 22} y={item.y + item.h - 19} className="room__meta">{item.equipment.length} Geräte · {item.people.length} Agenten</text>
                </g>
              ))}

              <path d="M340 255 H370" className="floorplan__door" />
              <path d="M620 255 H650" className="floorplan__door" />
              <path d="M310 255 H340" className="floorplan__door" />
              <path d="M600 255 H620" className="floorplan__door" />
              <path d="M175 250 V280" className="floorplan__door" />
              <path d="M470 250 V280" className="floorplan__door" />
              <path d="M795 250 V280" className="floorplan__door" />
              <rect x="0" y="0" width="1000" height="3" className="floorplan__scan" />
            </svg>
            <div className="floorplan__legend">
              {ROOMS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`legend-chip legend-chip--${item.color} ${selected === item.id ? 'is-active' : ''}`}
                  onClick={() => setSelected(item.id)}
                >
                  <span />{item.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <aside className="office-side">
          <Panel eyebrow={room.node} title={room.name} className={`room-detail room-detail--${room.color}`}>
            <div className="room-detail__status">
              <Badge tone="ok" dot>{room.status}</Badge>
              <span>{NODES[room.node]?.device}</span>
            </div>
            <p className="room-detail__desc">{room.description}</p>
            <div className="room-detail__section">
              <span className="eyebrow">Ausstattung</span>
              <div className="room-detail__tags">
                {room.equipment.map((item) => <span className="tag" key={item}>{item}</span>)}
              </div>
            </div>
            <div className="room-detail__section">
              <span className="eyebrow">Anwesend</span>
              <div className="room-detail__people">
                {room.people.length ? room.people.map((person) => (
                  <span className="person-chip" key={person}><Dot tone="ok" />{person}</span>
                )) : <span className="muted">Niemand · autonom</span>}
              </div>
            </div>
            <div className="room-detail__foot">
              <Icon name="check" size={14} />
              <span>Raum geprüft · Strom, Netz, Zugang intakt</span>
            </div>
          </Panel>

          <Panel eyebrow="Checkliste" title="Büro intakt" className="office-checks">
            <div className="check-list check-list--compact">
              {OFFICE_CHECKS.map((check) => (
                <div className="check-row" key={check.id}>
                  <span className="check-row__icon"><Icon name="check" size={13} /></span>
                  <div className="check-row__text">
                    <strong>{check.label}</strong>
                    <span>{check.detail}</span>
                  </div>
                  <Badge tone="ok">ok</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
