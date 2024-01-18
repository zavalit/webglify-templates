import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import chain, {PerformancePlugin, CanvasUniformsPlugin} from "./chain";
import { Pane } from 'tweakpane'


export const PARAMS = {
  PROGRESS: 0,
  Performance: 0
};

// obtain canvas context
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2")!;

const size = 512;
canvas.style.width = `${size}px`;
canvas.style.height = `${size}px`;


(async () => {

  const perf = new PerformancePlugin(gl)

  const { renderFrame } = chain(gl, [
    {
      vertexShader,
      fragmentShader,
      uniforms(gl, locs) {
        
        gl.uniform1f(locs.uProgress, PARAMS.PROGRESS)
        
      }
    }
  ], 
  [
    perf,
    new CanvasUniformsPlugin(canvas)
  ]);

  const animateSteps = async (time) => {
    requestAnimationFrame(animateSteps);
    renderFrame(time / 3000);
    
    PARAMS.Performance = perf.stats[0].avg
  };

  animateSteps(0);

})()


  

const pane = new Pane()
pane.addBinding(PARAMS, 'PROGRESS', {min: 0, max: 1, step: .01});
pane.addBinding(PARAMS, 'Performance', {
  readonly: true,

  view: 'graph',
  min: 0,
  max: 10,
}); 
  