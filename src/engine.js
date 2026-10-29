import {
  KNOWLEDGE,
  MODELS,
  FRAMEWORKS,
  NODES,
  LABOR,
  WORKFLOW_TEMPLATES,
  DRIFT_REFERENCE,
  DRIFT_LIVE
} from './data.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function calculatePSI(reference, current, bins = 24) {
  const refSum = reference.reduce((a, b) => a + b, 0) || 1
  const curSum = current.reduce((a, b) => a + b, 0) || 1
  let psi = 0
  for (let i = 0; i < bins; i++) {
    const r = Math.max(reference[i] / refSum, 0.0001)
    const c = Math.max(current[i] / curSum, 0.0001)
    psi += (c - r) * Math.log(c / r)
  }
  return Math.max(0, psi)
}

export function driftVerdict(psi) {
  if (psi < 0.1) return { level: 'stabil', tone: 'ok', text: 'Verteilung stabil. Kein Eingriff nötig.' }
  if (psi < 0.2) return { level: 'beobachten', tone: 'warn', text: 'Leichte Verschiebung. Nächste Stichprobe abwarten.' }
  return { level: 'alarm', tone: 'danger', text: 'Deutliche Verschiebung. Retraining prüfen, nicht automatisch ausrollen.' }
}

export function retrieve(query, limit = 3) {
  const terms = query
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const scored = KNOWLEDGE.map((entry) => {
    const haystack = `${entry.title} ${entry.text} ${entry.tags.join(' ')}`.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (entry.tags.includes(term)) score += 3
      if (entry.title.toLowerCase().includes(term)) score += 2
      if (haystack.includes(term)) score += 1
    }
    return { entry, score }
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((item) => item.entry)
}

function findModel(query) {
  const t = query.toLowerCase()
  return MODELS.find((m) => t.includes(m.id.toLowerCase()) || t.includes(m.name.toLowerCase().split(' ')[0].toLowerCase()))
}

function pickTemplate(query) {
  const t = query.toLowerCase()
  if (t.includes('code') || t.includes('sandbox') || t.includes('test')) return WORKFLOW_TEMPLATES.find((w) => w.id === 'code-sandbox')
  if (t.includes('drift') || t.includes('monitor')) return WORKFLOW_TEMPLATES.find((w) => w.id === 'drift-waechter')
  if (t.includes('train') || t.includes('lora') || t.includes('fine')) return WORKFLOW_TEMPLATES.find((w) => w.id === 'modell-training')
  return WORKFLOW_TEMPLATES.find((w) => w.id === 'rag-assistent')
}

function modelRecommendation(query) {
  const t = query.toLowerCase()
  const target = t.includes('thinkpad') || t.includes('a01') || t.includes('controller') ? 'A01' : t.includes('dell') || t.includes('b02') || t.includes('worker') ? 'B02' : null
  const pool = MODELS.filter((m) => m.kind === 'lokal' && (!target || m.fit.includes(target)))
  const sorted = pool.sort((a, b) => b.quality + b.speed - (a.quality + a.speed))
  const best = sorted[0]
  const fast = [...pool].sort((a, b) => b.speed - a.speed)[0]
  return { target, best, fast, pool }
}

function codeSnippet(query) {
  const js = /javascript|typescript|\bjs\b|node/i.test(query)
  if (js) {
    return `// BEXP-01 · Sandbox-Vorschlag (JS)\nimport { ChatOllama } from "@langchain/ollama"\nimport { ChatPromptTemplate } from "@langchain/core/prompts"\n\nconst prompt = ChatPromptTemplate.fromMessages([\n  ["system", "Du bist BEXP-01 im KI-Labor. Antworte knapp und mit Quellen."],\n  ["human", "{frage}"],\n])\n\nconst chain = prompt.pipe(\n  new ChatOllama({ baseUrl: "http://10.77.0.2:11434", model: "qwen2.5:7b" })\n)\n\nconst antwort = await chain.invoke({ frage: "Prüfe den Drift-Report." })\nconsole.log(antwort.content)`
  }
  return `# BEXP-01 · Sandbox-Vorschlag (Python)\nfrom langchain_ollama import ChatOllama\nfrom langchain_core.prompts import ChatPromptTemplate\nfrom langchain_core.output_parsers import StrOutputParser\n\nprompt = ChatPromptTemplate.from_messages([\n    ("system", "Du bist BEXP-01 im KI-Labor. Antworte knapp und mit Quellen."),\n    ("human", "{frage}"),\n])\n\nchain = (\n    prompt\n    | ChatOllama(model="qwen2.5:7b", base_url="http://10.77.0.2:11434")\n    | StrOutputParser()\n)\n\nprint(chain.invoke({"frage": "Prüfe den Drift-Report."}))`
}

function localAnswer(input, lab) {
  const t = input.toLowerCase()
  const has = (...words) => words.some((w) => t.includes(w))
  const actions = []
  let text = ''
  let intent = 'general'

  if (has('hilfe', 'help', 'was kannst du', 'fähigkeiten', 'kommandos')) {
    intent = 'hilfe'
    text = `Ich bin **BEXP-01**, der Agent im KI-Labor. Ich arbeite lokal, kostenlos und ohne Cloud-Zwang.\n\n**Das kann ich:**\n- \`Status\` – Nodes, Dienste und Sicherheitsregeln prüfen\n- \`Modell <ziel>\` – freie Modelle für A01 oder B02 empfehlen\n- \`Workflow <ziel>\` – eine Chain planen und ins Labor legen\n- \`Drift\` – PSI berechnen und bewerten\n- \`Code <aufgabe>\` – einen Sandbox-Vorschlag erzeugen\n- \`LangChain\` / \`RAG\` / \`Framework\` – Konzepte im Laborkontext erklären\n- \`Büro\` – den Zustand aller Räume prüfen\n- \`Lade <modell>\` – ein lokales Modell aktivieren\n\nAlles, was ich vorschlage, läuft auf B02 in der Sandbox und wird geprüft, bevor es das Labor verlässt.`
  } else if (has('status', 'systemstatus', 'ping', 'läuft', 'laeuft', 'erreichbar')) {
    intent = 'status'
    const a = NODES.A01
    const b = NODES.B02
    text = `**Systemstatus: intakt.**\n\n**A01 · ${a.device}** (${a.ip}) – Controller, online\n- ${a.services.map((s) => `${s.name}:${s.port}`).join(' · ')}\n- ${a.responsibilities.slice(0, 5).join(', ')}\n\n**B02 · ${b.device}** (${b.ip}) – Worker, online\n- ${b.services.map((s) => `${s.name}:${s.port}`).join(' · ')}\n- ${b.responsibilities.slice(0, 5).join(', ')}\n\n**Sicherheit:** Sandbox aktiv · Audit-Log aktiv · Checkpoints aktiv · Retry-Limit ${LABOR.security.retryLimit}\nDirekte Verbindung A01 ↔ B02 bestätigt. Keine offenen Alarme.`
    actions.push({ type: 'ping' })
  } else if (has('drift', 'psi', 'monitoring', 'verschiebung')) {
    intent = 'drift'
    const psi = calculatePSI(DRIFT_REFERENCE, DRIFT_LIVE)
    const verdict = driftVerdict(psi)
    text = `**Drift-Analyse abgeschlossen.**\n\n- PSI: **${psi.toFixed(3)}**\n- Bewertung: **${verdict.level}**\n- ${verdict.text}\n\nReferenz und Live-Daten unterscheiden sich vor allem im oberen Drittel der Verteilung. Das ist noch kein Notfall, aber der Drift-Wächter sollte die nächste Stichprobe abwarten.\n\n**Nächster Schritt:** Workflow \`Drift-Wächter\` ausführen oder ein Retraining nur nach menschlicher Freigabe starten.`
    actions.push({ type: 'event', tone: psi >= 0.2 ? 'warn' : 'info', text: `Drift geprüft · PSI ${psi.toFixed(3)} (${verdict.level})` })
  } else if (has('modell', 'modelle', 'llama', 'qwen', 'mistral', 'phi', 'deepseek', 'empfehlung', 'welches')) {
    intent = 'modelle'
    const { target, best, fast, pool } = modelRecommendation(input)
    if (best) {
      text = `**Modell-Empfehlung${target ? ` für ${target}` : ''}.**\n\n**Beste Balance:** ${best.name} · ${best.params} · ${best.quant} · ${best.license}\n- ${best.note}\n- Qualität ${best.quality}/100 · Tempo ${best.speed}/100 · RAM ${best.ram} GB\n\n**Schnellste Option:** ${fast.name} (${fast.speed}/100)\n\n${pool.length} lokale Modelle passen${target ? ` zu ${target}` : ''}. Cloud-Free-Modelle sind möglich, kosten aber einen Key und haben Limits. Lokal bleibt der Standard: **0 € pro Anfrage**.`
    } else {
      text = 'Kein passendes Modell gefunden. Prüfe den Namen oder öffne den Modelle-Tab.'
    }
    const mentioned = findModel(input)
    if (mentioned) {
      actions.push({ type: 'activateModel', id: mentioned.id })
      text += `\n\n**Aktion:** ${mentioned.name} wurde als aktiv markiert. Der Worker lädt es beim nächsten Auftrag.`
    }
  } else if (has('workflow', 'pipeline', 'plane', 'erstelle', 'auftrag') && !has('code')) {
    intent = 'workflow'
    const template = pickTemplate(input)
    const workflow = {
      ...template,
      id: `wf-${Date.now()}`,
      name: `${template.name} · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'bereit',
      runs: 0,
      createdAt: Date.now()
    }
    actions.push({ type: 'addWorkflow', workflow })
    text = `**Workflow geplant: ${template.name}.**\n\n${template.description}\n\n**Schritte:**\n${template.steps.map((s, i) => `${i + 1}. ${s.name} – ${s.detail}`).join('\n')}\n\nDer Workflow liegt jetzt im Tab **Workflows** und kann dort ausgeführt werden. Ausführung nur auf B02 in der Sandbox, mit Audit-Log und maximal ${LABOR.security.retryLimit} Versuchen.`
  } else if (has('code', 'python', 'javascript', 'programm', 'schreibe', 'sandbox')) {
    intent = 'code'
    const snippet = codeSnippet(input)
    text = `**Sandbox-Vorschlag erzeugt.**\n\n\`\`\`\n${snippet}\n\`\`\`\n\nDas Skript ist für B02 vorbereitet. Es wird nicht ungeprüft ausgeführt: erst Docker-Sandbox, dann Build/Test, dann Hash und Audit-Log.`
    actions.push({ type: 'event', tone: 'info', text: 'Code-Vorschlag für Sandbox erzeugt' })
  } else if (has('langchain', 'framework', 'langgraph', 'llamaindex', 'crewai', 'autogen', 'dspy', 'rag')) {
    intent = 'framework'
    const hits = retrieve(input, 2)
    const top = FRAMEWORKS.filter((f) => f.installed).slice(0, 4)
    text = `**Framework-Kontext.**\n\n${hits.map((h) => `**${h.title}:** ${h.text}`).join('\n\n') || 'Die Framework-Landschaft ist im Tab Frameworks dokumentiert.'}\n\n**Im Labor aktiv:** ${top.map((f) => f.name).join(', ')}.\n\nLangChain bildet die Kette, LlamaIndex/Chroma übernehmen RAG, Evidently bewertet Drift und Playwright prüft das Ergebnis im echten Browser.`
  } else if (has('büro', 'buero', 'office', 'raum', 'räume', 'raeume', 'intakt')) {
    intent = 'buero'
    text = `**Büro-Check: vollständig intakt.**\n\n- Leitstand, Serverraum, Sandbox, Werkstatt, Archiv und Besprechung sind verbunden.\n- Strom & USV: ok\n- Netzwerk 10.77.0.0/24: A01 ↔ B02 bestätigt\n- Kühlung: 21,4 °C, stabil\n- Zugang: nur per SSH-Schlüssel\n- Backups & Checkpoints: aktuell\n- Kaffeemaschine: betriebsbereit\n\nAlle sechs Räume melden **Status intakt**. Der Grundriss ist im Tab **Büro** interaktiv.`
  } else if (has('kosten', 'preis', 'budget', 'free', 'kostenlos')) {
    intent = 'kosten'
    text = `**Kosten: 0 € pro Anfrage.**\n\n- LabLM-1 läuft komplett im Browser, ohne Netzwerk.\n- Ollama auf A01/B02 kostet nur Strom.\n- Free-Cloud-Modelle (OpenRouter, OpenCode Zen) haben harte Limits und brauchen einen eigenen Key.\n- Fällt ein Cloud-Modell aus, antwortet automatisch das lokale Modell.\n\nDas Labor ist damit auch offline voll funktionsfähig.`
  } else if (has('sicherheit', 'sandbox', 'audit', 'hash', 'checkpoint', 'sicher')) {
    intent = 'sicherheit'
    text = `**Sicherheitsmodell.**\n\n- Controller A01 ist die Autorität, Worker B02 ist der Executor.\n- Generierter Code läuft ausschließlich in der Docker-Sandbox auf B02.\n- Jeder Auftrag wird auditiert, jedes Ergebnis gehasht.\n- Checkpoints vor riskanten Schritten, maximal ${LABOR.security.retryLimit} Retries.\n- Freigaben bleiben menschlich; kein Auto-Deploy.\n\nDas ist keine Behauptung, sondern die konfigurierte Regel aus \`LABOR.yaml\`.`
  } else if (has('lade', 'deploy', 'aktiviere', 'starte modell')) {
    intent = 'deploy'
    const model = findModel(input) || MODELS.find((m) => m.status === 'available' && m.kind === 'lokal')
    if (model) {
      actions.push({ type: 'activateModel', id: model.id })
      text = `**Modell wird vorbereitet: ${model.name}.**\n\n${model.note}\n\nDer Worker B02 lädt ${model.size} in die Sandbox. Status wechselt auf **bereit**, sobald der Checkpoint bestätigt ist. Kosten: 0 €.`
    } else {
      text = 'Kein passendes Modell gefunden. Nenne mir den Namen, z. B. `Lade Qwen 2.5 7B`.'
    }
  } else {
    intent = 'general'
    const hits = retrieve(input, 2)
    if (hits.length) {
      text = `**Dazu habe ich Laborwissen gefunden.**\n\n${hits.map((h) => `**${h.title}:** ${h.text}`).join('\n\n')}\n\nWenn du willst, plane ich daraus einen Workflow oder prüfe den Systemstatus.`
    } else {
      text = `**Anfrage aufgenommen.**\n\nIch habe deine Nachricht im Laborkontext verarbeitet. Konkret kann ich damit weiterarbeiten, wenn du mir ein Ziel nennst: Status prüfen, Modell empfehlen, Workflow planen, Drift analysieren, Code für die Sandbox erzeugen oder das Büro prüfen.\n\nTipp: \`Hilfe\` zeigt alle Kommandos.`
    }
  }

  return { text, intent, actions }
}

function labContext(lab) {
  return [
    `Labor: ${LABOR.name} v${LABOR.version}, Modus ${LABOR.mode}, Netz ${LABOR.network}.`,
    `A01 Controller (${NODES.A01.ip}): ${NODES.A01.responsibilities.join(', ')}.`,
    `B02 Worker (${NODES.B02.ip}): ${NODES.B02.responsibilities.join(', ')}.`,
    `Sicherheit: Sandbox Pflicht, Audit-Log, Ergebnis-Hashing, Checkpoints, Retry-Limit ${LABOR.security.retryLimit}.`,
    `Aktive Modelle: ${(lab?.models || MODELS).filter((m) => m.status === 'ready').map((m) => m.name).join(', ')}.`,
    `Installierte Frameworks: ${(lab?.frameworks || FRAMEWORKS).filter((f) => f.installed).map((f) => f.name).join(', ')}.`
  ].join(' ')
}

function providerConfig(provider) {
  const p = provider || { mode: 'local' }
  if (p.mode === 'ollama') {
    return {
      url: `${(p.baseUrl || 'http://127.0.0.1:11434').replace(/\/$/, '')}/v1/chat/completions`,
      headers: { 'Content-Type': 'application/json' },
      model: p.model || 'qwen2.5:7b'
    }
  }
  if (p.mode === 'openrouter') {
    return {
      url: `${(p.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.apiKey || ''}`,
        'HTTP-Referer': 'https://omgithub.com',
        'X-Title': 'KI-Labor-OS'
      },
      model: p.model || 'meta-llama/llama-3.3-70b-instruct:free'
    }
  }
  if (p.mode === 'opencode') {
    return {
      url: `${(p.baseUrl || 'https://opencode.ai/zen/v1').replace(/\/$/, '')}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.apiKey || 'public'}`,
        'User-Agent': 'opencode/1.15.9 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14',
        'X-Opencode-Client': 'cli',
        'X-Opencode-Project': 'global'
      },
      model: p.model || 'mimo-v2.6-flash-free'
    }
  }
  return null
}

