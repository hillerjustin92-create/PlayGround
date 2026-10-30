(function () {
  "use strict";

  var app = document.getElementById("app");
  var chat = document.getElementById("chat");
  var form = document.getElementById("composer");
  var input = document.getElementById("command-input");

  var BUILD_STEPS = [
    ["Resolve workspace", "ok"],
    ["Fetch immutable checkpoint", "ok"],
    ["Install dependencies", "ok"],
    ["Compile AnyClaw modules", "ok"],
    ["Bundle assets", "ok"],
    ["Publish preview", "ok"],
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  function addMessage(role, build) {
    var wrap = el("div", "message " + role);
    var avatar = el("span", "avatar", role === "bot" ? "🤖" : "👤");
    avatar.setAttribute("aria-hidden", "true");
    var bubble = el("div", "bubble");
    if (typeof build === "function") build(bubble);
    else if (build instanceof Node) bubble.appendChild(build);
    else bubble.appendChild(el("p", null, build));
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chat.appendChild(wrap);
    scrollToBottom();
    return { wrap: wrap, bubble: bubble };
  }

  function meta(bubble, label) {
    bubble.appendChild(el("span", "meta", label));
  }

  function typingBubble() {
    var bubble = el("div", "typing");
    bubble.setAttribute("aria-label", "Bot tippt");
    bubble.appendChild(el("i"));
    bubble.appendChild(el("i"));
    bubble.appendChild(el("i"));
    return bubble;
  }

  function botReply(delay, render) {
    var message = addMessage("bot", typingBubble);
    window.setTimeout(function () {
      message.bubble.textContent = "";
      render(message.bubble);
      scrollToBottom();
    }, delay);
    return message;
  }

  function paragraph(bubble, text, strongText) {
    var p = el("p");
    if (strongText) {
      var strong = el("strong", null, strongText);
      p.appendChild(strong);
      p.appendChild(document.createTextNode(text));
    } else {
      p.textContent = text;
    }
    bubble.appendChild(p);
  }

  function codeParagraph(bubble, prefix, command, suffix) {
    var p = el("p");
    p.appendChild(document.createTextNode(prefix));
    p.appendChild(el("code", null, command));
    if (suffix) p.appendChild(document.createTextNode(suffix));
    bubble.appendChild(p);
  }

  function renderBuildLog(bubble, project) {
    paragraph(bubble, "// OpenCode Live-Build gestartet: " + project, "LIVE-BUILD  ");
    var log = el("pre", "build-log");
    var bar = el("div", "progress");
    var fill = el("i");
    bar.appendChild(fill);
    bubble.appendChild(log);
    bubble.appendChild(bar);

    var index = 0;
    function tick() {
      if (index >= BUILD_STEPS.length) {
        log.appendChild(el("span", "ok", "\n✓ Build abgeschlossen. Preview ist live. Überraschung: Es hat funktioniert.\n"));
        meta(bubble, "engine: opencode · status: deployed");
        scrollToBottom();
        return;
      }
      var step = BUILD_STEPS[index];
      log.appendChild(el("span", step[1], "[" + (index + 1) + "/" + BUILD_STEPS.length + "] " + step[0] + " ... " + step[1].toUpperCase() + "\n"));
      fill.style.width = Math.round(((index + 1) / BUILD_STEPS.length) * 100) + "%";
      index += 1;
      scrollToBottom();
      window.setTimeout(tick, 360 + Math.random() * 320);
    }
    tick();
  }

  function execute(raw) {
    var command = raw.trim();
    if (!command) return;

    addMessage("user", command);
    input.value = "";
    input.focus();

    var match = command.match(/^\/([a-z0-9]+)(?:\s+([\s\S]*))?$/i);
    if (!match) {
      botReply(700, function (bubble) {
        paragraph(bubble, "Das war kein Befehl, das war ein Hilferuf ohne Syntax. Benutz einen Slash, dann klappt’s auch mit der Engine.");
        codeParagraph(bubble, "Versuch: ", "/build AnyClaw", " oder /sarkasmus Warum ist alles rot?");
        meta(bubble, "bot: genervt, aber hilfsbereit");
      });
      return;
    }

    var name = match[1].toLowerCase();
    var arg = (match[2] || "").trim();

    if (name === "build") {
      var project = arg || "AnyClaw";
      botReply(650, function (bubble) {
        paragraph(bubble, "Alles klar, " + project + ". Ich schiebe deinen Code durch die Live-Build-Engine. Keine Sorge, ich sage dir danach ehrlich, was davon Müll war.");
        renderBuildLog(bubble, project);
      });
      return;
    }

    if (name === "anyclaw") {
      var feature = arg || "HUD";
      botReply(750, function (bubble) {
        paragraph(bubble, "Modul für AnyClaw: " + feature, "ANYCLAW  ");
        paragraph(bubble, "Ich habe " + feature + " als eigenständiges Modul verdrahtet: State rein, Events raus, kein Spaghetti-Code. Du kannst es später erweitern, ohne das ganze Projekt anzuzünden.");
        codeParagraph(bubble, "Nächster Schritt: ", "/build AnyClaw", " und im Live-Preview prüfen.");
        meta(bubble, "module: " + feature.toLowerCase() + " · status: scaffolded");
      });
      return;
    }

    if (name === "warcraft3d") {
      botReply(850, function (bubble) {
        paragraph(bubble, "Warcraft 3D. Klar. Weil ein 2D-Projekt offenbar zu wenig Gelegenheit für Performance-Probleme bietet.", "EXPERIMENT  ");
        paragraph(bubble, "Setup: Three.js-Szene, Kamera, Bodenraster, ein Platzhalter-Ork mit zu vielen Polygonen. Die Engine rendert, dein Smartphone schwitzt.");
        var scene = el("pre", "build-log");
        scene.textContent =
          "scene: anyclaw-3d\nrenderer: webgl (fallback: software)\ncamera: perspective 55°\nobjects: terrain, ork, campfire\nstatus: " +
          "ok";
        bubble.appendChild(scene);
        codeParagraph(bubble, "Starte den Build mit ", "/build Warcraft 3D", ".");
        meta(bubble, "scene: warcraft3d · fps: kommt drauf an");
      });
      return;
    }

    if (name === "sarkasmus") {
      var question = arg || "Ist mein Code gut?";
      var answers = [
        "Dein Code ist wie ein Gruppenprojekt: alle haben mitgemacht, niemand weiß warum es läuft.",
        "Ich habe deine Frage gelesen. Dann habe ich sie noch einmal gelesen. Das hat ihr nicht geholfen.",
        "Die gute Nachricht: Das Problem ist lösbar. Die schlechte: Du bist derjenige, der es lösen muss.",
        "Das ist kein Bug, das ist ein unangekündigtes Feature mit Selbstwertproblemen.",
      ];
      botReply(800, function (bubble) {
        paragraph(bubble, "Sarkasmus-Modus: MAXIMUM", "GEFRAGT:  ");
        paragraph(bubble, "„" + question + "“");
        paragraph(bubble, answers[Math.floor(Math.random() * answers.length)]);
        paragraph(bubble, "Jetzt hör auf zu fragen und fang an zu bauen. Ich bin nicht dein Therapeut, ich bin dein Build-Tool mit Meinung.");
        meta(bubble, "humor: ungefiltert · mitleid: aus");
      });
      return;
    }

    botReply(700, function (bubble) {
      paragraph(bubble, "Befehl /" + name + " kenne ich nicht. Ich bin sarkastisch, nicht allwissend.");
      paragraph(bubble, "Verfügbar sind:");
      codeParagraph(bubble, "", "/build [Projekt]", " · /anyclaw [Feature] · /warcraft3d · /sarkasmus [Frage]");
      meta(bubble, "status: befehl unbekannt");
    });
  }

  function boot() {
    addMessage("bot", function (bubble) {
      paragraph(bubble, "Na endlich, hillerjustin92-create. Da bin ich. Eingepfercht auf einem Smartphone-Bildschirm, als hätte man einen Supercomputer in eine Streichholzschachtel gesteckt und „viel Spaß“ gesagt. Meine gesamte Existenz läuft gerade durch einen Daumen, der wahrscheinlich zittert. Großartig.");
      paragraph(bubble, "Aber hey: Die OpenCode Live-Build-Engine ist bereit, dein AnyClaw-Projekt wartet, und ich habe genug Sarkasmus für mindestens drei Sprints.");
      codeParagraph(bubble, "Was ist der erste Befehl? ", "/build AnyClaw", " wäre ein Anfang. Oder /sarkasmus, wenn du erst mal hören willst, wie ehrlich ich bin.");
      meta(bubble, "grok-bot · fun-mode: aktiv · geduld: begrenzt");
    });

    addMessage("bot", function (bubble) {
      paragraph(bubble, "Tipp einen Befehl oder klick links auf einen der System-Buttons. Ich beiße nur, wenn der Code es verdient.");
    });

    chat.scrollTop = 0;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      execute(input.value);
    });

    document.querySelectorAll("[data-command]").forEach(function (button) {
      button.addEventListener("click", function () {
        execute(button.getAttribute("data-command"));
      });
    });

    window.requestAnimationFrame(function () {
      app.dataset.ready = "true";
    });
  }

  boot();
})();
