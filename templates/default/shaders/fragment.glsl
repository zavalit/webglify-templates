#version 300 es

precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uProgress;


out vec4 fragColor;

void main() {
  
  vec2 uv = (gl_FragCoord.xy / uResolution);
  vec3 color;
  float alpha = 1.0 - uProgress;


  fragColor = vec4(color, alpha);
}
