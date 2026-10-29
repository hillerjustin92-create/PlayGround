import React, { useEffect, useState } from 'react'
import { Panel, Badge, Dot, Icon } from './ui.jsx'
import { LABOR } from '../data.js'
import { testProvider } from '../engine.js'

const MODES = [
  { id: 'local', label: 'Lokal · LabLM-1', hint: 'Läuft im Browser. Kein Netz, kein Key, 0 €.' },
  { id: 'ollama', label: 'Ollama', hint: 'Lokale Modelle auf A01/B02 über die OpenAI-kompatible API.' },
  { id: 'openrouter', label: 'OpenRouter · free', hint: 'Kostenlose Cloud-Modelle mit eigenem API-Key.' },
  { id: 'opencode', label: 'OpenCode Zen', hint: 'Free-Tier über den Zen-Endpunkt. Key optional.' }
]

const DEFAULTS = {
  local: { baseUrl: '', model: '' },
  ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'qwen2.5:7b' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  opencode: { baseUrl: 'https://opencode.ai/zen/v1', model: 'mimo-v2.6-flash-free' }
}

const ACCENTS = [
  { id: 'lime', label: 'Limette' },
  { id: 'teal', label: 'Türkis' },
  { id: 'violet', label: 'Violett' },
  { id: 'amber', label: 'Bernstein' },
  { id: 'rose', label: 'Rosé' }
]

