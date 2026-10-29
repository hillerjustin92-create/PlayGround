import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LABOR,
  NODES,
  MODELS,
  FRAMEWORKS,
  WORKFLOW_TEMPLATES,
  INITIAL_EVENTS
} from './data.js'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Overview from './components/Overview.jsx'
import Bot from './components/Bot.jsx'
import Office from './components/Office.jsx'
import Frameworks from './components/Frameworks.jsx'
import Models from './components/Models.jsx'
import Workflows from './components/Workflows.jsx'
import Monitoring from './components/Monitoring.jsx'
import Settings from './components/Settings.jsx'

const STORAGE_KEY = 'ki-labor-os-v1'

function nowTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function seedWorkflows() {
  return [WORKFLOW_TEMPLATES[0], WORKFLOW_TEMPLATES[1]].map((template, index) => ({
    ...template,
    id: `seed-${template.id}`,
    status: index === 0 ? 'bereit' : 'bereit',
    runs: index === 0 ? 12 : 7,
    createdAt: Date.now() - index * 86400000
  }))
}

export function createInitialLab() {
  return {
    nodes: {
      A01: { status: 'online', cpu: 23, ram: 54, ping: 8, lastSeen: nowTime() },
      B02: { status: 'online', cpu: 41, ram: 62, ping: 11, lastSeen: nowTime() }
    },
    models: MODELS.map((model) => ({ ...model })),
    frameworks: FRAMEWORKS.map((framework) => ({ ...framework })),
    workflows: seedWorkflows(),
    events: INITIAL_EVENTS.map((event) => ({ ...event })),
    messages: [],
    provider: {
      mode: 'local',
      baseUrl: '',
      model: '',
      apiKey: ''
    },
    settings: {
      accent: 'lime',
      reduceMotion: false
    }
  }
}

function loadLab() {
  const base = createInitialLab()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    const models = base.models.map((model) => ({
      ...model,
      ...(saved.models || []).find((item) => item.id === model.id)
    }))
    const frameworks = base.frameworks.map((framework) => ({
      ...framework,
      ...(saved.frameworks || []).find((item) => item.id === framework.id)
    }))
    return {
      ...base,
      ...saved,
      nodes: { ...base.nodes, ...(saved.nodes || {}) },
      models,
      frameworks,
      workflows: Array.isArray(saved.workflows) && saved.workflows.length ? saved.workflows : base.workflows,
      events: Array.isArray(saved.events) && saved.events.length ? saved.events : base.events,
      messages: Array.isArray(saved.messages) ? saved.messages : [],
      provider: { ...base.provider, ...(saved.provider || {}) },
      settings: { ...base.settings, ...(saved.settings || {}) }
    }
  } catch {
    return base
  }
}

const TAB_META = {
  overview: { label: 'Leitstand', eyebrow: 'Übersicht' },
  bot: { label: 'BEXP-01', eyebrow: 'Agent' },
  office: { label: 'Büro', eyebrow: 'Grundriss' },
  workflows: { label: 'Workflows', eyebrow: 'Chains' },
  frameworks: { label: 'Frameworks', eyebrow: 'Werkzeuge' },
  models: { label: 'Modelle', eyebrow: 'Freie KI' },
  monitoring: { label: 'Monitoring', eyebrow: 'Drift' },
  settings: { label: 'Einstellungen', eyebrow: 'Labor' }
}

