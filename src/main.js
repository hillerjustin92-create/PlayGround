import * as THREE from "../vendor/three.module.js";

/* ------------------------------------------------------------------ *
 * AnyClaw — the everything machine
 * A small, hand-built claw machine. Three.js, no external assets.
 * ------------------------------------------------------------------ */

const CAB = {
  width: 9.6,
  depth: 7.0,
  glassTop: 6.6,
  highClawY: 5.5,
  lowClawY: 1.65,
  minX: -3.45,
  maxX: 3.45,
  minZ: -2.25,
  maxZ: 2.25,
};

const CHUTE = { x: -2.85, z: 2.32, radius: 0.82 };
const RUN_SECONDS = 60;
const GRAB_RADIUS = 0.88;

const STATE = {
  IDLE: "idle",
  DROPPING: "dropping",
  CLOSING: "closing",
  LIFTING: "lifting",
  CARRYING: "carrying",
};

const rarity = {
  common: { points: 100, label: "Common" },
  rare: { points: 250, label: "Rare" },
  legend: { points: 500, label: "Legendary" },
};

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ------------------------------------------------------------------ *
 * DOM
 * ------------------------------------------------------------------ */
const ui = {
  canvas: $("scene"),
  hud: $("hud"),
  time: $("time"),
  timeStat: $("stat-time"),
  score: $("score"),
  best: $("best"),
  tray: $("tray"),
  trayCount: $("tray-count"),
  trayItems: $("tray-items"),
  hint: $("hint"),
  dropWrap: $("drop-wrap"),
  dropBtn: $("drop"),
  floaters: $("floaters"),
  toast: $("toast"),
  start: $("start"),
  result: $("result"),
  resultTitle: $("result-title"),
  resultScore: $("result-score"),
  resultCopy: $("result-copy"),
  resultItems: $("result-items"),
  resultBest: $("result-best"),
  loading: $("loading"),
  play: $("play"),
  replay: $("replay"),
  mute: $("mute"),
};

/* ------------------------------------------------------------------ *
 * Audio — tiny synthesized arcade cabinet
 * ------------------------------------------------------------------ */
class CabinetAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.startAmbience();
  }

  startAmbience() {
    if (!this.ctx || this.ambient) return;
    const t = this.ctx.currentTime;
    const bus = this.ctx.createGain();
    bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(0.05, t + 2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 3;
    const freqs = [55, 82.5, 110, 164.8];
    const oscillators = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? "sawtooth" : "sine";
      osc.frequency.value = f;
      osc.detune.value = i * 5 - 7;
      const gain = this.ctx.createGain();
      gain.gain.value = i === 0 ? 0.5 : 0.18 / (i + 1);
      osc.connect(gain).connect(filter);
      osc.start();
      return osc;
    });
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    filter.connect(bus).connect(this.master);
    this.ambient = { bus, filter, oscillators, lfo };
  }

  tone(freq, dur = 0.14, type = "sine", gain = 0.14, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise(dur = 0.12, gain = 0.05, freq = 1200) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.9;
    const amp = this.ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(this.master);
    src.start(t);
  }

  motor() {
    this.tone(78, 0.36, "sawtooth", 0.035, -20);
  }

  clank() {
    this.noise(0.1, 0.16, 2600);
    this.tone(180, 0.12, "square", 0.05, -60);
  }

  grab() {
    this.noise(0.14, 0.2, 1800);
    this.tone(240, 0.16, "triangle", 0.12, -90);
    setTimeout(() => this.tone(520, 0.12, "sine", 0.08, 120), 60);
  }

  miss() {
    this.tone(150, 0.18, "square", 0.06, -50);
    this.tone(110, 0.22, "sine", 0.05, -30);
  }

  collect(tier) {
    const sets = {
      common: [523, 659, 784],
      rare: [523, 659, 784, 1046],
      legend: [523, 659, 784, 1046, 1318, 1568],
    };
    const notes = sets[tier] || sets.common;
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "triangle", 0.12), i * 75));
  }

  tick() {
    this.tone(900, 0.05, "square", 0.04);
  }

  play() {
    [220, 330, 440, 660].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, "triangle", 0.1), i * 90));
  }

  over() {
    [440, 392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.34, "sine", 0.1), i * 150));
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, this.ctx.currentTime + 0.2);
    }
  }
}
const audio = new CabinetAudio();

/* ------------------------------------------------------------------ *
 * Three.js setup
 * ------------------------------------------------------------------ */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  ui.loading.innerHTML =
    '<div style="max-width:32ch;line-height:1.7;text-align:center">AnyClaw needs WebGL to run.<br>Try a browser with hardware acceleration enabled.</div>';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050d);
scene.fog = new THREE.Fog(0x04050d, 30, 92);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);
const baseCamPos = new THREE.Vector3(0, 5.9, 16);
const camTarget = new THREE.Vector3(0, 4.0, 0);
camera.position.copy(baseCamPos);
camera.lookAt(camTarget);

const glowTex = makeGlowTexture();

/* ------------------------------------------------------------------ *
 * Canvas texture helpers
 * ------------------------------------------------------------------ */
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d") };
}

