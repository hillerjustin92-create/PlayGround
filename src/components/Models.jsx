import React, { useMemo, useState } from 'react'
import { Panel, Badge, Dot, Icon } from './ui.jsx'

const KIND_FILTERS = [
  { id: 'alle', label: 'Alle' },
  { id: 'lokal', label: 'Lokal' },
  { id: 'cloud', label: 'Cloud · free' }
]

export default function Models({ lab, onLoad }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('alle')
  const [fit, setFit] = useState('alle')

  const filtered = lab.models.filter((model) => {
    const matchesKind = kind === 'alle' || model.kind === kind
    const matchesFit = fit === 'alle' || model.fit.includes(fit)
    const haystack = `${model.name} ${model.vendor} ${model.tags.join(' ')}`.toLowerCase()
    return matchesKind && matchesFit && haystack.includes(query.toLowerCase())
  })

  const stats = useMemo(() => {
    const local = lab.models.filter((model) => model.kind === 'lokal')
    const ready = lab.models.filter((model) => model.status === 'ready')
    const usedA01 = ready.filter((model) => model.kind === 'lokal' && model.fit.includes('A01')).reduce((sum, model) => sum + model.ram, 0)
    const usedB02 = ready.filter((model) => model.kind === 'lokal' && model.fit.includes('B02')).reduce((sum, model) => sum + model.ram, 0)
    return { local: local.length, ready: ready.length, usedA01, usedB02 }
  }, [lab.models])

  return (
    <div className="stack">
      <section className="section-head">
        <div>
          <div className="eyebrow">Freie KI · lokal zuerst</div>
          <h1>Modelle, die nichts kosten.</h1>
          <p>Lokale Modelle laufen auf A01 und B02. Cloud-Free-Modelle sind optional, brauchen einen Key und fallen bei Limits auf LabLM-1 zurück.</p>
        </div>
        <div className="section-head__stats">
          <div><strong>{stats.local}</strong><span>lokale Modelle</span></div>
          <div><strong>{stats.ready}</strong><span>bereit</span></div>
          <div><strong>0 €</strong><span>pro Anfrage</span></div>
        </div>
      </section>

      <div className="grid grid--2">
        <Panel eyebrow="A01 · Controller" title="ThinkPad T460" actions={<Badge tone="ok" dot>online</Badge>}>
          <div className="hardware">
            <div className="hardware__head">
              <span>RAM-Belegung durch Modelle</span>
              <strong>{stats.usedA01} / 16 GB</strong>
            </div>
            <div className="meter meter--tall"><span style={{ width: `${Math.min(100, (stats.usedA01 / 16) * 100)}%` }} /></div>
            <div className="hardware__foot">
              <span><Icon name="cpu" size={13} /> Intel i5-6300U</span>
              <span><Icon name="models" size={13} /> kleine Modelle bis 4 GB</span>
            </div>
          </div>
        </Panel>
        <Panel eyebrow="B02 · Worker" title="Dell Precision M4800" actions={<Badge tone="ok" dot>online</Badge>}>
          <div className="hardware">
            <div className="hardware__head">
              <span>RAM-Belegung durch Modelle</span>
              <strong>{stats.usedB02} / 32 GB</strong>
            </div>
            <div className="meter meter--tall"><span style={{ width: `${Math.min(100, (stats.usedB02 / 32) * 100)}%` }} /></div>
            <div className="hardware__foot">
              <span><Icon name="cpu" size={13} /> Intel i7-4800MQ</span>
              <span><Icon name="models" size={13} /> 7B–8B Modelle</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        eyebrow="Katalog"
        title="Freie Modelle"
        actions={<Badge tone="teal">{filtered.length} Modelle</Badge>}
      >
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Modell suchen …" aria-label="Modell suchen" />
          </label>
          <div className="filter-row">
            {KIND_FILTERS.map((item) => (
              <button type="button" key={item.id} className={`filter-chip ${kind === item.id ? 'is-active' : ''}`} onClick={() => setKind(item.id)}>
                {item.label}
              </button>
            ))}
            <span className="filter-divider" />
            {['alle', 'A01', 'B02'].map((item) => (
              <button type="button" key={item} className={`filter-chip ${fit === item ? 'is-active' : ''}`} onClick={() => setFit(item)}>
                {item === 'alle' ? 'Jeder Node' : item}
              </button>
            ))}
          </div>
        </div>

        <div className="model-grid">
          {filtered.map((model) => (
            <article className="model-card" key={model.id}>
              <header className="model-card__head">
                <div className={`model-card__mark model-card__mark--${model.kind}`}>{model.vendor.slice(0, 2).toUpperCase()}</div>
                <div className="model-card__title">
                  <strong>{model.name}</strong>
                  <span>{model.vendor} · {model.params}</span>
                </div>
                <Badge tone={model.status === 'ready' ? 'ok' : model.status === 'loading' ? 'warn' : 'neutral'} dot={model.status === 'ready'}>
                  {model.status === 'ready' ? 'bereit' : model.status === 'loading' ? 'lädt' : 'verfügbar'}
                </Badge>
              </header>

              <div className="model-card__specs">
                <div><span>Größe</span><strong>{model.size}</strong></div>
                <div><span>Quant</span><strong>{model.quant}</strong></div>
                <div><span>RAM</span><strong>{model.ram ? `${model.ram} GB` : 'Cloud'}</strong></div>
              </div>

              <div className="model-card__bars">
                <div>
                  <div className="bar-head"><span>Tempo</span><strong>{model.speed}</strong></div>
                  <div className="meter meter--thin"><span style={{ width: `${model.speed}%` }} /></div>
                </div>
                <div>
                  <div className="bar-head"><span>Qualität</span><strong>{model.quality}</strong></div>
                  <div className="meter meter--thin meter--teal"><span style={{ width: `${model.quality}%` }} /></div>
                </div>
              </div>

              <p className="model-card__note">{model.note}</p>

              <div className="model-card__tags">
                <span className="tag tag--kind">{model.kind === 'lokal' ? 'lokal' : 'cloud'}</span>
                {model.fit.map((node) => <span className="tag" key={node}>{node}</span>)}
                {model.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              </div>

              <footer className="model-card__foot">
                <span className="model-card__license">{model.license}</span>
                <button
                  type="button"
                  className={`btn btn--tiny ${model.status === 'ready' ? 'btn--ghost' : 'btn--soft'}`}
                  onClick={() => onLoad(model.id)}
                  disabled={model.status === 'loading' || model.status === 'ready'}
                >
                  {model.status === 'loading' ? <><Icon name="refresh" size={13} /> lädt …</> : model.status === 'ready' ? <><Icon name="check" size={13} /> bereit</> : <><Icon name="download" size={13} /> laden</>}
                </button>
              </footer>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon name="models" size={22} />
            <strong>Kein Modell gefunden.</strong>
            <span>Ändere Filter oder Suchbegriff.</span>
          </div>
        )}
      </Panel>

      <div className="info-strip">
        <Dot tone="teal" pulse />
        <span><strong>Lokal zuerst:</strong> Ollama auf A01 und B02. Cloud-Free nur auf Wunsch, mit eigenem Key und ehrlichem Fallback.</span>
      </div>
    </div>
  )
}
