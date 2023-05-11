import texUrl from 'url:./font.png';
import noiseUrl from 'url:./noise.png';
import {loadTexture, loadSVGTexture, loadCanvasTexture} from '../webgl'


// TEST Textures


const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 200 200">
<rect x="50" y="50" width="100" height="50" fill="yellow" />
<circle cx="100" cy="150" r="25" fill="red" />
</svg>
`;


const canvas2d = document.createElement("canvas");
const ctx = canvas2d.getContext("2d")!;

ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(ctx.canvas.width, ctx.canvas.height);
ctx.strokeStyle = 'red';
ctx.lineWidth = 20;
ctx.lineCap = 'round';
ctx.stroke();

  
export const loadSampleTextures = (gl) => Promise.all<WebGLTexture>([
    loadTexture(gl, texUrl), 
    loadTexture(gl, noiseUrl),
    loadSVGTexture(gl, svgString),
    loadCanvasTexture(gl, canvas2d)
  ]);