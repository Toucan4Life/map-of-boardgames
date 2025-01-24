import { mat4 } from "gl-matrix";
import { CustomLayerInterface, CustomRenderMethod, Map } from "maplibre-gl";
import { ColorAttribute, defineProgram, InstancedAttribute } from "w-gl";
import { RenderProgram } from "w-gl/src/gl/defineProgram";

export class getCustomLayer implements CustomLayerInterface {

  id: string;
  type: "custom";
  renderingMode?: "2d" | "3d" | undefined;
  prerender?: CustomRenderMethod | undefined;  
  onRemove?(_map: Map, _gl: WebGLRenderingContext): void;
  map: Map | undefined;
  program: RenderProgram | undefined;

  constructor() {
    this.id = 'null-island';
    this.type = 'custom';
    this.renderingMode = '2d';
  }
  onAdd(map: Map
    , gl: WebGLRenderingContext): void {
    this.map = map;
    this.program = defineProgram({
      gl,
      vertex: `
    uniform mat4 modelViewProjection;
    uniform float width;
    
    attribute vec2 from, to;
    attribute vec2 point;
    attribute vec4 color;
    varying vec2 vPoint;
    varying vec4 vColor;
    
    void main() {
      vec2 xBasis = normalize(to - from);
      vec2 yBasis = vec2(-xBasis.y, xBasis.x);
      vec4 clip0 = modelViewProjection * vec4(from.xy + width * yBasis * point.x, 0., 1.0);
      vec4 clip1 = modelViewProjection * vec4(to.xy + width * yBasis * point.x, 0., 1.0);
      gl_Position = mix(clip0, clip1, point.y);
      vColor = color;
    }`,

      fragment: `
        precision highp float;
        varying vec4 vColor;
    
        void main() {
          gl_FragColor = vColor.abgr;
        }`,
      attributes: { color: new ColorAttribute() },
      instanced: {
        point: new InstancedAttribute([
          -0.5, 0, -0.5, 1, 0.5, 1, // First 2D triangle of the quad
          -0.5, 0, 0.5, 1, 0.5, 0   // Second 2D triangle of the quad
        ])
      }
    });
  }

  render(gl: WebGLRenderingContext, matrix: mat4) {
    if (!this.map) return
    if (!this.program) return
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const zoom = this.map.getZoom();
    let width = 0.00005 / zoom;
    if (zoom >= 13.5) {
      width = 1e-2 * (13.5 + 1) / Math.exp(13.5);
    } else if (zoom >= 9.99851) {
      // use exponential from here:
      width = 1e-2 * (zoom + 1) / Math.exp(zoom);
    }
    this.program.draw({
      //width: 0.00005 / zoom,
      width,
      modelViewProjection: matrix,
    });
  }

  clear() {
    if (!this.program) return
    this.program.setCount(0);
  }

  addLine(lineDef: { from: number[]; to: number[]; color: number; }) {
    if (!this.program) return
    this.program.add(lineDef);
  }
}
