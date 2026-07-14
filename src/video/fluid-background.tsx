import { useEffect, useRef } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

// WebGL fbm-noise fluid (ChatGPT voice mode style). Time is driven by the
// Remotion frame — not requestAnimationFrame — so rendering stays
// deterministic, and preserveDrawingBuffer lets the web renderer screenshot
// the last drawn frame.

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform vec3 u_bg;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.25;

  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.7 + 1.3),
    cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1)
  );

  vec2 p = vec2(uv.x * 1.8, uv.y * 1.0) + drift * 0.7;

  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  float f = fbm(p + 1.2 * q);

  // Barely-there surface swell — enough to feel alive, never choppy.
  float wave = sin(uv.x * 3.0 + u_time * 0.5) * 0.025
             + sin(uv.x * 5.0 - u_time * 0.8) * 0.015;

  // Falloff sets the fluid level: lower multiplier = taller pool.
  float g = clamp(1.0 - (uv.y + wave) * 1.4, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, uv.y);
  // Fade the noise out above the surface so color never floats near the top.
  float topFade = smoothstep(0.95, 0.45, uv.y);
  float shade = clamp(g + (f - 0.5) * 0.7 * anchor * topFade, 0.0, 1.0);

  vec3 light = mix(u_bg, u_color, 0.45);

  // Wide, overlapping ramps blend the bands into one creamy gradient.
  vec3 col = u_bg;
  col = mix(col, light, smoothstep(0.2, 0.55, shade));
  col = mix(col, u_color, smoothstep(0.5, 0.9, shade));

  // Soft sheen along the crest, like light catching the surface.
  float crest = smoothstep(0.3, 0.45, shade) * smoothstep(0.62, 0.45, shade);
  col = mix(col, mix(u_color, vec3(1.0), 0.5), crest * 0.25);

  gl_FragColor = vec4(col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return [1, 1, 1]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

type GlState = {
  gl: WebGLRenderingContext
  uTime: WebGLUniformLocation | null
  uColor: WebGLUniformLocation | null
  uBg: WebGLUniformLocation | null
}

export function FluidBackground({
  primaryColor,
  shaderColor,
}: {
  primaryColor: string
  shaderColor: string
}) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<GlState | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      antialias: true,
      // Required so the export screenshot sees the last drawn frame.
      preserveDrawingBuffer: true,
    })
    if (!gl) return

    const program = gl.createProgram()
    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!program || !vert || !frag) return

    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height)

    glRef.current = {
      gl,
      uTime: gl.getUniformLocation(program, 'u_time'),
      uColor: gl.getUniformLocation(program, 'u_color'),
      uBg: gl.getUniformLocation(program, 'u_bg'),
    }

    return () => {
      glRef.current = null
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buffer)
    }
  }, [width, height])

  useEffect(() => {
    const state = glRef.current
    if (!state) return
    const { gl, uTime, uColor, uBg } = state
    gl.uniform1f(uTime, frame / fps)
    gl.uniform3f(uColor, ...hexToRgb(shaderColor))
    gl.uniform3f(uBg, ...hexToRgb(primaryColor))
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }, [frame, fps, primaryColor, shaderColor])

  return (
    <AbsoluteFill style={{ backgroundColor: primaryColor }}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </AbsoluteFill>
  )
}
