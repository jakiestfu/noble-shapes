import { renderScene, type Quaternion, type RenderedImage, type SceneOptions } from "@noble-polyhedra/render";
import { createPolyhedron, seededDefaults } from "@noble-polyhedra/core";

const numericAttribute = (element: Element, name: string): number | undefined => {
  const value = element.getAttribute(name);
  return value === null || value === "" ? undefined : Number(value);
};

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
type RenderReply = { id: number; width?: number; height?: number; buffer?: ArrayBuffer; renderMs?: number; vertices?: number; edges?: number; faces?: number; error?: string };

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? class {} as typeof HTMLElement : HTMLElement;

export class NoblePolyhedronElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ["shape", "seed", "palette", "color", "background", "yaw", "pitch", "rotation", "zoom", "view", "face-index", "stats", "n", "p", "q", "crown-height", "a", "b", "c"];
  }

  readonly #canvas: HTMLCanvasElement;
  readonly #message: HTMLDivElement;
  readonly #stats: HTMLOutputElement;
  #observer?: ResizeObserver;
  #worker?: Worker;
  #frame = 0;
  #timer = 0;
  #version = 0;
  #busy = false;
  #pending?: RenderRequest;
  #active?: RenderRequest;
  #dragging = false;
  #lastPointer?: { x: number; y: number };
  #drawTimes: number[] = [];
  #metrics = { renderMs: 0, presentMs: 0, latencyMs: 0, width: 0, height: 0, vertices: 0, edges: 0, faces: 0, quality: 2 };

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { display: block; position: relative; min-height: 180px; aspect-ratio: 1; overflow: hidden; border-radius: inherit; touch-action: none; }
      canvas { display: block; width: 100%; height: 100%; cursor: grab; }
      canvas:active { cursor: grabbing; }
      .message { position: absolute; inset: auto 12px 12px; padding: 9px 11px; border-radius: 9px; background: #241723e8; color: #ffe0d9; font: 12px/1.45 system-ui, sans-serif; display: none; }
      .stats { position: absolute; z-index: 2; top: 12px; right: 12px; min-width: 132px; padding: 8px 10px; border: 1px solid #ffffff35; border-radius: 8px; background: #111827df; color: #f8fafc; font: 10px/1.45 ui-monospace, SFMono-Regular, monospace; text-align: left; pointer-events: none; white-space: pre; box-shadow: 0 4px 18px #0003; }
      .stats[hidden] { display: none; }
    </style><canvas part="canvas" aria-label="Interactive noble polyhedron"></canvas><output class="stats" part="stats" aria-label="Renderer statistics" hidden></output><div class="message" part="error" role="status"></div>`;
    this.#canvas = shadow.querySelector("canvas")!;
    this.#message = shadow.querySelector(".message")!;
    this.#stats = shadow.querySelector(".stats")!;
  }

  connectedCallback(): void {
    this.#observer = new ResizeObserver(() => this.#schedule());
    this.#observer.observe(this);
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
    this.#syncStatsTimer();
    this.#updateStats();
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
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

  attributeChangedCallback(name: string): void {
    if (name !== "stats") this.#schedule();
    else this.#syncStatsTimer();
    this.#updateStats();
  }

  get canvas(): HTMLCanvasElement { return this.#canvas; }
  get stats(): boolean { return this.hasAttribute("stats") && this.getAttribute("stats") !== "false"; }
  set stats(enabled: boolean) { if (enabled) this.setAttribute("stats", ""); else this.removeAttribute("stats"); }

  #schedule(): void {
    if (!this.isConnected || this.#frame) return;
    this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#draw(); });
  }

  #options(): SceneOptions {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const bounds = this.getBoundingClientRect();
    const scale = this.#dragging ? 0.45 : 1;
    const max = this.#dragging ? 320 : 800;
    const rawWidth = Math.max(1, bounds.width * pixelRatio * scale);
    const rawHeight = Math.max(1, bounds.height * pixelRatio * scale);
    const fit = Math.min(1, max / Math.max(rawWidth, rawHeight));
    return {
      shape: (this.getAttribute("shape") ?? "random") as SceneOptions["shape"],
      seed: this.getAttribute("seed") ?? "noble",
      palette: this.getAttribute("palette") as SceneOptions["palette"] ?? undefined,
      color: this.getAttribute("color") ?? undefined,
      background: this.getAttribute("background") ?? undefined,
      width: Math.max(1, Math.round(rawWidth * fit)),
      height: Math.max(1, Math.round(rawHeight * fit)),
      yaw: numericAttribute(this, "yaw"), pitch: numericAttribute(this, "pitch"),
      rotation: parseRotation(this.getAttribute("rotation")), zoom: numericAttribute(this, "zoom"),
      view: this.getAttribute("view") as SceneOptions["view"] ?? undefined,
      faceIndex: numericAttribute(this, "face-index"),
      n: numericAttribute(this, "n"), p: numericAttribute(this, "p"), q: numericAttribute(this, "q"),
      crownHeight: numericAttribute(this, "crown-height"),
      a: numericAttribute(this, "a"), b: numericAttribute(this, "b"), c: numericAttribute(this, "c"),
      quality: this.#dragging ? 1 : 2,
    };
  }

  #draw(): void {
    try {
      const request: RenderRequest = { id: ++this.#version, options: this.#options(), requestedAt: performance.now() };
      if (this.#worker) {
        if (this.#busy) this.#pending = request;
        else this.#send(request);
      } else {
        const start = performance.now();
        const image = renderScene(request.options);
        const polyhedron = createPolyhedron(request.options);
        this.#present(image, request, performance.now() - start, polyhedron.vertices.length, polyhedron.edges.length, polyhedron.faces.length);
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
          this.#active, reply.renderMs ?? 0, reply.vertices ?? 0, reply.edges ?? 0, reply.faces ?? 0);
      }
    }
    this.#active = undefined;
    if (this.#pending) { const next = this.#pending; this.#pending = undefined; this.#send(next); }
  };

  #present(image: RenderedImage, request: RenderRequest, renderMs: number, vertices: number, edges: number, faces: number): void {
    const start = performance.now();
    if (this.#canvas.width !== image.width || this.#canvas.height !== image.height) {
      this.#canvas.width = image.width;
      this.#canvas.height = image.height;
    }
    const context = this.#canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D is unavailable");
    context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
    const now = performance.now();
    this.#drawTimes.push(now);
    this.#metrics = { renderMs, presentMs: now - start, latencyMs: now - request.requestedAt,
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
    this.#stats.textContent = `DRAW FPS   ${this.#drawTimes.length}${this.#drawTimes.length ? "" : " (idle)"}\nRENDER     ${m.renderMs.toFixed(1)} ms\nPRESENT    ${m.presentMs.toFixed(1)} ms\nLATENCY    ${m.latencyMs.toFixed(1)} ms\nCANVAS     ${m.width} × ${m.height}\nPIXELS     ${(m.width * m.height / 1e6).toFixed(2)} MP\nQUALITY    ${m.quality}× ${this.#dragging ? "drag" : "still"}\nGEOMETRY   ${m.vertices}v ${m.edges}e ${m.faces}f\nBACKEND    ${this.#worker ? "worker" : "main"}${this.#pending ? " · queued" : ""}`;
  }

  #pointerDown = (event: PointerEvent): void => {
    this.#dragging = true;
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.#canvas.setPointerCapture(event.pointerId);
  };

  #pointerMove = (event: PointerEvent): void => {
    if (!this.#dragging || !this.#lastPointer) return;
    const dx = event.clientX - this.#lastPointer.x, dy = event.clientY - this.#lastPointer.y;
    if (!dx && !dy) return;
    const defaults = seededDefaults(this.getAttribute("seed") ?? "noble");
    const current = parseRotation(this.getAttribute("rotation")) ?? multiply(
      axisRotation(1, 0, 0, numericAttribute(this, "pitch") ?? defaults.pitch),
      axisRotation(0, 1, 0, numericAttribute(this, "yaw") ?? defaults.yaw));
    const delta = multiply(axisRotation(1, 0, 0, dy * 0.008), axisRotation(0, 1, 0, dx * 0.008));
    this.setAttribute("rotation", normalize(multiply(delta, current)).map(value => value.toFixed(6)).join(","));
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };

  #pointerUp = (): void => { this.#dragging = false; this.#lastPointer = undefined; this.#schedule(); this.#updateStats(); };

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
