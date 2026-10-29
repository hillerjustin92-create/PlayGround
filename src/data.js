export const LABOR = {
  name: 'KI-Labor-OS',
  version: '1.0',
  mode: 'local',
  os: 'Linux Mint',
  network: '10.77.0.0/24',
  controller: '10.77.0.1',
  worker: '10.77.0.2',
  sshPort: 22,
  openWebUiPort: 8080,
  ollamaPort: 11434,
  agent: { id: 'BEXP-01', location: 'A01', role: 'Labor-Agent' },
  security: {
    controllerIsAuthority: true,
    workerIsExecutor: true,
    sandboxRequired: true,
    auditLogging: true,
    resultHashing: true,
    checkpoints: true,
    retryLimit: 3
  }
}

export const NODES = {
  A01: {
    id: 'A01',
    device: 'ThinkPad T460',
    role: 'controller',
    ip: '10.77.0.1',
    color: 'lime',
    responsibilities: ['Leitstand', 'Open WebUI', 'Agenten', 'Workflows', 'Projekte', 'Memory', 'Auftragssteuerung', 'Ergebniskontrolle'],
    services: [
      { name: 'Open WebUI', port: 8080, status: 'active' },
      { name: 'Ollama', port: 11434, status: 'active' },
      { name: 'BEXP-01 Runtime', port: 4100, status: 'active' }
    ],
    specs: { cpu: 'Intel i5-6300U', ram: '16 GB', disk: '512 GB SSD', gpu: 'Intel HD 520' }
  },
  B02: {
    id: 'B02',
    device: 'Dell Precision M4800',
    role: 'worker',
    ip: '10.77.0.2',
    color: 'teal',
    responsibilities: ['Ollama', 'Modelle', 'Docker', 'Sandbox', 'Programmieren', 'Build', 'Test', 'Debug'],
    services: [
      { name: 'Ollama Worker', port: 11434, status: 'active' },
      { name: 'Docker Sandbox', port: 2375, status: 'active' },
      { name: 'Build-Runner', port: 4200, status: 'active' }
    ],
    specs: { cpu: 'Intel i7-4800MQ', ram: '32 GB', disk: '1 TB SSD', gpu: 'NVIDIA Quadro K2100M' }
  }
}