function makeGlowTexture() {
  const { c, ctx } = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.75)");
  g.addColorStop(0.55, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowSprite(color, size = 4, opacity = 0.6) {
  const mat = new THREE.SpriteMaterial({
    map: glowTex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function makeEquirectEnvironment() {
  const { c, ctx } = makeCanvas(512, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#070a17");
  g.addColorStop(0.42, "#111a44");
  g.addColorStop(0.55, "#1e2a66");
  g.addColorStop(0.72, "#0b1030");
  g.addColorStop(1, "#05060f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  const bands = [
    ["rgba(95,246,255,0.9)", 104, 4],
    ["rgba(255,79,200,0.75)", 138, 3],
    ["rgba(139,92,255,0.7)", 68, 2],
    ["rgba(255,226,122,0.4)", 190, 2],
  ];
  for (const [color, y, h] of bands) {
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 512, h);
  }
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(180,220,255,${Math.random() * 0.5 + 0.1})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 220, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */
const MAT = {
  frame: new THREE.MeshStandardMaterial({ color: 0x1b2038, metalness: 0.88, roughness: 0.28, envMapIntensity: 1.1 }),
  frameDark: new THREE.MeshStandardMaterial({ color: 0x0a0d1b, metalness: 0.7, roughness: 0.42, envMapIntensity: 0.7 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x07090f, metalness: 0.1, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x9fe9ff,
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  }),
  cyan: new THREE.MeshBasicMaterial({ color: 0x5ff6ff, toneMapped: false }),
  pink: new THREE.MeshBasicMaterial({ color: 0xff4fc8, toneMapped: false }),
  violet: new THREE.MeshBasicMaterial({ color: 0x9b7bff, toneMapped: false }),
  gold: new THREE.MeshBasicMaterial({ color: 0xffe27a, toneMapped: false }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc4d8e8, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.5 }),
  metalDark: new THREE.MeshStandardMaterial({ color: 0x4a5878, metalness: 0.9, roughness: 0.34 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0b0d16, metalness: 0.4, roughness: 0.6 }),
};

function standard(color, { rough = 0.62, metal = 0.05, emissive = 0x000000, emissiveIntensity = 1 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive,
    emissiveIntensity,
    envMapIntensity: 0.75,
  });
}

const neonMats = [];

function neon(colorHex, thickness = 0.05, length = 1, horizontal = true) {
  const mat = new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false });
  neonMats.push({ mat, base: new THREE.Color(colorHex), phase: Math.random() * Math.PI * 2 });
  const geo = new THREE.BoxGeometry(horizontal ? length : thickness, horizontal ? thickness : length, thickness);
  return new THREE.Mesh(geo, mat);
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Room / backdrop
 * ------------------------------------------------------------------ */
function buildRoom() {
  const floorTex = (() => {
    const { c, ctx } = makeCanvas(256, 256);
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(95,246,255,0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);
    ctx.strokeStyle = "rgba(139,92,255,0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(56, 56);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    color: 0x252c50,
    metalness: 0.82,
    roughness: 0.36,
    envMapIntensity: 0.9,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.55;
  floor.receiveShadow = true;
  scene.add(floor);

  const halo = glowSprite(0x2f8bff, 34, 0.28);
  halo.position.set(0, -1.3, -1);
  halo.scale.set(34, 14, 1);
  scene.add(halo);

  const halo2 = glowSprite(0xff4fc8, 20, 0.18);
  halo2.position.set(-8, 1.5, -16);
  halo2.scale.set(22, 15, 1);
  scene.add(halo2);

  const backGlowTex = (() => {
    const { c, ctx } = makeCanvas(64, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(8,10,26,0)");
    g.addColorStop(0.55, "rgba(13,18,52,0.55)");
    g.addColorStop(1, "rgba(3,4,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 70),
    new THREE.MeshBasicMaterial({ map: backGlowTex, transparent: true, opacity: 0.8, depthWrite: false })
  );
  back.position.set(0, 14, -62);
  scene.add(back);

  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x2a5cff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  horizon.position.set(0, -1.5, -48);
  scene.add(horizon);

  const horizon2 = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0xff4fc8,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  horizon2.position.set(0, 6.5, -58);
  scene.add(horizon2);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = rand(-70, 70);
    positions[i * 3 + 1] = rand(-2, 36);
    positions[i * 3 + 2] = rand(-75, -12);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xb8e4ff,
      size: 0.16,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(stars);

  return { stars };
}

/* ------------------------------------------------------------------ *
 * Cabinet textures
 * ------------------------------------------------------------------ */
function buildMarqueeTexture() {
  const { c, ctx } = makeCanvas(1024, 224);
  const g = ctx.createLinearGradient(0, 0, 0, 224);
  g.addColorStop(0, "#171c44");
  g.addColorStop(0.5, "#0a0d23");
  g.addColorStop(1, "#141a3c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 224);

  ctx.strokeStyle = "rgba(95,246,255,0.55)";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 1004, 204);
  ctx.strokeStyle = "rgba(255,79,200,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 980, 180);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 118px "Orbitron", "Arial Black", sans-serif';
  ctx.save();
  ctx.shadowColor = "rgba(95,246,255,0.85)";
  ctx.shadowBlur = 36;
  const tg = ctx.createLinearGradient(210, 0, 820, 0);
  tg.addColorStop(0, "#a7fbff");
  tg.addColorStop(0.42, "#5ff6ff");
  tg.addColorStop(0.72, "#a68bff");
  tg.addColorStop(1, "#ff6fd4");
  ctx.fillStyle = tg;
  ctx.fillText("ANYCLAW", 512, 104);
  ctx.restore();

  ctx.font = '700 25px "Space Grotesk", sans-serif';
  ctx.fillStyle = "rgba(185,233,245,0.8)";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "9px";
  ctx.fillText("GRAB ANYTHING", 512, 177);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildBackPanelTexture() {
  const { c, ctx } = makeCanvas(1024, 768);
  const g = ctx.createLinearGradient(0, 0, 320, 768);
  g.addColorStop(0, "#080b1e");
  g.addColorStop(0.45, "#101640");
  g.addColorStop(0.72, "#1a1240");
  g.addColorStop(1, "#080a18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 768);

  const radial = ctx.createRadialGradient(512, 500, 20, 512, 500, 560);
  radial.addColorStop(0, "rgba(95,246,255,0.22)");
  radial.addColorStop(0.42, "rgba(139,92,255,0.12)");
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1024, 768);

  ctx.strokeStyle = "rgba(95,246,255,0.15)";
  ctx.lineWidth = 3;
  for (let r = 120; r < 640; r += 92) {
    ctx.beginPath();
    ctx.arc(512, 520, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,79,200,0.16)";
  ctx.lineWidth = 2;
  for (let r = 160; r < 660; r += 92) {
    ctx.beginPath();
    ctx.arc(512, 520, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.textAlign = "center";
  ctx.font = '900 210px "Orbitron", sans-serif';
  ctx.fillStyle = "#9fe9ff";
  ctx.fillText("ANY", 512, 300);
  ctx.fillText("CLAW", 512, 520);
  ctx.restore();

  ctx.fillStyle = "rgba(200,240,255,0.55)";
  for (let i = 0; i < 70; i++) {
    const s = Math.random() * 3 + 1;
    ctx.globalAlpha = Math.random() * 0.6 + 0.15;
    ctx.fillRect(Math.random() * 1024, Math.random() * 768, s, s);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildFloorTexture() {
  const { c, ctx } = makeCanvas(1024, 768);
  ctx.fillStyle = "#10132a";
  ctx.fillRect(0, 0, 1024, 768);
  const g = ctx.createRadialGradient(512, 400, 40, 512, 400, 620);
  g.addColorStop(0, "#232c5c");
  g.addColorStop(0.55, "#121731");
  g.addColorStop(1, "#080a17");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 768);

  ctx.strokeStyle = "rgba(95,246,255,0.12)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 768);
    ctx.stroke();
  }
  for (let y = 0; y <= 768; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,79,200,0.2)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(512, 390, 400, 290, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(95,246,255,0.16)";
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.ellipse(512, 390, 330, 236, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.textAlign = "center";
  ctx.font = '900 150px "Orbitron", sans-serif';
  ctx.fillStyle = "#bff8ff";
  ctx.fillText("ANYCLAW", 512, 430);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ *
 * Cabinet
 * ------------------------------------------------------------------ */
let reticle;
const reticleMats = [];

function buildCabinet() {
  const group = new THREE.Group();
  scene.add(group);

  const W = CAB.width;
  const D = CAB.depth;
  const H = CAB.glassTop;

  group.add(box(W + 0.6, 1.55, D + 0.6, MAT.frameDark, 0, -0.775, 0));
  group.add(box(W + 0.7, 0.06, D + 0.7, MAT.violet, 0, -0.02, 0));

  const footMat = MAT.rubber;
  group.add(box(1.2, 0.18, 0.5, footMat, -3.2, -1.62, 3.2));
  group.add(box(1.2, 0.18, 0.5, footMat, 3.2, -1.62, 3.2));
  group.add(box(1.2, 0.18, 0.5, footMat, -3.2, -1.62, -3.2));
  group.add(box(1.2, 0.18, 0.5, footMat, 3.2, -1.62, -3.2));

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.5, D - 0.45),
    new THREE.MeshStandardMaterial({ map: buildFloorTexture(), roughness: 0.5, metalness: 0.45, envMapIntensity: 0.8 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.012;
  floor.receiveShadow = true;
  group.add(floor);

  group.add(box(W - 0.4, 0.14, D - 0.4, MAT.frameDark, 0, H - 0.05, 0));

  const backTex = buildBackPanelTexture();
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.7, H - 0.4),
    new THREE.MeshStandardMaterial({
      map: backTex,
      emissive: 0xffffff,
      emissiveMap: backTex,
      emissiveIntensity: 0.42,
      roughness: 0.65,
      metalness: 0.25,
    })
  );
  backWall.position.set(0, H / 2 + 0.05, -D / 2 + 0.08);
  backWall.receiveShadow = true;
  group.add(backWall);

  group.add(box(0.16, H - 0.2, D - 0.3, MAT.frameDark, -W / 2 + 0.08, H / 2, 0));
  group.add(box(0.16, H - 0.2, D - 0.3, MAT.frameDark, W / 2 - 0.08, H / 2, 0));

  const postX = W / 2 - 0.14;
  const postZ = D / 2 - 0.14;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      group.add(box(0.3, H + 0.16, 0.3, MAT.frame, sx * postX, H / 2, sz * postZ));
      const strip = neon(sz > 0 ? 0x5ff6ff : 0x9b7bff, 0.035, H - 0.3);
      strip.rotation.z = Math.PI / 2;
      strip.position.set(sx * postX, H / 2, sz * postZ);
      group.add(strip);
    }
  }

  const edgeCyan = neon(0x5ff6ff, 0.045, W - 0.2, true);
  edgeCyan.position.set(0, 0.07, D / 2 - 0.06);
  group.add(edgeCyan);

  const edgePink = neon(0xff4fc8, 0.045, W - 0.2, true);
  edgePink.position.set(0, 0.07, -D / 2 + 0.06);
  group.add(edgePink);

  const edgeTop = neon(0xffe27a, 0.035, W - 0.2, true);
  edgeTop.position.set(0, H - 0.1, D / 2 - 0.05);
  group.add(edgeTop);

  const edgeSideL = neon(0x9b7bff, 0.035, D - 0.2, true);
  edgeSideL.rotation.y = Math.PI / 2;
  edgeSideL.position.set(-W / 2 + 0.06, 0.07, 0);
  group.add(edgeSideL);

  const edgeSideR = neon(0x9b7bff, 0.035, D - 0.2, true);
  edgeSideR.rotation.y = Math.PI / 2;
  edgeSideR.position.set(W / 2 - 0.06, 0.07, 0);
  group.add(edgeSideR);

  const cap = box(W + 0.14, 0.62, D + 0.14, MAT.frame, 0, H + 0.31, 0);
  cap.castShadow = false;
  group.add(cap);
  group.add(box(W + 0.22, 0.05, D + 0.22, MAT.gold, 0, H + 0.62, 0));

  const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.34, H - 0.2), MAT.glass);
  glassFront.position.set(0, H / 2, D / 2 - 0.05);
  group.add(glassFront);

  const glassLeft = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.3, H - 0.2), MAT.glass);
  glassLeft.rotation.y = Math.PI / 2;
  glassLeft.position.set(-W / 2 + 0.02, H / 2, 0);
  group.add(glassLeft);

  const glassRight = glassLeft.clone();
  glassRight.position.x = W / 2 - 0.02;
  group.add(glassRight);

  group.add(box(W - 0.3, 0.09, 0.12, MAT.metalDark, 0, H - 0.12, D / 2 - 0.02));
  group.add(box(W - 0.3, 0.09, 0.12, MAT.metalDark, 0, 0.1, D / 2 - 0.02));

  const controlPanel = box(3.2, 0.34, 0.9, MAT.frame, 0, H - 0.55, D / 2 + 0.34);
  controlPanel.rotation.x = -0.18;
  controlPanel.castShadow = false;
  group.add(controlPanel);

  const joystick = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), MAT.cyan);
  joystick.position.set(-0.7, H - 0.34, D / 2 + 0.52);
  group.add(joystick);
  const joyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.12, 16), MAT.metalDark);
  joyBase.position.set(-0.7, H - 0.43, D / 2 + 0.5);
  group.add(joyBase);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), [MAT.pink, MAT.cyan, MAT.gold][i]);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.15 + i * 0.32, H - 0.39, D / 2 + 0.56);
    group.add(btn);
  }

  const capBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 1.1, 0.38),
    new THREE.MeshBasicMaterial({
      map: (() => {
        const { c, ctx } = makeCanvas(1024, 64);
        ctx.clearRect(0, 0, 1024, 64);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '700 27px "Orbitron", sans-serif';
        if ("letterSpacing" in ctx) ctx.letterSpacing = "7px";
        ctx.fillStyle = "#9ffbff";
        ctx.shadowColor = "#5ff6ff";
        ctx.shadowBlur = 14;
        ctx.fillText("EVERYTHING MUST GO", 512, 33);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
      })(),
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
    })
  );
  capBanner.position.set(0, H + 0.32, D / 2 + 0.08);
  group.add(capBanner);

  const marquee = new THREE.Group();
  marquee.position.set(0, H + 1.45, D / 2 - 0.28);
  marquee.add(box(W - 0.55, 1.75, 0.55, MAT.frameDark, 0, 0, 0));
  const marqueeFace = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.72, 1.42),
    new THREE.MeshBasicMaterial({ map: buildMarqueeTexture(), toneMapped: false })
  );
  marqueeFace.position.set(0, 0, 0.29);
  marquee.add(marqueeFace);
  const marqueeFrame = neon(0x5ff6ff, 0.05, W - 0.5, true);
  marqueeFrame.position.set(0, 0.9, 0.31);
  marquee.add(marqueeFrame);
  const marqueeFrame2 = marqueeFrame.clone();
  marqueeFrame2.position.y = -0.9;
  marqueeFrame2.material = new THREE.MeshBasicMaterial({ color: 0xff4fc8, toneMapped: false });
  neonMats.push({ mat: marqueeFrame2.material, base: new THREE.Color(0xff4fc8), phase: 1.5 });
  marquee.add(marqueeFrame2);
  const signGlow = glowSprite(0x5ff6ff, 6.2, 0.28);
  signGlow.position.set(0, 0, 0.5);
  signGlow.scale.set(8.5, 3.2, 1);
  marquee.add(signGlow);
  group.add(marquee);

  // chute
  const chute = new THREE.Group();
  chute.position.set(CHUTE.x, 0, CHUTE.z);
  const chuteHole = new THREE.Mesh(
    new THREE.CircleGeometry(CHUTE.radius, 48),
    new THREE.MeshBasicMaterial({ color: 0x02030a, toneMapped: false })
  );
  chuteHole.rotation.x = -Math.PI / 2;
  chuteHole.position.y = 0.025;
  chute.add(chuteHole);
  const chuteRing = new THREE.Mesh(new THREE.TorusGeometry(CHUTE.radius, 0.055, 12, 64), new THREE.MeshBasicMaterial({ color: 0xff4fc8, toneMapped: false }));
  chuteRing.rotation.x = Math.PI / 2;
  chuteRing.position.y = 0.05;
  chute.add(chuteRing);
  const chuteRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(CHUTE.radius + 0.13, 0.018, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x5ff6ff, toneMapped: false })
  );
  chuteRing2.rotation.x = Math.PI / 2;
  chuteRing2.position.y = 0.04;
  chute.add(chuteRing2);
  const chuteGlow = glowSprite(0xff4fc8, 3.2, 0.35);
  chuteGlow.position.y = 0.12;
  chuteGlow.scale.set(2.6, 2.6, 1);
  chute.add(chuteGlow);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(CHUTE.radius - 0.02, CHUTE.radius - 0.1, 1.8, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a0d1c, metalness: 0.7, roughness: 0.5, side: THREE.BackSide })
  );
  tube.position.y = -0.9;
  chute.add(tube);
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.5),
    new THREE.MeshBasicMaterial({
      map: (() => {
        const { c, ctx } = makeCanvas(512, 128);
        ctx.clearRect(0, 0, 512, 128);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '700 42px "Orbitron", sans-serif';
        ctx.fillStyle = "#ff9fe3";
        ctx.shadowColor = "#ff4fc8";
        ctx.shadowBlur = 16;
        ctx.fillText("PRIZE CHUTE", 256, 66);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(0, 0.035, -1.3);
  chute.add(decal);
  group.add(chute);

  // target reticle
  reticle = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x5ff6ff,
    transparent: true,
    opacity: 0.85,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  reticleMats.push(ringMat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.83, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  reticle.add(ring);

  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0x5ff6ff,
    transparent: true,
    opacity: 0.32,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  reticleMats.push(ring2Mat);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.48, 48), ring2Mat);
  ring2.rotation.x = -Math.PI / 2;
  reticle.add(ring2);

  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x9ffbff,
    transparent: true,
    opacity: 0.7,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.24), tickMat);
    tick.rotation.x = -Math.PI / 2;
    tick.rotation.z = -a;
    tick.position.set(Math.sin(a) * 0.94, 0, Math.cos(a) * 0.94);
    reticle.add(tick);
  }

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.075, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 })
  );
  dot.rotation.x = -Math.PI / 2;
  reticle.add(dot);
  reticle.position.y = 0.055;
  scene.add(reticle);

  return group;
}

