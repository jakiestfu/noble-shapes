import type { Polyhedron, Vec3 } from "@noble-polyhedra/core";
import { MATERIAL_NAMES, PALETTES, shadeFace, type Quaternion, type RenderOptions, type RenderView } from "@noble-polyhedra/render";

/** CPU submission time and the most recently completed, asynchronous GPU timer query. */
export interface GpuTimings {
  renderMs: number;
  geometryMs: number;
  gpuMs?: number;
  faces: number;
  edges: number;
  drawCalls: number;
  width: number;
  height: number;
}

export interface GpuRenderOptions extends RenderOptions {
  /** Vertical shape translation in output canvas pixels; positive moves down. */
  floatOffsetY?: number;
}

type RGB = [number, number, number];
type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };
type PreparedMesh = {
  mesh: Polyhedron;
  vertices: WebGLBuffer;
  edges: WebGLBuffer;
  faces: { buffer: WebGLBuffer; count: number }[];
  edgeCount: number;
  maxRadius: number;
};

const VERTEX_SOURCE = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
uniform vec3 u_center, u_basis0, u_basis1, u_basis2;
uniform vec4 u_rotation;
uniform float u_radius, u_depthScale, u_offsetY;
uniform vec2 u_size;
out vec3 v_local;
vec3 rotated(vec3 p) {
  vec3 t = 2.0 * cross(u_rotation.xyz, p);
  return p + u_rotation.w * t + cross(u_rotation.xyz, t);
}
void main() {
  vec3 relative = a_position - u_center;
  v_local = vec3(dot(relative,u_basis0), dot(relative,u_basis1), dot(relative,u_basis2));
  vec3 p = rotated(v_local);
  vec2 clip = p.xy * u_radius * 2.0 / u_size;
  clip.y -= u_offsetY * 2.0 / u_size.y;
  gl_Position = vec4(clip, -p.z * u_depthScale, 1.0);
}`;

const FACE_FRAGMENT = `#version 300 es
precision highp float;
uniform vec4 u_color;
uniform bool u_marble;
in vec3 v_local;
out vec4 outColor;
float smoothBand(float low, float high, float value) {
  float t = clamp((value-low)/(high-low),0.0,1.0);
  return t*t*(3.0-2.0*t);
}
void main() {
  if (!u_marble) { outColor = u_color; return; }
  vec3 p = v_local;
  float phase = p.x*10.0+p.y*7.0+p.z*5.0+sin(p.y*6.0+p.z*12.0)*2.2+sin(p.x*9.0-p.z*7.0)*1.8;
  float wave = sin(phase);
  float secondary = sin(p.y*12.0-p.z*10.0+p.x*3.0+sin(p.x*6.0+p.z*3.0)*1.8);
  float cloud = 0.5+0.5*sin(p.x*3.1-p.y*4.7+p.z*5.3+sin(p.y*4.0+p.z*3.0));
  float vein = max(smoothBand(0.94,0.98,wave),smoothBand(0.97,0.995,secondary)*0.5);
  float tone = 0.78+0.32*cloud+0.12*smoothBand(0.78,0.9,wave)-0.38*vein;
  outColor = vec4(clamp(u_color.rgb*tone,0.0,1.0),u_color.a);
}`;

const EDGE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_start;
layout(location=1) in vec3 a_end;
uniform vec3 u_center, u_basis0, u_basis1, u_basis2;
uniform vec4 u_rotation;
uniform vec2 u_size;
uniform float u_radius, u_edgeRadius, u_depthScale, u_offsetY;
flat out vec2 v_start, v_end;
flat out float v_startZ, v_endZ;
vec3 rotated(vec3 p) {
  vec3 t = 2.0 * cross(u_rotation.xyz, p);
  return p + u_rotation.w * t + cross(u_rotation.xyz, t);
}
vec3 placed(vec3 p) {
  p -= u_center;
  return rotated(vec3(dot(p,u_basis0), dot(p,u_basis1), dot(p,u_basis2)));
}
void main() {
  vec3 a = placed(a_start), b = placed(a_end);
  v_start = u_size * 0.5 + a.xy * u_radius - vec2(0.0,u_offsetY);
  v_end = u_size * 0.5 + b.xy * u_radius - vec2(0.0,u_offsetY);
  v_startZ = a.z;
  v_endZ = b.z;
  vec2 delta = v_end - v_start;
  vec2 tangent = delta / max(length(delta), 1e-7);
  vec2 side = vec2(-tangent.y, tangent.x);
  int corner = gl_VertexID % 6;
  float along = (corner == 1 || corner == 4 || corner == 5) ? 1.0 : 0.0;
  float across = (corner == 2 || corner == 3 || corner == 5) ? 1.0 : -1.0;
  float extension = u_edgeRadius + 1.0;
  vec2 screen = mix(v_start, v_end, along) + tangent * (along * 2.0 - 1.0) * extension + side * across * extension;
  gl_Position = vec4(screen * 2.0 / u_size - 1.0, -mix(a.z,b.z,along) * u_depthScale, 1.0);
}`;

