declare module 'ngraph.fromdot' {
  /**
   * A single link (edge) of the graph
   */
  export default function load(dotGraph: string, appendTo?: Graph<NodeData, LinkData>): Graph<NodeData, LinkData>
}