export const MODELS = [
  {
    id: 'llama3.2-3b',
    name: 'Llama 3.2 3B',
    vendor: 'Meta',
    params: '3B',
    size: '2.0 GB',
    quant: 'Q4_K_M',
    license: 'Llama 3.2 Community',
    kind: 'lokal',
    fit: ['A01', 'B02'],
    ram: 3,
    speed: 92,
    quality: 62,
    status: 'ready',
    tags: ['Allrounder', 'schnell', 'Deutsch ok'],
    note: 'Der zuverlässige Standard für den ThinkPad. Antwortet flott, braucht wenig RAM.'
  },
  {
    id: 'qwen2.5-7b',
    name: 'Qwen 2.5 7B',
    vendor: 'Alibaba',
    params: '7B',
    size: '4.7 GB',
    quant: 'Q4_K_M',
    license: 'Apache 2.0',
    kind: 'lokal',
    fit: ['B02'],
    ram: 8,
    speed: 68,
    quality: 78,
    status: 'ready',
    tags: ['Code', 'Deutsch', 'Apache'],
    note: 'Beste Balance aus Codequalität und Tempo auf dem Dell Worker.'
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B Instruct',
    vendor: 'Mistral AI',
    params: '7B',
    size: '4.4 GB',
    quant: 'Q4_K_M',
    license: 'Apache 2.0',
    kind: 'lokal',
    fit: ['B02'],
    ram: 8,
    speed: 72,
    quality: 74,
    status: 'available',
    tags: ['Instruct', 'mehrsprachig'],
    note: 'Robuster Instruct-Allrounder, ideal für RAG und Zusammenfassungen.'
  },
  {
    id: 'phi4-mini',
    name: 'Phi-4 Mini',
    vendor: 'Microsoft',
    params: '3.8B',
    size: '2.5 GB',
    quant: 'Q4_K_M',
    license: 'MIT',
    kind: 'lokal',
    fit: ['A01', 'B02'],
    ram: 4,
    speed: 85,
    quality: 70,
    status: 'available',
    tags: ['Reasoning', 'klein', 'MIT'],
    note: 'Kleines Reasoning-Modell für Planung und strukturierte Ausgaben.'
  },
  {
    id: 'nomic-embed',
    name: 'Nomic Embed Text',
    vendor: 'Nomic',
    params: '137M',
    size: '274 MB',
    quant: 'F16',
    license: 'Apache 2.0',
    kind: 'lokal',
    fit: ['A01', 'B02'],
    ram: 1,
    speed: 99,
    quality: 66,
    status: 'ready',
    tags: ['Embeddings', 'RAG'],
    note: 'Vektorisiert das Laborwissen für den lokalen Retriever.'
  },
  {
    id: 'deepseek-r1-8b',
    name: 'DeepSeek R1 Distill 8B',
    vendor: 'DeepSeek',
    params: '8B',
    size: '4.9 GB',
    quant: 'Q4_K_M',
    license: 'MIT',
    kind: 'lokal',
    fit: ['B02'],
    ram: 10,
    speed: 54,
    quality: 82,
    status: 'available',
    tags: ['Reasoning', 'Analyse', 'MIT'],
    note: 'Für harte Analysefälle. Langsamer, aber stark beim Zerlegen von Aufgaben.'
  },
  {
    id: 'openrouter-llama-free',
    name: 'Llama 3.3 70B :free',
    vendor: 'OpenRouter',
    params: '70B',
    size: 'Cloud',
    quant: 'API',
    license: 'Llama Community',
    kind: 'cloud',
    fit: ['A01', 'B02'],
    ram: 0,
    speed: 64,
    quality: 88,
    status: 'available',
    tags: ['kostenlos', 'groß', 'API'],
    note: 'Kostenloses Cloud-Modell über OpenRouter. Braucht einen eigenen API-Key.'
  },
  {
    id: 'opencode-free',
    name: 'OpenCode Free Models',
    vendor: 'OpenCode Zen',
    params: 'variiert',
    size: 'Cloud',
    quant: 'API',
    license: 'variiert',
    kind: 'cloud',
    fit: ['A01', 'B02'],
    ram: 0,
    speed: 80,
    quality: 80,
    status: 'available',
    tags: ['kostenlos', 'API', 'Fallback'],
    note: 'Free-Tier über den OpenCode-Zen-Endpunkt. Limit kann erreicht sein – dann greift LabLM-1.'
  }
]

