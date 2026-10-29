(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  $("#year").textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------
     Navigation
     --------------------------------------------------------------- */
  const nav = $("#nav");
  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");

  const closeMenu = () => {
    nav.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
  };
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------------- */
  const reveals = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
    window.setTimeout(() => reveals.forEach((el) => el.classList.add("in")), 700);
  }

  /* ---------------------------------------------------------------
     Pointer glow
     --------------------------------------------------------------- */
  const glow = $("#cursorGlow");
  if (glow && window.matchMedia("(pointer: fine)").matches) {
    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let tx = gx;
    let ty = gy;
    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
      },
      { passive: true }
    );
    const loop = () => {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------
     Background canvas
     --------------------------------------------------------------- */
  const canvas = $("#bg");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const palette = [
      "255, 138, 77",
      "255, 179, 92",
      "95, 227, 255",
      "182, 156, 255",
    ];
    let W = 0;
    let H = 0;
    let nodes = [];
    let raf = 0;
    let visible = true;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const build = () => {
      const count = Math.round(Math.min(72, Math.max(30, (W * H) / 26000)));
      nodes = Array.from({ length: count }, () => {
        const roll = Math.random();
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.7,
          hue: palette[roll > 0.82 ? 2 : roll > 0.66 ? 3 : roll > 0.34 ? 1 : 0],
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduced) draw(0);
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, W, H);
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const ox = (pointer.x - 0.5) * 22;
      const oy = (pointer.y - 0.5) * 22;

      ctx.save();
      ctx.translate(ox, oy);

      ctx.fillStyle = "rgba(255,255,255,0.05)";
      const gap = 62;
      const startX = -gap - ((ox * 2) % gap);
      const startY = -gap - ((oy * 2) % gap);
      for (let x = startX; x < W + gap; x += gap) {
        for (let y = startY; y < H + gap; y += gap) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reduced) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -20) a.x = W + 20;
          if (a.x > W + 20) a.x = -20;
          if (a.y < -20) a.y = H + 20;
          if (a.y > H + 20) a.y = -20;
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 138) {
            const alpha = (1 - dist / 138) * 0.16;
            ctx.strokeStyle = `rgba(${a.hue},${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const twinkle = reduced ? 1 : 0.62 + Math.sin(time * 0.0011 + a.phase) * 0.38;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${a.hue},${(0.5 * twinkle).toFixed(3)})`;
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();

        if (twinkle > 0.86) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${a.hue},0.05)`;
          ctx.arc(a.x, a.y, a.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.tx = e.clientX / Math.max(W, 1);
        pointer.ty = e.clientY / Math.max(H, 1);
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    });

    resize();
    if (!reduced) raf = requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------------
     Terminal
     --------------------------------------------------------------- */
  const term = $("#terminal");
  const termBody = $("#termBody");
  const termOut = $("#termOut");
  const termForm = $("#termForm");
  const termInput = $("#termInput");
  const scrollTerm = () => {
    termBody.scrollTop = termBody.scrollHeight;
  };
  const print = (html, cls = "") => {
    const div = document.createElement("div");
    div.className = "term-line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    termOut.appendChild(div);
    scrollTerm();
    return div;
  };

  print(`<span class="term-logo-word">anyclaw</span><span class="logo-cursor"></span><span class="dim"> dein lokaler Agent. Überall.</span>`);
  print(`<span class="dim">v2.0.14 · aarch64 · lokale Agent-Runtime</span>`);
  print(`<span class="ok">✓</span> Linux-Userland bereit <span class="dim">· node 24.13.0</span>`);
  print(
    `<span class="ok">✓</span> Agenten registriert <span class="cyan">openclaw</span><span class="dim"> · </span><span class="cyan">codex</span><span class="dim"> · </span><span class="cyan">claude-code</span>`
  );
  print(`<span class="dim">Tippe </span><b>/help</b><span class="dim"> für Befehle oder </span><b>/guest</b><span class="dim"> für einen Demo-ClawKey.</span>`);
  print("");

  const echo = (text) => {
    print(`<span class="prompt">web@anyclaw:~$</span> ${esc(text)}`);
  };

  const themes = [
    { name: "Klaue", a: "#ff6a2b", b: "#ffb35c" },
    { name: "Gletscher", a: "#4dd8ff", b: "#a9f2ff" },
    { name: "Violett", a: "#a98bff", b: "#d8c8ff" },
    { name: "Limette", a: "#8fe36a", b: "#c9ff9e" },
  ];
  let themeIndex = 0;
  let history = [];
  let historyIndex = -1;
  let agentBusy = false;

  const randomKey = () => {
    const chars = "abcdef0123456789";
    let s = "";
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const helpText = [
    `<span class="accent">BEFEHLE</span>`,
    `  <b>/help</b>      zeigt diese Liste`,
    `  <b>/agents</b>    listet die registrierten Agenten`,
    `  <b>/status</b>    Runtime- und Sandbox-Status`,
    `  <b>/guest</b>     erzeugt einen Demo-ClawKey`,
    `  <b>/run</b> &lt;task&gt; übergibt eine Aufgabe an den Router`,
    `  <b>/theme</b>     wechselt die Akzent-Palette`,
    `  <b>/about</b>     was AnyClaw ist`,
    `  <b>/clear</b>     leert den Bildschirm`,
    ``,
    `<span class="dim">Teste </span><b>/run landingpage bauen</b><span class="dim"> — oder tippe einfach.</span>`,
  ];

  const aboutText = [
    `<span class="warn">AnyClaw</span> <span class="dim">v2.0.14</span>`,
    `Drei KI-Coding-Agenten und ein vollständiges Linux-Terminal,`,
    `lokal in einer einzigen Android-APK.`,
    ``,
    `<span class="dim">Baut auf Open Source: OpenClaw (MIT), Codex CLI</span>`,
    `<span class="dim">(Apache-2.0) und OpenCode (MIT).</span>`,
  ];

  const agentsText = [
    `<span class="ok">●</span> <b>openclaw</b>      <span class="dim">gateway </span> <span class="dim">2026.9.9</span>  <span class="ok">online</span>`,
    `<span class="ok">●</span> <b>codex</b>         <span class="dim">terminal</span> <span class="dim">0.104.0 </span>  <span class="ok">online</span>`,
    `<span class="warn">○</span> <b>claude-code</b>   <span class="dim">Schwarm </span> <span class="dim">latest  </span>  <span class="warn">bereit</span>`,
    ``,
    `<span class="dim">Router → codex für Edits · claude für Audits · openclaw für Ops</span>`,
  ];

  const statusText = [
    `<span class="accent">runtime</span>   linux aarch64 · node 24.13.0`,
    `<span class="accent">agenten</span>   <span class="ok">2 online</span> · <span class="warn">1 bereit</span>`,
    `<span class="accent">sandbox</span>   workspace-write · on-request`,
    `<span class="accent">speicher</span>  482 MB / 500 MB`,
    `<span class="accent">uptime</span>    6d 04:12 · Foreground-Service`,
  ];

  const neofetch = [
    `       <span class="accent">,--.</span>        <b>web@anyclaw</b>`,
    `      <span class="accent">( o o )</span>       <span class="dim">-----------</span>`,
    `       <span class="accent">\\   /</span>        <span class="dim">OS:</span> AnyClaw Linux aarch64`,
    `        <span class="accent">\\_/</span>         <span class="dim">Shell:</span> zsh`,
    ``,
    `                    <span class="dim">Agenten:</span> 3 · Router: aktiv`,
    `                    <span class="dim">Modell:</span> gpt-5.3-codex`,
    `                    <span class="dim">Theme:</span> ${esc(themes[themeIndex].name)}`,
  ];

  const runSequence = [
    { t: 420, html: `<span class="dim">› routing ·</span> Absicht=<span class="cyan">Code</span> <span class="dim">Agent=</span><span class="accent">codex</span>` },
    { t: 380, html: `<span class="dim">› Kontext ·</span> 42 Dateien <span class="dim">·</span> 1.8k Tokens <span class="dim">·</span> Repo gemountet` },
    { t: 340, html: `<span class="dim">› Plan    ·</span> prüfen <span class="dim">→</span> scaffolden <span class="dim">→</span> verifizieren` },
    { t: 520, html: `<span class="dim">› Tool    ·</span> schreibe <span class="violet">src/App.tsx</span>` },
    { t: 460, html: `<span class="dim">› Tool    ·</span> npm run build <span class="dim">····</span> <span class="ok">ok</span>` },
    { t: 320, html: `<span class="ok">✓</span> fertig in 3.4s <span class="dim">· 0 Fehler · Vorschau</span> <span class="cyan">:5173</span>` },
  ];

  const runAgent = async (task) => {
    if (agentBusy) {
      print(`<span class="warn">Agent beschäftigt</span> <span class="dim">· warte auf den laufenden Run oder</span> <b>/clear</b>`);
      return;
    }
    agentBusy = true;
    print(`<span class="dim">übergebe an den Router…</span>`);
    for (const step of runSequence) {
      await wait(step.t);
      print(step.html);
    }
    print(`<span class="dim">eingereiht:</span> <span class="cyan">${esc(task || "unbenannte Aufgabe")}</span>`);
    agentBusy = false;
  };

  const handleCommand = (raw) => {
    echo(raw);
    const trimmed = raw.trim();
    const parts = trimmed.split(/\s+/);
    const name = parts[0].replace(/^\//, "").toLowerCase();
    const arg = parts.slice(1).join(" ");

    switch (name) {
      case "help":
      case "?":
        helpText.forEach((line) => print(line));
        print("");
        break;
      case "agents":
        agentsText.forEach((line) => print(line));
        print("");
        break;
      case "status":
        statusText.forEach((line) => print(line));
        print("");
        break;
      case "guest":
        print(`<span class="ok">✓</span> Gastzugang gewährt <span class="dim">· läuft in 24 h ab</span>`);
        print(`ClawKey <span class="cyan">ck_guest_${randomKey()}</span>`);
        print(`<span class="dim">Füge ihn auf anyclaw.sh ein oder teste mit /run den Router.</span>`);
        print("");
        break;
      case "run":
        runAgent(arg);
        break;
      case "theme": {
        themeIndex = (themeIndex + 1) % themes.length;
        const t = themes[themeIndex];
        document.documentElement.style.setProperty("--accent", t.a);
        document.documentElement.style.setProperty("--accent-2", t.b);
        print(`<span class="ok">✓</span> Palette → <span class="accent">${esc(t.name)}</span> <span class="dim">(${esc(t.a)})</span>`);
        break;
      }
      case "about":
        aboutText.forEach((line) => print(line));
        print("");
        break;
      case "whoami":
        print(`web <span class="dim">· Gast-Session · localhost · kein Root</span>`);
        break;
      case "date":
        print(`<span class="dim">${esc(new Date().toLocaleString("de-DE"))}</span>`);
        break;
      case "echo":
        print(esc(arg));
        break;
      case "ls":
        print(`<span class="cyan">agents/</span>  <span class="cyan">projects/</span>  <span class="cyan">skills/</span>  <span class="cyan">sessions/</span>  <span class="dim">README.md</span>`);
        break;
      case "neofetch":
        neofetch.forEach((line) => print(line));
        print("");
        break;
      case "open":
        print(`<span class="dim">öffne das Installations-Panel…</span>`);
        $("#install").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        break;
      case "sudo":
        print(`<span class="warn">Netter Versuch.</span> Die Sandbox bleibt intakt. <span class="dim">Kein Root nötig — genau das ist der Punkt.</span>`);
        break;
      case "exit":
      case "quit":
        print(`<span class="dim">Es gibt kein Exit. Nur Hintergrundausführung.</span>`);
        break;
      case "clear":
        termOut.innerHTML = "";
        break;
      case "version":
      case "v":
        print(`AnyClaw <span class="cyan">v2.0.14</span> <span class="dim">· Build 514 · aarch64</span>`);
        break;
      case "":
        break;
      default:
        print(`<span class="err">Befehl nicht gefunden:</span> ${esc(parts[0])}`);
        print(`<span class="dim">probiere</span> <b>/help</b> <span class="dim">· oder</span> <b>/run ${esc(arg || "landingpage bauen")}</b>`);
    }
  };

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = termInput.value;
    if (!raw.trim()) return;
    history.push(raw);
    historyIndex = history.length;
    termInput.value = "";
    handleCommand(raw);
    scrollTerm();
  });

  termInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      termInput.value = history[historyIndex] || "";
      queueMicrotask(() => termInput.setSelectionRange(termInput.value.length, termInput.value.length));
    } else if (e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      termInput.value = history[historyIndex] || "";
    } else if (e.key === "Tab") {
      const value = termInput.value;
      if (!value.startsWith("/")) return;
      const commands = ["help", "agents", "status", "guest", "run", "theme", "about", "clear", "neofetch", "whoami", "version", "open"];
      const matches = commands.filter((c) => ("/" + c).startsWith(value.toLowerCase()));
      if (matches.length === 1) {
        e.preventDefault();
        termInput.value = "/" + matches[0] + " ";
      } else if (matches.length > 1) {
        e.preventDefault();
        print(`<span class="dim">${matches.map((m) => "/" + m).join("  ")}</span>`);
      }
    }
  });

  $$("#termChips button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd || "";
      termInput.value = "";
      handleCommand(cmd);
      termInput.focus({ preventScroll: true });
      scrollTerm();
    });
  });

  termBody.addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, label")) return;
    if (String(window.getSelection?.() || "").length) return;
    termInput.focus({ preventScroll: true });
  });

  const focusTerminal = () => {
    term.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    window.setTimeout(() => termInput.focus({ preventScroll: true }), reduced ? 0 : 420);
  };
  $("#tryTerminal").addEventListener("click", focusTerminal);
  $("#tryTerminal2").addEventListener("click", focusTerminal);

  /* ---------------------------------------------------------------
     Router demo
     --------------------------------------------------------------- */
  const routeDemo = $("#routeDemo");
  const routeLog = $("#routeLog");
  const routeMeta = $("#routeMeta");
  const pipeAgent = $("#pipeAgent");
  const tasks = $$(".task");
  const agentCards = $$(".agent-card");
  const nodes = {};
  $$(".pipe-node", routeDemo).forEach((n) => {
    nodes[n.dataset.node] = n;
  });

  const routeData = {
    landing: {
      label: "Landingpage ausliefern",
      agent: "codex",
      agentLabel: "Codex",
      color: "#5fe3ff",
      intent: "Build · Konfidenz 0.96",
      meta: "abgeschlossen in 3.4s",
      lines: [
        ["dim", "Prompt empfangen · 1 Repo · 12 Dateien"],
        ["warn", "Router · Absicht=Build · Ziel=codex"],
        ["agent", "codex gewählt · Repo-Kontext + Skills angehängt"],
        ["dim", "Tool · Scaffold · index.html + styles.css"],
        ["dim", "Tool · npm run build · 0 Fehler"],
        ["ok", "ausgeliefert · Vorschau :5173 · Screenshot verifiziert"],
      ],
    },
    audit: {
      label: "Repo-Architektur auditieren",
      agent: "claude",
      agentLabel: "Claude",
      color: "#b69cff",
      intent: "Review · Konfidenz 0.93",
      meta: "abgeschlossen in 5.1s",
      lines: [
        ["dim", "Prompt empfangen · 1 Repo · 128 Dateien"],
        ["warn", "Router · Absicht=Review · Ziel=claude-code"],
        ["agent", "claude-code gewählt · Schwarm aus 3 gestartet"],
        ["dim", "Tool · Lesen · Abhängigkeitsgraph (128 Knoten)"],
        ["dim", "Tool · Analyse · 4 Kopplungs-Hotspots"],
        ["ok", "Report bereit · 7 Befunde · 2 blockierend"],
      ],
    },
    inbox: {
      label: "Posteingang zusammenfassen",
      agent: "openclaw",
      agentLabel: "OpenClaw",
      color: "#ff7a3d",
      intent: "Ops · Konfidenz 0.91",
      meta: "abgeschlossen in 2.2s",
      lines: [
        ["dim", "Prompt empfangen · Kanäle: 4 · ungelesen: 38"],
        ["warn", "Router · Absicht=Ops · Ziel=openclaw"],
        ["agent", "openclaw gewählt · Sessions + Skills gemountet"],
        ["dim", "Tool · Lesen · 38 Threads in 4 Kanälen"],
        ["dim", "Tool · Thread · 6 Threads brauchen eine Antwort"],
        ["ok", "Digest bereit · 3 dringend · 2 warten auf dich"],
      ],
    },
    test: {
      label: "Fehlgeschlagenen Auth-Test beheben",
      agent: "codex",
      agentLabel: "Codex",
      color: "#5fe3ff",
      intent: "Fix · Konfidenz 0.98",
      meta: "abgeschlossen in 4.7s",
      lines: [
        ["dim", "Prompt empfangen · fehlschlagend: auth.spec.ts"],
        ["warn", "Router · Absicht=Fix · Ziel=codex"],
        ["agent", "codex gewählt · Testausgabe + Diff angehängt"],
        ["dim", "Tool · Repro · 1 fehlschlagend · erwartet 200, erhalten 401"],
        ["dim", "Tool · Patch · src/auth/session.ts:84"],
        ["ok", "behoben · 42/42 Tests grün · 0 Regressionen"],
      ],
    },
  };

  let routeRun = 0;
  let hasRun = false;
  let currentTask = "landing";

  const routeLogLine = (html) => {
    const line = document.createElement("div");
    line.className = "rl";
    const stamp = new Date().toLocaleTimeString("de-DE", { hour12: false });
    line.innerHTML = `<span class="rl-time">${stamp}</span>${html}`;
    routeLog.appendChild(line);
    routeLog.scrollTop = routeLog.scrollHeight;
  };

  routeLogLine(`<span class="rl-dim">Router online · 3 Agenten registriert · Sandbox bereit</span>`);
  routeLogLine(`<span class="rl-warn">wartet auf eine Aufgabe</span> <span class="rl-dim">· wähle links eine</span>`);
  routeMeta.textContent = "bereit";

  const resetPipeline = () => {
    Object.values(nodes).forEach((n) => n.classList.remove("is-on", "is-done"));
    agentCards.forEach((c) => c.classList.remove("is-active"));
  };

  const runRoute = async (key, options = {}) => {
    const data = routeData[key] || routeData.landing;
    const token = ++routeRun;
    hasRun = true;
    currentTask = key;

    tasks.forEach((t) => t.classList.toggle("is-selected", t.dataset.task === key));
    resetPipeline();
    routeLog.innerHTML = "";
    routeMeta.textContent = "streamt…";
    pipeAgent.textContent = data.agentLabel;
    pipeAgent.parentElement.style.setProperty("--pipe-accent", data.color);
    nodes.agent.style.borderColor = data.color + "66";
    nodes.agent.style.color = data.color;

    const active = (name) => {
      if (nodes[name]) nodes[name].classList.add("is-on");
    };
    const done = (name) => {
      if (!nodes[name]) return;
      nodes[name].classList.remove("is-on");
      nodes[name].classList.add("is-done");
    };

    active("prompt");
    routeLogLine(`<span class="rl-dim">Prompt empfangen</span> · <span class="rl-warn">${esc(data.label)}</span>`);
    await wait(420);
    if (token !== routeRun) return;

    active("router");
    routeLogLine(`<span class="rl-dim">Router</span> · ${esc(data.intent)}`);
    await wait(520);
    if (token !== routeRun) return;

    done("prompt");
    active("agent");
    const card = agentCards.find((c) => c.dataset.agent === data.agent);
    if (card) card.classList.add("is-active");
    routeLogLine(`<span class="rl-agent">${esc(data.agentLabel.toLowerCase())}</span> <span class="rl-dim">gewählt · Kontext angehängt</span>`);
    await wait(560);
    if (token !== routeRun) return;

    done("router");
    active("tools");
    for (let i = 3; i < data.lines.length - 1; i++) {
      const [tone, text] = data.lines[i];
      const cls = tone === "ok" ? "rl-ok" : tone === "warn" ? "rl-warn" : tone === "agent" ? "rl-agent" : "rl-dim";
      routeLogLine(`<span class="${cls}">${esc(text)}</span>`);
      await wait(440);
      if (token !== routeRun) return;
    }

    done("tools");
    active("done");
    await wait(320);
    if (token !== routeRun) return;
    done("done");
    const last = data.lines[data.lines.length - 1];
    routeLogLine(`<span class="rl-ok">✓ ${esc(last[1])}</span>`);
    routeMeta.textContent = data.meta + " · lokal";
    if (options.onComplete) options.onComplete();
  };

  tasks.forEach((task) => {
    task.addEventListener("click", () => {
      const key = task.dataset.task;
      runRoute(key);
    });
  });

  $("#rerun").addEventListener("click", () => runRoute(currentTask));

  if ("IntersectionObserver" in window) {
    const routeIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasRun) {
            runRoute(currentTask, { auto: true });
            routeIo.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    routeIo.observe(routeDemo);
  } else {
    runRoute(currentTask);
  }

  /* ---------------------------------------------------------------
     Tabs + copy
     --------------------------------------------------------------- */
  const tabs = $$(".tab");
  const panels = $$(".tab-panel");
  const activateTab = (name) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      activateTab(next.dataset.tab);
      next.focus();
    });
  });

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  };

  $$(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy || "");
      const label = $("span", btn);
      if (!label) return;
      const original = label.textContent;
      label.textContent = ok ? "Kopiert" : "Strg+C";
      btn.classList.toggle("copied", ok);
      window.setTimeout(() => {
        label.textContent = original;
        btn.classList.remove("copied");
      }, 1600);
    });
  });
})();
