#version 300 es

layout(location = 0) in vec3 aPosition;

void main() {
  vec3 pos = mix(vec3(-1.), vec3(1.), aPosition);

  gl_Position = vec4(pos, 1.0);
}
