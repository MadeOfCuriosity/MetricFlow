import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CursorState } from '../../types/landing';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface DitherPlasmaHeroProps {
  setCursorState: (state: CursorState) => void;
}

// 1. Vertex Shader (Exact Codapress GLSL)
const VS_SOURCE = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 2. Fragment Shader (Exact Codapress GLSL)
const FS_SOURCE = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uDispTexture;
uniform sampler2D uTrailDispTexture;
uniform sampler2D uTrailEnergyTexture;
uniform sampler2D uTextTexture;
uniform vec2 uFieldSize;
uniform float uFieldScale;
uniform float uDispStrength;
uniform float uDispMax;
uniform float uDitherCellSize;
uniform float uDitherScale;
uniform float uHasText;
uniform float uTrailReveal;
uniform vec3 uTrailColor;

uniform float uTimeSpeed;
uniform float uSeedZ;
uniform float uModThreshold;
uniform float uModWarp;
uniform float uModZSpeed;
uniform float uModFreq;
uniform int uIterations;
uniform float uRotateSpeed;
uniform float uMixScale1;
uniform float uMixScale2;
uniform float uFalloffY;
uniform float uFalloffX;
uniform float uContrast;
uniform float uGamma;

out vec4 fragColor;

vec2 toScreenCoord(vec2 fragCoord) {
  return vec2(fragCoord.x, uResolution.y - fragCoord.y);
}

vec2 snapToDitherGrid(vec2 coord) {
  float grain = max(uDitherCellSize, 1.0);
  return (floor(coord / grain) + 0.5) * grain;
}

vec2 sampleDisplacement(vec2 screenCoord) {
  vec2 snapped = snapToDitherGrid(screenCoord);
  vec2 uv = (snapped / uFieldScale + 0.5) / uFieldSize;
  vec2 encoded = texture(uDispTexture, uv).rg;
  return (encoded - 0.5) * 2.0 * uDispMax;
}

vec2 warpScreenCoord(vec2 screenCoord) {
  vec2 disp = sampleDisplacement(screenCoord);
  vec2 offset = vec2(disp.x, -disp.y) * uDispStrength;
  float grain = max(uDitherCellSize, 1.0);
  vec2 blockyOffset = floor(offset / grain + 0.5) * grain;
  float useBlocks = step(0.001, length(offset));
  return screenCoord + mix(offset, blockyOffset, useBlocks);
}

float modulate(vec3 p, float time) {
  p.y += uModWarp * sin(p.x + time);
  p.z += uModZSpeed * time;
  return length(0.2 * sin(p.x / uModFreq + p.y) + cos(p.zzx / (uModFreq * 2.0))) - uModThreshold;
}

vec2 rotate(vec2 uv, float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c) * uv;
}

float plasmaLuminance(vec2 fragCoord) {
  vec2 screenCoord = toScreenCoord(fragCoord);
  vec2 disp = sampleDisplacement(screenCoord);
  vec2 offset = vec2(disp.x, -disp.y) * uDispStrength;
  float grain = max(uDitherCellSize, 1.0);
  vec2 blockyOffset = floor(offset / grain + 0.5) * grain;
  float useBlocks = step(0.001, length(offset));
  vec2 warpedFrag = fragCoord + mix(offset, blockyOffset, useBlocks);

  vec2 uv = (warpedFrag / uResolution) * 2.0 - 1.0;
  float ar = uResolution.x / uResolution.y;
  uv.x *= ar;

  vec3 col = 0.5 - vec3(uv, uSeedZ);
  vec3 orig = col;
  float time = uTime * uTimeSpeed;

  for (int i = 0; i < 48; i++) {
    if (i >= uIterations) break;
    vec3 c = col;
    c.xy = rotate(c.xy, time * uRotateSpeed);
    orig += modulate(orig, time) * c;
  }

  vec3 c = abs(
    modulate(orig * uMixScale1, time) * vec3(0.3 + sin(orig.x) / 3.0, 0.1, 0.1) +
    modulate(orig * uMixScale2, time) * vec3(0.1, 0.12, 0.15)
  ) * (uFalloffY - orig.y / 2.0) * 0.5;
  c = clamp(c, 0.0, 1.0);
  c += abs(
    modulate(orig + col, time) * vec3(0.30, 0.15, 0.10) +
    modulate(orig * uMixScale2, time) * vec3(0.10, 0.05, 0.00)
  ) * (uFalloffX - orig.x / 3.0) * 0.5;
  c = clamp(c * uContrast, 0.0, 1.0);
  c = clamp(pow(c, vec3(uGamma)), 0.0, 1.0);

  return dot(c, vec3(0.2125, 0.7154, 0.0721));
}

#define TRYF(newVal) old = mix(newVal, old, step(abs(ref - old), abs(ref - (newVal))));

float findClosestGray(float ref) {
  ref = clamp(ref, 0.0, 255.0);
  float old = 1e6;
  TRYF(0.0);
  TRYF(27.0);
  TRYF(48.0);
  TRYF(71.0);
  TRYF(94.0);
  TRYF(119.0);
  TRYF(145.0);
  TRYF(171.0);
  TRYF(198.0);
  TRYF(226.0);
  TRYF(255.0);
  return old;
}