export const FRAMEWORKS = [
  {
    id: 'langchain',
    name: 'LangChain',
    category: 'Orchestrierung',
    license: 'MIT',
    language: 'Python / JS',
    maturity: 94,
    installed: true,
    featured: true,
    desc: 'Baukasten für Chains, Tools, Retriever, Memory und Agenten. Das Rückgrat von BEXP-01.',
    snippet: `from langchain_ollama import ChatOllama\nfrom langchain_core.prompts import ChatPromptTemplate\n\nchain = (\n    ChatPromptTemplate.from_messages([\n        ("system", "Du bist BEXP-01 im KI-Labor."),\n        ("human", "{frage}"),\n    ])\n    | ChatOllama(model="qwen2.5:7b", base_url="http://10.77.0.2:11434")\n)\n\nprint(chain.invoke({"frage": "Prüfe den Drift"}).content)`
  },
  {
    id: 'langgraph',
    name: 'LangGraph',
    category: 'Orchestrierung',
    license: 'MIT',
    language: 'Python / JS',
    maturity: 86,
    installed: true,
    desc: 'Zustandsgraphen für mehrstufige Agenten mit Schleifen, Checkpoints und Human-in-the-Loop.',
    snippet: `from langgraph.graph import StateGraph, END\n\ngraph = StateGraph(AgentState)\ngraph.add_node("plan", plan)\ngraph.add_node("execute", execute)\ngraph.add_edge("plan", "execute")\ngraph.add_edge("execute", END)\napp = graph.compile()`
  },
  {
    id: 'llamaindex',
    name: 'LlamaIndex',
    category: 'RAG',
    license: 'MIT',
    language: 'Python / TS',
    maturity: 88,
    installed: true,
    desc: 'Datenframework für Ingestion, Indexe und Retrieval über Laborhandbücher und Projektakten.',
    snippet: `from llama_index.core import VectorStoreIndex, SimpleDirectoryReader\n\ndocs = SimpleDirectoryReader("laborwissen").load_data()\nindex = VectorStoreIndex.from_documents(docs)\nprint(index.as_query_engine().query("Welche Modelle laufen lokal?"))`
  },
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'Runtime',
    license: 'MIT',
    language: 'Go',
    maturity: 96,
    installed: true,
    desc: 'Lokale Modell-Runtime auf A01 und B02. Ein Befehl, ein Modell, keine Cloud.',
    snippet: `ollama pull qwen2.5:7b\nollama run qwen2.5:7b "Fasse den Laborstatus zusammen"\n# API: http://10.77.0.2:11434/v1`
  },
  {
    id: 'open-webui',
    name: 'Open WebUI',
    category: 'Interface',
    license: 'BSD-3',
    language: 'Python / Svelte',
    maturity: 91,
    installed: true,
    desc: 'Chat-Oberfläche für lokale Modelle auf Port 8080. Der menschliche Zugang zum Labor.',
    snippet: `docker run -d -p 8080:8080 \\\n  -e OLLAMA_BASE_URL=http://10.77.0.2:11434 \\\n  -v open-webui:/app/backend/data \\\n  ghcr.io/open-webui/open-webui:main`
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    category: 'Agenten',
    license: 'MIT',
    language: 'Python',
    maturity: 78,
    installed: false,
    desc: 'Rollenbasierte Agententeams. Nützlich, wenn Planung, Bau und Prüfung getrennte Kollegen brauchen.',
    snippet: `from crewai import Agent, Task, Crew\n\nbuilder = Agent(role="Builder", goal="Baue die Pipeline")\ncritic = Agent(role="Critic", goal="Finde Fehler")\ncrew = Crew(agents=[builder, critic], tasks=[build_task, review_task])\ncrew.kickoff()`
  },
  {
    id: 'autogen',
    name: 'AutoGen',
    category: 'Agenten',
    license: 'MIT',
    language: 'Python',
    maturity: 76,
    installed: false,
    desc: 'Konversationsbasierte Multi-Agenten mit klaren Sprecherrollen und Tool-Nutzung.',
    snippet: `from autogen import AssistantAgent, UserProxyAgent\n\nassistant = AssistantAgent("lab", llm_config=config)\nuser = UserProxyAgent("operator", code_execution_config={"work_dir": "sandbox"})\nuser.initiate_chat(assistant, message="Prüfe die Chain.")`
  },
  {
    id: 'semantic-kernel',
    name: 'Semantic Kernel',
    category: 'Orchestrierung',
    license: 'MIT',
    language: 'C# / Python',
    maturity: 74,
    installed: false,
    desc: 'Microsofts Plugin- und Planner-Framework. Gute Wahl für .NET-nahe Laborwerkzeuge.',
    snippet: `var kernel = Kernel.CreateBuilder()\n    .AddOllamaChatCompletion("qwen2.5:7b", new Uri("http://10.77.0.2:11434"))\n    .Build();`
  },
  {
    id: 'dspy',
    name: 'DSPy',
    category: 'Optimierung',
    license: 'MIT',
    language: 'Python',
    maturity: 72,
    installed: false,
    desc: 'Programmiert Prompts als Module und optimiert sie gegen Messwerte statt Bauchgefühl.',
    snippet: `import dspy\n\nclass LabQA(dspy.Module):\n    def __init__(self):\n        self.answer = dspy.ChainOfThought("frage -> antwort")\n\n    def forward(self, frage):\n        return self.answer(frage=frage)`
  },
  {
    id: 'chroma',
    name: 'ChromaDB',
    category: 'Vektorstore',
    license: 'Apache 2.0',
    language: 'Python / TS',
    maturity: 84,
    installed: true,
    desc: 'Lokaler Vektorstore für Laborwissen, Audit-Logs und Projektdokumente.',
    snippet: `import chromadb\n\nclient = chromadb.PersistentClient(path="./chroma")\ncollection = client.get_or_create_collection("laborwissen")\ncollection.add(documents=["..."], ids=["doc-1"])`
  },
  {
    id: 'faiss',
    name: 'FAISS',
    category: 'Vektorstore',
    license: 'MIT',
    language: 'C++ / Python',
    maturity: 90,
    installed: false,
    desc: 'Sehr schnelle Ähnlichkeitssuche. Ideal, wenn der Retriever größer wird.',
    snippet: `import faiss\n\nindex = faiss.IndexFlatL2(768)\nindex.add(vectors)\nD, I = index.search(query_vector, 5)`
  },
  {
    id: 'vllm',
    name: 'vLLM',
    category: 'Runtime',
    license: 'Apache 2.0',
    language: 'Python',
    maturity: 89,
    installed: false,
    desc: 'Hochdurchsatz-Inferenz mit PagedAttention. Erst sinnvoll, wenn B02 mehr GPU bekommt.',
    snippet: `vllm serve Qwen/Qwen2.5-7B-Instruct \\\n  --host 0.0.0.0 --port 8000 \\\n  --max-model-len 8192`
  },
  {
    id: 'mlflow',
    name: 'MLflow',
    category: 'Monitoring',
    license: 'Apache 2.0',
    language: 'Python',
    maturity: 87,
    installed: false,
    desc: 'Experimente, Modelle und Metriken nachvollziehbar versionieren.',
    snippet: `import mlflow\n\nwith mlflow.start_run():\n    mlflow.log_param("modell", "qwen2.5:7b")\n    mlflow.log_metric("drift_psi", 0.08)`
  },
  {
    id: 'evidently',
    name: 'Evidently',
    category: 'Monitoring',
    license: 'Apache 2.0',
    language: 'Python',
    maturity: 80,
    installed: true,
    desc: 'Drift-Reports und Datenqualität. Erzeugt die Kennzahlen im Monitoring-Tab.',
    snippet: `from evidently.report import Report\nfrom evidently.metric_preset import DataDriftPreset\n\nreport = Report(metrics=[DataDriftPreset()])\nreport.run(reference_data=ref, current_data=cur)\nreport.save_html("drift.html")`
  },
  {
    id: 'ragas',
    name: 'RAGAS',
    category: 'Evaluierung',
    license: 'Apache 2.0',
    language: 'Python',
    maturity: 70,
    installed: false,
    desc: 'Bewertet RAG-Antworten nach Faithfulness, Relevance und Context Precision.',
    snippet: `from ragas import evaluate\nfrom ragas.metrics import faithfulness, answer_relevancy\n\nresult = evaluate(dataset, metrics=[faithfulness, answer_relevancy])`
  },
  {
    id: 'playwright',
    name: 'Playwright',
    category: 'Verifikation',
    license: 'Apache 2.0',
    language: 'JS / Python',
    maturity: 95,
    installed: true,
    desc: 'Echte Browserprüfung: Rendering, Konsole, Interaktion. Kein Screenshot ohne Blick.',
    snippet: `import { chromium } from "playwright"\n\nconst browser = await chromium.launch()\nconst page = await browser.newPage()\nawait page.goto("http://127.0.0.1:3000")\nawait page.screenshot({ path: "beweis.png" })`
  }
]

