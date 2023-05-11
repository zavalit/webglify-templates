import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import webgl from "./webgl";
import { Pane } from 'tweakpane'
import { loadSampleTextures } from "./textures";


export const PARAMS = {
  progress: 0
};

// obtain canvas context
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2")!;


(async () => {
  
  const textures = await loadSampleTextures(gl);

  const { step } = webgl(
    {
      gl,
      vertexShader,
      fragmentShader,
      width: 512,
      height: 512,
      textures
    },
    PARAMS
  );

  const animateSteps = async (time) => {
    requestAnimationFrame(animateSteps);
    step(time / 3000);
  };

  animateSteps(0);

})()

const pane = new Pane()
pane.addInput(PARAMS, 'progress', {min: 0, max: 1, step: .01});
  