/* ------------------------------------------------------------------ *
 * Lighting
 * ------------------------------------------------------------------ */
function buildLights() {
  scene.add(new THREE.HemisphereLight(0x5a6cff, 0x080816, 0.75));

  const key = new THREE.DirectionalLight(0xfff4e8, 2.5);
  key.position.set(7, 14, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const cyan = new THREE.PointLight(0x5ff6ff, 55, 22, 1.8);
  cyan.position.set(-6.2, 4.4, 6.4);
  scene.add(cyan);

  const pink = new THREE.PointLight(0xff4fc8, 62, 24, 1.8);
  pink.position.set(6.4, 5.2, 3.2);
  scene.add(pink);

  const top = new THREE.PointLight(0xa9c8ff, 40, 18, 2);
  top.position.set(0, 9.4, 4.2);
  scene.add(top);

  const inner = new THREE.PointLight(0xd8e8ff, 34, 13, 2);
  inner.position.set(0, 5.7, 0.8);
  scene.add(inner);

  const innerWarm = new THREE.PointLight(0xffd2a1, 14, 9, 2);
  innerWarm.position.set(0, 2.2, -2.4);
  scene.add(innerWarm);

  return { key, cyan, pink, top, inner };
}

/* ------------------------------------------------------------------ *
 * Prize catalogue
 * ------------------------------------------------------------------ */
const eyeGeo = new THREE.SphereGeometry(0.045, 12, 10);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0b12, roughness: 0.25, metalness: 0.1 });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const glintGeo = new THREE.SphereGeometry(0.016, 6, 5);

