import React, { useMemo, useState } from 'react'
import { Panel, Badge, Icon } from './ui.jsx'

export default function Frameworks({ lab, onToggle }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Alle')
  const [selected, setSelected] = useState(null)
  const [copied, setCopied] = useState(false)

  const categories = useMemo(() => ['Alle', ...new Set(lab.frameworks.map((item) => item.category))], [lab.frameworks])
  const featured = lab.frameworks.find((item) => item.id === 'langchain')
  const filtered = lab.frameworks.filter((item) => {
    const matchesCategory = category === 'Alle' || item.category === category
    const haystack = `${item.name} ${item.desc} ${item.language} ${item.category}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  })
  const installedCount = lab.frameworks.filter((item) => item.installed).length

  function open(framework) {
    setSelected(framework)
    setCopied(false)
  }

  async function copySnippet() {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected.snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="stack">
      <section className="section-head">
        <div>
          <div className="eyebrow">Werkzeuge · Open Source</div>
          <h1>Frameworks für das Labor.</h1>
          <p>Alles, was BEXP-01 zum Denken, Erinnern, Bauen und Prüfen braucht. Lokal, kostenlos, nachvollziehbar.</p>
        </div>
        <div className="section-head__stats">
          <div><strong>{lab.frameworks.length}</strong><span>Frameworks</span></div>
          <div><strong>{installedCount}</strong><span>installiert</span></div>
          <div><strong>0 €</strong><span>Lizenzkosten</span></div>
        </div>
      </section>

      {featured && (
        <Panel className="featured-framework" eyebrow="Empfohlen" title="LangChain">
          <div className="featured-framework__grid">
            <div className="featured-framework__copy">
              <div className="featured-framework__badges">
                <Badge tone="lime">MIT</Badge>
                <Badge tone="teal">Python / JS</Badge>
                <Badge tone="ok" dot>installiert</Badge>
              </div>
              <p>{featured.desc}</p>
              <p className="featured-framework__detail">
                BEXP-01 nutzt dasselbe Muster lokal: <strong>RunnableSequence</strong> aus Router, Retriever,
                Planner, Modell und Guardrails. Jeder Schritt bekommt die Ausgabe des vorherigen.
              </p>
              <div className="featured-framework__actions">
                <button type="button" className="btn btn--primary" onClick={() => open(featured)}>
                  <Icon name="code" size={16} /> Code ansehen
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => onToggle(featured.id)}>
                  <Icon name={featured.installed ? 'check' : 'plus'} size={15} />
                  {featured.installed ? 'Installiert' : 'Installieren'}
                </button>
              </div>
            </div>
            <pre className="featured-framework__code"><code>{featured.snippet}</code></pre>
          </div>
        </Panel>
      )}

      <Panel
        eyebrow="Katalog"
        title="Alle Werkzeuge"
        actions={<Badge tone="teal">{filtered.length} Treffer</Badge>}
      >
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Framework suchen …" aria-label="Framework suchen" />
          </label>
          <div className="filter-row">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={`filter-chip ${category === item ? 'is-active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="framework-grid">
          {filtered.map((framework) => (
            <article className="framework-card" key={framework.id} onClick={() => open(framework)}>
              <header className="framework-card__head">
                <div className="framework-card__mark">{framework.name.slice(0, 2).toUpperCase()}</div>
                <div className="framework-card__title">
                  <strong>{framework.name}</strong>
                  <span>{framework.category}</span>
                </div>
                <Badge tone={framework.installed ? 'ok' : 'neutral'} dot={framework.installed}>
                  {framework.installed ? 'aktiv' : 'optional'}
                </Badge>
              </header>
              <p className="framework-card__desc">{framework.desc}</p>
              <div className="framework-card__meta">
                <span><Icon name="book" size={12} />{framework.license}</span>
                <span><Icon name="code" size={12} />{framework.language}</span>
              </div>
              <div className="framework-card__maturity">
                <div className="framework-card__maturity-head"><span>Reifegrad</span><strong>{framework.maturity}%</strong></div>
                <div className="meter"><span style={{ width: `${framework.maturity}%` }} /></div>
              </div>
              <footer className="framework-card__foot">
                <button
                  type="button"
                  className={`btn btn--tiny ${framework.installed ? 'btn--ghost' : 'btn--soft'}`}
                  onClick={(event) => { event.stopPropagation(); onToggle(framework.id) }}
                >
                  {framework.installed ? 'Deinstallieren' : 'Installieren'}
                </button>
                <span className="link-btn">Details <Icon name="chevron" size={13} /></span>
              </footer>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Icon name="search" size={22} />
            <strong>Kein Framework gefunden.</strong>
            <span>Ändere den Suchbegriff oder die Kategorie.</span>
          </div>
        )}
      </Panel>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)} role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-label={selected.name} onClick={(event) => event.stopPropagation()}>
            <header className="modal__head">
              <div className="modal__title">
                <div className="framework-card__mark framework-card__mark--large">{selected.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2>{selected.name}</h2>
                  <span>{selected.category} · {selected.language} · {selected.license}</span>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelected(null)} aria-label="Schließen">
                <Icon name="close" size={17} />
              </button>
            </header>
            <p className="modal__desc">{selected.desc}</p>
            <div className="modal__meta">
              <Badge tone={selected.installed ? 'ok' : 'neutral'} dot={selected.installed}>
                {selected.installed ? 'im Labor aktiv' : 'nicht installiert'}
              </Badge>
              <Badge tone="teal">Reifegrad {selected.maturity}%</Badge>
              <Badge tone="lime">0 €</Badge>
            </div>
            <div className="modal__code-head">
              <span className="eyebrow">Beispiel</span>
              <button type="button" className="btn btn--tiny btn--ghost" onClick={copySnippet}>
                <Icon name={copied ? 'check' : 'download'} size={13} /> {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
            <pre className="modal__code"><code>{selected.snippet}</code></pre>
            <footer className="modal__foot">
              <button type="button" className="btn btn--primary" onClick={() => onToggle(selected.id)}>
                <Icon name={selected.installed ? 'trash' : 'plus'} size={15} />
                {selected.installed ? 'Deinstallieren' : 'Installieren'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>Schließen</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
