
// Type Definitions
type W2 = WebGL2RenderingContext


export type DrawData = {[key:string]: number[]}
export type UnirformLocationsMap =   {[key: string]: WebGLUniformLocation}

export type UniformSignature = (gl:W2, locs: UnirformLocationsMap) => void
export type FramebufferChainProp = [WebGLFramebuffer | null, null?]

export type BufferMap = {[key: string]: WebGLBuffer}
export type VAOBufferMap = Map<WebGLVertexArrayObject, BufferMap>;

export type DrawCallProps = {buffers?: BufferMap, uniformLocations: UnirformLocationsMap}

export type DrawCallSignature = (gl:W2, props: DrawCallProps) => void

export type CustomChainPassPops = Partial<ChainPassPops>;

export type ChainPassPops = {
  vertexShader: string;
  fragmentShader: string;
  passId?: string,

  devicePixelRatio?: number;
  textures?: WebGLTexture[]
  framebuffer?: FramebufferChainProp
  viewport?: [number, number, number, number]
  vertexArrayObject?: (gl:W2, defaultVAO: WebGLVertexArrayObject, vaoMap?:VAOBufferMap) => WebGLVertexArrayObject
  uniforms?: UniformSignature
  
  drawCall?: DrawCallSignature
};

export type ProgramsMapType = {
  [name: string]: {
    program: WebGLProgram,
    chainDrawCall: (time: number, drawCall?: DrawCallSignature) => void
  }
}



export type PluginCallProps = {
  program: WebGLProgram
  passId: string,
  time: number,
  uniformLocations: UnirformLocationsMap
  gl: W2
}
export interface ChainPlugin {
  onInit?: (props: ProgramsMapType) => void;
  beforeDrawCall?: (props: PluginCallProps) => void;
  afterDrawCall?: (props: PluginCallProps) => void;
}



export type ChainDrawProps = {
 
  renderFrame: (time: number) => void
  programs: ProgramsMapType
  gl: W2
}



// Exported Plugins
export * from './plugins'

export default (
  gl: WebGL2RenderingContext,
  callsProps: ChainPassPops[],
  plugins: ChainPlugin[] = []
): ChainDrawProps => {

  const vaoMap: VAOBufferMap = new Map()
    
  const calls = callsProps
  // init programms
  .map(({ vertexShader, fragmentShader, devicePixelRatio=2, ...props }, index:number) => {
    const passId = props.passId || `${index}`

    
    const program = createProgramm(gl, {vertexShader, fragmentShader})
    
    
    return {...props, passId, program }
  })
  // init state
  .map(({program, passId, ...props}) => {

     
    const [x, y, width, height] = props.viewport || [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]
    
  

    // provide attributes and uniforms
    const vao = props.vertexArrayObject 
    ? props.vertexArrayObject(gl, addDefaultVertexArrayObject(gl), vaoMap) 
    : addDefaultVertexArrayObject (gl)    
   
   
    gl.useProgram(program);
  
  
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    const uniformLocations: UnirformLocationsMap = Array.from({ length: numUniforms }).reduce((acc:UnirformLocationsMap, _, i) => {
        const uniformInfo = gl.getActiveUniform(program, i);
        const location = uniformInfo && gl.getUniformLocation(program, uniformInfo.name);
        if (uniformInfo && location) {
            acc[uniformInfo.name] = location;
        }
        return acc;
    }, {});

    
    
    // Textures
    const textures: any[] = []
    props.textures && props.textures.forEach((texture: (WebGLTexture | {(): WebGLTexture}), i: number) => {
      const name =  `uTexture${i}`
      const textureLocation = gl.getUniformLocation(program, name);
          
      textures.push({
        activate(){
          const tex = typeof texture === 'function' ? texture() : texture
          gl.uniform1i(textureLocation, i);  
          gl.activeTexture(gl.TEXTURE0 + i);  
          gl.bindTexture(gl.TEXTURE_2D, tex);
        },
        deactivate(){
          gl.activeTexture(gl.TEXTURE0 + i);  
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      })
      
    })

    const startFramebuffer = () => {
      const {framebuffer} = props
      if(!framebuffer) return

      if(framebuffer.length > 0 && (framebuffer[0]) instanceof WebGLFramebuffer) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer[0])
      }
    }

    const endFramebuffer = () => {
      const {framebuffer} = props
      if(!framebuffer) return

      if(framebuffer.length == 2 && framebuffer[1] === null) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }
    }


    const beforeDrawCall = () => {

      gl.viewport(x, y, width, height);

      startFramebuffer()
      
      gl.useProgram(program)
      gl.bindVertexArray(vao)
      
      textures.forEach(t => t.activate())      
      
      props.uniforms &&  props.uniforms(gl, uniformLocations)
          
    }

    const afterDrawCall = () => {

      gl.bindVertexArray(null)
      textures.forEach(t => t.deactivate())
      endFramebuffer()
      
    }

    
  
    const chainDrawCall = (time: number, drawCallCb?: (gl: W2, props: DrawCallProps) => void) => {


      beforeDrawCall()

      plugins.forEach(p => p.beforeDrawCall && p.beforeDrawCall({gl, passId, time, program, uniformLocations}))

      const drawProps = {buffers: vaoMap.get(vao), uniformLocations};
      
      props.drawCall 
      ? props.drawCall(gl, drawProps)
      : drawCallCb
        ? drawCallCb(gl, drawProps)
        : drawDefaultCall(gl)

      
      // Call the function to start checking for the query result asynchronously
      plugins.forEach(p => p.afterDrawCall && p.afterDrawCall({gl, passId, time, program, uniformLocations}))
      

      afterDrawCall()

      
      
    };

   
    
    return {
      chainDrawCall,
      program: {passId, program}
    };
  });

  const chainDraw: ChainDrawProps = {
    gl,
    programs: calls.reduce((acc, {chainDrawCall, program: {passId, program}}) => {
        return {...acc, [passId]: {
          chainDrawCall, program
        }}
    }, {}),
    renderFrame: function (time: number){

      calls.forEach((c) => {
        // Perform the draw call 
        c.chainDrawCall(time);         

      })      
    }
  }

  // init plugins
  plugins.forEach(p => p.onInit && p.onInit(chainDraw.programs))

  return chainDraw
}