function addEyes(group, y, z, spread = 0.12) {
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * spread, y, z);
    group.add(eye);
    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(s * spread + 0.015, y + 0.018, z + 0.035);
    group.add(glint);
  }
}

function plush(color, rough = 0.92) {
  return standard(color, { rough, metal: 0 });
}

const prizeBuilders = {
  bear() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), plush(0xc98a5a));
    body.position.y = 0.44;
    body.scale.set(1, 1.04, 0.9);
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 16), plush(0xf2d3b3));
    belly.position.set(0, 0.4, 0.17);
    belly.scale.set(1, 1.1, 0.55);
    g.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 20), plush(0xc98a5a));
    head.position.y = 0.98;
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), plush(0xb27748));
      ear.position.set(s * 0.23, 1.22, 0.01);
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), plush(0xffc9d8));
      inner.position.set(s * 0.23, 1.22, 0.09);
      g.add(inner);
    }
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), plush(0xf2d3b3));
    muzzle.position.set(0, 0.92, 0.27);
    muzzle.scale.set(1.1, 0.8, 0.7);
    g.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), standard(0x2a1a16, { rough: 0.3 }));
    nose.position.set(0, 0.96, 0.38);
    g.add(nose);
    addEyes(g, 1.04, 0.29, 0.12);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), plush(0xc98a5a));
      arm.position.set(s * 0.42, 0.54, 0.05);
      arm.scale.set(0.85, 1.35, 0.85);
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), plush(0xb27748));
      leg.position.set(s * 0.23, 0.13, 0.14);
      leg.scale.set(1, 0.85, 1.1);
      g.add(leg);
    }
    return { group: g, name: "Honey Bear", tier: "common", color: 0xc98a5a, height: 1.35 };
  },

  cat() {
    const g = new THREE.Group();
    const lavender = 0xb18cff;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 20), plush(lavender));
    body.position.y = 0.42;
    body.scale.set(1, 1.05, 0.94);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 20), plush(lavender));
    head.position.y = 0.95;
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 16), plush(lavender));
      ear.position.set(s * 0.19, 1.21, 0);
      ear.rotation.z = s * -0.12;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 12), plush(0xffbfe6));
      inner.position.set(s * 0.19, 1.21, 0.06);
      inner.rotation.z = s * -0.12;
      g.add(inner);
    }
    addEyes(g, 1.0, 0.28, 0.11);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), plush(0xff7fc8));
    nose.position.set(0, 0.93, 0.31);
    g.add(nose);
    const whiskerMat = standard(0xf6e9ff, { rough: 0.5 });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.012), whiskerMat);
        w.position.set(s * 0.24, 0.93 + i * 0.045, 0.25);
        w.rotation.z = s * (0.18 - i * 0.22);
        g.add(w);
      }
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 10, 32, Math.PI * 1.35), plush(lavender));
    tail.position.set(0.28, 0.42, -0.26);
    tail.rotation.set(0.35, 0.4, -0.7);
    g.add(tail);
    return { group: g, name: "Cosmic Cat", tier: "common", color: lavender, height: 1.35 };
  },

  duck() {
    const g = new THREE.Group();
    const yellow = 0xffd84d;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 20), plush(yellow));
    body.position.y = 0.4;
    body.scale.set(1, 0.92, 1.08);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), plush(yellow));
    head.position.set(0, 0.88, 0.1);
    g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 14), standard(0xff9a3d, { rough: 0.6 }));
    beak.position.set(0, 0.85, 0.37);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
    addEyes(g, 0.94, 0.32, 0.1);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), plush(0xffc93d));
      wing.position.set(s * 0.38, 0.46, 0);
      wing.scale.set(0.5, 1, 1.1);
      g.add(wing);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.22), standard(0xff9a3d));
      foot.position.set(s * 0.17, 0.04, 0.2);
      g.add(foot);
    }
    return { group: g, name: "Lucky Duck", tier: "common", color: yellow, height: 1.2 };
  },

  bot() {
    const g = new THREE.Group();
    const blue = 0x6fa8ff;
    g.add(box(0.58, 0.54, 0.42, standard(blue, { metal: 0.45, rough: 0.35 }), 0, 0.38, 0));
    g.add(box(0.46, 0.36, 0.34, standard(0x9cc8ff, { metal: 0.35, rough: 0.3 }), 0, 0.9, 0));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), MAT.black);
    face.position.set(0, 0.9, 0.176);
    g.add(face);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), MAT.cyan);
      eye.position.set(s * 0.09, 0.92, 0.181);
      g.add(eye);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12), MAT.metalDark);
      arm.position.set(s * 0.38, 0.38, 0);
      arm.rotation.z = 0.14;
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.2), standard(0x3d5c99, { metal: 0.5 }));
      leg.position.set(s * 0.15, 0.1, 0);
      g.add(leg);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), MAT.metal);
    antenna.position.set(0, 1.24, 0);
    g.add(antenna);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), MAT.pink);
    bulb.position.set(0, 1.4, 0);
    g.add(bulb);
    const chest = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), MAT.gold);
    chest.position.set(0, 0.44, 0.212);
    g.add(chest);
    return { group: g, name: "Bit Bot", tier: "rare", color: blue, height: 1.4 };
  },

  planet() {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 24),
      standard(0x4f8cff, { rough: 0.35, metal: 0.25, emissive: 0x142a63, emissiveIntensity: 1.4 })
    );
    sphere.position.y = 0.46;
    g.add(sphere);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.055, 12, 64),
      standard(0xd8b6ff, { rough: 0.4, metal: 0.4, emissive: 0x442266, emissiveIntensity: 0.8 })
    );
    band.position.y = 0.46;
    band.rotation.x = 1.16;
    band.rotation.z = 0.18;
    g.add(band);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), standard(0xffd88a, { emissive: 0x5a3a00 }));
    moon.position.set(0.55, 0.72, 0.22);
    g.add(moon);
    const glow = glowSprite(0x4f8cff, 1.7, 0.3);
    glow.position.y = 0.46;
    g.add(glow);
    return { group: g, name: "Saturn Ring", tier: "legend", color: 0x4f8cff, height: 1.25 };
  },

  donut() {
    const g = new THREE.Group();
    const dough = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.17, 20, 40), standard(0xd99b63, { rough: 0.85 }));
    dough.position.y = 0.52;
    g.add(dough);
    const icing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.14, 16, 40),
      standard(0xff7fc8, { rough: 0.5, emissive: 0x40001f, emissiveIntensity: 0.5 })
    );
    icing.position.set(0, 0.53, 0.045);
    g.add(icing);
    const sprinkleColors = [0x5ff6ff, 0xffe27a, 0x9b7bff, 0xffffff, 0x7dffb0];
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.36 + rand(-0.06, 0.06);
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.075, 0.028),
        standard(pick(sprinkleColors), { rough: 0.5 })
      );
      s.position.set(Math.cos(a) * r, 0.53 + Math.sin(a) * r, 0.17);
      s.rotation.z = Math.random() * Math.PI;
      g.add(s);
    }
    return { group: g, name: "Glazed Comet", tier: "common", color: 0xff7fc8, height: 1.05 };
  },

  gem() {
    const g = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.44, 0),
      new THREE.MeshStandardMaterial({
        color: 0xff66d4,
        metalness: 0.35,
        roughness: 0.12,
        emissive: 0x7a104f,
        emissiveIntensity: 1.3,
        envMapIntensity: 1.8,
      })
    );
    gem.position.y = 0.58;
    gem.scale.set(0.9, 1.35, 0.9);
    g.add(gem);
    const inner = glowSprite(0xff4fc8, 1.5, 0.38);
    inner.position.y = 0.58;
    g.add(inner);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.14, 6), MAT.metalDark);
    base.position.y = 0.07;
    g.add(base);
    return { group: g, name: "Prism Gem", tier: "legend", color: 0xff4fc8, height: 1.3 };
  },

  rocket() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.23, 0.82, 24),
      standard(0xe8eefc, { metal: 0.6, rough: 0.25 })
    );
    body.position.y = 0.52;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 24), standard(0xff5c7a, { metal: 0.3, rough: 0.32 }));
    nose.position.y = 1.12;
    g.add(nose);
    const windowMat = standard(0x5ff6ff, { emissive: 0x1b6f80, emissiveIntensity: 1.2, metal: 0.2, rough: 0.2 });
    const window = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), windowMat);
    window.position.set(0, 0.66, 0.225);
    g.add(window);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.22), standard(0xff5c7a, { metal: 0.3 }));
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.24, 0.2, Math.sin(a) * 0.24);
      fin.rotation.y = -a;
      fin.rotation.z = 0.25;
      g.add(fin);
    }
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.14, 16), MAT.metalDark);
    engine.position.y = 0.04;
    g.add(engine);
    return { group: g, name: "Nova Rocket", tier: "rare", color: 0xff5c7a, height: 1.35 };
  },

  ghost() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf2f0ff,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0x8f86ff,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.95,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 20), bodyMat);
    body.position.y = 0.6;
    body.scale.set(1, 1.12, 0.92);
    g.add(body);
    for (let i = 0; i < 4; i++) {
      const nub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), bodyMat);
      nub.position.set(-0.24 + i * 0.16, 0.2, 0.04);
      nub.scale.set(1, 0.8, 1);
      g.add(nub);
    }
    addEyes(g, 0.67, 0.31, 0.11);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), eyeMat);
    mouth.position.set(0, 0.52, 0.35);
    mouth.scale.set(1.2, 1.6, 0.5);
    g.add(mouth);
    const glow = glowSprite(0x9b7bff, 1.6, 0.22);
    glow.position.y = 0.6;
    g.add(glow);
    return { group: g, name: "Boo Ghost", tier: "rare", color: 0xdcd8ff, height: 1.25 };
  },

  mushroom() {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.42, 20), plush(0xf4e6cf));
    stem.position.y = 0.21;
    g.add(stem);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      plush(0xff5c7a, 0.8)
    );
    cap.position.y = 0.4;
    cap.scale.set(1.15, 0.82, 1.15);
    g.add(cap);
    const dotMat = plush(0xfff6ea, 0.8);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(rand(0.04, 0.07), 10, 8), dotMat);
      dot.position.set(Math.cos(a) * rand(0.12, 0.3), 0.52 + rand(0, 0.1), Math.sin(a) * rand(0.12, 0.3));
      dot.scale.y = 0.5;
      g.add(dot);
    }
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
      eye.position.set(s * 0.07, 0.25, 0.19);
      g.add(eye);
    }
    return { group: g, name: "Shroom Pal", tier: "common", color: 0xff5c7a, height: 1.0 };
  },

  star() {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 0.48 : 0.21;
      const a = -Math.PI / 2 + (i * Math.PI) / spikes;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
      curveSegments: 4,
    });
    geo.center();
    const star = new THREE.Mesh(
      geo,
      standard(0xffd84d, { rough: 0.35, metal: 0.3, emissive: 0x8a5a00, emissiveIntensity: 0.9 })
    );
    star.position.y = 0.64;
    star.rotation.z = 0.12;
    g.add(star);
    addEyes(g, 0.68, 0.12, 0.11);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), eyeMat);
    smile.position.set(0, 0.58, 0.12);
    smile.rotation.z = Math.PI;
    g.add(smile);
    const glow = glowSprite(0xffe27a, 1.8, 0.28);
    glow.position.y = 0.64;
    g.add(glow);
    return { group: g, name: "Little Star", tier: "legend", color: 0xffd84d, height: 1.2 };
  },

  bunny() {
    const g = new THREE.Group();
    const white = 0xf4f1ff;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 20), plush(white));
    body.position.y = 0.4;
    body.scale.set(1, 1.05, 0.95);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 20), plush(white));
    head.position.y = 0.87;
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 12), plush(white));
      ear.position.set(s * 0.14, 1.22, -0.02);
      ear.rotation.z = s * 0.12;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.24, 6, 10), plush(0xffb8d9));
      inner.position.set(s * 0.14, 1.22, 0.045);
      inner.rotation.z = s * 0.12;
      g.add(inner);
    }
    addEyes(g, 0.92, 0.26, 0.1);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), plush(0xff9ecf));
    nose.position.set(0, 0.85, 0.29);
    g.add(nose);
    for (const s of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), plush(white));
      foot.position.set(s * 0.22, 0.1, 0.16);
      foot.scale.set(1, 0.8, 1.3);
      g.add(foot);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), plush(white));
      paw.position.set(s * 0.34, 0.42, 0.14);
      g.add(paw);
    }
    return { group: g, name: "Moon Bunny", tier: "common", color: 0xf4f1ff, height: 1.4 };
  },
};

