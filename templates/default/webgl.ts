type WebGLFactoryPops = {
  gl: WebGL2RenderingContext;
  vertexShader: string;
  fragmentShader: string;
  width?: number;
  height?: number;
  textures?: WebGLTexture[]
};

const MOUSE_COORDS = {
  x: 0,
  y: 0
}

const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

export default (
  { gl, vertexShader, fragmentShader, ...props }: WebGLFactoryPops,
  PARAMS: { [key: string]: number }
) => {
  const width = props.width || window.innerWidth;
  const height = props.height || window.innerHeight;

  const specifyCanvasSize = () => {
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = width.toString();
    canvas.style.height = height.toString();
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  };

  specifyCanvasSize();


  const listenToMouseMove = (ev: MouseEvent)=> {

    const {top, bottom, left} =  (gl.canvas as HTMLCanvasElement).getBoundingClientRect()
    const height = bottom - top;
    const fromTop = ev.clientY - top;
    MOUSE_COORDS.x = (left - ev.clientX) / width
    MOUSE_COORDS.y = (fromTop - height) / height
  }


  // initiaize program and attach shaders
  const prog = gl.createProgram()!;

  const attachShader = (shaderType: number, shaderSource: string) => {
    const shader = gl.createShader(shaderType)!;
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(shaderType, gl.getShaderInfoLog(shader));
      return;
    }
    gl.attachShader(prog, shader);
  };

  attachShader(gl.VERTEX_SHADER, vertexShader);
  attachShader(gl.FRAGMENT_SHADER, fragmentShader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
  }

  // provide attributes and uniforms
  const b1 = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, b1);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 1, -1, -1, 1,

      -1, 1, 1, -1, 1, 1,
    ]),
    gl.STATIC_DRAW
  );

  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * 4, 0);
  gl.enableVertexAttribArray(0);

  gl.useProgram(prog);

  const u1 = gl.getUniformLocation(prog, "uResolution");
  gl.uniform2fv(u1, [gl.drawingBufferWidth, gl.drawingBufferHeight]);
  const u2 = gl.getUniformLocation(prog, "uTime");
  gl.uniform1f(u2, 0);
  const u3 = gl.getUniformLocation(prog, "uMouse");
  gl.uniform2fv(u3, [MOUSE_COORDS.x, MOUSE_COORDS.y]);

  // GUI Parameters
  const paramsKeys = Object.keys(PARAMS);
  const pLocs: {[k: string]: {loc: WebGLUniformLocation, method: string}} = Object.keys(PARAMS).reduce((acc, key) => {
    
    const loc = gl.getUniformLocation(prog, `u${key.charAt(0).toUpperCase() + key.slice(1)}`)
    if( typeof PARAMS[key] === 'number'){
      const method = 'uniform1f'
      acc[key] = {loc, method}      
    }
    
    return acc
  }, {}) 

  // Textures
  props.textures && props.textures.forEach((texture: WebGLTexture, i: number) => {
    const textureLocation = gl.getUniformLocation(prog, `uTexture${i}`);
    gl.uniform1i(textureLocation, i);
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  })
  


  // draw
  const animate = (time: number) => {
    requestAnimationFrame(animate);
    const sec = time / 1000;
    step(sec);
  };

  const step = (time: number) => {
    gl.uniform1f(u2, time);
    gl.uniform2fv(u3, [MOUSE_COORDS.x, MOUSE_COORDS.y]);

    paramsKeys.forEach(key => {
      gl[pLocs[key].method](pLocs[key].loc, PARAMS[key]);
    })

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  // listeners
  window.addEventListener("resize", specifyCanvasSize, false);
  window.addEventListener("mousemove", listenToMouseMove, false)

  return {
    animate,
    step,
  };
};


function loadImage(url, callback) {
  const image = new Image();
  image.src = url;
  image.onload = () => callback(image);
  return image;
}


function createTexture(gl: WebGL2RenderingContext, image, settings?: (gl:WebGL2RenderingContext, image) => void) {
  
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  settings && settings(gl, image) || (() => {
  
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  })()
  
  gl.bindTexture(gl.TEXTURE_2D, null)

  return  texture;

}




export const loadTexture = (gl, url) => new Promise((res, _) => loadImage(url, image => res(createTexture(gl, image))));

export const loadSVGTexture = (gl, svgString) => {
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);
  return loadTexture(gl, svgDataUrl);
}

export const loadCanvasTexture = (gl, canvas) => {
  return Promise.resolve(createTexture(gl, canvas));
}


