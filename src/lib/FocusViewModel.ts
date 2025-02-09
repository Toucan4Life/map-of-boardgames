import { ref, type Ref } from 'vue'
import type { Graph, Link, Node, NodeId } from 'ngraph.graph'
import { GraphDownloader, type BoardgameData } from './downloadGroupGraph'
export interface Repo {
  name: NodeId
  lngLat: Ref<string>
  // isExternal: boolean
  id: number
  linkWeight: number
}
export interface IFocusViewModel {
  id: string
  name: string
  repos: Ref<Repo[]>
  lngLat: Ref<string>
  loading: Ref<boolean>
}
/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export default class FocusViewModel implements IFocusViewModel {
  name: string
  repos: Ref<Repo[]>
  lngLat: Ref<string>
  loading: Ref<boolean>
  id: string
  constructor(repositoryName: string, groupId: string | number) {
    this.name = repositoryName
    this.repos = ref([])
    this.lngLat = ref('')
    this.id = ''
    this.loading = ref(true)
    new GraphDownloader().downloadGroupGraph(+groupId).then((graph: Graph<BoardgameData, { weight: number }>): void => {
      this.loading.value = false
      const neighgbors: Repo[] = []
      const focusedNode = graph.getNode(repositoryName)
      if (!focusedNode) {
        console.warn('Focused node not found')
        return
      }
      const id = focusedNode.id
      this.id = id.toString()
      this.lngLat.value = focusedNode.data.l
      graph.forEachLinkedNode(
        repositoryName,
        (node: Node<BoardgameData>, link: Link<{ weight: number }>) => {
          neighgbors.push({
            name: node.id,
            lngLat: ref(node.data.l),
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

      this.repos.value = neighgbors
    })
  }
}
