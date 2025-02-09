export function MyRenderProgram(gl: WebGL2RenderingContext) {
  const vertexSource = `
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
  }`

  const fragmentSource = `
      precision highp float;
      varying vec4 vColor;

      void main() {
        gl_FragColor = vColor.abgr;
      }`

  const vertex = compileShader(gl.VERTEX_SHADER, vertexSource, gl)
  const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource, gl)
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to link a program')

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Failed to link a program')
  }
  let count = 0
  const bytePerVertex = 20
  const itemPerVertex = 5
  let capacity = 20
  let buffer = new ArrayBuffer(capacity)

  let isDirty = true
  let fromArray = new Float32Array(buffer)
  let toArray = new Float32Array(buffer)
  let colorArray = new Uint32Array(buffer)
  const glBuffer = gl.createBuffer()
  if (!glBuffer) throw new Error('failed to create a WebGL buffer')

  const fromAttributeLocation = gl.getAttribLocation(program, 'from')
  const toAttributeLocation = gl.getAttribLocation(program, 'to')
  const colorAttributeLocation = gl.getAttribLocation(program, 'color')
  const modelViewProjectionUniformLocation = gl.getUniformLocation(program, 'modelViewProjection')
  const widthUniformLocation = gl.getUniformLocation(program, 'width')

  const pointInstancedBuffer = gl.createBuffer()
  if (!pointInstancedBuffer) throw new Error('failed to create a WebGL buffer')
  const pointInstancedBufferValues = new Float32Array([-0.5, 0, -0.5, 1, 0.5, 1, -0.5, 0, 0.5, 1, 0.5, 0])
  const pointAttributeLocation = gl.getAttribLocation(program, 'point')

  return {
    add: add,
    draw: draw,
  }

  function add(item: { from: [number, number]; to: [number, number]; color: number }): number {
    if (count * bytePerVertex >= capacity) {
      const oldBuffer = buffer
      capacity *= 2
      buffer = new ArrayBuffer(capacity)
      // Copy old buffer to the new buffer
      new Uint8Array(buffer).set(new Uint8Array(oldBuffer))
      // And re-assign views:
      fromArray = new Float32Array(buffer)
      toArray = new Float32Array(buffer)
      colorArray = new Uint32Array(buffer)
    }

    const index = count * itemPerVertex
    fromArray[index + 0] = item.from[0]
    fromArray[index + 1] = item.from[1]

    toArray[index + 2] = item.to[0]
    toArray[index + 3] = item.to[1]

    colorArray[index + 4] = item.color

    isDirty = true
    return count++
  }

  function draw(uniforms: { modelViewProjection: Iterable<number>; width: number }): void {
    if (count === 0) return
    gl.useProgram(program)
    gl.uniformMatrix4fv(modelViewProjectionUniformLocation, false, uniforms.modelViewProjection)
    gl.uniform1f(widthUniformLocation, uniforms.width)

    gl.bindBuffer(gl.ARRAY_BUFFER, pointInstancedBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, pointInstancedBufferValues, gl.STATIC_DRAW)

    gl.enableVertexAttribArray(pointAttributeLocation)
    gl.vertexAttribPointer(pointAttributeLocation, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
    if (isDirty) {
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW)
      isDirty = false
    }

    gl.enableVertexAttribArray(fromAttributeLocation)
    gl.vertexAttribPointer(fromAttributeLocation, 2, gl.FLOAT, false, 20, 0)

    gl.enableVertexAttribArray(toAttributeLocation)
    gl.vertexAttribPointer(toAttributeLocation, 2, gl.FLOAT, false, 20, 8)

    if (colorAttributeLocation > -1) {
      gl.enableVertexAttribArray(colorAttributeLocation)
      gl.vertexAttribPointer(colorAttributeLocation, 4, gl.UNSIGNED_BYTE, true, 20, 16)
    }
    if (pointAttributeLocation > -1) gl.vertexAttribDivisor(pointAttributeLocation, 0)
    if (fromAttributeLocation > -1) gl.vertexAttribDivisor(fromAttributeLocation, 1)
    if (toAttributeLocation > -1) gl.vertexAttribDivisor(toAttributeLocation, 1)
    if (colorAttributeLocation > -1) gl.vertexAttribDivisor(colorAttributeLocation, 1)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count)
    if (pointAttributeLocation > -1) gl.vertexAttribDivisor(pointAttributeLocation, 0)
    if (fromAttributeLocation > -1) gl.vertexAttribDivisor(fromAttributeLocation, 0)
    if (toAttributeLocation > -1) gl.vertexAttribDivisor(toAttributeLocation, 0)
    if (colorAttributeLocation > -1) gl.vertexAttribDivisor(colorAttributeLocation, 0)
  }

  function compileShader(type: GLenum, shaderSource: string, gl: WebGLRenderingContext): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('Failed to create a shared ' + shaderSource)
    }
    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader))
      throw new Error(gl.getShaderInfoLog(shader) || 'Failed to compile shader ' + shaderSource)
    }

    return shader
  }
}
