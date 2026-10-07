import { createGeometryCache, randomOptions, randomSeed, renderPolyhedron, type DesignOptions, type Quaternion, type RenderedImage, type RenderTimings, type SceneOptions } from "@noble-polyhedra/render";
import { seededDefaults } from "@noble-polyhedra/core";

const numericAttribute = (element: Element, name: string): number | undefined => {
  const value = element.getAttribute(name);
  return value === null || value === "" ? undefined : Number(value);
};
const motionAmount = (element: Element, name: string): number => {
  const value = numericAttribute(element, name);
  return value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(1, value));
};
const MAX_ROTATION_SPEED = 0.35; // Radians per second; one turn takes about 18 seconds.
const MAX_FLOAT_DISTANCE = 8; // Pixels at the largest component size.

const axisRotation = (x: number, y: number, z: number, angle: number): Quaternion => {
  const sine = Math.sin(angle / 2);
  return [x * sine, y * sine, z * sine, Math.cos(angle / 2)];
};
const multiply = (a: Quaternion, b: Quaternion): Quaternion => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const normalize = (q: Quaternion): Quaternion => { const length = Math.hypot(...q); return [q[0] / length, q[1] / length, q[2] / length, q[3] / length]; };
const parseRotation = (value: string | null): Quaternion | undefined => {
  if (value === null) return undefined;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) throw new Error("rotation must be four comma-separated numbers");
  return normalize(parts as unknown as Quaternion);
};

type RenderRequest = { id: number; options: SceneOptions; requestedAt: number };
type RenderReply = { id: number; width?: number; height?: number; buffer?: ArrayBuffer; renderMs?: number;
  geometryMs?: number; meshCacheHit?: boolean; stages?: RenderTimings;
  vertices?: number; edges?: number; faces?: number; error?: string };

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? class {} as typeof HTMLElement : HTMLElement;

