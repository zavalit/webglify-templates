#version 300 es

precision mediump float;

uniform float uTime;
uniform vec2 uResolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float time = fract(uTime);

  fragColor = vec4(uv, time, 1.0);
}