const PRIZE_ORDER = ["bear", "cat", "duck", "bot", "planet", "donut", "gem", "rocket", "ghost", "mushroom", "star", "bunny"];

const PRIZE_TIERS = {
  bear: "common",
  cat: "common",
  duck: "common",
  bot: "rare",
  planet: "legend",
  donut: "common",
  gem: "legend",
  rocket: "rare",
  ghost: "rare",
  mushroom: "common",
  star: "legend",
  bunny: "common",
};

function weightedTier() {
  const r = Math.random();
  if (r < 0.1) return "legend";
  if (r < 0.34) return "rare";
  return "common";
}

function pickPrizeType() {
  const tier = weightedTier();
  const pool = PRIZE_ORDER.filter((key) => PRIZE_TIERS[key] === tier);
  return pick(pool.length ? pool : PRIZE_ORDER);
}

/* ------------------------------------------------------------------ *
 * Prize management
 * ------------------------------------------------------------------ */
const prizes = [];
const falling = [];
const collecting = [];
const bursts = [];
let held = null;

const PRIZE_SPOTS = [
  [-2.46, -1.32],
  [-1.24, -1.56],
  [0.02, -1.32],
  [1.28, -1.54],
  [2.52, -1.18],
  [-2.78, -0.18],
  [-1.52, 0.04],
  [-0.26, -0.12],
  [1.04, 0.16],
  [2.34, 0.02],
  [-2.44, 1.18],
  [-1.24, 1.42],
  [0.04, 1.14],
  [1.34, 1.44],
  [2.56, 1.2],
  [0.56, 0.62],
  [-0.66, 0.58],
];

function spawnPrizes() {
  const types = [...PRIZE_ORDER].sort(() => Math.random() - 0.5);
  while (types.length < PRIZE_SPOTS.length) types.push(pickPrizeType());
  types.sort(() => Math.random() - 0.5);
  if (!types.some((t) => PRIZE_TIERS[t] === "legend")) {
    types[Math.floor(Math.random() * types.length)] = pick(["planet", "gem", "star"]);
  }

  PRIZE_SPOTS.forEach(([x, z], i) => {
    const built = prizeBuilders[types[i]]();
    const group = built.group;
    const scale = rand(0.85, 1.06);
    group.scale.setScalar(scale);
    group.position.set(
      clamp(x + rand(-0.11, 0.11), CAB.minX + 0.45, CAB.maxX - 0.45),
      rand(0.02, 0.06),
      clamp(z + rand(-0.09, 0.09), CAB.minZ + 0.4, CAB.maxZ - 0.25)
    );
    group.rotation.y = rand(-0.6, 0.6);
    group.userData = {
      name: built.name,
      tier: built.tier,
      color: built.color,
      points: rarity[built.tier].points,
      height: built.height * scale,
      alive: true,
      held: false,
      baseScale: scale,
      phase: Math.random() * Math.PI * 2,
    };
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(group);
    prizes.push(group);
  });
}

const sharedResources = new Set([eyeGeo, glintGeo, eyeMat, glintMat, ...Object.values(MAT), glowTex]);

