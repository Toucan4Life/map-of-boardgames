import type { Graph, Link, Node, NodeId } from 'ngraph.graph'
import { GraphDownloader, type BoardgameData } from './downloadGroupGraph'
export interface Repositories {
  name: NodeId
  lngLat: [number, number]
  // isExternal: boolean
  id: number
  linkWeight: number
}
export interface IFocusViewModel {
  name: string
  repos: Repositories[]
  lngLat: [number, number]
  loading: boolean
  id: number | undefined
}
/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export class FocusViewModel implements IFocusViewModel {
  name: string
  repos: Repositories[]
  lngLat: [number, number]
  loading: boolean
  id: number | undefined
  constructor(repositoryName: string) {
    this.name = repositoryName
    this.repos = []
    this.lngLat = [0, 0]
    this.id = undefined
    this.loading = true
  }

  async create(groupId: number): Promise<this | undefined> {
    const graph: Graph<BoardgameData, { weight: number }> = await new GraphDownloader().downloadGroupGraph(groupId)

    const neighgbors: Repositories[] = []
    const focusedNode = graph.getNode(this.name)
    if (!focusedNode) {
      console.warn('Focused node not found')
      return undefined
    }
    this.id = focusedNode.data.id
    this.lngLat = focusedNode.data.lnglat
    graph.forEachLinkedNode(
      this.name,
      (node: Node<BoardgameData>, link: Link<{ weight: number }>) => {
        neighgbors.push({
          name: node.id,
          lngLat: node.data.lnglat,
          // isExternal: !!link.data?.e,
          id: node.data.id,
          linkWeight: link.data.weight,
        })
      },
      false,
    )

    neighgbors.sort((a, b) => {
      return b.linkWeight - a.linkWeight
    })

    this.repos = neighgbors
    this.loading = false

    return this
  }
}