export default function Settings({ lab, onProvider, onSettings, onReset, addEvent }) {
  const [form, setForm] = useState(lab.provider)
  const [test, setTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(lab.provider)
  }, [lab.provider])

  function setMode(mode) {
    setForm((current) => ({ ...current, mode, ...DEFAULTS[mode] }))
    setTest(null)
  }

  function save() {
    onProvider(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  async function runTest() {
    setTesting(true)
    setTest(null)
    const result = await testProvider(form)
    setTest(result)
    setTesting(false)
  }

  function exportConfig() {
    const { messages, provider, ...rest } = lab
    const payload = { ...rest, provider: { ...provider, apiKey: provider.apiKey ? '***gespeichert***' : '' } }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'ki-labor-config.json'
    anchor.click()
    URL.revokeObjectURL(url)
    addEvent('Labor-Konfiguration exportiert', 'info')
  }

  function reset() {
    if (window.confirm('Labor wirklich zurücksetzen? Chat, Workflows und Einstellungen werden lokal gelöscht.')) {
      onReset()
      addEvent('Labor auf Werkseinstellung zurückgesetzt', 'warn')
    }
  }

  const mode = MODES.find((item) => item.id === form.mode) || MODES[0]

  return (
    <div className="stack">
      <section className="section-head">
        <div>
          <div className="eyebrow">Einstellungen · lokal</div>
          <h1>Das Labor gehört dir.</h1>
          <p>Provider, Theme und Daten bleiben auf diesem Gerät. Kein Konto, kein Server, keine versteckten Keys.</p>
        </div>
        <div className="section-head__stats">
          <div><strong>{form.mode}</strong><span>Provider</span></div>
          <div><strong>0 €</strong><span>Kosten</span></div>
          <div><strong>lokal</strong><span>Speicher</span></div>
        </div>
      </section>

      <div className="settings-grid">
        <Panel eyebrow="KI-Anbindung" title="Provider" actions={<Badge tone={form.mode === 'local' ? 'lime' : 'teal'} dot>{form.mode === 'local' ? 'offline' : 'extern'}</Badge>}>
          <div className="mode-grid">
            {MODES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`mode-card ${form.mode === item.id ? 'is-active' : ''}`}
                onClick={() => setMode(item.id)}
              >
                <span className="mode-card__icon"><Icon name={item.id === 'local' ? 'cpu' : 'wifi'} size={16} /></span>
                <span className="mode-card__body">
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
                <span className="mode-card__check">{form.mode === item.id && <Icon name="check" size={14} />}</span>
              </button>
            ))}
          </div>

          {form.mode !== 'local' && (
            <div className="form">
              <label className="field">
                <span>Basis-URL</span>
                <input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder={DEFAULTS[form.mode].baseUrl} />
              </label>
              <label className="field">
                <span>Modell</span>
                <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder={DEFAULTS[form.mode].model} />
              </label>
              <label className="field">
                <span>API-Key {form.mode === 'opencode' ? '(optional)' : form.mode === 'ollama' ? '(nicht nötig)' : ''}</span>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                  placeholder={form.mode === 'ollama' ? '—' : 'sk-…'}
                  autoComplete="off"
                />
              </label>
              <p className="field-note">
                <Icon name="lock" size={13} /> Der Key bleibt in <code>localStorage</code> dieses Browsers. Er wird nur an die gewählte Basis-URL gesendet.
              </p>
            </div>
          )}

          <div className="settings-actions">
            <button type="button" className="btn btn--primary" onClick={save}>
              <Icon name={saved ? 'check' : 'download'} size={15} /> {saved ? 'Gespeichert' : 'Speichern'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={runTest} disabled={testing}>
              <Icon name={testing ? 'refresh' : 'wifi'} size={15} /> {testing ? 'Teste …' : 'Verbindung testen'}
            </button>
          </div>
          {test && (
            <div className={`test-result test-result--${test.ok ? 'ok' : 'warn'}`}>
              <Icon name={test.ok ? 'check' : 'alert'} size={14} />
              <span>{test.message}</span>
            </div>
          )}
        </Panel>

        <div className="settings-side">
          <Panel eyebrow="Darstellung" title="Akzent">
            <div className="accent-row">
              {ACCENTS.map((accent) => (
                <button
                  type="button"
                  key={accent.id}
                  className={`accent-swatch accent-swatch--${accent.id} ${lab.settings.accent === accent.id ? 'is-active' : ''}`}
                  onClick={() => onSettings({ accent: accent.id })}
                  aria-label={accent.label}
                  title={accent.label}
                >
                  {lab.settings.accent === accent.id && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <span>
                <strong>Animationen reduzieren</strong>
                <span>Weniger Bewegung, gleiche Funktion.</span>
              </span>
              <input
                type="checkbox"
                checked={lab.settings.reduceMotion}
                onChange={(event) => onSettings({ reduceMotion: event.target.checked })}
              />
            </label>
          </Panel>

          <Panel eyebrow="Daten" title="Lokal & exportierbar">
            <div className="data-actions">
              <button type="button" className="btn btn--soft btn--block" onClick={exportConfig}>
                <Icon name="download" size={15} /> Konfiguration exportieren
              </button>
              <button type="button" className="btn btn--danger btn--block" onClick={reset}>
                <Icon name="trash" size={15} /> Labor zurücksetzen
              </button>
            </div>
            <p className="field-note">
              Chat, Workflows, Provider und Einstellungen liegen ausschließlich in <code>localStorage</code>. Ein Export enthält keine Keys.
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid grid--2">
        <Panel eyebrow="LABOR.yaml" title="Umgebung" actions={<Badge tone="ok" dot>intakt</Badge>}>
          <div className="env-grid">
            <div><span>Projekt</span><strong>{LABOR.name}</strong></div>
            <div><span>Version</span><strong>{LABOR.version}</strong></div>
            <div><span>Modus</span><strong>{LABOR.mode}</strong></div>
            <div><span>System</span><strong>{LABOR.os}</strong></div>
            <div><span>Netzwerk</span><strong>{LABOR.network}</strong></div>
            <div><span>Controller</span><strong>{LABOR.controller}</strong></div>
            <div><span>Worker</span><strong>{LABOR.worker}</strong></div>
            <div><span>Agent</span><strong>{LABOR.agent.id}</strong></div>
          </div>
          <div className="env-ports">
            <span>SSH <strong>:{LABOR.sshPort}</strong></span>
            <span>Open WebUI <strong>:{LABOR.openWebUiPort}</strong></span>
            <span>Ollama <strong>:{LABOR.ollamaPort}</strong></span>
          </div>
        </Panel>

        <Panel eyebrow="Schutz" title="Sicherheitsregeln" actions={<Badge tone="ok">6/6</Badge>}>
          <div className="check-list check-list--compact">
            {[
              ['Controller ist Autorität', LABOR.security.controllerIsAuthority],
              ['Worker ist Executor', LABOR.security.workerIsExecutor],
              ['Sandbox verpflichtend', LABOR.security.sandboxRequired],
              ['Audit-Logging', LABOR.security.auditLogging],
              ['Ergebnis-Hashing', LABOR.security.resultHashing],
              ['Checkpoints', LABOR.security.checkpoints]
            ].map(([label, active]) => (
              <div className="check-row" key={label}>
                <span className="check-row__icon"><Icon name="check" size={13} /></span>
                <div className="check-row__text"><strong>{label}</strong></div>
                <Badge tone={active ? 'ok' : 'warn'}>{active ? 'aktiv' : 'aus'}</Badge>
              </div>
            ))}
          </div>
          <div className="check-note">
            <Dot tone="ok" pulse />
            <span>Retry-Limit {LABOR.security.retryLimit} · Freigabe bleibt menschlich.</span>
          </div>
        </Panel>
      </div>

      <div className="info-strip">
        <Icon name="spark" size={15} />
        <span><strong>KI-Labor-OS</strong> · React, Vite, LabChain-Muster, lokale Agenten-Runtime. Gebaut für A01 und B02, läuft überall im Browser.</span>
      </div>
    </div>
  )
}