function disposeGroup(group) {
  group.traverse((child) => {
    if (!child.isMesh && !child.isSprite) return;
    if (child.geometry && !sharedResources.has(child.geometry)) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (mat && !sharedResources.has(mat)) mat.dispose();
    }
  });
}

function clearPrizes() {
  for (const p of prizes) {
    scene.remove(p);
    disposeGroup(p);
  }
  prizes.length = 0;
  for (const f of falling) {
    scene.remove(f.group);
    disposeGroup(f.group);
  }
  falling.length = 0;
  for (const c of collecting) {
    scene.remove(c.group);
    disposeGroup(c.group);
  }
  collecting.length = 0;
  while (bursts.length) {
    const b = bursts.pop();
    scene.remove(b.group);
    b.mat.dispose();
  }
  if (held) {
    scene.remove(held);
    disposeGroup(held);
    held = null;
  }
}

/* ------------------------------------------------------------------ *
 * Claw
 * ------------------------------------------------------------------ */
const bridge = box(CAB.width - 0.5, 0.28, 0.3, MAT.frame, 0, 6.16, 0);
scene.add(bridge);
const railL = box(0.2, 0.14, CAB.depth - 0.4, MAT.metalDark, -(CAB.width / 2 - 0.32), 6.28, 0);
const railR = railL.clone();
railR.position.x = CAB.width / 2 - 0.32;
scene.add(railL, railR);

const railGlowL = neon(0x5ff6ff, 0.02, CAB.depth - 0.5, true);
railGlowL.rotation.y = Math.PI / 2;
railGlowL.position.set(-(CAB.width / 2 - 0.32), 6.36, 0);
scene.add(railGlowL);
const railGlowR = neon(0x5ff6ff, 0.02, CAB.depth - 0.5, true);
railGlowR.rotation.y = Math.PI / 2;
railGlowR.position.set(CAB.width / 2 - 0.32, 6.36, 0);
scene.add(railGlowR);

const trolley = new THREE.Group();
scene.add(trolley);
trolley.add(box(0.62, 0.36, 0.62, MAT.frame, 0, 0, 0));
const trolleyGlow = neon(0xff4fc8, 0.03, 0.5, true);
trolleyGlow.position.y = 0.2;
trolley.add(trolleyGlow);

const cable = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 1, 8),
  new THREE.MeshStandardMaterial({ color: 0x2b3450, metalness: 0.8, roughness: 0.35 })
);
scene.add(cable);

const clawGroup = new THREE.Group();
scene.add(clawGroup);
const clawMetal = new THREE.MeshStandardMaterial({ color: 0xd6e5f4, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.7 });
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.36, 24), clawMetal);
hub.castShadow = true;
clawGroup.add(hub);
const hubTop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), clawMetal);
hubTop.position.y = 0.2;
hubTop.castShadow = true;
clawGroup.add(hubTop);
const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 10, 32), MAT.cyan);
hubRing.rotation.x = Math.PI / 2;
hubRing.position.y = -0.17;
clawGroup.add(hubRing);
const clawLight = new THREE.PointLight(0x5ff6ff, 8, 3.4, 2);
clawLight.position.y = -0.2;
clawGroup.add(clawLight);
const clawGlow = glowSprite(0x5ff6ff, 1.1, 0.35);
clawGlow.position.y = -0.2;
clawGroup.add(clawGlow);

const beamMat = new THREE.MeshBasicMaterial({
  color: 0x5ff6ff,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), beamMat);
scene.add(beam);

const prongPivots = [];
for (let i = 0; i < 3; i++) {
  const pivot = new THREE.Group();
  pivot.rotation.y = (i / 3) * Math.PI * 2;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.13), clawMetal);
  upper.position.set(0.16, -0.36, 0);
  upper.rotation.z = 0.28;
  upper.castShadow = true;
  pivot.add(upper);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.11), clawMetal);
  lower.position.set(0.41, -0.73, 0);
  lower.rotation.z = -0.42;
  lower.castShadow = true;
  pivot.add(lower);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), MAT.cyan);
  tip.position.set(0.55, -0.95, 0);
  pivot.add(tip);
  clawGroup.add(pivot);
  prongPivots.push(pivot);
}

/* ------------------------------------------------------------------ *
 * Game state
 * ------------------------------------------------------------------ */
const game = {
  running: false,
  finished: false,
  score: 0,
  timeLeft: RUN_SECONDS,
  collected: [],
  targetX: 0,
  targetZ: 0.4,
  clawX: 0,
  clawZ: 0.4,
  clawY: CAB.highClawY,
  state: STATE.IDLE,
  stateT: 0,
  open: 0.38,
  candidate: null,
  best: 0,
  demoTime: 0,
  lastTick: RUN_SECONDS,
};

try {
  game.best = Number(localStorage.getItem("anyclaw.best") || 0) || 0;
} catch {
  game.best = 0;
}

/* ------------------------------------------------------------------ *
 * UI helpers
 * ------------------------------------------------------------------ */
const fmt = (n) => n.toLocaleString("en-US");

function updateHud() {
  ui.time.textContent = Math.max(0, Math.ceil(game.timeLeft));
  ui.score.textContent = fmt(game.score);
  ui.best.textContent = fmt(game.best);
  ui.timeStat.classList.toggle("is-low", game.running && game.timeLeft <= 10);
}

function renderTray(target, items, emptyText) {
  target.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "tray-empty";
    p.textContent = emptyText;
    target.appendChild(p);
    return;
  }
  for (const item of items) {
    const chip = document.createElement("span");
    chip.className = "tray-chip";
    const dot = document.createElement("i");
    dot.style.setProperty("--dot", `#${item.color.toString(16).padStart(6, "0")}`);
    const label = document.createElement("span");
    label.textContent = item.name;
    chip.append(dot, label);
    target.appendChild(chip);
  }
}

function refreshTray() {
  ui.trayCount.textContent = String(game.collected.length);
  renderTray(ui.trayItems, game.collected, "Nothing clawed yet.");
}

let toastTimer = 0;
function toast(text, duration = 1900) {
  ui.toast.textContent = text;
  ui.toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-on"), duration);
}

