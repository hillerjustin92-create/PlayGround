import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Badge, Dot, Icon, BotAvatar, RichText } from './ui.jsx'
import { QUICK_PROMPTS } from '../data.js'
import { runAgent } from '../engine.js'

const TOOLS = [
  { icon: 'book', name: 'Wissens-Retriever', detail: 'Laborhandbuch · 12 Einträge' },
  { icon: 'chain', name: 'Workflow-Planner', detail: 'Chains · Vorlagen' },
  { icon: 'monitor', name: 'Drift-Analyse', detail: 'PSI · Schwellen' },
  { icon: 'code', name: 'Code-Sandbox', detail: 'B02 · Docker' },
  { icon: 'office', name: 'Büro-Check', detail: '6 Räume' }
]

function timeNow() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

const WELCOME = `Willkommen im Leitstand. Ich bin **BEXP-01**, der Agent dieses Labors.

Ich denke auf **A01**, baue auf **B02** und prüfe jedes Ergebnis in der Sandbox. Frag mich nach dem Systemstatus, nach einem passenden freien Modell, einem Workflow, dem Drift oder dem Büro.

Tipp: \`Hilfe\` zeigt alle Kommandos.`

export default function Bot({ lab, setLab, onActions, addEvent, onNavigate }) {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [pending, setPending] = useState([])
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const messages = lab.messages || []
  const providerMode = lab.provider?.mode || 'local'

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages.length, thinking, pending.length])

  const providerLabel = useMemo(() => {
    if (providerMode === 'local') return 'LabLM-1 · lokal · 0 €'
    if (providerMode === 'ollama') return `Ollama · ${lab.provider.model || 'qwen2.5:7b'}`
    if (providerMode === 'openrouter') return `OpenRouter · ${lab.provider.model || 'free'}`
    if (providerMode === 'opencode') return `OpenCode Zen · ${lab.provider.model || 'free'}`
    return providerMode
  }, [providerMode, lab.provider])

  async function send(value) {
    const text = (value ?? input).trim()
    if (!text || thinking) return
    setInput('')
    const userMessage = { id: `m-${Date.now()}`, role: 'user', text, time: timeNow() }
    setLab((current) => ({ ...current, messages: [...(current.messages || []), userMessage].slice(-80) }))
    setThinking(true)
    setPending([])
    try {
      const result = await runAgent({
        input: text,
        lab,
        provider: lab.provider,
        onStep: (steps) => setPending(steps)
      })
      const botMessage = {
        id: `m-${Date.now()}-b`,
        role: 'bot',
        text: result.text,
        time: timeNow(),
        steps: result.steps,
        meta: result.meta,
        intent: result.intent
      }
      setLab((current) => ({ ...current, messages: [...(current.messages || []), botMessage].slice(-80) }))
      onActions(result.actions)
    } catch (error) {
      const botMessage = {
        id: `m-${Date.now()}-e`,
        role: 'bot',
        text: `**Fehler im Agentenlauf.**\n\n${error.message}\n\nIch bleibe lokal erreichbar. Prüfe den Provider oder starte einen neuen Versuch.`,
        time: timeNow(),
        steps: [],
        meta: { model: 'LabLM-1 · lokal', cost: '0,00 €', ms: 0, tokens: 0 }
      }
      setLab((current) => ({ ...current, messages: [...(current.messages || []), botMessage].slice(-80) }))
      addEvent(`Agentenlauf fehlgeschlagen: ${error.message}`, 'warn')
    } finally {
      setThinking(false)
      setPending([])
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function clearChat() {
    setLab((current) => ({ ...current, messages: [] }))
    addEvent('Chat-Verlauf gelöscht · Gedächtnis bleibt lokal', 'info')
  }

  const memoryPct = Math.min(100, Math.round((messages.length / 80) * 100))

  return (
    <div className="bot-layout">
      <section className="chat panel">
        <header className="chat__head">
          <div className="chat__identity">
            <BotAvatar size={44} active={thinking} />
            <div>
              <div className="chat__name">BEXP-01 <Badge tone="ok" dot>online</Badge></div>
              <div className="chat__sub">Labor-Agent · A01 · {providerLabel}</div>
            </div>
          </div>
          <div className="chat__head-actions">
            <Badge tone={providerMode === 'local' ? 'lime' : 'teal'}>
              <Icon name={providerMode === 'local' ? 'cpu' : 'wifi'} size={13} />
              {providerMode === 'local' ? 'offline-fähig' : 'extern'}
            </Badge>
            <button type="button" className="icon-btn" title="Verlauf löschen" onClick={clearChat} aria-label="Verlauf löschen">
              <Icon name="trash" size={16} />
            </button>
          </div>
        </header>

        <div className="chat__scroll" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="msg msg--bot">
              <BotAvatar size={34} />
              <div className="msg__body">
                <div className="msg__meta"><strong>BEXP-01</strong><span>jetzt</span></div>
                <div className="bubble"><RichText text={WELCOME} /></div>
                <div className="quick-grid">
                  {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                    <button type="button" className="quick-chip" key={prompt} onClick={() => send(prompt)}>
                      <Icon name="spark" size={13} />{prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div className={`msg msg--${message.role}`} key={message.id}>
              {message.role === 'bot' && <BotAvatar size={34} />}
              <div className="msg__body">
                <div className="msg__meta">
                  <strong>{message.role === 'bot' ? 'BEXP-01' : 'Operator'}</strong>
                  <span>{message.time}</span>
                  {message.intent && <span className="msg__intent">{message.intent}</span>}
                </div>
                <div className={`bubble ${message.role === 'user' ? 'bubble--user' : ''}`}>
                  <RichText text={message.text} />
                </div>
                {message.meta && (
                  <div className="msg__foot">
                    <span><Icon name="cpu" size={12} />{message.meta.model}</span>
                    <span>{message.meta.ms} ms</span>
                    <span>{message.meta.tokens} Tokens</span>
                    <span>{message.meta.cost}</span>
                  </div>
                )}
                {message.steps?.length > 0 && (
                  <details className="trace">
                    <summary><Icon name="chain" size={13} /> Chain-Trace · {message.steps.length} Schritte</summary>
                    <ol className="trace__list">
                      {message.steps.map((step) => (
                        <li key={step.id} className={`trace__item trace__item--${step.status}`}>
                          <span className="trace__icon">
                            <Icon name={step.status === 'warn' ? 'alert' : 'check'} size={12} />
                          </span>
                          <span className="trace__label">{step.label}</span>
                          <span className="trace__detail">{step.detail}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="msg msg--bot">
              <BotAvatar size={34} active />
              <div className="msg__body">
                <div className="msg__meta"><strong>BEXP-01</strong><span>denkt …</span></div>
                <div className="bubble bubble--thinking">
                  <span className="typing"><i /><i /><i /></span>
                  <div className="thinking-steps">
                    {pending.map((step) => (
                      <div className="thinking-step" key={step.id}>
                        <Icon name="check" size={12} />
                        <span>{step.label}</span>
                        <em>{step.detail}</em>
                      </div>
                    ))}
                    {pending.length === 0 && <div className="thinking-step"><Icon name="spark" size={12} /><span>Anfrage wird eingeordnet …</span></div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat__composer">
          <div className="quick-row">
            {QUICK_PROMPTS.slice(2, 6).map((prompt) => (
              <button type="button" className="quick-chip quick-chip--small" key={prompt} onClick={() => send(prompt)} disabled={thinking}>
                {prompt}
              </button>
            ))}
          </div>
          <form className="composer" onSubmit={(event) => { event.preventDefault(); send() }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Frag BEXP-01 … z. B. „Status prüfen“ oder „Erstelle einen RAG-Workflow“"
              rows={2}
              aria-label="Nachricht an BEXP-01"
            />
            <div className="composer__foot">
              <span className="composer__hint">
                <Icon name="shield" size={13} /> {providerMode === 'local' ? 'Lokal · Antworten verlassen den Browser nicht' : 'Externer Provider · Key bleibt lokal gespeichert'}
              </span>
              <button type="submit" className="btn btn--primary btn--send" disabled={!input.trim() || thinking}>
                <Icon name="send" size={16} /> Senden
              </button>
            </div>
          </form>
        </div>
      </section>

      <aside className="bot-side">
        <Panel eyebrow="Agent" title="Profil" className="bot-side__panel">
          <div className="agent-profile">
            <BotAvatar size={72} active />
            <div>
              <strong>BEXP-01</strong>
              <span>Labor-Agent · A01</span>
              <Badge tone="ok" dot>bereit</Badge>
            </div>
          </div>
          <div className="kv-list">
            <div><span>Modell</span><strong>{providerMode === 'local' ? 'LabLM-1' : lab.provider.model || 'Standard'}</strong></div>
            <div><span>Provider</span><strong>{providerMode}</strong></div>
            <div><span>Kosten</span><strong>0,00 €</strong></div>
            <div><span>Gedächtnis</span><strong>{messages.length}/80</strong></div>
          </div>
          <div className="meter meter--wide"><span style={{ width: `${memoryPct}%` }} /></div>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => onNavigate?.('settings')}>
            <Icon name="settings" size={15} /> Provider wechseln
          </button>
        </Panel>

        <Panel eyebrow="Fähigkeiten" title="Werkzeuge" className="bot-side__panel">
          <div className="tool-list">
            {TOOLS.map((tool) => (
              <div className="tool-row" key={tool.name}>
                <span className="tool-row__icon"><Icon name={tool.icon} size={15} /></span>
                <div><strong>{tool.name}</strong><span>{tool.detail}</span></div>
                <Dot tone="ok" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Schutz" title="Guardrails" className="bot-side__panel">
          <div className="guard-list">
            <div><Icon name="check" size={13} /><span>Keine erfundenen Quellen</span></div>
            <div><Icon name="check" size={13} /><span>Sandbox-Hinweis bei Code</span></div>
            <div><Icon name="check" size={13} /><span>Kein Auto-Deploy</span></div>
            <div><Icon name="check" size={13} /><span>Kosten bleiben bei 0 €</span></div>
          </div>
          <div className="bot-side__note">
            <Icon name="lock" size={14} />
            <span>Lokales Gedächtnis in <code>localStorage</code>. Keine Nachricht wird an Dritte gesendet, solange der Provider <strong>lokal</strong> ist.</span>
          </div>
        </Panel>
      </aside>
    </div>
  )
}