export const WORKFLOW_TEMPLATES = [
  {
    id: 'rag-assistent',
    name: 'RAG-Assistent',
    goal: 'Fragen aus dem Laborhandbuch beantworten',
    description: 'Retriever holt Laborwissen, das Modell antwortet mit Quellen, Guardrails prüfen die Ausgabe.',
    tags: ['RAG', 'LangChain', 'Chroma'],
    steps: [
      { id: 'ingest', name: 'Dokumente laden', kind: 'source', detail: 'Handbuch, LABOR.yaml, Audit-Log' },
      { id: 'embed', name: 'Embeddings', kind: 'process', detail: 'nomic-embed-text auf A01' },
      { id: 'retrieve', name: 'Retriever', kind: 'process', detail: 'Top-4 Treffer aus Chroma' },
      { id: 'prompt', name: 'Prompt-Template', kind: 'process', detail: 'Kontext + Frage + Quellenpflicht' },
      { id: 'llm', name: 'Lokales LLM', kind: 'model', detail: 'Qwen 2.5 7B auf B02' },
      { id: 'guard', name: 'Guardrails', kind: 'check', detail: 'Keine erfundenen Quellen' }
    ]
  },
  {
    id: 'code-sandbox',
    name: 'Code-Sandbox-Pipeline',
    goal: 'Generierten Code sicher bauen und testen',
    description: 'Der Controller plant, der Worker führt in Docker aus, ein Kritiker prüft das Ergebnis.',
    tags: ['Docker', 'B02', 'Sicherheit'],
    steps: [
      { id: 'plan', name: 'Auftrag zerlegen', kind: 'process', detail: 'BEXP-01 auf A01' },
      { id: 'generate', name: 'Code erzeugen', kind: 'model', detail: 'Qwen 2.5 7B' },
      { id: 'sandbox', name: 'Docker-Sandbox', kind: 'source', detail: 'B02, kein Netz, read-only Mount' },
      { id: 'test', name: 'Build + Test', kind: 'process', detail: 'npm test / pytest' },
      { id: 'hash', name: 'Ergebnis-Hash', kind: 'check', detail: 'SHA-256 + Audit-Log' },
      { id: 'report', name: 'Bericht', kind: 'output', detail: 'Freigabe oder Retry (max. 3)' }
    ]
  },
  {
    id: 'drift-waechter',
    name: 'Drift-Wächter',
    goal: 'Modell- und Datenverschiebung früh erkennen',
    description: 'Vergleicht Referenz- und Live-Daten, berechnet PSI und alarmiert bei Überschreitung.',
    tags: ['Monitoring', 'Evidently', 'PSI'],
    steps: [
      { id: 'collect', name: 'Daten sammeln', kind: 'source', detail: 'Inference-Logs seit 24 h' },
      { id: 'reference', name: 'Referenz laden', kind: 'source', detail: 'Trainingsverteilung' },
      { id: 'psi', name: 'PSI berechnen', kind: 'process', detail: 'Population Stability Index' },
      { id: 'threshold', name: 'Schwelle prüfen', kind: 'check', detail: 'Alarm ab 0,20' },
      { id: 'retrain', name: 'Retraining', kind: 'output', detail: 'Vorschlag, kein Auto-Deploy' }
    ]
  },
  {
    id: 'modell-training',
    name: 'Modell-Training',
    goal: 'Ein lokales Modell mit Labordaten nachschärfen',
    description: 'Datensatz kuratieren, LoRA trainieren, evaluieren und nur bei Gewinn ausrollen.',
    tags: ['Training', 'LoRA', 'Evaluierung'],
    steps: [
      { id: 'dataset', name: 'Datensatz', kind: 'source', detail: 'Freigegebene Projektakten' },
      { id: 'clean', name: 'Bereinigen', kind: 'process', detail: 'Duplikate, PII, Format' },
      { id: 'train', name: 'LoRA-Training', kind: 'model', detail: 'B02, QLoRA 4-bit' },
      { id: 'eval', name: 'Evaluierung', kind: 'check', detail: 'RAGAS + Golden Set' },
      { id: 'gate', name: 'Freigabe-Gate', kind: 'check', detail: 'Nur bei messbarem Gewinn' }
    ]
  }
]