float ditherMatrix(float x, float y) {
  return mix(
    mix(
      mix(
        mix(
          mix(mix(0.0, 32.0, step(1.0, y)), mix(8.0, 40.0, step(3.0, y)), step(2.0, y)),
          mix(mix(2.0, 34.0, step(5.0, y)), mix(10.0, 42.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        mix(
          mix(mix(48.0, 16.0, step(1.0, y)), mix(56.0, 24.0, step(3.0, y)), step(2.0, y)),
          mix(mix(50.0, 18.0, step(5.0, y)), mix(58.0, 26.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        step(1.0, x)
      ),
      mix(
        mix(
          mix(mix(12.0, 44.0, step(1.0, y)), mix(4.0, 36.0, step(3.0, y)), step(2.0, y)),
          mix(mix(14.0, 46.0, step(5.0, y)), mix(6.0, 38.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        mix(
          mix(mix(60.0, 28.0, step(1.0, y)), mix(52.0, 20.0, step(3.0, y)), step(2.0, y)),
          mix(mix(62.0, 30.0, step(5.0, y)), mix(54.0, 22.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        step(3.0, x)
      ),
      step(2.0, x)
    ),
    mix(
      mix(
        mix(
          mix(mix(3.0, 35.0, step(1.0, y)), mix(11.0, 43.0, step(3.0, y)), step(2.0, y)),
          mix(mix(1.0, 33.0, step(5.0, y)), mix(9.0, 41.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        mix(
          mix(mix(51.0, 19.0, step(1.0, y)), mix(59.0, 27.0, step(3.0, y)), step(2.0, y)),
          mix(mix(49.0, 17.0, step(5.0, y)), mix(57.0, 25.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        step(5.0, x)
      ),
      mix(
        mix(
          mix(mix(15.0, 47.0, step(1.0, y)), mix(7.0, 39.0, step(3.0, y)), step(2.0, y)),
          mix(mix(13.0, 45.0, step(5.0, y)), mix(5.0, 37.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        mix(
          mix(mix(63.0, 31.0, step(1.0, y)), mix(55.0, 23.0, step(3.0, y)), step(2.0, y)),
          mix(mix(61.0, 29.0, step(5.0, y)), mix(53.0, 21.0, step(7.0, y)), step(6.0, y)),
          step(4.0, y)
        ),
        step(7.0, x)
      ),
      step(6.0, x)
    ),
    step(4.0, x)
  );
}

float ditherGray(float lum, vec2 coord) {
  float ref = lum * 255.0 + ditherMatrix(mod(coord.x, 8.0), mod(coord.y, 8.0));
  return findClosestGray(ref) / 255.0;
}

float heroVignette(vec2 screenCoord) {
  vec2 uv = screenCoord / uResolution;
  vec2 delta = (uv - vec2(0.5, 0.4)) / vec2(0.4, 0.35);
  float shade = clamp(length(delta), 0.0, 1.0);
  return 1.0 - shade * 0.55 * smoothstep(0.2, 1.0, shade);
}

vec2 sampleTrailDisplacement(vec2 screenCoord) {
  vec2 snapped = snapToDitherGrid(screenCoord);
  vec2 uv = (snapped / uFieldScale + 0.5) / uFieldSize;
  vec2 encoded = texture(uTrailDispTexture, uv).rg;
  return (encoded - 0.5) * 2.0 * uDispMax;
}

float sampleTrailEnergy(vec2 screenCoord) {
  vec2 snapped = snapToDitherGrid(screenCoord);
  vec2 uv = (snapped / uFieldScale + 0.5) / uFieldSize;
  return texture(uTrailEnergyTexture, uv).r;
}

float trailIntensity(vec2 screenCoord) {
  vec2 disp = sampleTrailDisplacement(screenCoord);
  vec2 offset = vec2(disp.x, -disp.y) * uDispStrength;
  float grain = max(uDitherCellSize, 1.0);
  vec2 blockyOffset = floor(offset / grain + 0.5) * grain;
  float useBlocks = step(0.001, length(offset));
  float mag = length(mix(offset, blockyOffset, useBlocks));
  return clamp(mag / (uDispMax * uDispStrength * 0.55), 0.0, 1.0);
}

vec3 rgbToHsl(vec3 c) {
  float cMax = max(c.r, max(c.g, c.b));
  float cMin = min(c.r, min(c.g, c.b));
  float delta = cMax - cMin;
  float h = 0.0;
  float s = 0.0;
  float l = (cMax + cMin) * 0.5;

  if (delta > 0.00001) {
    s = l > 0.5 ? delta / (2.0 - cMax - cMin) : delta / (cMax + cMin);
    if (cMax == c.r) {
      h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
    } else if (cMax == c.g) {
      h = (c.b - c.r) / delta + 2.0;
    } else {
      h = (c.r - c.g) / delta + 4.0;
    }
    h /= 6.0;
  }

  return vec3(h, s, l);
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  if (hsl.y <= 0.00001) return vec3(hsl.z);
  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;
  return vec3(
    hueToRgb(p, q, hsl.x + 1.0 / 3.0),
    hueToRgb(p, q, hsl.x),
    hueToRgb(p, q, hsl.x - 1.0 / 3.0)
  );
}

vec3 blendColor(vec3 backdrop, vec3 source) {
  vec3 hslBase = rgbToHsl(backdrop);
  vec3 hslSrc = rgbToHsl(source);
  return hslToRgb(vec3(hslSrc.x, hslSrc.y, hslBase.z));
}

void main() {
  vec2 screenCoord = toScreenCoord(gl_FragCoord.xy);
  float lum = plasmaLuminance(gl_FragCoord.xy);
  float gray = ditherGray(lum, gl_FragCoord.xy * uDitherScale);
  vec3 bg = vec3(gray);

  if (uHasText > 0.5) {
    bg *= heroVignette(screenCoord);
  }

  if (uTrailReveal > 0.001) {
    float trailAlpha = trailIntensity(screenCoord) * sampleTrailEnergy(screenCoord);
    if (trailAlpha > 0.001) {
      vec3 tinted = blendColor(bg, uTrailColor);
      bg = mix(bg, tinted, trailAlpha);
    }
  }

  if (uHasText > 0.5) {
    vec2 warpedScreen = warpScreenCoord(screenCoord);
    vec2 textUv = warpedScreen / uResolution;
    vec4 textSample = texture(uTextTexture, textUv);
    float textMask = textSample.a;
    bg = mix(bg, vec3(1.0), textMask);
  }

  fragColor = vec4(bg, 1.0);
}
`;

// Fluid Simulation Class (Exact Codapress solver)
interface FluidConfig {
  fieldScale: number;
  mouseRadius: number;
  radialStrength: number;
  flowStrength: number;
  returnStiffness: number;
  velocityDamping: number;
  diffusion: number;
  squareFalloff?: boolean;
}

class FluidDisplacement {
  config: FluidConfig;
  dCols = 0;
  dRows = 0;
  dispX = new Float32Array(0);
  dispY = new Float32Array(0);
  velX = new Float32Array(0);
  velY = new Float32Array(0);
  nextDispX = new Float32Array(0);
  nextDispY = new Float32Array(0);
  nextVelX = new Float32Array(0);
  nextVelY = new Float32Array(0);

  constructor(config: FluidConfig) {
    this.config = config;
  }

  resize(width: number, height: number) {
    const { fieldScale } = this.config;
    this.dCols = Math.max(1, Math.ceil(width / fieldScale));
    this.dRows = Math.max(1, Math.ceil(height / fieldScale));
    const total = this.dCols * this.dRows;

    this.dispX = new Float32Array(total);
    this.dispY = new Float32Array(total);
    this.velX = new Float32Array(total);
    this.velY = new Float32Array(total);
    this.nextDispX = new Float32Array(total);
    this.nextDispY = new Float32Array(total);
    this.nextVelX = new Float32Array(total);
    this.nextVelY = new Float32Array(total);
  }

  update(
    mouseX: number,
    mouseY: number,
    velX: number,
    velY: number,
    active: boolean,
    radius: number = this.config.mouseRadius
  ): boolean {
    const { dCols, dRows } = this;
    const {
      radialStrength,
      flowStrength,
      returnStiffness,
      velocityDamping,
      diffusion,
      fieldScale,
      squareFalloff,
    } = this.config;

    const r2 = radius * radius;
    let hasMotion = active;

    for (let row = 0; row < dRows; row++) {
      for (let col = 0; col < dCols; col++) {
        const idx = row * dCols + col;
        const cellX = (col + 0.5) * fieldScale;
        const cellY = (row + 0.5) * fieldScale;

        let vX = this.velX[idx];
        let vY = this.velY[idx];
        const dX = this.dispX[idx];
        const dY = this.dispY[idx];

        if (active) {
          const dx = cellX - mouseX;
          const dy = cellY - mouseY;
          let proximity = 0;

          if (squareFalloff) {
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            if (absX < radius && absY < radius) {
              proximity = 1 - Math.max(absX, absY) / radius;
            }
          } else {
            const distSq = dx * dx + dy * dy;
            if (distSq < r2) {
              proximity = 1 - Math.sqrt(distSq) / radius;
            }
          }

          if (proximity > 0) {
            const smooth = proximity * proximity * (3 - 2 * proximity);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const invDist = dist > 0.01 ? 1 / dist : 0;
            vX += dx * invDist * smooth * radialStrength;
            vY += dy * invDist * smooth * radialStrength;
            vX += velX * smooth * flowStrength;
            vY += velY * smooth * flowStrength;
          }
        }

        vX -= dX * returnStiffness;
        vY -= dY * returnStiffness;
        vX *= velocityDamping;
        vY *= velocityDamping;

        let sumDispX = dX;
        let sumDispY = dY;
        let neighbors = 1;

        if (col > 0) {
          sumDispX += this.dispX[idx - 1];
          sumDispY += this.dispY[idx - 1];
          neighbors++;
        }
        if (col < dCols - 1) {
          sumDispX += this.dispX[idx + 1];
          sumDispY += this.dispY[idx + 1];
          neighbors++;
        }
        if (row > 0) {
          sumDispX += this.dispX[idx - dCols];
          sumDispY += this.dispY[idx - dCols];
          neighbors++;
        }
        if (row < dRows - 1) {
          sumDispX += this.dispX[idx + dCols];
          sumDispY += this.dispY[idx + dCols];
          neighbors++;
        }

        const avgDispX = sumDispX / neighbors;
        const avgDispY = sumDispY / neighbors;

        this.nextVelX[idx] = vX;
        this.nextVelY[idx] = vY;
        this.nextDispX[idx] = dX + vX + (avgDispX - dX) * diffusion;
        this.nextDispY[idx] = dY + vY + (avgDispY - dY) * diffusion;

        if (
          !hasMotion &&
          (Math.abs(this.nextDispX[idx]) > 0.04 ||
            Math.abs(this.nextDispY[idx]) > 0.04 ||
            Math.abs(vX) > 0.04 ||
            Math.abs(vY) > 0.04)
        ) {
          hasMotion = true;
        }
      }
    }

    [this.dispX, this.nextDispX] = [this.nextDispX, this.dispX];
    [this.dispY, this.nextDispY] = [this.nextDispY, this.dispY];
    [this.velX, this.nextVelX] = [this.nextVelX, this.velX];
    [this.velY, this.nextVelY] = [this.nextVelY, this.velY];

    return hasMotion;
  }
}

// Codapress Configuration defaults
const DEFAULT_CONFIG = {
  plasma: {
    timeSpeed: 1.0,
    seedZ: -0.4,
    modThreshold: 0.8,
    modWarp: 1.5,
    modZSpeed: 1.0,
    modFreq: 2.0,
    iterations: 21,
    rotateSpeed: -0.1,
    mixScale1: 1.8,
    mixScale2: 0.5,
    falloffY: 5.0,
    falloffX: 7.0,
    contrast: 0.71,
    gamma: 1.49,
  },
  dither: {
    scale: 0.19,
  },
  mouse: {
    fieldScale: 6,
    mouseRadius: 3,
    radialStrength: 3.6,
    flowStrength: 4.2,
    returnStiffness: 0.012,
    velocityDamping: 0.88,
    diffusion: 0.32,
    squareFalloff: true,
    dispStrength: 2.8,
    dispEncodeMax: 64,
    radiusScale: 0.18,
    radiusMin: 50,
  },
};

function getTrailConfig(mouse: typeof DEFAULT_CONFIG.mouse): FluidConfig {
  return {
    ...mouse,
    returnStiffness: mouse.returnStiffness * 0.45,
    velocityDamping: Math.min(0.97, mouse.velocityDamping + 0.08),
    diffusion: Math.min(0.42, mouse.diffusion + 0.06),
  };
}

// Resolution and DPR scale factors from Codapress
function getResolutionScale() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return window.innerWidth <= 768 ? 0.55 * dpr : dpr > 1.5 ? 0.7 * dpr : 0.85 * dpr;
}

function getNativeDprFactor() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return dpr > 1.5 ? 0.7 * dpr : 0.85 * dpr;
}

function getAdjustedDitherScale(nativeScale: number, baseScale: number) {
  const n = getNativeDprFactor();
  return baseScale * (n / nativeScale);
}

// Spring coordinate structure
interface SpringCoord {
  pos: number;
  vel: number;
  target: number;
}

function createSpring(init = 0): SpringCoord {
  return { pos: init, vel: 0, target: init };
}

function updateSpring(coord: SpringCoord, stiffness: number, damping: number) {
  const diff = (coord.target - coord.pos) * stiffness;
  coord.vel = (coord.vel + diff) * damping;
  coord.pos += coord.vel;
}

// Binary search font size to fit text into contentWidth
function binarySearchFontSize(
  text: string,
  maxWidth: number,
  weight: number,
  fontFamily: string,
  ctx: CanvasRenderingContext2D
): number {
  let low = 16;
  let high = 900;
  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    ctx.font = `${weight} ${mid}px ${fontFamily}`;
    if (ctx.measureText(text).width > maxWidth) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return low;
}

export const DitherPlasmaHero: React.FC<DitherPlasmaHeroProps> = ({ setCursorState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);

  // Parallax ScrollTrigger (matching Codapress scale-on-scroll)
  useGSAP(
    () => {
      gsap.to(canvasRef.current, {
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: heroRef }
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      desynchronized: true,
    });
    if (!gl) {
      console.warn("WebGL2 not supported");
      return;
    }

    // Compile Shaders
    function createShader(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    // Geometry Quad buffer
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPosition = gl.getAttribLocation(program, "a_position");

    // Uniform Locations
    const u = {
      uResolution: gl.getUniformLocation(program, "uResolution"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uDispTexture: gl.getUniformLocation(program, "uDispTexture"),
      uTrailDispTexture: gl.getUniformLocation(program, "uTrailDispTexture"),
      uTrailEnergyTexture: gl.getUniformLocation(program, "uTrailEnergyTexture"),
      uTextTexture: gl.getUniformLocation(program, "uTextTexture"),
      uFieldSize: gl.getUniformLocation(program, "uFieldSize"),
      uFieldScale: gl.getUniformLocation(program, "uFieldScale"),
      uDispStrength: gl.getUniformLocation(program, "uDispStrength"),
      uDispMax: gl.getUniformLocation(program, "uDispMax"),
      uDitherCellSize: gl.getUniformLocation(program, "uDitherCellSize"),
      uDitherScale: gl.getUniformLocation(program, "uDitherScale"),
      uHasText: gl.getUniformLocation(program, "uHasText"),
      uTrailReveal: gl.getUniformLocation(program, "uTrailReveal"),
      uTrailColor: gl.getUniformLocation(program, "uTrailColor"),
      uTimeSpeed: gl.getUniformLocation(program, "uTimeSpeed"),
      uSeedZ: gl.getUniformLocation(program, "uSeedZ"),
      uModThreshold: gl.getUniformLocation(program, "uModThreshold"),
      uModWarp: gl.getUniformLocation(program, "uModWarp"),
      uModZSpeed: gl.getUniformLocation(program, "uModZSpeed"),
      uModFreq: gl.getUniformLocation(program, "uModFreq"),
      uIterations: gl.getUniformLocation(program, "uIterations"),
      uRotateSpeed: gl.getUniformLocation(program, "uRotateSpeed"),
      uMixScale1: gl.getUniformLocation(program, "uMixScale1"),
      uMixScale2: gl.getUniformLocation(program, "uMixScale2"),
      uFalloffY: gl.getUniformLocation(program, "uFalloffY"),
      uFalloffX: gl.getUniformLocation(program, "uFalloffX"),
      uContrast: gl.getUniformLocation(program, "uContrast"),
      uGamma: gl.getUniformLocation(program, "uGamma"),
    };

    // Textures creation
    function createTextureNearest() {
      const tex = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.bindTexture(gl!.TEXTURE_2D, null);
      return tex;
    }

    function createTextureLinear() {
      const tex = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.bindTexture(gl!.TEXTURE_2D, null);
      return tex;
    }

    const dispTexture = createTextureNearest();
    const trailDispTexture = createTextureNearest();
    const trailEnergyTexture = createTextureNearest();
    const textTexture = createTextureLinear();

    // Simulation Solvers
    const mainFluid = new FluidDisplacement(DEFAULT_CONFIG.mouse);
    const trailFluid = new FluidDisplacement(getTrailConfig(DEFAULT_CONFIG.mouse));

    // Simulation Byte / Float Arrays
    let packedDisp = new Uint8Array(0);
    let packedTrailDisp = new Uint8Array(0);
    let packedEnergy = new Uint8Array(0);
    let energyBuffer = new Float32Array(0);

    let trailRevealMax = 0;
    const TRAIL_COLOR = [247 / 255, 105 / 255, 20 / 255]; // #F76914 vibrant orange

    // Interaction Coordinates
    const springX = createSpring();
    const springY = createSpring();
    let isPointerInside = false;
    let isPointerDown = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let smoothedVelX = 0;
    let smoothedVelY = 0;

    // Viewport & Scale variables
    let canvasW = 0;
    let canvasH = 0;
    let currentDitherScale = DEFAULT_CONFIG.dither.scale;
    let currentCellSize = 4.5 / currentDitherScale;
    let scaleRatio = 1;

    let hasTextReady = false;
    let startTime = performance.now();
    let animFrameId = 0;
    let isPageVisible = !document.hidden;

    // Pack Float displacement to RG8 byte buffer (128 = neutral 0 displacement)
    const packDisplacement = (
      fluid: FluidDisplacement,
      maxDisp: number,
      targetArray: Uint8Array
    ) => {
      const count = fluid.dCols * fluid.dRows;
      for (let i = 0; i < count; i++) {
        targetArray[i * 2] = Math.round((fluid.dispX[i] / maxDisp * 0.5 + 0.5) * 255);
        targetArray[i * 2 + 1] = Math.round((fluid.dispY[i] / maxDisp * 0.5 + 0.5) * 255);
      }
    };

    // Pack Energy float array to R8 byte buffer
    const packEnergy = (source: Float32Array, targetArray: Uint8Array) => {
      const count = source.length;
      for (let i = 0; i < count; i++) {
        const val = source[i];
        targetArray[i] = val <= 0 ? 0 : val >= 1 ? 255 : Math.round(val * 255);
      }
    };

    // 4x Supersampled Text Texture Generation (Exact Codapress Algorithm)
    function rasterizeTextTexture(w: number, h: number, dprScale: number) {
      if (!canvas || !gl || w <= 0 || h <= 0) return;

      const lines = [
        { text: "ACCELERATING", opacity: 0.8, align: "left" },
        { text: "FOUNDER", opacity: 0.5, align: "left" },
        { text: "INTELLIGENCE", opacity: 0.5, align: "right" },
      ];

      // Exact layout sizing
      const fontFamily = "\"Brockmann\", -apple-system, sans-serif";
      const fontWeight = 400;
      const fontSizeScale = 0.5;
      const lineHeightFactor = 0.82;

      // Measure content width based on canvas client width (no artificial caps!)
      const gutter = Math.max(24, Math.min(canvas.clientWidth * 0.05, 60));
      const contentWidth = Math.max(100, canvas.clientWidth - gutter * 2);

      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");
      if (!measureCtx) return;

      // Binary search for exact font size to fit "ACCELERATING"
      const baseFontSize = binarySearchFontSize(
        "ACCELERATING",
        contentWidth,
        fontWeight,
        fontFamily,
        measureCtx
      );
      const fontSize = baseFontSize * fontSizeScale;
      const lineHeight = fontSize * lineHeightFactor;
      const totalBlockHeight = lineHeight * lines.length;

      // Vertical centering
      const startY = (canvas.clientHeight - totalBlockHeight) / 2;

      measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const firstLineWidth = measureCtx.measureText("ACCELERATING").width;
      const leftX = (canvas.clientWidth - firstLineWidth) / 2;
      const rightX = leftX + firstLineWidth;

      // 4x Supersampled offscreen canvas (Rt = 4)
      const RT = 4;
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = w * RT;
      offscreenCanvas.height = h * RT;
      const offCtx = offscreenCanvas.getContext("2d");
      if (!offCtx) return;

      const transformScale = dprScale * RT;
      offCtx.setTransform(transformScale, 0, 0, transformScale, 0, 0);
      offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      offCtx.textBaseline = "top";
      offCtx.fillStyle = "#ffffff";

      lines.forEach((line, idx) => {
        offCtx.globalAlpha = line.opacity;
        const y = startY + idx * lineHeight;
        let x = leftX;
        if (line.align === "right") {
          const wordW = offCtx.measureText(line.text).width;
          x = rightX - wordW;
        }
        offCtx.fillText(line.text, x, y);
      });

      // Target texture canvas
      const texCanvas = document.createElement("canvas");
      texCanvas.width = w;
      texCanvas.height = h;
      const texCtx = texCanvas.getContext("2d");
      if (!texCtx) return;

      texCtx.imageSmoothingEnabled = true;
      texCtx.imageSmoothingQuality = "high";
      texCtx.clearRect(0, 0, w, h);
      texCtx.drawImage(offscreenCanvas, 0, 0, offscreenCanvas.width, offscreenCanvas.height, 0, 0, w, h);

      // Force all non-zero alpha pixels to 255 RGB for crisp rasterization
      const imgData = texCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      texCtx.putImageData(imgData, 0, 0);

      // Upload to WebGL TEXTURE1
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas);
      gl.bindTexture(gl.TEXTURE_2D, null);

      hasTextReady = true;
    }

    // Robust Resize Handler with Immediate Texture Allocation
    function handleResize() {
      if (!canvas || !gl) return;
      const clientW = canvas.clientWidth;
      const clientH = canvas.clientHeight;
      if (clientW <= 0 || clientH <= 0) return;

      const resolutionScale = getResolutionScale();
      currentDitherScale = getAdjustedDitherScale(resolutionScale, DEFAULT_CONFIG.dither.scale);
      currentCellSize = 4.5 / currentDitherScale;

      canvasW = Math.max(1, Math.round(clientW * resolutionScale));
      scaleRatio = canvasW / clientW;
      canvasH = Math.max(1, Math.round(clientH * scaleRatio));

      canvas.width = canvasW;
      canvas.height = canvasH;
      gl.viewport(0, 0, canvasW, canvasH);

      mainFluid.resize(canvasW, canvasH);
      trailFluid.resize(canvasW, canvasH);

      const totalCells = mainFluid.dCols * mainFluid.dRows;
      packedDisp = new Uint8Array(totalCells * 2);
      packedTrailDisp = new Uint8Array(totalCells * 2);
      packedEnergy = new Uint8Array(totalCells);
      energyBuffer = new Float32Array(totalCells);
      trailRevealMax = 0;

      // Immediately allocate and initialize neutral displacement (byte 128) textures
      packDisplacement(mainFluid, DEFAULT_CONFIG.mouse.dispEncodeMax, packedDisp);
      packDisplacement(trailFluid, DEFAULT_CONFIG.mouse.dispEncodeMax, packedTrailDisp);
      packEnergy(energyBuffer, packedEnergy);

      gl.bindTexture(gl.TEXTURE_2D, dispTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RG8,
        mainFluid.dCols,
        mainFluid.dRows,
        0,
        gl.RG,
        gl.UNSIGNED_BYTE,
        packedDisp
      );

      gl.bindTexture(gl.TEXTURE_2D, trailDispTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RG8,
        trailFluid.dCols,
        trailFluid.dRows,
        0,
        gl.RG,
        gl.UNSIGNED_BYTE,
        packedTrailDisp
      );

      gl.bindTexture(gl.TEXTURE_2D, trailEnergyTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R8,
        trailFluid.dCols,
        trailFluid.dRows,
        0,
        gl.RED,
        gl.UNSIGNED_BYTE,
        packedEnergy
      );
      gl.bindTexture(gl.TEXTURE_2D, null);

      rasterizeTextTexture(canvasW, canvasH, scaleRatio);
    }

    // Initial resize & Font loading observers
    handleResize();
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);
    if (heroRef.current) resizeObserver.observe(heroRef.current);

    document.fonts.ready.then(() => handleResize());
    if (document.fonts.addEventListener) {
      document.fonts.addEventListener("loadingdone", handleResize);
    }

    // Window-level Pointer Event Handlers (Guaranteed capture anywhere over hero)
    const updatePointerPos = (e: MouseEvent | PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInside) {
        if (isPointerInside) {
          isPointerInside = false;
          isPointerDown = false;
          setCursorState("default");
        }
        return;
      }

      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const curX = (e.clientX - rect.left) * scaleX;
      const curY = (e.clientY - rect.top) * scaleY;

      if (!Number.isFinite(curX) || !Number.isFinite(curY)) return;

      if (isPointerInside) {
        const dx = curX - prevPointerX;
        const dy = curY - prevPointerY;
        smoothedVelX = smoothedVelX * 0.7 + dx * 0.3;
        smoothedVelY = smoothedVelY * 0.7 + dy * 0.3;
      } else {
        smoothedVelX = 0;
        smoothedVelY = 0;
      }

      isPointerInside = true;
      prevPointerX = curX;
      prevPointerY = curY;
      springX.target = curX;
      springY.target = curY;
    };

    const isFinePointerDevice = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !isFinePointerDevice()) return;
      updatePointerPos(e);
    };

    const handleWindowPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !isFinePointerDevice()) return;
      if (e.button === 0) {
        updatePointerPos(e);
        if (isPointerInside) {
          isPointerDown = true;
          setCursorState("drag");
        }
      }
    };

    const handleWindowPointerUp = () => {
      isPointerDown = false;
      setCursorState("default");
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerdown", handleWindowPointerDown, { passive: true });
    window.addEventListener("pointerup", handleWindowPointerUp, { passive: true });
    window.addEventListener("pointercancel", handleWindowPointerUp, { passive: true });
    window.addEventListener("blur", handleWindowPointerUp);

    // Visibility change handler (pauses/resumes smoothly without time jump)
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // WebGL Context Lost & Restored Protections
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animFrameId);
    };
    const handleContextRestored = () => {
      handleResize();
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    // Energy Field Update (Trail persistence with decay 0.972)
    const updateTrailEnergy = (isActive: boolean, radius: number) => {
      const cols = trailFluid.dCols;
      const rows = trailFluid.dRows;
      const fScale = DEFAULT_CONFIG.mouse.fieldScale;
      const isSquare = DEFAULT_CONFIG.mouse.squareFalloff === true;
      const r2 = radius * radius;
      const targetX = springX.target;
      const targetY = springY.target;
      let maxEnergy = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          let energy = energyBuffer[idx] * 0.972; // Codapress decay factor
          if (energy < 0.004) energy = 0;

          if (isActive) {
            const cellX = (c + 0.5) * fScale;
            const cellY = (r + 0.5) * fScale;
            const dx = cellX - targetX;
            const dy = cellY - targetY;
            let proximity = 0;

            if (isSquare) {
              const absX = Math.abs(dx);
              const absY = Math.abs(dy);
              if (absX < radius && absY < radius) {
                proximity = 1 - Math.max(absX, absY) / radius;
              }
            } else {
              const distSq = dx * dx + dy * dy;
              if (distSq < r2) {
                proximity = 1 - Math.sqrt(distSq) / radius;
              }
            }

            if (proximity > 0) {
              const smooth = proximity * proximity * (3 - 2 * proximity);
              if (smooth > energy) {
                energy = smooth;
              }
            }
          }

          energyBuffer[idx] = energy;
          if (energy > maxEnergy) maxEnergy = energy;
        }
      }

      trailRevealMax = maxEnergy;
    };

    // Render Animation Loop
    const render = () => {
      if (!gl || !canvas || canvasW <= 0 || canvasH <= 0 || !isPageVisible) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      // Spring coordinate physics
      updateSpring(springX, 0.035, 0.9);
      updateSpring(springY, 0.035, 0.9);

      if (!isPointerInside) {
        smoothedVelX *= 0.88;
        smoothedVelY *= 0.88;
      }

      const radius = Math.max(
        DEFAULT_CONFIG.mouse.radiusMin,
        Math.min(canvasW, canvasH) * DEFAULT_CONFIG.mouse.radiusScale
      );

      const mouseSpeed = Math.hypot(smoothedVelX, smoothedVelY);
      const isFastMove = mouseSpeed > 1.6;
      const isTrailActive = isPointerDown || (isPointerInside && isFastMove) || trailRevealMax > 0.001;

      // Always update Main Fluid Simulation for continuous smooth physics
      mainFluid.update(
        springX.target,
        springY.target,
        smoothedVelX,
        smoothedVelY,
        isPointerInside,
        radius
      );
      packDisplacement(mainFluid, DEFAULT_CONFIG.mouse.dispEncodeMax, packedDisp);

      gl.bindTexture(gl.TEXTURE_2D, dispTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        mainFluid.dCols,
        mainFluid.dRows,
        gl.RG,
        gl.UNSIGNED_BYTE,
        packedDisp
      );
      gl.bindTexture(gl.TEXTURE_2D, null);

      // Update Trail Simulation
      if (isTrailActive) {
        updateTrailEnergy(isPointerDown || isFastMove, radius);
        trailFluid.update(
          springX.target,
          springY.target,
          smoothedVelX,
          smoothedVelY,
          isPointerDown || isFastMove,
          radius
        );

        packDisplacement(trailFluid, DEFAULT_CONFIG.mouse.dispEncodeMax, packedTrailDisp);
        packEnergy(energyBuffer, packedEnergy);

        gl.bindTexture(gl.TEXTURE_2D, trailDispTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          trailFluid.dCols,
          trailFluid.dRows,
          gl.RG,
          gl.UNSIGNED_BYTE,
          packedTrailDisp
        );

        gl.bindTexture(gl.TEXTURE_2D, trailEnergyTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          trailFluid.dCols,
          trailFluid.dRows,
          gl.RED,
          gl.UNSIGNED_BYTE,
          packedEnergy
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      // WebGL Draw Frame
      gl.viewport(0, 0, canvasW, canvasH);
      gl.useProgram(program);

      gl.enableVertexAttribArray(aPosition);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      const elapsed = (performance.now() - startTime) / 1000.0;
      const plasma = DEFAULT_CONFIG.plasma;
      const mouse = DEFAULT_CONFIG.mouse;

      gl.uniform2f(u.uResolution, canvasW, canvasH);
      gl.uniform1f(u.uTime, elapsed);
      gl.uniform1f(u.uDitherScale, currentDitherScale);
      gl.uniform1f(u.uHasText, hasTextReady ? 1.0 : 0.0);
      gl.uniform2f(u.uFieldSize, mainFluid.dCols, mainFluid.dRows);
      gl.uniform1f(u.uFieldScale, mouse.fieldScale);
      gl.uniform1f(u.uDispStrength, mouse.dispStrength);
      gl.uniform1f(u.uDispMax, mouse.dispEncodeMax);
      gl.uniform1f(u.uDitherCellSize, currentCellSize);
      gl.uniform1f(u.uTrailReveal, trailRevealMax);
      gl.uniform3f(u.uTrailColor, TRAIL_COLOR[0], TRAIL_COLOR[1], TRAIL_COLOR[2]);

      // Plasma uniforms
      gl.uniform1f(u.uTimeSpeed, plasma.timeSpeed);
      gl.uniform1f(u.uSeedZ, plasma.seedZ);
      gl.uniform1f(u.uModThreshold, plasma.modThreshold);
      gl.uniform1f(u.uModWarp, plasma.modWarp);
      gl.uniform1f(u.uModZSpeed, plasma.modZSpeed);
      gl.uniform1f(u.uModFreq, plasma.modFreq);
      gl.uniform1i(u.uIterations, plasma.iterations);
      gl.uniform1f(u.uRotateSpeed, plasma.rotateSpeed);
      gl.uniform1f(u.uMixScale1, plasma.mixScale1);
      gl.uniform1f(u.uMixScale2, plasma.mixScale2);
      gl.uniform1f(u.uFalloffY, plasma.falloffY);
      gl.uniform1f(u.uFalloffX, plasma.falloffX);
      gl.uniform1f(u.uContrast, plasma.contrast);
      gl.uniform1f(u.uGamma, plasma.gamma);

      // Texture units
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dispTexture);
      gl.uniform1i(u.uDispTexture, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.uniform1i(u.uTextTexture, 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, trailDispTexture);
      gl.uniform1i(u.uTrailDispTexture, 2);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, trailEnergyTexture);
      gl.uniform1i(u.uTrailEnergyTexture, 3);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(aPosition);

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (document.fonts.removeEventListener) {
        document.fonts.removeEventListener("loadingdone", handleResize);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerdown", handleWindowPointerDown);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      window.removeEventListener("blur", handleWindowPointerUp);

      gl.deleteProgram(program);
      gl.deleteBuffer(posBuffer);
      gl.deleteTexture(dispTexture);
      gl.deleteTexture(textTexture);
      gl.deleteTexture(trailDispTexture);
      gl.deleteTexture(trailEnergyTexture);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="home-hero"
      data-dither-hero
      aria-labelledby="home-hero-title"
    >
      {/* Background WebGL Dithered Plasma Canvas with Vignette */}
      <section className="dither-hero" aria-hidden="true">
        <canvas
          ref={canvasRef}
          className="dither-hero__canvas"
          data-dither-plasma
          aria-hidden="true"
        />
        <div className="dither-hero__vignette" />
      </section>

      {/* Screen-reader accessible title fallback (Exact Codapress DOM structure) */}
      <div className="container home-hero__title" ref={titleRef}>
        <h1 id="home-hero-title">
          <span className="home-hero__line home-hero__line--1">Accelerating</span>
          <span className="home-hero__line home-hero__line--2">Technical</span>
          <span className="home-hero__line home-hero__line--3">Knowledge</span>
        </h1>
      </div>
    </section>
  );
};