const EDGE_FRAGMENT = `#version 300 es
precision highp float;
flat in vec2 v_start, v_end;
flat in float v_startZ, v_endZ;
uniform float u_edgeRadius, u_opacity, u_depthScale, u_depthBias;
uniform vec3 u_color;
out vec4 outColor;
void main() {
  vec2 delta = v_end - v_start;
  float t = clamp(dot(gl_FragCoord.xy - v_start, delta) / max(dot(delta,delta),1e-7),0.0,1.0);
  float distanceToEdge = length(gl_FragCoord.xy - mix(v_start,v_end,t));
  float coverage = clamp(u_edgeRadius + 0.5 - distanceToEdge,0.0,1.0);
  if (coverage <= 0.0) discard;
  // Native depth compares the interpolated edge against the filled face.
  float z = mix(v_startZ,v_endZ,t) + u_depthBias;
  gl_FragDepth = clamp(0.5 - z * u_depthScale * 0.5,0.0,1.0);
  outColor = vec4(u_color,coverage*u_opacity);
}`;

const QUAD_VERTEX = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2((gl_VertexID == 1 || gl_VertexID == 4 || gl_VertexID == 5) ? 1.0 : -1.0,
                (gl_VertexID == 2 || gl_VertexID == 3 || gl_VertexID == 5) ? 1.0 : -1.0);
  gl_Position = vec4(p,0.0,1.0);
}`;

const BACKGROUND_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_size;
uniform vec3 u_base, u_background;
out vec4 outColor;
void main() {
  vec2 delta = gl_FragCoord.xy - vec2(0.5) - u_size * 0.5;
  float glow = min(u_size.x,u_size.y) * 0.58;
  float halo = exp(-dot(delta,delta)/(glow*glow))*0.14;
  float vignette = clamp(1.0-length(delta/u_size)*0.34,0.72,1.0);
  outColor = vec4((u_background + u_base*halo)*vignette,1.0);
}`;

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string, names: string[]): Program {
  const shader = (kind: number, source: string): WebGLShader => {
    const result = gl.createShader(kind);
    if (!result) throw new Error("Could not create WebGL shader");
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(`WebGL shader: ${message}`);
    }
    return result;
  };
  const vert = shader(gl.VERTEX_SHADER, vertex), frag = shader(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create WebGL program");
  gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program);
  gl.deleteShader(vert); gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`WebGL program: ${message}`);
  }
  return { program, uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) };
}

