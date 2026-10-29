import React, { useMemo } from 'react'
import { Panel, Badge, Dot, Icon, Gauge, BotAvatar } from './ui.jsx'
import { LABOR, NODES, ROOMS, OFFICE_CHECKS, DRIFT_REFERENCE, DRIFT_LIVE } from '../data.js'
import { calculatePSI, driftVerdict } from '../engine.js'

const SECURITY = [
  { key: 'controllerIsAuthority', label: 'Controller ist Autorität', detail: 'A01 entscheidet' },
  { key: 'workerIsExecutor', label: 'Worker ist Executor', detail: 'B02 führt aus' },
  { key: 'sandboxRequired', label: 'Sandbox verpflichtend', detail: 'Docker, kein Netz' },
  { key: 'auditLogging', label: 'Audit-Logging', detail: 'Jeder Auftrag' },
  { key: 'resultHashing', label: 'Ergebnis-Hashing', detail: 'SHA-256' },
  { key: 'checkpoints', label: 'Checkpoints', detail: 'vor Risiko-Schritten' }
]

function MiniOffice() {
  return (
    <svg className="mini-office" viewBox="0 0 1000 560" role="img" aria-label="Miniatur-Grundriss des Labors">
      <rect x="0" y="0" width="1000" height="560" rx="18" className="mini-office__floor" />
      {ROOMS.map((room) => (
        <g key={room.id}>
          <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="12" className={`mini-office__room mini-office__room--${room.color}`} />
          <rect x={room.x + 14} y={room.y + 14} width={room.w - 28} height={room.h - 28} rx="8" className="mini-office__inner" />
          <text x={room.x + 24} y={room.y + 40} className="mini-office__label">{room.name}</text>
        </g>
      ))}
      <line x1="340" y1="255" x2="370" y2="255" className="mini-office__door" />
      <line x1="620" y1="255" x2="650" y2="255" className="mini-office__door" />
      <line x1="310" y1="255" x2="340" y2="255" className="mini-office__door" />
      <line x1="600" y1="255" x2="630" y2="255" className="mini-office__door" />
      <line x1="175" y1="250" x2="175" y2="280" className="mini-office__door" />
      <line x1="470" y1="250" x2="470" y2="280" className="mini-office__door" />
      <line x1="795" y1="250" x2="795" y2="280" className="mini-office__door" />
    </svg>
  )
}

