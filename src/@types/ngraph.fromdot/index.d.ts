declare module 'ngraph.fromdot' {
  import type { Graph } from 'ngraph.graph'

  /**
   * A single link (edge) of the graph
   */
  export default function load<NodeData = unknown, LinkData = unknown>(dotGraph: string, appendTo?: Graph<NodeData, LinkData>): Graph<NodeData, LinkData>
}
