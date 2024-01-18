import { ChainPlugin, PluginCallProps } from "../chain";

export class CanvasUniformsPlugin implements ChainPlugin {

  private canvas: HTMLCanvasElement

  MOUSE_COORDS = {
    x: 0,
    y: 0,
    z: 0,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas as HTMLCanvasElement
    window.addEventListener("mousemove", (e) => this.listenToMouseMove(e), false)
  }

  private listenToMouseMove = ( ev: MouseEvent)=> {
    const {top, bottom, left} =  (this.canvas as HTMLCanvasElement).getBoundingClientRect()
    const height = bottom - top;
    const fromTop = ev.clientY - top;
    this.MOUSE_COORDS.x = (left - ev.clientX) * devicePixelRatio
    this.MOUSE_COORDS.y = (fromTop - height) * devicePixelRatio  
  }
  
  
  beforeDrawCall({gl, time, uniformLocations}: PluginCallProps) {

    const {canvas, MOUSE_COORDS} = this
    gl.uniform2fv(uniformLocations.uResolution, [gl.drawingBufferWidth, gl.drawingBufferHeight]);
    gl.uniform1f(uniformLocations.uTime, time);        
    gl.uniform3fv(uniformLocations.uMouse, [MOUSE_COORDS.x, MOUSE_COORDS.y, MOUSE_COORDS.z]);
    gl.uniform2fv(uniformLocations.uResolutionInPx, [canvas.clientWidth, canvas.clientHeight]);    
    
  }

  
}