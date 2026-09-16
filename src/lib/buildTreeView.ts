import type { Graph, NodeId } from 'ngraph.graph'
import type { BoardGameLinkData, BoardGameNodeData } from './fetchAndProcessGraph'
import type { TreeItem } from './FocusViewModel'

/**
 * Builds a tree view of a node's neighborhood, up to `depth` levels deep. Cycles are avoided by
 * tracking the ancestor path of each branch, and each node keeps only its 25 strongest-linked
 * children.
 */
export function buildTreeView(graph: Graph<BoardGameNodeData, BoardGameLinkData>, startNodeId: number, depth = 2): TreeItem {
  const rootGraphNode = graph.getNode(startNodeId)
  if (!rootGraphNode) {
    // Return a minimal tree structure if the start node isn't found
    return {
      node: {
        id: startNodeId,
        label: startNodeId.toString() + ' (not found)',
        isExternal: false,
        lnglat: [0, 0],
        max_players: '0',
        pos: '',
        c: 0,
        rating: '',
        complexity: '',
        size: '',
      },
      children: [],
    }
  }

  const rootNodeData = rootGraphNode.data

  // Helper function to recursively build the tree for children
  // parentNodeId: The ID of the node whose children are being fetched.
  // parentDepthInTree: The depth of parentNodeId in the tree (startNodeId is at 0).
  // path: Set of ancestor IDs in the current traversal path to avoid cycles.
  function getChildrenRecursive(parentNodeId: NodeId, parentDepthInTree: number, path: Set<NodeId>): TreeItem[] {
    if (parentDepthInTree >= depth) {
      return []
    }

    // Add current node to path
    path.add(parentNodeId)

    const childNodes: TreeItem[] = []

    graph.forEachLinkedNode(
      parentNodeId,
      (linkedGraphNode, linkedGraphLink) => {
        if (path.has(linkedGraphNode.id)) {
          return
        }

        // Create a copy of the node data
        const childData = { ...linkedGraphNode.data }

        // Use the same path Set (current node already added above)
        const grandChildren = getChildrenRecursive(linkedGraphNode.id, parentDepthInTree + 1, path)
        childNodes.push({ node: childData, children: grandChildren, linkWeight: linkedGraphLink.data.weight })
      },
      false,
    )

    // Remove current node from path when backtracking
    path.delete(parentNodeId)

    childNodes.sort((a, b) => (b.linkWeight ?? 0) - (a.linkWeight ?? 0))
    return childNodes.slice(0, 25)
  }
  // Initial path for recursion, containing only the startNodeId.
  const initialPath = new Set<number>()
  initialPath.add(startNodeId)

  // Fetch children for the root node (startNodeId, which is at depth 0).
  const rootChildren = getChildrenRecursive(startNodeId, 0, initialPath)

  return { node: rootNodeData, children: rootChildren }
}