export const ROOMS = [
  {
    id: 'leitstand',
    name: 'Leitstand',
    node: 'A01',
    x: 40,
    y: 40,
    w: 300,
    h: 210,
    color: 'lime',
    description: 'Hier sitzt BEXP-01. Der Controller plant Aufträge, prüft Ergebnisse und hält das Gedächtnis.',
    equipment: ['ThinkPad T460', 'Zwei Monitore', 'Open WebUI', 'Audit-Terminal'],
    people: ['BEXP-01', 'Operator'],
    status: 'intakt'
  },
  {
    id: 'serverraum',
    name: 'Serverraum',
    node: 'B02',
    x: 370,
    y: 40,
    w: 250,
    h: 210,
    color: 'teal',
    description: 'Der Worker führt aus: Ollama, Docker-Sandbox, Builds und Tests. Klimatisiert und zugangsbeschränkt.',
    equipment: ['Dell Precision M4800', 'Serverrack', 'USV', 'Kühlung'],
    people: ['B02'],
    status: 'intakt'
  },
  {
    id: 'sandbox',
    name: 'Sandbox',
    node: 'B02',
    x: 650,
    y: 40,
    w: 310,
    h: 210,
    color: 'violet',
    description: 'Isolierte Werkbank für generierten Code. Kein Netz, keine Geheimnisse, alles wird gehasht.',
    equipment: ['Docker-Container', 'Wegwerf-Volume', 'Test-Runner', 'Netz-Sperre'],
    people: [],
    status: 'intakt'
  },
  {
    id: 'werkstatt',
    name: 'Werkstatt',
    node: 'B02',
    x: 40,
    y: 280,
    w: 270,
    h: 230,
    color: 'amber',
    description: 'Hier entstehen Chains, Prompts und Werkzeuge. Whiteboard, Kaffee, kontrolliertes Chaos.',
    equipment: ['Werkbank', 'Whiteboard', 'Prompt-Bibliothek', 'Lötstation'],
    people: ['Builder-Agent'],
    status: 'intakt'
  },
  {
    id: 'archiv',
    name: 'Archiv',
    node: 'A01',
    x: 340,
    y: 280,
    w: 260,
    h: 230,
    color: 'cyan',
    description: 'Das Gedächtnis des Labors: Vektorstore, Checkpoints, Audit-Log und Ergebnis-Hashes.',
    equipment: ['ChromaDB', 'Backup-NAS', 'Checkpoint-Regal', 'Hash-Register'],
    people: [],
    status: 'intakt'
  },
  {
    id: 'besprechung',
    name: 'Besprechung',
    node: 'A01',
    x: 630,
    y: 280,
    w: 330,
    h: 230,
    color: 'rose',
    description: 'Menschen und Agenten stimmen sich ab. Hier werden Freigaben erteilt, nie automatisch.',
    equipment: ['Konferenztisch', 'Beamer', 'Freigabe-Terminal', 'Pflanzen'],
    people: ['Operator', 'Critic-Agent'],
    status: 'intakt'
  }
]