export default function Overview({ lab, clock, counts, onNavigate, addEvent }) {
  const psi = useMemo(() => calculatePSI(DRIFT_REFERENCE, DRIFT_LIVE), [])
  const verdict = driftVerdict(psi)
  const runs = lab.workflows.reduce((total, workflow) => total + (workflow.runs || 0), 0)
  const hour = clock.getHours()
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__copy">
          <div className="hero__eyebrow">
            <Dot tone="ok" pulse />
            <span>BEXP-01 · online</span>
            <span className="hero__sep" />
            <span>{LABOR.mode} · {LABOR.os}</span>
          </div>
          <h1>
            {greeting}, Operator.
            <span>Das Labor ist bereit.</span>
          </h1>
          <p className="hero__lead">
            Zwei Nodes, freie Modelle, ein Agent. BEXP-01 plant auf A01, führt auf B02 aus und prüft jedes
            Ergebnis, bevor es das Labor verlässt. Vollständig lokal, vollständig intakt.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('bot')}>
              <Icon name="bot" size={17} /> Mit BEXP-01 sprechen
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onNavigate('workflows')}>
              <Icon name="play" size={15} /> Workflow starten
            </button>
          </div>
          <div className="hero__facts">
            <div><strong>{counts.online}/2</strong><span>Nodes online</span></div>
            <div><strong>{counts.ready}</strong><span>Modelle bereit</span></div>
            <div><strong>0 €</strong><span>pro Anfrage</span></div>
            <div><strong>{LABOR.security.retryLimit}×</strong><span>Retry-Limit</span></div>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__orbit hero__orbit--outer" />
          <div className="hero__orbit hero__orbit--inner" />
          <div className="hero__avatar">
            <BotAvatar size={168} active />
          </div>
          <div className="hero__tag hero__tag--a">
            <Dot tone="ok" pulse />
            <span>Denkt auf A01</span>
          </div>
          <div className="hero__tag hero__tag--b">
            <Dot tone="teal" pulse />
            <span>Baut auf B02</span>
          </div>
          <div className="hero__tag hero__tag--c">
            <Icon name="shield" size={13} />
            <span>Sandbox aktiv</span>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__icon stat-card__icon--lime"><Icon name="wifi" size={17} /></span>
            <Badge tone="ok" dot>stabil</Badge>
          </div>
          <strong className="stat-card__value">{counts.online}<span>/2</span></strong>
          <span className="stat-card__label">Nodes online</span>
          <div className="stat-card__foot"><span>A01 · B02</span><span>10.77.0.0/24</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__icon stat-card__icon--teal"><Icon name="models" size={17} /></span>
            <Badge tone="lime">free</Badge>
          </div>
          <strong className="stat-card__value">{counts.ready}<span>/{lab.models.length}</span></strong>
          <span className="stat-card__label">Modelle bereit</span>
          <div className="stat-card__foot"><span>Ollama · lokal</span><span>0 €</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__icon stat-card__icon--violet"><Icon name="chain" size={17} /></span>
            <Badge tone="teal">{lab.workflows.length} aktiv</Badge>
          </div>
          <strong className="stat-card__value">{runs}<span> Läufe</span></strong>
          <span className="stat-card__label">Workflows ausgeführt</span>
          <div className="stat-card__foot"><span>{lab.frameworks.filter((f) => f.installed).length} Frameworks</span><span>max. 3 Retries</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className={`stat-card__icon stat-card__icon--${verdict.tone}`}><Icon name="monitor" size={17} /></span>
            <Badge tone={verdict.tone} dot>{verdict.level}</Badge>
          </div>
          <strong className="stat-card__value">{psi.toFixed(2)}</strong>
          <span className="stat-card__label">Drift PSI</span>
          <div className="stat-card__foot"><span>Referenz vs. live</span><span>Alarm ab 0,20</span></div>
        </article>
      </div>

      <div className="grid grid--2">
        <Panel
          eyebrow="Infrastruktur"
          title="Labor-Knoten"
          actions={<button type="button" className="link-btn" onClick={() => onNavigate('office')}>Grundriss <Icon name="chevron" size={14} /></button>}
        >
          <div className="node-list">
            {Object.values(NODES).map((node) => {
              const live = lab.nodes[node.id] || {}
              return (
                <article className="node-card" key={node.id}>
                  <header className="node-card__head">
                    <div className="node-card__id">
                      <span className={`node-card__badge node-card__badge--${node.color}`}>{node.id}</span>
                      <div>
                        <strong>{node.device}</strong>
                        <span>{node.role} · {node.ip}</span>
                      </div>
                    </div>
                    <Badge tone="ok" dot>{live.status || 'online'}</Badge>
                  </header>
                  <div className="node-card__body">
                    <div className="node-card__gauges">
                      <Gauge value={live.cpu ?? 0} label="CPU" tone={node.color} size={78} />
                      <Gauge value={live.ram ?? 0} label="RAM" tone={node.color} size={78} />
                      <div className="node-card__ping">
                        <span>Ping</span>
                        <strong>{live.ping ?? '–'}<small>ms</small></strong>
                        <span className="node-card__seen">seit {live.lastSeen || '–'}</span>
                      </div>
                    </div>
                    <div className="node-card__services">
                      {node.services.map((service) => (
                        <div className="service-row" key={service.name}>
                          <span className="service-row__name"><Dot tone="ok" />{service.name}</span>
                          <span className="service-row__port">:{service.port}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="node-card__tags">
                    {node.responsibilities.slice(0, 5).map((item) => (
                      <span className="tag" key={item}>{item}</span>
                    ))}
                    {node.responsibilities.length > 5 && <span className="tag tag--more">+{node.responsibilities.length - 5}</span>}
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>

        <Panel
          eyebrow="Sicherheit"
          title="Betriebscheck"
          actions={<Badge tone="ok" dot>6/6 intakt</Badge>}
        >
          <div className="check-list">
            {SECURITY.map((item) => (
              <div className="check-row" key={item.key}>
                <span className="check-row__icon"><Icon name="check" size={14} /></span>
                <div className="check-row__text">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <Badge tone={LABOR.security[item.key] ? 'ok' : 'warn'}>{LABOR.security[item.key] ? 'aktiv' : 'aus'}</Badge>
              </div>
            ))}
          </div>
          <div className="check-note">
            <Icon name="lock" size={15} />
            <span>Generierter Code verlässt die Sandbox nur mit Hash und Audit-Eintrag.</span>
          </div>
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel
          eyebrow="Räume"
          title="Büro-Status"
          actions={<button type="button" className="link-btn" onClick={() => onNavigate('office')}>Öffnen <Icon name="chevron" size={14} /></button>}
        >
          <div className="office-preview">
            <MiniOffice />
            <div className="office-preview__side">
              <div className="office-preview__headline">
                <Badge tone="ok" dot>voll intakt</Badge>
                <span>6 Räume verbunden</span>
              </div>
              <div className="room-chips">
                {ROOMS.map((room) => (
                  <span className={`room-chip room-chip--${room.color}`} key={room.id}>
                    <Dot tone="ok" />{room.name}
                  </span>
                ))}
              </div>
              <div className="office-preview__checks">
                {OFFICE_CHECKS.slice(0, 3).map((check) => (
                  <div key={check.id}><Icon name="check" size={13} /><span>{check.label}</span></div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Audit"
          title="Letzte Ereignisse"
          actions={<button type="button" className="link-btn" onClick={() => { addEvent('Audit-Log manuell geprüft · 0 Fehler', 'ok') }}>Log prüfen <Icon name="refresh" size={14} /></button>}
        >
          <div className="event-list">
            {lab.events.slice(0, 6).map((event) => (
              <div className="event-row" key={event.id}>
                <span className="event-row__time">{event.time}</span>
                <Dot tone={event.type === 'ok' ? 'ok' : event.type === 'warn' ? 'warn' : 'teal'} />
                <span className="event-row__text">{event.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
