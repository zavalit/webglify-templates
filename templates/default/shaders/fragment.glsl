#version 300 es

precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float time = mod(uTime, 2.);
  time = time > 1. ? 2. - time : time;
  vec2 mouse = uMouse / uResolution;
  uv += mouse;

  fragColor = vec4(uv, time, 1.0);
}