const parseHex = (value: string): RGB => {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Expected a six-digit hex color, got ${value}`);
  return [0, 2, 4].map(i => parseInt(match[1]!.slice(i,i+2),16)) as RGB;
};
const clamp = (n: number, low = 0, high = 1): number => Math.min(high,Math.max(low,n));
const dot = (a: Vec3,b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const subtract = (a: Vec3,b: Vec3): Vec3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a: Vec3,b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalized = (v: Vec3): Vec3 => { const n = Math.hypot(...v) || 1; return [v[0]/n,v[1]/n,v[2]/n]; };
const faceNormal = (a: Vec3,b: Vec3,c: Vec3): Vec3 => normalized(cross(subtract(b,a),subtract(c,a)));
const identity: Vec3[] = [[1,0,0],[0,1,0],[0,0,1]];
const rotate = (v: Vec3,q: Quaternion): Vec3 => {
  const raw = cross([q[0],q[1],q[2]],v);
  const t: Vec3 = [raw[0]*2,raw[1]*2,raw[2]*2];
  const u = cross([q[0],q[1],q[2]],t);
  return [v[0]+q[3]*t[0]+u[0],v[1]+q[3]*t[1]+u[1],v[2]+q[3]*t[2]+u[2]];
};
const defaultRotation = (yaw: number,pitch: number): Quaternion => {
  const sy = Math.sin(yaw/2), cy = Math.cos(yaw/2), sx = Math.sin(pitch/2), cx = Math.cos(pitch/2);
  return [sx*cy,cx*sy,sx*sy,cx*cy];
};

export class GpuRenderer {
  readonly #gl: WebGL2RenderingContext;
  readonly #canvas: HTMLCanvasElement;
  readonly #face: Program;
  readonly #edge: Program;
  readonly #background: Program;
  readonly #quad: WebGLVertexArrayObject;
  readonly #faceVao: WebGLVertexArrayObject;
  readonly #edgeVao: WebGLVertexArrayObject;
  readonly #extension: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  #query?: WebGLQuery;
  #lastGpuMs?: number;
  #mesh?: PreparedMesh;
  #framebuffer?: WebGLFramebuffer;
  #color?: WebGLTexture;
  #depthStencil?: WebGLRenderbuffer;
  #internalWidth = 0;
  #internalHeight = 0;
  #lost = false;

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.#canvas = canvas; this.#gl = gl;
    const shared = ["u_center","u_basis0","u_basis1","u_basis2","u_rotation","u_radius","u_depthScale","u_size","u_offsetY"];
    this.#face = compile(gl,VERTEX_SOURCE,FACE_FRAGMENT,[...shared,"u_color","u_marble"]);
    this.#edge = compile(gl,EDGE_VERTEX,EDGE_FRAGMENT,[...shared,"u_edgeRadius","u_depthBias","u_opacity","u_color"]);
    this.#background = compile(gl,QUAD_VERTEX,BACKGROUND_FRAGMENT,["u_size","u_base","u_background"]);
    const empty = gl.createVertexArray(), face = gl.createVertexArray(), edge = gl.createVertexArray();
    if (!empty || !face || !edge) throw new Error("Could not create WebGL vertex arrays");
    this.#quad = empty; this.#faceVao = face; this.#edgeVao = edge;
    this.#extension = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    canvas.addEventListener("webglcontextlost",this.#contextLost);
  }

  static create(canvas: HTMLCanvasElement): GpuRenderer | undefined {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: true, stencil: true,
      preserveDrawingBuffer: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) return undefined;
    return new GpuRenderer(canvas,gl);
  }

  #contextLost = (event: Event): void => { event.preventDefault(); this.#lost = true; };
  get lost(): boolean { return this.#lost || this.#gl.isContextLost(); }

  #prepare(mesh: Polyhedron): number {
    if (this.#mesh?.mesh === mesh) return 0;
    const started = performance.now(), gl = this.#gl;
    this.#releaseMesh();
    const vertices = gl.createBuffer(), edges = gl.createBuffer();
    if (!vertices || !edges) throw new Error("Could not create WebGL mesh buffers");
    gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices.flat()),gl.STATIC_DRAW);
    const edgePositions = new Float32Array(mesh.edges.length*6);
    mesh.edges.forEach(([a,b],i) => {
      edgePositions.set(mesh.vertices[a]!,i*6); edgePositions.set(mesh.vertices[b]!,i*6+3);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER,edges);
    gl.bufferData(gl.ARRAY_BUFFER,edgePositions,gl.STATIC_DRAW);
    const faces = mesh.faces.map(face => {
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Could not create WebGL face buffer");
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(face),gl.STATIC_DRAW);
      return { buffer,count:face.length };
    });
    gl.bindVertexArray(this.#faceVao);
    gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);
    gl.bindVertexArray(this.#edgeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER,edges);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0); gl.vertexAttribDivisor(0,1);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12); gl.vertexAttribDivisor(1,1);
    gl.bindVertexArray(null);
    this.#mesh = { mesh,vertices,edges,faces,edgeCount:mesh.edges.length,
      maxRadius:Math.max(1,...mesh.vertices.map(v => Math.hypot(...v))) };
    return performance.now()-started;
  }

  #releaseMesh(): void {
    if (!this.#mesh) return;
    const gl = this.#gl;
    gl.deleteBuffer(this.#mesh.vertices); gl.deleteBuffer(this.#mesh.edges);
    for (const face of this.#mesh.faces) gl.deleteBuffer(face.buffer);
    this.#mesh = undefined;
  }

  #resize(width: number,height: number,quality: 1|2): void {
    const gl = this.#gl, w = width*quality,h = height*quality;
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;
    if (this.#internalWidth === w && this.#internalHeight === h) return;
    if (this.#color) gl.deleteTexture(this.#color);
    if (this.#depthStencil) gl.deleteRenderbuffer(this.#depthStencil);
    if (this.#framebuffer) gl.deleteFramebuffer(this.#framebuffer);
    const color = gl.createTexture(), depthStencil = gl.createRenderbuffer(), framebuffer = gl.createFramebuffer();
    if (!color || !depthStencil || !framebuffer) throw new Error("Could not create WebGL render target");
    gl.bindTexture(gl.TEXTURE_2D,color);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,depthStencil);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH24_STENCIL8,w,h);
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_STENCIL_ATTACHMENT,gl.RENDERBUFFER,depthStencil);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error("Incomplete WebGL render target");
    this.#color=color; this.#depthStencil=depthStencil; this.#framebuffer=framebuffer;
    this.#internalWidth=w; this.#internalHeight=h;
  }

  #uniforms(program: Program, center: Vec3,basis: Vec3[],rotation: Quaternion,radius: number,depthScale: number,offsetY: number): void {
    const gl=this.#gl,u=program.uniforms;
    gl.useProgram(program.program);
    gl.uniform3f(u.u_center!,center[0],center[1],center[2]);
    gl.uniform3f(u.u_basis0!,basis[0]![0],basis[0]![1],basis[0]![2]);
    gl.uniform3f(u.u_basis1!,basis[1]![0],basis[1]![1],basis[1]![2]);
    gl.uniform3f(u.u_basis2!,basis[2]![0],basis[2]![1],basis[2]![2]);
    gl.uniform4f(u.u_rotation!,rotation[0],rotation[1],rotation[2],rotation[3]);
    gl.uniform1f(u.u_radius!,radius); gl.uniform1f(u.u_depthScale!,depthScale);
    gl.uniform2f(u.u_size!,this.#internalWidth,this.#internalHeight);
    gl.uniform1f(u.u_offsetY!,offsetY);
  }

  #pollQuery(): void {
    const gl=this.#gl,extension=this.#extension,query=this.#query;
    if (!extension || !query) return;
    if (!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)) return;
    if (!gl.getParameter(extension.GPU_DISJOINT_EXT)) this.#lastGpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
    gl.deleteQuery(query); this.#query=undefined;
  }

  render(mesh: Polyhedron,options: GpuRenderOptions={}): GpuTimings {
    if (this.lost) throw new Error("WebGL context was lost");
    const started=performance.now(),gl=this.#gl;
    const width=Math.round(options.width??512),height=Math.round(options.height??512),quality=options.quality??2;
    if (!(width>0&&height>0&&width<=8192&&height<=8192&&width*height*quality*quality<=64_000_000)) throw new Error("Invalid image dimensions");
    if (quality!==1&&quality!==2) throw new Error("Quality must be 1 or 2");
    const palette=PALETTES[options.palette??"aurora"];
    if (!palette) throw new Error(`Unknown palette: ${options.palette}`);
    const base=parseHex(options.color??palette.color),transparent=options.background==="transparent";
    const background=transparent?undefined:parseHex(options.background??palette.background);
    const view: RenderView=options.view??"solid-wireframe";
    if (!["solid","solid-wireframe","wireframe","face","face-context"].includes(view)) throw new Error(`Unknown render view: ${view}`);
    const material=options.material??"studio";
    if (!MATERIAL_NAMES.includes(material)) throw new Error(`Unknown material: ${material}`);
    const faceIndex=options.faceIndex??0;
    if (!Number.isInteger(faceIndex)||faceIndex<0||faceIndex>=mesh.faces.length) throw new Error("Face index is outside this shape's face range");
    const zoom=options.zoom??1;
    if (!(Number.isFinite(zoom)&&zoom>0&&zoom<=4)) throw new Error("Zoom must be between 0 and 4");
    if (options.floatOffsetY !== undefined && !Number.isFinite(options.floatOffsetY)) throw new Error("Float offset must be finite");
    const offsetY=(options.floatOffsetY??0)*quality;
    const rotation=options.rotation??defaultRotation(options.yaw??0.55,options.pitch??(view==="face"?0:0.72));
    if (rotation.length!==4||rotation.some(value=>!Number.isFinite(value))||Math.abs(Math.hypot(...rotation)-1)>0.01) throw new Error("Rotation must be a unit quaternion");
    const geometryMs=this.#prepare(mesh);
    this.#resize(width,height,quality);
    this.#pollQuery();
    let query:WebGLQuery|undefined;
    if (this.#extension&&!this.#query) {
      query=gl.createQuery()??undefined;
      if (query) gl.beginQuery(this.#extension.TIME_ELAPSED_EXT,query);
    }
    const w=this.#internalWidth,h=this.#internalHeight;
    let center:Vec3=[0,0,0],basis=identity,radius=Math.min(w,h)*0.37*zoom;
    if (view==="face") {
      const face=mesh.faces[faceIndex]!;
      const sum=face.reduce<Vec3>((acc,i)=>[acc[0]+mesh.vertices[i]![0],acc[1]+mesh.vertices[i]![1],acc[2]+mesh.vertices[i]![2]],[0,0,0]);
      center=[sum[0]/face.length,sum[1]/face.length,sum[2]/face.length];
      const a=mesh.vertices[face[0]!]!,b=mesh.vertices[face[1]!]!,c=mesh.vertices[face[2]!]!;
      const normal=faceNormal(a,b,c),u=normalized(subtract(a,center)),v=cross(normal,u);
      basis=[u,v,normal];
      const faceRadius=Math.max(...face.map(i=>Math.hypot(dot(subtract(mesh.vertices[i]!,center),u),dot(subtract(mesh.vertices[i]!,center),v))));
      radius=Math.min(w,h)*0.38*zoom/faceRadius;
    }
    const depthScale=1/(this.#mesh!.maxRadius*2);
    // Bounding boxes are needed only for the stencil scissor; all pixel work stays on the GPU.
    const projected=mesh.vertices.map(vertex=>{
      const point=rotate([dot(subtract(vertex,center),basis[0]!),dot(subtract(vertex,center),basis[1]!),dot(subtract(vertex,center),basis[2]!)],rotation);
      return { x:w/2+point[0]*radius,y:h/2+point[1]*radius-offsetY,z:point[2] };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.#framebuffer!); gl.viewport(0,0,w,h);
    gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true,true,true,true); gl.depthMask(true); gl.stencilMask(0xff);
    gl.clearColor(0,0,0,0); gl.clearDepth(1); gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
    let drawCalls=0,faces=0,edges=0;
    if (background) {
      gl.useProgram(this.#background.program); gl.bindVertexArray(this.#quad);
      gl.uniform2f(this.#background.uniforms.u_size!,w,h);
      gl.uniform3f(this.#background.uniforms.u_base!,base[0]/255,base[1]/255,base[2]/255);
      gl.uniform3f(this.#background.uniforms.u_background!,background[0]/255,background[1]/255,background[2]/255);
      gl.drawArrays(gl.TRIANGLES,0,6); drawCalls++;
    }
    gl.bindVertexArray(this.#faceVao);
    this.#uniforms(this.#face,center,basis,rotation,radius,depthScale,offsetY);
    gl.uniform1i(this.#face.uniforms.u_marble!,material==="marble"?1:0);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    for (let i=0;i<mesh.faces.length;i++) {
      if (view==="wireframe"||((view==="face"||view==="face-context")&&i!==faceIndex)) continue;
      const face=mesh.faces[i]!;
      const poly=face.map(j=>projected[j]!);
      const minX=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.x))));
      const maxX=Math.min(w-1,Math.ceil(Math.max(...poly.map(p=>p.x))));
      const minY=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.y))));
      const maxY=Math.min(h-1,Math.ceil(Math.max(...poly.map(p=>p.y))));
      if (maxX<minX||maxY<minY) continue;
      const a=mesh.vertices[face[0]!]!,b=mesh.vertices[face[1]!]!,c=mesh.vertices[face[2]!]!;
      const faceN=faceNormal(a,b,c);
      const normal=rotate([dot(faceN,basis[0]!),dot(faceN,basis[1]!),dot(faceN,basis[2]!)],rotation);
      if (Math.abs(normal[2])<1e-7) continue;
      const color=shadeFace(base,normal,i,material,view==="face"||view==="face-context").map(channel=>channel/255);
      gl.uniform4f(this.#face.uniforms.u_color!,color[0]!,color[1]!,color[2]!,1);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(minX,minY,maxX-minX+1,maxY-minY+1);
      gl.stencilMask(0xff); gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.ALWAYS,0,0xff); gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);
      gl.colorMask(false,false,false,false); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.#mesh!.faces[i]!.buffer);
      // The stencil pass only builds coverage; skip procedural work until color is written.
      if (material==="marble") gl.uniform1i(this.#face.uniforms.u_marble!,0);
      gl.drawElements(gl.TRIANGLE_FAN,face.length,gl.UNSIGNED_INT,0); drawCalls++;
      gl.colorMask(true,true,true,true); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
      gl.stencilMask(0); gl.stencilFunc(gl.NOTEQUAL,0,0xff); gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
      // The planar fan can color itself: every fragment has the correct face depth.
      if (material==="marble") gl.uniform1i(this.#face.uniforms.u_marble!,1);
      gl.drawElements(gl.TRIANGLE_FAN,face.length,gl.UNSIGNED_INT,0); drawCalls++;
      gl.disable(gl.STENCIL_TEST); gl.disable(gl.SCISSOR_TEST);
      faces++;
    }
    const edgeRadius=Math.max(0.65,(options.edgeWidth??(view==="wireframe"||view==="face-context"?1.3:1.0))*quality/2);
    const edgeColor=base.map(channel=>clamp(channel*(view==="solid-wireframe"?0.55:0.65)+(view==="solid-wireframe"?95:115),0,255)/255);
    const drawEdges=(positions: WebGLBuffer,count: number,opacity: number,testDepth: boolean): void=>{
      if (!count) return;
      this.#uniforms(this.#edge,center,basis,rotation,radius,depthScale,offsetY);
      gl.uniform1f(this.#edge.uniforms.u_edgeRadius!,edgeRadius);
      gl.uniform1f(this.#edge.uniforms.u_opacity!,opacity);
      gl.uniform1f(this.#edge.uniforms.u_depthBias!,testDepth?0.008:0);
      gl.uniform3f(this.#edge.uniforms.u_color!,edgeColor[0]!,edgeColor[1]!,edgeColor[2]!);
      gl.bindVertexArray(this.#edgeVao);
      gl.bindBuffer(gl.ARRAY_BUFFER,positions);
      gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
      gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
      if (testDepth) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); }
      else gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false); gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);
      gl.disable(gl.BLEND); gl.depthMask(true);
      drawCalls++; edges+=count;
    };
    if (view==="solid-wireframe") drawEdges(this.#mesh!.edges,this.#mesh!.edgeCount,1,true);
    if (view==="wireframe") drawEdges(this.#mesh!.edges,this.#mesh!.edgeCount,0.8,false);
    if (view==="face-context") drawEdges(this.#mesh!.edges,this.#mesh!.edgeCount,0.42,false);
    if (view==="face"||view==="face-context") {
      const face=mesh.faces[faceIndex]!;
      const positions=new Float32Array(face.length*6);
      face.forEach((index,i)=>{
        positions.set(mesh.vertices[index]!,i*6);
        positions.set(mesh.vertices[face[(i+1)%face.length]!]!,i*6+3);
      });
      const buffer=gl.createBuffer();
      if (buffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);
        drawEdges(buffer,face.length,1,false);
        gl.deleteBuffer(buffer);
      }
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.#framebuffer!);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
    gl.blitFramebuffer(0,0,w,h,0,0,width,height,gl.COLOR_BUFFER_BIT,gl.LINEAR);
    drawCalls++;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    if (query) { gl.endQuery(this.#extension!.TIME_ELAPSED_EXT); this.#query=query; }
    return { renderMs:performance.now()-started,geometryMs,gpuMs:this.#lastGpuMs,faces,edges,drawCalls,width,height };
  }

  dispose(): void {
    this.#canvas.removeEventListener("webglcontextlost",this.#contextLost);
    const gl=this.#gl;
    this.#releaseMesh();
    if (this.#query) gl.deleteQuery(this.#query);
    if (this.#color) gl.deleteTexture(this.#color);
    if (this.#depthStencil) gl.deleteRenderbuffer(this.#depthStencil);
    if (this.#framebuffer) gl.deleteFramebuffer(this.#framebuffer);
    gl.deleteVertexArray(this.#quad); gl.deleteVertexArray(this.#faceVao); gl.deleteVertexArray(this.#edgeVao);
    gl.deleteProgram(this.#face.program); gl.deleteProgram(this.#edge.program); gl.deleteProgram(this.#background.program);
  }
}

export const createGpuRenderer = (canvas: HTMLCanvasElement): GpuRenderer | undefined => GpuRenderer.create(canvas);