export const OFFICE_CHECKS = [
  { id: 'strom', label: 'Strom & USV', detail: 'Beide Nodes versorgt', status: 'ok' },
  { id: 'netz', label: 'Netzwerk 10.77.0.0/24', detail: 'A01 ↔ B02 verbunden', status: 'ok' },
  { id: 'kuehlung', label: 'Kühlung Serverraum', detail: '21,4 °C · stabil', status: 'ok' },
  { id: 'zugang', label: 'Zugangskontrolle', detail: 'SSH nur mit Schlüssel', status: 'ok' },
  { id: 'backup', label: 'Backups & Checkpoints', detail: 'Letzter Checkpoint vor 12 min', status: 'ok' },
  { id: 'kaffee', label: 'Kaffeemaschine', detail: 'Betriebsbereit · wichtig', status: 'ok' }
]

export const KNOWLEDGE = [
  {
    id: 'k-labor',
    tags: ['labor', 'aufbau', 'nodes', 'a01', 'b02', 'netzwerk', 'status', 'system'],
    title: 'Laboraufbau',
    text: 'Das KI-Labor besteht aus dem Controller A01 (ThinkPad T460, 10.77.0.1) und dem Worker B02 (Dell Precision M4800, 10.77.0.2). A01 ist die Autorität: Leitstand, Agenten, Workflows, Memory und Ergebniskontrolle. B02 ist der Executor: Ollama, Modelle, Docker-Sandbox, Build, Test und Debug. Die direkte Verbindung A01–B02 ist bestätigt.'
  },
  {
    id: 'k-sicherheit',
    tags: ['sicherheit', 'sandbox', 'audit', 'hash', 'checkpoint', 'retry', 'freigabe'],
    title: 'Sicherheitsregeln',
    text: 'Generierter Code läuft ausschließlich in der Sandbox auf B02. Jeder Auftrag wird auditiert, Ergebnisse werden gehasht, Checkpoints werden gespeichert. Es gibt maximal drei Retries. Der Controller entscheidet, der Worker führt aus. Freigaben bleiben menschlich.'
  },
  {
    id: 'k-modelle',
    tags: ['modell', 'modelle', 'ollama', 'llama', 'qwen', 'mistral', 'phi', 'deepseek', 'lokal', 'empfehlung', 'free', 'kostenlos'],
    title: 'Modellwahl',
    text: 'Auf A01 laufen kleine Modelle bis etwa 4 GB: Llama 3.2 3B und Phi-4 Mini. Auf B02 laufen 7B-Modelle wie Qwen 2.5 7B und Mistral 7B, für Analyse auch DeepSeek R1 Distill 8B. Nomic Embed Text erzeugt die Embeddings. Kostenlose Cloud-Modelle sind über OpenRouter und OpenCode Zen anbindbar, brauchen aber einen Key.'
  },
  {
    id: 'k-langchain',
    tags: ['langchain', 'chain', 'framework', 'runnable', 'prompt', 'tool', 'memory'],
    title: 'LangChain im Labor',
    text: 'LangChain orchestriert Chains aus Prompt-Template, Retriever, Modell und Tools. Jede Chain ist eine RunnableSequence: Ausgabe eines Schritts wird Eingabe des nächsten. BEXP-01 nutzt dasselbe Muster lokal im Browser: Router, Retriever, Planner, Modell, Guardrails.'
  },
  {
    id: 'k-rag',
    tags: ['rag', 'retrieval', 'vektor', 'chroma', 'embedding', 'wissen', 'quellen'],
    title: 'RAG-Pipeline',
    text: 'RAG lädt Dokumente, zerlegt sie in Chunks, erzeugt Embeddings mit Nomic Embed Text und speichert sie in ChromaDB. Zur Frage werden die besten Treffer gesucht und dem Modell als Kontext mitgegeben. Antworten müssen Quellen nennen, sonst greifen die Guardrails.'
  },
  {
    id: 'k-drift',
    tags: ['drift', 'monitoring', 'psi', 'evidently', 'metriken', 'alarm', 'qualität'],
    title: 'Drift-Überwachung',
    text: 'Der Drift-Wächter vergleicht Referenz- und Live-Daten. Der PSI (Population Stability Index) liegt unter 0,10 bei stabiler Verteilung, 0,10 bis 0,20 ist beobachten, ab 0,20 wird alarmiert. Bei Alarm wird ein Retraining vorgeschlagen, niemals automatisch ausgerollt.'
  },
  {
    id: 'k-workflow',
    tags: ['workflow', 'pipeline', 'auftrag', 'plan', 'schritte', 'erstellen'],
    title: 'Workflows',
    text: 'Ein Workflow ist eine Kette aus Quellen, Verarbeitung, Modell, Prüfung und Ausgabe. Der Controller zerlegt den Auftrag, B02 führt aus, ein Kritiker prüft. Ergebnisse werden gehasht und im Audit-Log gespeichert. Fehlschläge werden bis zu dreimal wiederholt.'
  },
  {
    id: 'k-buero',
    tags: ['büro', 'buero', 'office', 'raum', 'räume', 'leitstand', 'serverraum', 'werkstatt', 'archiv'],
    title: 'Das Büro',
    text: 'Das Büro ist vollständig intakt. Leitstand, Serverraum, Sandbox, Werkstatt, Archiv und Besprechung sind verbunden. Strom, Netzwerk, Kühlung, Zugang, Backups und Kaffee sind geprüft. Alle Räume melden Status intakt.'
  },
  {
    id: 'k-frameworks',
    tags: ['framework', 'frameworks', 'llamaindex', 'langgraph', 'crewai', 'autogen', 'dspy', 'vllm', 'mlflow'],
    title: 'Framework-Landschaft',
    text: 'Orchestrierung: LangChain, LangGraph, Semantic Kernel. RAG: LlamaIndex, ChromaDB, FAISS. Agenten: CrewAI, AutoGen. Optimierung: DSPy. Runtime: Ollama, vLLM. Monitoring: MLflow, Evidently. Evaluierung: RAGAS. Verifikation: Playwright.'
  },
  {
    id: 'k-betrieb',
    tags: ['betrieb', 'ports', 'open webui', 'ssh', 'ollama', 'dienst', 'services'],
    title: 'Betrieb und Ports',
    text: 'Open WebUI läuft auf Port 8080, Ollama auf 11434, SSH auf 22. Der Leitstand ist über 10.77.0.1 erreichbar, der Worker über 10.77.0.2. Dienste werden überwacht; ein Neustart erfolgt nur nach Prüfung des Endpunkts.'
  },
  {
    id: 'k-kosten',
    tags: ['kosten', 'free', 'kostenlos', 'budget', 'preis', 'offline'],
    title: 'Kosten',
    text: 'Der lokale Betrieb kostet 0 Euro pro Anfrage. LabLM-1 läuft vollständig im Browser. Ollama auf A01 und B02 verursacht nur Strom. Kostenlose Cloud-Modelle haben Limits und brauchen einen eigenen Key; bei Erschöpfung fällt das Labor automatisch auf das lokale Modell zurück.'
  },
  {
    id: 'k-agent',
    tags: ['bot', 'agent', 'bexp', 'bexp-01', 'hilfe', 'fähigkeiten'],
    title: 'BEXP-01',
    text: 'BEXP-01 ist der Labor-Agent auf A01. Er beantwortet Fragen zum Labor, prüft den Systemstatus, empfiehlt Modelle, plant Workflows, erklärt Frameworks, analysiert Drift und erzeugt Code-Vorschläge für die Sandbox. Er führt keinen Code ungeprüft aus.'
  }
]

