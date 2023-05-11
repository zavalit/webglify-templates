#version 300 es

precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uProgress;

uniform sampler2D uTexture0;
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uTexture3;

out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution);
  float time = mod(uTime, 2.);
  time = time > 1. ? 2. - time : time;

  vec3 color;
  color.xy = uv;
  color.xy += uMouse;
  color.z = time;
  
  color += texture(uTexture2, uv * 1.).xyz;
  color -= texture(uTexture1, uv).xyz;
  color *= texture(uTexture0, uv).xyz;
  color += texture(uTexture3, uv * 8.).xyz;

  fragColor = vec4(color, 1.0 - uProgress);
}