function showFloater(text, sub, worldPos, extraClass = "") {
  const v = worldPos.clone().project(camera);
  if (v.z > 1 || v.z < -1) return;
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  const el = document.createElement("div");
  el.className = `floater ${extraClass}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.textContent = text;
  if (sub) {
    const small = document.createElement("small");
    small.textContent = sub;
    el.appendChild(small);
  }
  ui.floaters.appendChild(el);
  setTimeout(() => el.remove(), 1250);
}

/* ------------------------------------------------------------------ *
 * Effects
 * ------------------------------------------------------------------ */
function burst(pos, color, count = 20, speed = 2.6) {
  const group = new THREE.Group();
  group.position.copy(pos);
  scene.add(group);
  const mat = new THREE.SpriteMaterial({
    map: glowTex,
    color,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const parts = [];
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(rand(0.05, 0.18));
    const dir = new THREE.Vector3(rand(-1, 1), rand(-0.3, 1.1), rand(-1, 1)).normalize();
    parts.push({ sprite, vel: dir.multiplyScalar(rand(0.4, 1) * speed) });
    group.add(sprite);
  }
  bursts.push({ group, mat, parts, t: 0, dur: 1.05 });
}

function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.t += dt;
    b.mat.opacity = Math.max(0, 1 - b.t / b.dur);
    for (const p of b.parts) {
      p.vel.y -= 2.4 * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.multiplyScalar(1 - dt * 0.4);
    }
    if (b.t >= b.dur) {
      scene.remove(b.group);
      b.mat.dispose();
      bursts.splice(i, 1);
    }
  }
}

function updateFalling(dt) {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.vy -= 19 * dt;
    f.group.position.y += f.vy * dt;
    f.group.rotation.x += f.spin * dt;
    if (f.group.position.y <= 0.02) {
      f.group.position.y = 0.02;
      f.group.rotation.x = 0;
      f.group.userData.falling = false;
      falling.splice(i, 1);
      if (!prizes.includes(f.group)) prizes.push(f.group);
    }
  }
}

function updateCollecting(dt) {
  for (let i = collecting.length - 1; i >= 0; i--) {
    const c = collecting[i];
    c.t += dt;
    const k = Math.min(1, c.t / c.dur);
    const eased = k * k;
    c.group.position.x = c.from.x + (CHUTE.x - c.from.x) * eased;
    c.group.position.z = c.from.z + (CHUTE.z - c.from.z) * eased;
    c.group.position.y = c.from.y - 3.4 * k;
    c.group.rotation.y += dt * 7;
    c.group.scale.setScalar(c.scale * (1 - k * 0.9));
    if (k >= 1) {
      scene.remove(c.group);
      disposeGroup(c.group);
      collecting.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Claw mechanics
 * ------------------------------------------------------------------ */
function findCandidate() {
  let best = null;
  let bestDist = Infinity;
  for (const p of prizes) {
    if (!p.userData.alive || p.userData.held || p.userData.falling) continue;
    const d = Math.hypot(p.position.x - game.clawX, p.position.z - game.clawZ);
    if (d < GRAB_RADIUS && d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

function attachPrize(p) {
  p.userData.held = true;
  held = p;
  scene.updateMatrixWorld(true);
  clawGroup.attach(p);
  const holdY = -(1.45 + p.userData.height * 0.12);
  p.position.set(0, holdY, 0);
  p.rotation.set(0, rand(-0.2, 0.2), 0);
  p.scale.setScalar(p.userData.baseScale);
}

function overChute() {
  return Math.hypot(game.clawX - CHUTE.x, game.clawZ - CHUTE.z) < CHUTE.radius + 0.12;
}

function releaseHeld(toChute) {
  if (!held) return;
  const p = held;
  held = null;
  p.userData.held = false;

  scene.updateMatrixWorld(true);
  scene.attach(p);

  if (toChute) {
    const tier = p.userData.tier;
    const from = p.position.clone();
    collecting.push({ group: p, from, t: 0, dur: 0.72, scale: p.userData.baseScale });
    p.userData.alive = false;
    const index = prizes.indexOf(p);
    if (index >= 0) prizes.splice(index, 1);

    const points = p.userData.points;
    game.score += points;
    game.collected.push({ name: p.userData.name, color: p.userData.color, tier });
    refreshTray();
    updateHud();

    const worldPos = from.clone();
    worldPos.y += 0.6;
    showFloater(`+${fmt(points)}`, rarity[tier].label, worldPos);
    burst(new THREE.Vector3(CHUTE.x, 1.1, CHUTE.z), p.userData.color, 26, 3.1);
    burst(new THREE.Vector3(CHUTE.x, 0.35, CHUTE.z), 0xffe27a, 14, 2.2);
    audio.collect(tier);
    toast(`${p.userData.name} · +${fmt(points)}`, 2100);
    if (tier === "legend") {
      document.body.classList.add("legend-hit");
      setTimeout(() => document.body.classList.remove("legend-hit"), 700);
    }
  } else {
    p.userData.alive = true;
    p.userData.falling = true;
    falling.push({ group: p, vy: 0.6, spin: rand(-2.5, 2.5) });
    audio.tone(200, 0.1, "triangle", 0.05, -40);
    toast("Release it over the prize chute", 1600);
  }

  game.open = 0.38;
  game.state = STATE.IDLE;
  game.stateT = 0;
  game.candidate = null;
}

function triggerDrop() {
  if (!game.running) return;
  if (game.state === STATE.IDLE) {
    game.state = STATE.DROPPING;
    game.stateT = 0;
    game.candidate = null;
    audio.motor();
  } else if (game.state === STATE.CARRYING) {
    if (overChute()) releaseHeld(true);
    else toast("Carry it to the prize chute", 1300);
  }
}

function updateClaw(dt) {
  const canMove =
    game.running && (game.state === STATE.IDLE || game.state === STATE.CARRYING);

  if (canMove) {
    const dx =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const dz =
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    const speed = game.state === STATE.CARRYING ? 2.9 : 3.6;
    game.targetX = clamp(game.targetX + dx * speed * dt, CAB.minX, CAB.maxX);
    game.targetZ = clamp(game.targetZ + dz * speed * dt, CAB.minZ, CAB.maxZ);
  } else if (!game.running) {
    game.demoTime += dt;
    const t = game.demoTime;
    game.targetX = Math.sin(t * 0.42) * 2.35;
    game.targetZ = Math.cos(t * 0.3) * 0.95 + 0.15;
  }

  game.targetX = clamp(game.targetX, CAB.minX, CAB.maxX);
  game.targetZ = clamp(game.targetZ, CAB.minZ, CAB.maxZ);
  game.clawX = damp(game.clawX, game.targetX, 11, dt);
  game.clawZ = damp(game.clawZ, game.targetZ, 11, dt);

  switch (game.state) {
    case STATE.DROPPING: {
      game.clawY -= 4.8 * dt;
      if (game.clawY <= CAB.lowClawY) {
        game.clawY = CAB.lowClawY;
        game.state = STATE.CLOSING;
        game.stateT = 0;
        game.candidate = findCandidate();
        audio.clank();
        if (game.candidate) {
          burst(
            game.candidate.position.clone().setY(game.candidate.position.y + 0.6),
            0x5ff6ff,
            10,
            1.4
          );
        }
      }
      break;
    }
    case STATE.CLOSING: {
      game.stateT += dt;
      game.open = damp(game.open, 0.02, 14, dt);
      if (game.stateT > 0.42) {
        if (game.candidate && game.candidate.userData.alive) {
          attachPrize(game.candidate);
          audio.grab();
          const p = game.candidate.position.clone();
          p.y += 0.4;
          showFloater("GOT IT", game.candidate.userData.name, p);
          burst(new THREE.Vector3(game.clawX, game.clawY, game.clawZ), 0xffe27a, 8, 1.2);
        } else {
          audio.miss();
          showFloater("MISS", "", new THREE.Vector3(game.clawX, 1.4, game.clawZ), "floater--miss");
        }
        game.state = STATE.LIFTING;
        game.stateT = 0;
      }
      break;
    }
    case STATE.LIFTING: {
      game.clawY += 4.4 * dt;
      if (game.clawY >= CAB.highClawY) {
        game.clawY = CAB.highClawY;
        if (held) {
          game.state = STATE.CARRYING;
          toast("Carry it to the glowing chute", 1700);
        } else {
          game.state = STATE.IDLE;
        }
        game.stateT = 0;
        game.candidate = null;
      }
      break;
    }
    case STATE.IDLE:
    case STATE.CARRYING: {
      game.clawY = damp(game.clawY, CAB.highClawY, 8, dt);
      game.open = damp(game.open, held ? 0.05 : 0.38, 8, dt);
      break;
    }
  }

  if (game.state === STATE.IDLE) game.open = damp(game.open, 0.38, 8, dt);

  bridge.position.z = game.clawZ;
  trolley.position.set(game.clawX, 6.18, game.clawZ);
  clawGroup.position.set(game.clawX, game.clawY, game.clawZ);

  const cableTop = 6.18;
  const cableBottom = game.clawY + 0.18;
  const cableLen = Math.max(0.08, cableTop - cableBottom);
  cable.position.set(game.clawX, cableTop - cableLen / 2, game.clawZ);
  cable.scale.y = cableLen;

  for (const pivot of prongPivots) {
    pivot.rotation.z = game.open;
  }

  reticle.position.set(game.clawX, 0.055, game.clawZ);
  const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.025;
  reticle.scale.setScalar(pulse);

  let targetColor = 0x5ff6ff;
  if (held) targetColor = overChute() ? 0x7dffb0 : 0xffe27a;
  else if (game.state === STATE.IDLE && findCandidate()) targetColor = 0x7dffb0;
  const tmpColor = new THREE.Color(targetColor);
  for (const mat of reticleMats) mat.color.lerp(tmpColor, 1 - Math.exp(-8 * dt));

  const beamLen = Math.max(0.05, game.clawY - 0.55);
  beam.position.set(game.clawX, beamLen / 2 + 0.05, game.clawZ);
  beam.scale.set(1, beamLen, 1);
  beamMat.color.lerp(tmpColor, 1 - Math.exp(-8 * dt));
  beamMat.opacity = 0.16 + Math.sin(performance.now() * 0.004) * 0.04;

  const label = ui.dropBtn.querySelector(".drop-label");
  if (label) label.textContent = held ? (overChute() ? "RELEASE" : "CARRY") : "DROP";
  ui.dropBtn.disabled =
    !game.running ||
    !(game.state === STATE.IDLE || game.state === STATE.CARRYING) ||
    (game.state === STATE.CARRYING && !overChute());
}

/* ------------------------------------------------------------------ *
 * Flow
 * ------------------------------------------------------------------ */
function startGame() {
  audio.init().catch((error) => {
  console.error(error);
  ui.loading.innerHTML =
    '<div style="max-width:34ch;line-height:1.7;text-align:center">AnyClaw could not start.<br>Reload the page to try again.</div>';
});
  audio.play();
  clearPrizes();
  spawnPrizes();

  held = null;
  game.running = true;
  game.finished = false;
  game.score = 0;
  game.timeLeft = RUN_SECONDS;
  game.lastTick = RUN_SECONDS;
  game.collected = [];
  game.targetX = 0;
  game.targetZ = 0.4;
  game.clawX = 0;
  game.clawZ = 0.4;
  game.clawY = CAB.highClawY;
  game.state = STATE.IDLE;
  game.stateT = 0;
  game.open = 0.38;
  game.candidate = null;
  game.demoTime = 0;

  ui.start.classList.add("is-hidden");
  ui.result.classList.add("is-hidden");
  ui.hud.classList.remove("is-hidden");
  ui.tray.classList.remove("is-hidden");
  ui.hint.classList.remove("is-hidden");
  ui.dropWrap.classList.remove("is-hidden");

  refreshTray();
  updateHud();
  toast("CLAW READY · 60 SECONDS", 1900);
}

function endGame() {
  if (!game.running) return;
  game.running = false;
  game.finished = true;
  game.timeLeft = 0;
  if (game.score > game.best) {
    game.best = game.score;
    try {
      localStorage.setItem("anyclaw.best", String(game.best));
    } catch {
      /* private mode */
    }
  }
  updateHud();
  audio.over();

  let title = "SO CLOSE";
  if (game.score >= 2000) title = "CLAW LEGEND";
  else if (game.score >= 1000) title = "PRIZE PILOT";
  else if (game.score > 0) title = "NICE GRAB";

  ui.resultTitle.textContent = title;
  ui.resultScore.textContent = fmt(game.score);
  ui.resultBest.textContent = fmt(game.best);
  ui.resultCopy.textContent =
    game.collected.length === 0
      ? "The claw came up empty. The machine demands a rematch."
      : `You clawed ${game.collected.length} ${game.collected.length === 1 ? "treasure" : "treasures"} out of the pile.`;
  renderTray(ui.resultItems, game.collected, "");
  ui.hint.classList.add("is-hidden");
  ui.dropWrap.classList.add("is-hidden");
  ui.result.classList.remove("is-hidden");
}

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */
const keys = new Set();
const pointer = { nx: 0, ny: 0, down: false };
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CAB.highClawY);
const aimHit = new THREE.Vector3();
const ndc = new THREE.Vector2();

function aimAt(clientX, clientY) {
  if (!game.running) return;
  if (game.state !== STATE.IDLE && game.state !== STATE.CARRYING) return;
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (raycaster.ray.intersectPlane(aimPlane, aimHit)) {
    game.targetX = clamp(aimHit.x, CAB.minX, CAB.maxX);
    game.targetZ = clamp(aimHit.z, CAB.minZ, CAB.maxZ);
  }
}

function bindInput() {
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "Enter") {
      if (!game.running) {
        startGame();
      } else {
        triggerDrop();
      }
      return;
    }
    keys.add(e.code);
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  window.addEventListener("blur", () => keys.clear());

  window.addEventListener("pointermove", (e) => {
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  });

  ui.canvas.addEventListener("pointerdown", (e) => {
    pointer.down = true;
    ui.canvas.setPointerCapture?.(e.pointerId);
    aimAt(e.clientX, e.clientY);
  });

  ui.canvas.addEventListener("pointermove", (e) => {
    if (pointer.down) aimAt(e.clientX, e.clientY);
  });

  const release = (e) => {
    pointer.down = false;
    try {
      ui.canvas.releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
  };
  ui.canvas.addEventListener("pointerup", release);
  ui.canvas.addEventListener("pointercancel", release);

  ui.play.addEventListener("click", startGame);
  ui.replay.addEventListener("click", startGame);
  ui.dropBtn.addEventListener("click", triggerDrop);

  ui.mute.addEventListener("click", () => {
    audio.init().catch((error) => {
  console.error(error);
  ui.loading.innerHTML =
    '<div style="max-width:34ch;line-height:1.7;text-align:center">AnyClaw could not start.<br>Reload the page to try again.</div>';
});
    const next = !audio.muted;
    audio.setMuted(next);
    ui.mute.classList.toggle("is-muted", next);
    ui.mute.setAttribute("aria-label", next ? "Unmute sound" : "Mute sound");
    ui.mute.setAttribute("title", next ? "Unmute sound" : "Mute sound");
  });

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) keys.clear();
  });
}

/* ------------------------------------------------------------------ *
 * Layout, dust, render loop
 * ------------------------------------------------------------------ */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const fitW = 10.75;
  const fitH = 13.6;
  const distW = fitW / (2 * Math.tan(vFov / 2) * camera.aspect);
  const distH = fitH / (2 * Math.tan(vFov / 2));
  const dist = Math.max(distW, distH);
  camBase.set(0, 6.15, dist);
  if (!game.running && !game.finished) camera.position.copy(camBase);
  camera.updateProjectionMatrix();
}

let dust;
function buildDust() {
  const count = 130;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rand(-4.3, 4.3);
    pos[i * 3 + 1] = rand(0.3, 6.2);
    pos[i * 3 + 2] = rand(-3.1, 3.1);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0x9fe9ff,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(dust);
}

function updateDust(dt, t) {
  if (!dust) return;
  const p = dust.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i) + (0.08 + (i % 5) * 0.012) * dt;
    if (y > 6.3) y = 0.25;
    p.setY(i, y);
    p.setX(i, p.getX(i) + Math.sin(t * 0.4 + i) * 0.0009);
  }
  p.needsUpdate = true;
}

const camBase = new THREE.Vector3(0, 6.15, 16);
let elapsed = 0;
let lastFrame = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const raw = (now - lastFrame) / 1000;
  lastFrame = now;
  const dt = Math.min(0.08, Math.max(0.0001, raw || 0.016));
  elapsed += dt;
  const t = elapsed;

  if (game.running) {
    game.timeLeft -= dt;
    const ceil = Math.ceil(game.timeLeft);
    if (ceil !== game.lastTick) {
      game.lastTick = ceil;
      updateHud();
      if (ceil <= 10 && ceil > 0) audio.tick();
    }
    if (game.timeLeft <= 0) endGame();
  }

  updateClaw(dt);
  updateFalling(dt);
  updateCollecting(dt);
  updateBursts(dt);
  updateDust(dt, t);

  for (const n of neonMats) {
    const k = 0.82 + 0.18 * Math.sin(t * 1.7 + n.phase);
    n.mat.color.copy(n.base).multiplyScalar(k);
  }

  camera.position.x = damp(camera.position.x, camBase.x + pointer.nx * 0.5, 3.2, dt);
  camera.position.y = damp(camera.position.y, camBase.y - pointer.ny * 0.22, 3.2, dt);
  camera.position.z = damp(camera.position.z, camBase.z, 3.2, dt);
  camera.lookAt(camTarget);

  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
async function init() {
  try {
    await document.fonts.ready;
  } catch {
    /* fonts unavailable */
  }

  scene.environment = makeEquirectEnvironment();
  buildRoom();
  buildCabinet();
  buildLights();
  buildDust();
  spawnPrizes();
  resize();
  bindInput();
  updateHud();
  refreshTray();

  camera.position.copy(camBase);
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
  window.__anyclaw = {
    game,
    prizes,
    triggerDrop,
    startGame,
    get held() {
      return held;
    },
    get overChute() {
      return overChute();
    },
  };

  setTimeout(() => ui.loading.classList.add("is-hidden"), 320);
  lastFrame = performance.now();
  requestAnimationFrame(animate);
}

init().catch((error) => {
  console.error(error);
  ui.loading.innerHTML =
    '<div style="max-width:34ch;line-height:1.7;text-align:center">AnyClaw could not start.<br>Reload the page to try again.</div>';
});