export const QUICK_PROMPTS = [
  'Systemstatus prüfen',
  'Welches Modell für den ThinkPad?',
  'Erstelle einen Workflow für RAG',
  'Analysiere den Drift',
  'Erkläre LangChain im Labor',
  'Ist das Büro intakt?'
]

export const INITIAL_EVENTS = [
  { id: 'e1', time: '05:41', type: 'ok', text: 'A01 ↔ B02 Verbindung bestätigt' },
  { id: 'e2', time: '05:38', type: 'ok', text: 'Checkpoint #482 gespeichert' },
  { id: 'e3', time: '05:32', type: 'info', text: 'Ollama Worker: qwen2.5:7b geladen' },
  { id: 'e4', time: '05:20', type: 'ok', text: 'Sandbox-Image verifiziert (SHA-256)' },
  { id: 'e5', time: '05:12', type: 'warn', text: 'Drift PSI 0,14 · beobachten' },
  { id: 'e6', time: '04:58', type: 'ok', text: 'Audit-Log rotiert · 0 Fehler' }
]

export const DRIFT_REFERENCE = [12, 18, 24, 31, 27, 22, 16, 11, 9, 13, 19, 26, 30, 28, 21, 15, 10, 8, 14, 20, 25, 29, 26, 19]
export const DRIFT_LIVE = [10, 15, 21, 28, 25, 20, 15, 11, 10, 15, 22, 30, 35, 33, 26, 19, 13, 11, 18, 26, 32, 36, 33, 24]
