import { ref, type Ref } from 'vue'
import downloadGroupGraph from './downloadGroupGraph'
import type { Graph, Link, Node, NodeId } from 'ngraph.graph'
interface Repo {
  name: NodeId
  lngLat: Ref<string>
  isExternal: boolean
  id: string
  linkWeight: number
}
interface IFocusViewModel {
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
    downloadGroupGraph(groupId).then((graph: Graph): void => {
      this.loading.value = false
      const neighgbors: Repo[] = []
      const id = graph.getNode(repositoryName)?.id
      if (id) this.id = id.toString()
      this.lngLat.value = graph.getNode(repositoryName)?.data.l
      graph.forEachLinkedNode(
        repositoryName,
        (node: Node, link: Link) => {
          neighgbors.push({
            name: node.id,
            lngLat: node.data.l,
            isExternal: !!link.data?.e,
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
