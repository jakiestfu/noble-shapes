import { renderScene, type SceneOptions } from "@noble-polyhedra/render";
import { seededDefaults } from "@noble-polyhedra/core";

const numericAttribute = (element: Element, name: string): number | undefined => {
  const value = element.getAttribute(name);
  return value === null || value === "" ? undefined : Number(value);
};

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? class {} as typeof HTMLElement : HTMLElement;

export class NoblePolyhedronElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ["shape", "seed", "palette", "color", "background", "yaw", "pitch", "zoom", "view", "face-index", "n", "p", "q", "crown-height", "a", "b", "c"];
  }

  readonly #canvas: HTMLCanvasElement;
  readonly #message: HTMLDivElement;
  #observer?: ResizeObserver;
  #frame = 0;
  #dragging = false;
  #lastPointer?: { x: number; y: number };

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { display: block; position: relative; min-height: 180px; aspect-ratio: 1; overflow: hidden; border-radius: inherit; touch-action: none; }
      canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
      .message { position: absolute; inset: auto 12px 12px; padding: 9px 11px; border-radius: 9px; background: #241723e8; color: #ffe0d9; font: 12px/1.45 system-ui, sans-serif; display: none; }
    </style><canvas part="canvas" aria-label="Interactive noble polyhedron"></canvas><div class="message" part="error" role="status"></div>`;
    this.#canvas = shadow.querySelector("canvas")!;
    this.#message = shadow.querySelector(".message")!;
  }

  connectedCallback(): void {
    this.#observer = new ResizeObserver(() => this.#schedule());
    this.#observer.observe(this);
    this.#canvas.addEventListener("pointerdown", this.#pointerDown);
    this.#canvas.addEventListener("pointermove", this.#pointerMove);
    this.#canvas.addEventListener("pointerup", this.#pointerUp);
    this.#canvas.addEventListener("pointercancel", this.#pointerUp);
    this.#canvas.addEventListener("wheel", this.#wheel, { passive: false });
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#canvas.removeEventListener("pointerdown", this.#pointerDown);
    this.#canvas.removeEventListener("pointermove", this.#pointerMove);
    this.#canvas.removeEventListener("pointerup", this.#pointerUp);
    this.#canvas.removeEventListener("pointercancel", this.#pointerUp);
    this.#canvas.removeEventListener("wheel", this.#wheel);
  }

  attributeChangedCallback(): void { this.#schedule(); }

  get canvas(): HTMLCanvasElement { return this.#canvas; }

  #schedule(): void {
    if (!this.isConnected || this.#frame) return;
    this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#draw(); });
  }

  #options(): SceneOptions {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const side = Math.min(800, Math.max(1, Math.round(this.getBoundingClientRect().width * pixelRatio)));
    return {
      shape: (this.getAttribute("shape") ?? "random") as SceneOptions["shape"],
      seed: this.getAttribute("seed") ?? "noble",
      palette: this.getAttribute("palette") as SceneOptions["palette"] ?? undefined,
      color: this.getAttribute("color") ?? undefined,
      background: this.getAttribute("background") ?? undefined,
      width: side, height: side,
      yaw: numericAttribute(this, "yaw"), pitch: numericAttribute(this, "pitch"), zoom: numericAttribute(this, "zoom"),
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
      const image = renderScene(this.#options());
      if (this.#canvas.width !== image.width || this.#canvas.height !== image.height) {
        this.#canvas.width = image.width;
        this.#canvas.height = image.height;
      }
      const context = this.#canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D is unavailable");
      context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
      this.#message.style.display = "none";
      this.dispatchEvent(new CustomEvent("noble-render", { detail: { width: image.width, height: image.height } }));
    } catch (error) {
      this.#message.textContent = error instanceof Error ? error.message : String(error);
      this.#message.style.display = "block";
      this.dispatchEvent(new CustomEvent("noble-error", { detail: error }));
    }
  }

  #pointerDown = (event: PointerEvent): void => {
    this.#dragging = true;
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.#canvas.setPointerCapture(event.pointerId);
  };

  #pointerMove = (event: PointerEvent): void => {
    if (!this.#dragging || !this.#lastPointer) return;
    const defaults = seededDefaults(this.getAttribute("seed") ?? "noble");
    const yaw = numericAttribute(this, "yaw") ?? defaults.yaw;
    const pitch = numericAttribute(this, "pitch") ?? defaults.pitch;
    this.setAttribute("yaw", String(yaw + (event.clientX - this.#lastPointer.x) * 0.008));
    this.setAttribute("pitch", String(Math.max(-1.45, Math.min(1.45, pitch + (event.clientY - this.#lastPointer.y) * 0.008))));
    this.#lastPointer = { x: event.clientX, y: event.clientY };
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };

  #pointerUp = (): void => { this.#dragging = false; this.#lastPointer = undefined; this.#schedule(); };

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