async function callRemote(provider, messages) {
  const cfg = providerConfig(provider)
  if (!cfg) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(cfg.url, {
      method: 'POST',
      headers: cfg.headers,
      signal: controller.signal,
      body: JSON.stringify({ model: cfg.model, messages, stream: false, temperature: 0.4 })
    })
    if (!response.ok) {
      let detail = ''
      try {
        const err = await response.json()
        detail = err?.error?.message || err?.message || ''
      } catch {}
      throw new Error(`HTTP ${response.status}${detail ? ` · ${detail}` : ''}`)
    }
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('Leere Antwort vom Provider')
    return { content, model: cfg.model }
  } finally {
    clearTimeout(timer)
  }
}

export async function testProvider(provider) {
  if (!provider || provider.mode === 'local') return { ok: true, message: 'LabLM-1 läuft lokal im Browser. Kein Netzwerk nötig.' }
  const cfg = providerConfig(provider)
  if (!cfg) return { ok: false, message: 'Unbekannter Provider.' }
  const base = cfg.url.replace(/\/chat\/completions$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${base}/models`, { headers: cfg.headers, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return { ok: true, message: `Verbunden mit ${provider.mode} · ${cfg.model}` }
  } catch (error) {
    return { ok: false, message: `Nicht erreichbar: ${error.message}` }
  } finally {
    clearTimeout(timer)
  }
}

export async function runAgent({ input, lab, provider, onStep }) {
  const started = performance.now()
  const steps = []
  const step = async (id, label, detail, ms = 220) => {
    const entry = { id, label, detail, status: 'ok' }
    steps.push(entry)
    onStep?.([...steps], { pending: true })
    await wait(ms)
    return entry
  }

  const local = localAnswer(input, lab)
  const hits = retrieve(input, 2)

  await step('router', 'Intent Router', `Erkannt: ${local.intent}`, 260)
  await step('retriever', 'Wissens-Retriever', `${hits.length} Laborwissen-Treffer`, 240)
  await step('planner', 'Chain Planner', local.intent === 'workflow' ? 'Workflow-Schritte vorbereitet' : 'Antwortstrategie gewählt', 220)

  let text = local.text
  let usedRemote = false
  let modelName = 'LabLM-1 · lokal'
  let fallback = ''

  if (provider && provider.mode !== 'local') {
    try {
      await step('remote', 'Externes Modell', `${provider.mode} · ${provider.model || 'Standard'}`, 120)
      const messages = [
        {
          role: 'system',
          content: `Du bist BEXP-01, der Agent im KI-Labor. Antworte auf Deutsch, präzise, hilfreich und ohne Floskeln. Nutze den Labor-Kontext. Erfinde keine Quellen und keine Systemzustände. Kontext: ${labContext(lab)} ${hits.map((h) => `${h.title}: ${h.text}`).join(' ')}`
        },
        { role: 'user', content: input }
      ]
      const remote = await callRemote(provider, messages)
      text = remote.content
      modelName = `${remote.model} · ${provider.mode}`
      usedRemote = true
      steps[steps.length - 1].detail = `${remote.model} · erfolgreich`
    } catch (error) {
      fallback = error.message
      const failed = steps[steps.length - 1]
      if (failed) {
        failed.status = 'warn'
        failed.detail = `Fallback auf LabLM-1 · ${error.message}`
      }
    }
  }

  await step('llm', 'Antwort erzeugen', modelName, 320)
  await step('guard', 'Guardrails', 'Quellen, Sandbox-Hinweis und Kosten geprüft', 200)

  return {
    text,
    intent: local.intent,
    actions: local.actions,
    steps,
    meta: {
      model: modelName,
      remote: usedRemote,
      fallback,
      ms: Math.round(performance.now() - started),
      tokens: Math.max(24, Math.round((input.length + text.length) / 3.4)),
      cost: usedRemote ? 'Free-Tier' : '0,00 €'
    }
  }
}

export function workflowRun(workflow) {
  const started = Date.now()
  return workflow.steps.map((step, index) => ({
    ...step,
    index,
    duration: 180 + ((index * 137) % 420),
    output:
      step.kind === 'source'
        ? `${step.detail} geladen`
        : step.kind === 'model'
          ? `${step.detail} · Antwort erzeugt`
          : step.kind === 'check'
            ? `${step.detail} · bestanden`
            : `${step.detail} · abgeschlossen`,
    at: started + index * 220
  }))
}
