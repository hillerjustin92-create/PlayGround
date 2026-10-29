import React, { useEffect, useMemo, useState } from 'react'
import { Panel, Badge, Dot, Icon } from './ui.jsx'
import { WORKFLOW_TEMPLATES } from '../data.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function stamp() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const KIND_LABEL = {
  source: 'Quelle',
  process: 'Verarbeitung',
  model: 'Modell',
  check: 'Prüfung',
  output: 'Ausgabe'
}

export default function Workflows({ lab, onAdd, onComplete, addEvent }) {
  const [selectedId, setSelectedId] = useState(lab.workflows[0]?.id)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({})
  const [logs, setLogs] = useState([])

  const selected = useMemo(
    () => lab.workflows.find((workflow) => workflow.id === selectedId) || lab.workflows[0],
    [lab.workflows, selectedId]
  )

  useEffect(() => {
    if (!lab.workflows.some((workflow) => workflow.id === selectedId) && lab.workflows[0]) {
      setSelectedId(lab.workflows[0].id)
    }
  }, [lab.workflows, selectedId])

  useEffect(() => {
    setProgress({})
    setLogs([])
  }, [selected?.id])

  const totalRuns = lab.workflows.reduce((sum, workflow) => sum + (workflow.runs || 0), 0)
  const done = Object.values(progress).filter((value) => value === 'ok').length
  const pct = selected ? Math.round((done / Math.max(1, selected.steps.length)) * 100) : 0

  async function run() {
    if (!selected || running) return
    setRunning(true)
    setProgress({})
    setLogs([`[${stamp()}] Lauf gestartet · ${selected.name}`, `[${stamp()}] Controller A01 plant, Worker B02 führt aus`])
    for (let index = 0; index < selected.steps.length; index++) {
      const step = selected.steps[index]
      setProgress((current) => ({ ...current, [index]: 'running' }))
      setLogs((current) => [...current, `[${stamp()}] ${step.name} · ${step.detail} …`])
      await wait(520 + ((index * 173) % 420))
      setProgress((current) => ({ ...current, [index]: 'ok' }))
      setLogs((current) => [...current, `[${stamp()}] ${step.name} · abgeschlossen`])
    }
    setLogs((current) => [...current, `[${stamp()}] Ergebnis gehasht · Audit-Log geschrieben`, `[${stamp()}] Lauf erfolgreich beendet`])
    setRunning(false)
    onComplete(selected.id, true)
  }

  function addTemplate(template) {
    const id = onAdd(template)
    setSelectedId(id)
    setProgress({})
    setLogs([`[${stamp()}] Vorlage geladen: ${template.name}`])
  }

  return (
    <div className="stack">
      <section className="section-head">
        <div>
          <div className="eyebrow">Chains · LangChain-Muster</div>
          <h1>Workflows, die das Labor bewegen.</h1>
          <p>Jeder Workflow ist eine Kette aus Quellen, Verarbeitung, Modell, Prüfung und Ausgabe. Ausführung nur auf B02.</p>
        </div>
        <div className="section-head__stats">
          <div><strong>{lab.workflows.length}</strong><span>Workflows</span></div>
          <div><strong>{totalRuns}</strong><span>Läufe</span></div>
          <div><strong>3×</strong><span>Retry-Limit</span></div>
        </div>
      </section>

      <div className="workflow-layout">
        <div className="workflow-side">
          <Panel eyebrow="Bibliothek" title="Meine Workflows" actions={<Badge tone="teal">{lab.workflows.length}</Badge>}>
            <div className="workflow-list">
              {lab.workflows.map((workflow) => (
                <button
                  type="button"
                  key={workflow.id}
                  className={`workflow-item ${selected?.id === workflow.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(workflow.id)}
                >
                  <span className="workflow-item__icon"><Icon name="chain" size={15} /></span>
                  <span className="workflow-item__body">
                    <strong>{workflow.name}</strong>
                    <span>{workflow.steps.length} Schritte · {workflow.runs || 0} Läufe</span>
                  </span>
                  <Dot tone={workflow.status === 'fehler' ? 'danger' : workflow.status === 'abgeschlossen' ? 'ok' : 'teal'} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Vorlagen" title="Neu anlegen">
            <div className="template-list">
              {WORKFLOW_TEMPLATES.map((template) => (
                <button type="button" className="template-item" key={template.id} onClick={() => addTemplate(template)}>
                  <span className="template-item__plus"><Icon name="plus" size={14} /></span>
                  <span>
                    <strong>{template.name}</strong>
                    <span>{template.goal}</span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {selected ? (
          <Panel
            eyebrow="Chain-Studio"
            title={selected.name}
            className="workflow-main"
            actions={<Badge tone={running ? 'warn' : 'ok'} dot>{running ? 'läuft' : 'bereit'}</Badge>}
          >
            <p className="workflow-desc">{selected.description}</p>
            <div className="workflow-tags">
              {selected.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              <span className="tag tag--kind">{selected.steps.length} Schritte</span>
            </div>

            <div className="chain-flow">
              {selected.steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className={`chain-step chain-step--${step.kind} ${progress[index] === 'running' ? 'is-running' : ''} ${progress[index] === 'ok' ? 'is-done' : ''}`}>
                    <div className="chain-step__head">
                      <span className="chain-step__index">{String(index + 1).padStart(2, '0')}</span>
                      <Badge tone={step.kind === 'check' ? 'ok' : step.kind === 'model' ? 'lime' : step.kind === 'source' ? 'teal' : 'neutral'}>
                        {KIND_LABEL[step.kind] || step.kind}
                      </Badge>
                      {progress[index] === 'ok' && <span className="chain-step__check"><Icon name="check" size={12} /></span>}
                      {progress[index] === 'running' && <span className="chain-step__spin"><Icon name="refresh" size={12} /></span>}
                    </div>
                    <strong className="chain-step__name">{step.name}</strong>
                    <span className="chain-step__detail">{step.detail}</span>
                  </div>
                  {index < selected.steps.length - 1 && (
                    <span className="chain-arrow" aria-hidden="true">
                      <Icon name="chevron" size={16} />
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="workflow-run">
              <div className="workflow-run__bar">
                <div className="workflow-run__meta">
                  <span>{running ? 'Ausführung auf B02 …' : done ? 'Lauf abgeschlossen' : 'Bereit zur Ausführung'}</span>
                  <strong>{pct}%</strong>
                </div>
                <div className="meter meter--tall"><span style={{ width: `${pct}%` }} /></div>
              </div>
              <div className="workflow-run__actions">
                <button type="button" className="btn btn--primary" onClick={run} disabled={running}>
                  <Icon name={running ? 'refresh' : 'play'} size={15} /> {running ? 'Läuft …' : 'Workflow ausführen'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setProgress({})
                    setLogs([])
                    addEvent('Workflow-Log zurückgesetzt', 'info')
                  }}
                  disabled={running}
                >
                  <Icon name="refresh" size={14} /> Zurücksetzen
                </button>
              </div>
            </div>

            <div className="terminal">
              <div className="terminal__head">
                <span className="terminal__dots"><i /><i /><i /></span>
                <span>audit.log · {selected.id}</span>
                <Badge tone="ok">sandbox</Badge>
              </div>
              <div className="terminal__body">
                {logs.length === 0 && <span className="terminal__muted">Noch kein Lauf. Starte den Workflow, um die Chain zu sehen.</span>}
                {logs.map((line, index) => (
                  <div className="terminal__line" key={`${line}-${index}`}>
                    <span className="terminal__prompt">$</span>{line}
                  </div>
                ))}
                {running && <div className="terminal__line terminal__line--cursor"><span className="terminal__prompt">$</span><span className="terminal__cursor" /></div>}
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Kein Workflow" eyebrow="Chain-Studio">
            <div className="empty-state">
              <Icon name="chain" size={22} />
              <strong>Noch kein Workflow.</strong>
              <span>Wähle links eine Vorlage.</span>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