export default function App() {
  const [tab, setTab] = useState('overview')
  const [lab, setLab] = useState(loadLab)
  const [clock, setClock] = useState(new Date())
  const timers = useRef([])

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lab))
    } catch {
      /* storage may be unavailable */
    }
  }, [lab])

  useEffect(() => {
    document.documentElement.dataset.accent = lab.settings.accent || 'lime'
    document.documentElement.dataset.motion = lab.settings.reduceMotion ? 'reduced' : 'full'
  }, [lab.settings.accent, lab.settings.reduceMotion])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach((id) => clearTimeout(id))
  }, [])

  const addEvent = useCallback((text, tone = 'info') => {
    setLab((current) => ({
      ...current,
      events: [
        { id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, time: nowTime(), type: tone, text },
        ...current.events
      ].slice(0, 60)
    }))
  }, [])

  const applyActions = useCallback(
    (actions = []) => {
      actions.forEach((action) => {
        if (action.type === 'event') addEvent(action.text, action.tone)
        if (action.type === 'ping') {
          setLab((current) => ({
            ...current,
            nodes: {
              A01: { ...current.nodes.A01, lastSeen: nowTime(), ping: 7 + Math.floor(Math.random() * 4) },
              B02: { ...current.nodes.B02, lastSeen: nowTime(), ping: 9 + Math.floor(Math.random() * 5) }
            }
          }))
          addEvent('Ping an A01 und B02 · Verbindung bestätigt', 'ok')
        }
        if (action.type === 'addWorkflow') {
          setLab((current) => ({ ...current, workflows: [action.workflow, ...current.workflows] }))
          addEvent(`Workflow angelegt: ${action.workflow.name}`, 'ok')
        }
        if (action.type === 'activateModel') {
          setLab((current) => ({
            ...current,
            models: current.models.map((model) => (model.id === action.id ? { ...model, status: 'loading' } : model))
          }))
          addEvent(`Modell wird geladen: ${action.id}`, 'info')
          const timer = setTimeout(() => {
            setLab((current) => ({
              ...current,
              models: current.models.map((model) => (model.id === action.id ? { ...model, status: 'ready' } : model))
            }))
            addEvent(`Modell bereit: ${action.id} · Checkpoint bestätigt`, 'ok')
          }, 1700)
          timers.current.push(timer)
        }
      })
    },
    [addEvent]
  )

  const loadModel = useCallback(
    (id) => {
      applyActions([{ type: 'activateModel', id }])
    },
    [applyActions]
  )

  const toggleFramework = useCallback(
    (id) => {
      setLab((current) => {
        const framework = current.frameworks.find((item) => item.id === id)
        if (!framework) return current
        const installed = !framework.installed
        addEvent(`${framework.name} ${installed ? 'installiert' : 'deinstalliert'} · Sandbox geprüft`, installed ? 'ok' : 'info')
        return {
          ...current,
          frameworks: current.frameworks.map((item) => (item.id === id ? { ...item, installed } : item))
        }
      })
    },
    [addEvent]
  )

  const addWorkflow = useCallback(
    (template) => {
      const workflow = {
        ...template,
        id: `wf-${Date.now()}`,
        name: `${template.name} · ${nowTime()}`,
        status: 'bereit',
        runs: 0,
        createdAt: Date.now()
      }
      applyActions([{ type: 'addWorkflow', workflow }])
      setTab('workflows')
      return workflow.id
    },
    [applyActions]
  )

  const completeWorkflow = useCallback(
    (id, ok = true) => {
      setLab((current) => ({
        ...current,
        workflows: current.workflows.map((workflow) =>
          workflow.id === id
            ? { ...workflow, runs: (workflow.runs || 0) + 1, status: ok ? 'abgeschlossen' : 'fehler', lastRun: Date.now() }
            : workflow
        )
      }))
      const workflow = lab.workflows.find((item) => item.id === id)
      addEvent(`Workflow ${ok ? 'abgeschlossen' : 'fehlgeschlagen'}: ${workflow?.name || id}`, ok ? 'ok' : 'warn')
    },
    [addEvent, lab.workflows]
  )

  const updateProvider = useCallback(
    (provider) => {
      setLab((current) => ({ ...current, provider }))
      addEvent(`Provider gesetzt: ${provider.mode}${provider.model ? ` · ${provider.model}` : ''}`, 'info')
    },
    [addEvent]
  )

  const updateSettings = useCallback((patch) => {
    setLab((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
  }, [])

  const resetLab = useCallback(() => {
    const fresh = createInitialLab()
    setLab(fresh)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const counts = useMemo(() => {
    const ready = lab.models.filter((model) => model.status === 'ready').length
    const online = Object.values(lab.nodes).filter((node) => node.status === 'online').length
    return { ready, online }
  }, [lab.models, lab.nodes])

  const content = (() => {
    switch (tab) {
      case 'bot':
        return <Bot lab={lab} setLab={setLab} onActions={applyActions} addEvent={addEvent} onNavigate={setTab} />
      case 'office':
        return <Office lab={lab} />
      case 'workflows':
        return <Workflows lab={lab} onAdd={addWorkflow} onComplete={completeWorkflow} addEvent={addEvent} />
      case 'frameworks':
        return <Frameworks lab={lab} onToggle={toggleFramework} addEvent={addEvent} />
      case 'models':
        return <Models lab={lab} onLoad={loadModel} addEvent={addEvent} />
      case 'monitoring':
        return <Monitoring lab={lab} addEvent={addEvent} />
      case 'settings':
        return (
          <Settings
            lab={lab}
            onProvider={updateProvider}
            onSettings={updateSettings}
            onReset={resetLab}
            addEvent={addEvent}
          />
        )
      default:
        return (
          <Overview
            lab={lab}
            clock={clock}
            counts={counts}
            onNavigate={setTab}
            addEvent={addEvent}
          />
        )
    }
  })()

  const meta = TAB_META[tab] || TAB_META.overview

  return (
    <div className="app">
      <Sidebar tab={tab} onNavigate={setTab} lab={lab} counts={counts} />
      <div className="app__main">
        <Topbar tabLabel={meta.label} eyebrow={meta.eyebrow} lab={lab} clock={clock} />
        <main className="content" key={tab}>
          {content}
        </main>
        <footer className="app__footer">
          <span>KI-Labor-OS · {LABOR.version}</span>
          <span className="app__footer-sep" />
          <span>Lokal · 0 € pro Anfrage</span>
          <span className="app__footer-sep" />
          <span>Sandbox aktiv · Audit-Log aktiv</span>
          <span className="app__footer-right">A01 {LABOR.controller} · B02 {LABOR.worker}</span>
        </footer>
      </div>
    </div>
  )
}
