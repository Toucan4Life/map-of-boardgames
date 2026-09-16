import { type Layout } from 'ngraph.forcelayout'
import createLayout from 'ngraph.forcelayout'
import type { Graph, NodeId } from 'ngraph.graph'

/**
 * Owns the ngraph.forcelayout physics simulation for the subgraph viewer: starting/stepping/
 * stopping/resuming the animation loop, and pinning the root node. Rendering (turning node
 * positions into map features) is left to the caller via the `onStep`/`onSettled` callbacks,
 * so this class has no knowledge of MapLibre.
 */
export class ForceLayoutEngine<NodeData, LinkData> {
  private layout: Layout<Graph<NodeData, LinkData>> | undefined
  private steps = 400
  private animationFrame: number | undefined
  private disposed = false
  private settledOnce = false

  constructor(
    private graph: Graph<NodeData, LinkData>,
    private callbacks: {
      onStep: () => void
      onSettled: () => void
      onStatusChange: (running: boolean) => void
    },
  ) {}

  isReady(): boolean {
    return !!this.layout
  }

  getBody(nodeId: NodeId) {
    return this.layout?.getBody(nodeId)
  }

  start(rootNodeId: NodeId) {
    if (this.disposed) return

    this.layout = createLayout(this.graph, {
      timeStep: 0.5,
      springLength: 10,
      springCoefficient: 0.8,
      gravity: -12,
      dragCoefficient: 0.9,
    })

    // Pin the root node to improve stability
    const rootNode = this.graph.getNode(rootNodeId)
    if (rootNode) {
      this.layout.pinNode(rootNode, true)
    }

    // Initialize node positions
    this.layout.step()
    this.callbacks.onStep()

    this.animationFrame = requestAnimationFrame(this.run)
  }

  stop() {
    this.steps = 0
  }

  resume() {
    this.steps = 400
    if (!this.disposed && this.layout) {
      this.callbacks.onStatusChange(true)
      if (!this.animationFrame) {
        this.animationFrame = requestAnimationFrame(this.run)
      }
    }
  }

  dispose() {
    this.disposed = true
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = undefined
    }
  }

  // Run layout steps and notify the caller so it can re-render
  private run = () => {
    if (this.disposed || !this.layout) return

    const willStop = this.steps <= 1

    if (this.steps > 0) {
      this.steps--
      this.layout.step()
      this.callbacks.onStep()
    }

    if (willStop) {
      this.callbacks.onStatusChange(false)

      if (!this.settledOnce) {
        this.settledOnce = true
        // need a timeout, because maplibre.isStyleLoaded() is not true immediately after we
        // modify the points.
        setTimeout(() => {
          this.callbacks.onSettled()
        }, 200)
      }
      this.animationFrame = undefined
    } else {
      this.animationFrame = requestAnimationFrame(this.run)
    }
  }
}