// Utils functions


function loadImage(url: string, callback: (i:HTMLImageElement) => void) {
  const image = new Image();
  image.src = url;
  image.onload = () => callback(image);
  return image;
}


export function createTexture(gl: W2, image: TexImageSource, parameterCb?: (gl: W2) => void): WebGLTexture {
  
  const texture = gl.createTexture();
  if(texture === null) {
    throw new Error('can not create texture')
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);


  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // overwrite with optional custom parameter
  parameterCb && parameterCb(gl)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  gl.bindTexture(gl.TEXTURE_2D, null)

  return  texture;

}

export const createFramebufferTexture = (gl:W2, resolution : [number, number]) => {
    
    const [width, height] = resolution;  
    
    // Create a framebuffer
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    // Create a texture to render to
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);


    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    
    // Attach the texture to the framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    // Check if the framebuffer is complete
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Framebuffer is not complete');
    }
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null)
    return {
      framebuffer,
      texture
    }
}


export const createProgramm = (gl: W2, {vertexShader, fragmentShader}: {vertexShader: string, fragmentShader: string}): WebGLProgram => {
   // initiaize program and attach shaders
   const prog = gl.createProgram()!;

   const attachShader = (shaderType: number, shaderSource: string) => {
     const shader = gl.createShader(shaderType)!;
     gl.shaderSource(shader, shaderSource);
     gl.compileShader(shader);
     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`${shaderType === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex' } shader: ${gl.getShaderInfoLog(shader)}`);       
     }
     gl.attachShader(prog, shader);
   };
 
   attachShader(gl.VERTEX_SHADER, vertexShader);
   attachShader(gl.FRAGMENT_SHADER, fragmentShader);
   gl.linkProgram(prog);
   if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog)?.toString());
   }
   return prog
}

type WebGLTextureData = {
  texture: WebGLTexture,
  resoultion: [number, number]
}

export const loadTexture = (gl: W2, url: string): Promise<WebGLTextureData> => new Promise((res, _) => loadImage(url, image => res({texture: createTexture(gl, image), resoultion: [image.width, image.height]})));


export const loadSVGTexture = (gl: W2, svgString: string) => {
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);
  return loadTexture(gl, svgDataUrl);
}

export const convertCanvasTexture = (gl: W2, canvas: HTMLCanvasElement,  parameterCb?: (gl: W2) => void) => {
  // TODO
  // check safari and eventauly fix with context.getImageData(0, 0, context.canvas.width, context.canvas.height);

  return createTexture(gl, canvas, parameterCb);
}

const addDefaultVertexArrayObject = (gl: W2): WebGLVertexArrayObject => {

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    // Create the buffer and load the tree vertices
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,
      0, 0,
      1, 1,
      1, 0
    ]), gl.STATIC_DRAW);

    // Set up the vertex attribute pointers
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    return vao;

}

const drawDefaultCall = (gl: W2) => {

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
}
type HTMLCanvasContetxtType = {canvas: HTMLCanvasElement, gl: WebGL2RenderingContext}
export const createHTMLCanvasContext = (size: number | [number, number], options: WebGLContextAttributes = {}, dpr?: number): HTMLCanvasContetxtType => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', options)!

  const [width, height] = (typeof size == 'object') ? [size[0], size[1]]: [size, size]
  
  const _dpr = dpr || Math.min(window.devicePixelRatio, 2.)
  canvas.width = width * _dpr
  canvas.height = height * _dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  return {canvas, gl};

}