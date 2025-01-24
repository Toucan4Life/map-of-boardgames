import { mat4 } from "gl-matrix";
import { CustomLayerInterface, CustomRenderMethod, Map } from "maplibre-gl";
import { MyRenderProgram } from "./RenderProgram";
export class getCustomLayer implements CustomLayerInterface {

  id: string;
  type: "custom";
  renderingMode?: "2d" | "3d" | undefined;
  prerender?: CustomRenderMethod | undefined;
  onRemove?(_map: Map, _gl: WebGLRenderingContext): void;
  map: Map | undefined;
  program: { draw: any; add: any; } | undefined;
  gl: WebGLRenderingContext | undefined;
  count: number;
  constructor() {
    this.id = 'null-island';
    this.type = 'custom';
    this.renderingMode = '2d';
    this.count = 0;
  }
  onAdd(map: Map, gl: WebGLRenderingContext): void {
    this.gl = gl;
    this.map = map;
    this.program = MyRenderProgram(gl);
  }

  render(gl: WebGLRenderingContext, matrix: mat4) {
    if (this.count === 0) return;
    this.gl = gl;
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
    this.count = 0;
  }

  addLine(lineDef: { from: number[]; to: number[]; color: number; }) {
    if (!this.program) return
    this.count++
    this.program.add(lineDef);
  }
}