export class NoblePolyhedronElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ["shape", "seed", "random", "palette", "color", "background", "yaw", "pitch", "rotation", "zoom", "view", "face-index", "stats", "rotate", "float", "n", "p", "q", "crown-height", "a", "b", "c"];
  }

  readonly #canvas: HTMLCanvasElement;
  readonly #backdrop: HTMLCanvasElement;
  readonly #message: HTMLDivElement;
  readonly #stats: HTMLOutputElement;
  #observer?: ResizeObserver;
  #visibilityObserver?: IntersectionObserver;
  #visible = true;
  #worker?: Worker;
  #frame = 0;
  #motionFrame = 0;
  #lastMotionTime = 0;
  #lastMotionDraw = 0;
  #motionAngle = 0;
  #motionPreference?: MediaQueryList;
  #pixelRatioMedia?: MediaQueryList;
  #timer = 0;
  #version = 0;
  #busy = false;
  #pending?: RenderRequest;
  #active?: RenderRequest;
  #dragging = false;
  #lastPointer?: { x: number; y: number };
  #drawTimes: number[] = [];
  #randomKey?: string;
  #randomBase?: DesignOptions;
  #geometry = createGeometryCache(4);
  #metrics = { renderMs: 0, geometryMs: 0, meshCacheHit: false, stages: undefined as RenderTimings | undefined,
    presentMs: 0, latencyMs: 0, width: 0, height: 0, vertices: 0, edges: 0, faces: 0, quality: 2 };

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { display: block; position: relative; min-height: 180px; aspect-ratio: 1; overflow: hidden; border-radius: inherit; touch-action: none; }
      canvas { display: block; width: 100%; height: 100%; }
      canvas.backdrop { position: absolute; inset: 0; pointer-events: none; }
      canvas.backdrop[hidden] { display: none; }
      canvas.scene { position: relative; cursor: grab; }
      canvas.scene:active { cursor: grabbing; }
      canvas.scene.floating { animation: pickup-float 3.6s ease-in-out infinite; will-change: transform; }
      @keyframes pickup-float { 0%, 100% { transform: translateY(var(--float-distance)); } 50% { transform: translateY(calc(-1 * var(--float-distance))); } }
      @media (prefers-reduced-motion: reduce) { canvas.scene.floating { animation: none; transform: none; } }
      .message { position: absolute; inset: auto 12px 12px; padding: 9px 11px; border-radius: 9px; background: #241723e8; color: #ffe0d9; font: 12px/1.45 system-ui, sans-serif; display: none; }
      .stats { position: absolute; z-index: 2; top: 12px; right: 12px; min-width: 132px; padding: 8px 10px; border: 1px solid #ffffff35; border-radius: 8px; background: #111827df; color: #f8fafc; font: 10px/1.45 ui-monospace, SFMono-Regular, monospace; text-align: left; pointer-events: none; white-space: pre; box-shadow: 0 4px 18px #0003; }
      .stats[hidden] { display: none; }
    </style><canvas class="backdrop" aria-hidden="true" hidden></canvas><canvas class="scene" part="canvas" aria-label="Interactive noble polyhedron"></canvas><output class="stats" part="stats" aria-label="Renderer statistics" hidden></output><div class="message" part="error" role="status"></div>`;
    this.#backdrop = shadow.querySelector("canvas.backdrop")!;
    this.#canvas = shadow.querySelector("canvas.scene")!;
    this.#message = shadow.querySelector(".message")!;
    this.#stats = shadow.querySelector(".stats")!;
  }

  connectedCallback(): void {
    this.#observer = new ResizeObserver(() => { this.#updateFloat(); this.#schedule(); });
    this.#observer.observe(this);
    if (typeof IntersectionObserver !== "undefined") {
      this.#visibilityObserver = new IntersectionObserver(entries => {
        this.#visible = entries[0]?.isIntersecting ?? true;
        this.#syncMotion();
      });
      this.#visibilityObserver.observe(this);
    }
    this.#canvas.addEventListener("pointerdown", this.#pointerDown);
    this.#canvas.addEventListener("pointermove", this.#pointerMove);
    this.#canvas.addEventListener("pointerup", this.#pointerUp);
    this.#canvas.addEventListener("pointercancel", this.#pointerUp);
    this.#canvas.addEventListener("wheel", this.#wheel, { passive: false });
    try {
      if (typeof Worker !== "undefined") {
        this.#worker = new Worker(new URL("./renderer.worker.js", import.meta.url), { type: "module" });
        this.#worker.onmessage = this.#workerMessage;
        this.#worker.onerror = () => { this.#worker?.terminate(); this.#worker = undefined; this.#busy = false; this.#schedule(); };
      }
    } catch { this.#worker = undefined; }
    this.#motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.#motionPreference?.addEventListener("change", this.#motionPreferenceChanged);
    this.#watchPixelRatio();
    window.addEventListener("resize", this.#windowResize);
    this.#updateFloat();
    this.#syncMotion();
    this.#syncStatsTimer();
    this.#updateStats();
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#visibilityObserver?.disconnect();
    this.#visibilityObserver = undefined;
    this.#visible = true;
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#motionFrame);
    this.#motionFrame = 0;
    this.#lastMotionTime = 0;
    this.#motionPreference?.removeEventListener("change", this.#motionPreferenceChanged);
    this.#motionPreference = undefined;
    this.#pixelRatioMedia?.removeEventListener("change", this.#pixelRatioChanged);
    this.#pixelRatioMedia = undefined;
    window.removeEventListener("resize", this.#windowResize);
    clearInterval(this.#timer);
    this.#worker?.terminate();
    this.#worker = undefined;
    this.#busy = false;
    this.#canvas.removeEventListener("pointerdown", this.#pointerDown);
    this.#canvas.removeEventListener("pointermove", this.#pointerMove);
    this.#canvas.removeEventListener("pointerup", this.#pointerUp);
    this.#canvas.removeEventListener("pointercancel", this.#pointerUp);
    this.#canvas.removeEventListener("wheel", this.#wheel);
  }

  attributeChangedCallback(name: string, oldValue: string | null): void {
    if (name === "random") {
      this.#randomKey = undefined;
      this.#randomBase = undefined;
      this.#motionAngle = 0;
      this.#updateFloat();
      this.#syncMotion();
    }
    if (name === "rotate") {
      const previous = Number(oldValue);
      if (Number.isFinite(previous) && previous > 0 && motionAmount(this, "rotate") === 0 && this.#motionAngle !== 0) {
        const current = this.#currentRotation();
        this.#motionAngle = 0;
        this.setAttribute("rotation", current.map(value => value.toFixed(6)).join(","));
        this.dispatchEvent(new Event("change", { bubbles: true }));
      }
      this.#syncMotion();
    }
    if (name === "float") this.#updateFloat();
    if (name === "stats") this.#syncStatsTimer();
    else if (name !== "float") this.#schedule();
    this.#updateStats();
  }

  get canvas(): HTMLCanvasElement { return this.#canvas; }
  get stats(): boolean { return this.hasAttribute("stats") && this.getAttribute("stats") !== "false"; }
  set stats(enabled: boolean) { if (enabled) this.setAttribute("stats", ""); else this.removeAttribute("stats"); }
  get random(): string | boolean { const value = this.getAttribute("random"); return value === null ? false : value === "" ? true : value; }
  set random(value: string | boolean) {
    if (value === false) this.removeAttribute("random");
    else this.setAttribute("random", value === true ? "" : value);
  }
  get rotate(): number { return motionAmount(this, "rotate"); }
  set rotate(value: number) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) this.removeAttribute("rotate");
    else this.setAttribute("rotate", String(Math.min(1, amount)));
  }
  get float(): number { return motionAmount(this, "float"); }
  set float(value: number) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) this.removeAttribute("float");
    else this.setAttribute("float", String(Math.min(1, amount)));
  }

  #generatedOptions(): DesignOptions | undefined {
    const value = this.getAttribute("random");
    if (value === null) return undefined;
    if (this.#randomKey !== value || !this.#randomBase) {
      this.#randomKey = value;
      this.#randomBase = randomOptions(value === "" ? randomSeed() : value);
    }
    return this.#randomBase;
  }

  #baseRotation(): Quaternion {
    const defaults = seededDefaults(this.getAttribute("seed") ?? "noble");
    const faceView = (this.getAttribute("view") ?? this.#generatedOptions()?.view) === "face";
    return parseRotation(this.getAttribute("rotation")) ?? multiply(
      axisRotation(1, 0, 0, numericAttribute(this, "pitch") ?? (faceView ? 0 : defaults.pitch)),
      axisRotation(0, 1, 0, numericAttribute(this, "yaw") ?? defaults.yaw));
  }

  #currentRotation(): Quaternion {
    return normalize(multiply(axisRotation(0, 1, 0, this.#motionAngle), this.#baseRotation()));
  }

  #motionPreferenceChanged = (): void => {
    this.#updateFloat();
    this.#syncMotion();
    this.#schedule();
  };

  #windowResize = (): void => this.#schedule();
  #pixelRatioChanged = (): void => { this.#watchPixelRatio(); this.#schedule(); };
  #watchPixelRatio(): void {
    this.#pixelRatioMedia?.removeEventListener("change", this.#pixelRatioChanged);
    this.#pixelRatioMedia = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.#pixelRatioMedia?.addEventListener("change", this.#pixelRatioChanged);
  }

  #syncMotion(): void {
    if (this.isConnected && this.#visible && this.rotate > 0 && !this.#motionPreference?.matches) {
      if (!this.#motionFrame) this.#motionFrame = requestAnimationFrame(this.#motionTick);
    } else {
      cancelAnimationFrame(this.#motionFrame);
      this.#motionFrame = 0;
      this.#lastMotionTime = 0;
    }
  }

  #motionTick = (time: number): void => {
    this.#motionFrame = 0;
    if (!this.isConnected || this.rotate === 0 || this.#motionPreference?.matches) return;
    if (this.#lastMotionTime && !this.#dragging && !document.hidden) {
      this.#motionAngle = (this.#motionAngle + Math.min((time - this.#lastMotionTime) / 1000, 0.1) * MAX_ROTATION_SPEED * this.rotate) % (Math.PI * 2);
    }
    this.#lastMotionTime = time;
    if (!this.#dragging && !document.hidden && !this.#busy && !this.#pending && !this.#frame && time - this.#lastMotionDraw >= 16) {
      this.#lastMotionDraw = time;
      this.#draw();
    }
    this.#motionFrame = requestAnimationFrame(this.#motionTick);
  };

  #updateFloat(): void {
    const enabled = this.float > 0 && !this.#motionPreference?.matches;
    this.#canvas.classList.toggle("floating", enabled);
    this.#backdrop.hidden = !enabled;
    if (enabled) this.#copyBackdrop();
    if (enabled) this.#canvas.style.setProperty("--float-distance", `${Math.min(MAX_FLOAT_DISTANCE, this.clientHeight * 0.012) * this.float}px`);
  }

  #copyBackdrop(): void {
    if (this.#backdrop.hidden) return;
    if (this.#backdrop.width !== this.#canvas.width) this.#backdrop.width = this.#canvas.width;
    if (this.#backdrop.height !== this.#canvas.height) this.#backdrop.height = this.#canvas.height;
    this.#backdrop.getContext("2d")?.drawImage(this.#canvas, 0, 0);
  }

  #schedule(): void {
    if (!this.isConnected || this.#frame) return;
    this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#draw(); });
  }

  #options(): SceneOptions {
    const pixelRatio = window.devicePixelRatio || 1;
    const bounds = this.getBoundingClientRect();
    const rotating = this.rotate > 0 && !this.#motionPreference?.matches;
    const generated = this.#generatedOptions();
    const shape = (this.getAttribute("shape") ?? generated?.shape ?? "random") as SceneOptions["shape"];
    const geometry = {
      shape, n: numericAttribute(this, "n") ?? generated?.n,
      p: numericAttribute(this, "p") ?? generated?.p, q: numericAttribute(this, "q") ?? generated?.q,
      crownHeight: numericAttribute(this, "crown-height") ?? generated?.crownHeight,
      a: numericAttribute(this, "a") ?? generated?.a, b: numericAttribute(this, "b") ?? generated?.b,
      c: numericAttribute(this, "c") ?? generated?.c,
    };
    const explicitFaceIndex = numericAttribute(this, "face-index");
    return {
      ...geometry,
      seed: this.getAttribute("seed") ?? "noble",
      palette: this.getAttribute("palette") as SceneOptions["palette"] ?? generated?.palette,
      color: this.getAttribute("color") ?? generated?.color,
      background: this.getAttribute("background") ?? generated?.background,
      width: Math.max(1, Math.round(bounds.width * pixelRatio)),
      height: Math.max(1, Math.round(bounds.height * pixelRatio)),
      yaw: numericAttribute(this, "yaw"),
      pitch: numericAttribute(this, "pitch") ?? ((this.getAttribute("view") ?? generated?.view) === "face" ? 0 : undefined),
      rotation: rotating ? this.#currentRotation() : parseRotation(this.getAttribute("rotation")),
      zoom: numericAttribute(this, "zoom"),
      view: this.getAttribute("view") as SceneOptions["view"] ?? generated?.view,
      faceIndex: explicitFaceIndex ?? (generated ? generated.faceIndex % this.#geometry.get(geometry).polyhedron.faces.length : undefined),
      quality: 2,
    };
  }

  #draw(): void {
    try {
      const request: RenderRequest = { id: ++this.#version, options: this.#options(), requestedAt: performance.now() };
      if (this.#worker) {
        if (this.#busy) this.#pending = request;
        else this.#send(request);
      } else {
        const geometryStarted = performance.now();
        const defaults = seededDefaults(request.options.seed);
        const { polyhedron, hit: meshCacheHit } = this.#geometry.get(request.options);
        const geometryMs = performance.now() - geometryStarted;
        let stages: RenderTimings | undefined;
        const renderStarted = performance.now();
        const image = renderPolyhedron(polyhedron, {
          ...request.options, palette: request.options.palette ?? defaults.palette,
          yaw: request.options.yaw ?? defaults.yaw,
          pitch: request.options.pitch ?? (request.options.view === "face" ? 0 : defaults.pitch),
          onTiming: timings => { stages = timings; },
        });
        this.#present(image, request, performance.now() - renderStarted, polyhedron.vertices.length,
          polyhedron.edges.length, polyhedron.faces.length, geometryMs, meshCacheHit, stages);
      }
    } catch (error) {
      this.#showError(error);
    }
  }

  #send(request: RenderRequest): void {
    this.#busy = true;
    this.#active = request;
    this.#worker!.postMessage({ id: request.id, options: request.options });
  }

  #workerMessage = (event: MessageEvent<RenderReply>): void => {
    this.#busy = false;
    const reply = event.data;
    if (reply.id === this.#version) {
      if (reply.error) this.#showError(reply.error);
      else if (reply.buffer && reply.width && reply.height && this.#active) {
        this.#present({ width: reply.width, height: reply.height, data: new Uint8ClampedArray(reply.buffer) },
          this.#active, reply.renderMs ?? 0, reply.vertices ?? 0, reply.edges ?? 0, reply.faces ?? 0,
          reply.geometryMs ?? 0, reply.meshCacheHit ?? false, reply.stages);
      }
    }
    this.#active = undefined;
    if (this.#pending) { const next = this.#pending; this.#pending = undefined; this.#send(next); }
  };

  #present(image: RenderedImage, request: RenderRequest, renderMs: number, vertices: number, edges: number,
    faces: number, geometryMs: number, meshCacheHit: boolean, stages?: RenderTimings): void {
    const start = performance.now();
    if (this.#canvas.width !== image.width || this.#canvas.height !== image.height) {
      this.#canvas.width = image.width;
      this.#canvas.height = image.height;
    }
    const context = this.#canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas 2D is unavailable");
    context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    this.#copyBackdrop();
    const now = performance.now();
    this.#drawTimes.push(now);
    this.#metrics = { renderMs, geometryMs, meshCacheHit, stages, presentMs: now - start, latencyMs: now - request.requestedAt,
      width: image.width, height: image.height, vertices, edges, faces, quality: request.options.quality ?? 2 };
    this.#message.style.display = "none";
    this.#updateStats();
    this.dispatchEvent(new CustomEvent("noble-render", { detail: { ...this.#metrics } }));
  }

  #showError(error: unknown): void {
    this.#message.textContent = error instanceof Error ? error.message : String(error);
    this.#message.style.display = "block";
    this.dispatchEvent(new CustomEvent("noble-error", { detail: error }));
  }

  #syncStatsTimer(): void {
    const enabled = this.isConnected && this.hasAttribute("stats") && this.getAttribute("stats") !== "false";
    if (enabled && !this.#timer) this.#timer = window.setInterval(() => this.#updateStats(), 500);
    if (!enabled && this.#timer) { clearInterval(this.#timer); this.#timer = 0; }
  }

  #updateStats(): void {
    const enabled = this.hasAttribute("stats") && this.getAttribute("stats") !== "false";
    this.#stats.hidden = !enabled;
    if (!enabled) return;
    const now = performance.now();
    this.#drawTimes = this.#drawTimes.filter(time => time > now - 1000);
    const m = this.#metrics;
    this.#stats.textContent = [
      `DRAW FPS   ${this.#drawTimes.length}${this.#drawTimes.length ? "" : " (idle)"}`,
      `MESH       ${m.geometryMs.toFixed(1)} ms ${m.meshCacheHit ? "cached" : "built"}`,
      `RENDER     ${m.renderMs.toFixed(1)} ms`,
      `BACKGROUND ${m.stages?.backgroundMs.toFixed(1) ?? "0.0"} ms ${m.stages?.backgroundCacheHit ? "cached" : "built"}`,
      `FACES      ${m.stages?.facesMs.toFixed(1) ?? "0.0"} ms`,
      `EDGES      ${m.stages?.edgesMs.toFixed(1) ?? "0.0"} ms`,
      `DOWNSAMPLE ${m.stages?.downsampleMs.toFixed(1) ?? "0.0"} ms`,
      `PRESENT    ${m.presentMs.toFixed(1)} ms`,
      `LATENCY    ${m.latencyMs.toFixed(1)} ms`,
      `CANVAS     ${m.width} × ${m.height}`,
      `PIXELS     ${(m.width * m.height / 1e6).toFixed(2)} MP`,
      `QUALITY    ${m.quality}× ${this.#dragging ? "drag" : this.rotate && !this.#motionPreference?.matches ? "motion" : "still"}`,
      `MOTION     r ${this.rotate.toFixed(2)} · f ${this.float.toFixed(2)}`,
      `GEOMETRY   ${m.vertices}v ${m.edges}e ${m.faces}f`,
      `BACKEND    ${this.#worker ? "worker" : "main"}${this.#pending ? " · queued" : ""}`,
    ].join("\n");
  }

  #pointerDown = (event: PointerEvent): void => {
    if (this.rotate > 0 && this.#motionAngle !== 0) {
      const current = this.#currentRotation();
      this.#motionAngle = 0;
      this.setAttribute("rotation", current.map(value => value.toFixed(6)).join(","));
      this.dispatchEvent(new Event("input", { bubbles: true }));
    }
    this.#dragging = true;
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.#canvas.setPointerCapture(event.pointerId);
  };

  #pointerMove = (event: PointerEvent): void => {
    if (!this.#dragging || !this.#lastPointer) return;
    const dx = event.clientX - this.#lastPointer.x, dy = event.clientY - this.#lastPointer.y;
    if (!dx && !dy) return;
    const current = this.#baseRotation();
    const delta = multiply(axisRotation(1, 0, 0, dy * 0.008), axisRotation(0, 1, 0, dx * 0.008));
    this.setAttribute("rotation", normalize(multiply(delta, current)).map(value => value.toFixed(6)).join(","));
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.dispatchEvent(new Event("input", { bubbles: true }));
  };

  #pointerUp = (): void => {
    if (!this.#dragging) return;
    this.#dragging = false;
    this.#lastPointer = undefined;
    this.#schedule();
    this.#updateStats();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };

  #wheel = (event: WheelEvent): void => {
    event.preventDefault();
    const zoom = numericAttribute(this, "zoom") ?? 1;
    this.setAttribute("zoom", String(Math.max(0.4, Math.min(2.5, zoom * (event.deltaY > 0 ? 0.94 : 1.06)))));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };
}

export function defineNoblePolyhedron(tagName = "noble-polyhedron"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tagName)) customElements.define(tagName, NoblePolyhedronElement);
}

defineNoblePolyhedron();

declare global {
  interface HTMLElementTagNameMap { "noble-polyhedron": NoblePolyhedronElement }
}
