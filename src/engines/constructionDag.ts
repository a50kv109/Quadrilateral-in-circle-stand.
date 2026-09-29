/**
 * CQNS-001 — Construction DAG (Package 03: CQNS-PKG-03-EUCLIDEAN-TOOLS)
 *
 * Lineage and dependency tracking for classical Euclidean constructions.
 * Records the strict constructive history of geometry:
 * Operation + Inputs (parents) -> Outputs (children) + Parameters.
 *
 * STRICTLY NON-EPISTEMIC & SEPARATED FROM VERIFICATION:
 * - Construction ≠ Verification, Constructed ≠ Verified.
 * - Zero authority to mutate or emit epistemic statuses (VERIFIED, DERIVED, INVALID, VANISHED).
 * - Tracks construction lineage and cascade recomputations only.
 */

import { ConstructionNode } from '../types/geometry';

export interface ConstructionDagNode {
  id: string;                      // Unique operation or entity ID in GeometryState
  operation: string;               // e.g., 'INTERSECT_CIRCLES', 'PERPENDICULAR_BISECTOR', 'CIRCUMCIRCLE'
  inputs: string[];                // IDs of parent geometry objects
  outputs: string[];               // IDs of generated geometry objects
  parameters?: Record<string, any>; // e.g., branchIndex, radius, bisectorType
  timestamp: number;
}

export class ConstructionDAG {
  private nodes: Map<string, ConstructionNode> = new Map();
  private dagNodes: Map<string, ConstructionDagNode> = new Map();
  private childMap: Map<string, Set<string>> = new Map();

  /**
   * Register a legacy/simple construction node (maintains backward compatibility)
   */
  register(
    entityId: string,
    entityType: 'point' | 'circle' | 'segment' | 'quadrilateral',
    parentIds: string[],
    operation: string
  ): void {
    const node: ConstructionNode = {
      entityId,
      entityType,
      parentIds,
      operation,
      timestamp: Date.now(),
    };

    this.nodes.set(entityId, node);

    // Also register in modern DAG node registry
    this.dagNodes.set(entityId, {
      id: entityId,
      operation,
      inputs: parentIds,
      outputs: [entityId],
      timestamp: node.timestamp,
    });

    // Update child references
    for (const parentId of parentIds) {
      if (!this.childMap.has(parentId)) {
        this.childMap.set(parentId, new Set());
      }
      this.childMap.get(parentId)!.add(entityId);
    }
  }

  /**
   * Register a full Package 03 Construction DAG Node with explicit inputs and outputs
   */
  registerOperation(
    opId: string,
    operation: string,
    inputs: string[],
    outputs: string[],
    parameters?: Record<string, any>
  ): ConstructionDagNode {
    const dagNode: ConstructionDagNode = {
      id: opId,
      operation,
      inputs,
      outputs,
      parameters,
      timestamp: Date.now(),
    };

    this.dagNodes.set(opId, dagNode);

    // Register outputs under operation
    for (const outputId of outputs) {
      this.dagNodes.set(outputId, dagNode);
    }

    // Map dependency edges: input -> output
    for (const inputId of inputs) {
      if (!this.childMap.has(inputId)) {
        this.childMap.set(inputId, new Set());
      }
      for (const outputId of outputs) {
        this.childMap.get(inputId)!.add(outputId);
      }
    }

    return dagNode;
  }

  /**
   * Get all downstream dependent entity IDs (topological breadth)
   */
  getDownstreamDependents(entityId: string): string[] {
    const visited = new Set<string>();
    const queue = [entityId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this.childMap.get(current);
      if (children) {
        for (const child of children) {
          if (!visited.has(child)) {
            visited.add(child);
            queue.push(child);
          }
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Get direct parent IDs
   */
  getParents(entityId: string): string[] {
    const dagNode = this.dagNodes.get(entityId);
    if (dagNode) {
      return dagNode.inputs;
    }
    return this.nodes.get(entityId)?.parentIds ?? [];
  }

  /**
   * Trace complete lineage back to root/GIVEN primitives
   */
  getLineage(entityId: string): ConstructionDagNode[] {
    const lineage: ConstructionDagNode[] = [];
    const visited = new Set<string>();
    const queue = [entityId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      const node = this.dagNodes.get(curr);
      if (node) {
        if (!lineage.some(n => n.id === node.id)) {
          lineage.push(node);
        }
        for (const parentId of node.inputs) {
          if (!visited.has(parentId)) {
            queue.push(parentId);
          }
        }
      }
    }

    return lineage;
  }

  /**
   * Check if entity exists in DAG
   */
  has(entityId: string): boolean {
    return this.dagNodes.has(entityId) || this.nodes.has(entityId);
  }

  /**
   * Get node details
   */
  getNode(entityId: string): ConstructionNode | undefined {
    return this.nodes.get(entityId);
  }

  /**
   * Get full Package 03 DAG node details
   */
  getDagNode(entityId: string): ConstructionDagNode | undefined {
    return this.dagNodes.get(entityId);
  }

  /**
   * Get all registered nodes
   */
  getAllNodes(): ConstructionNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all registered Package 03 DAG nodes
   */
  getAllDagNodes(): ConstructionDagNode[] {
    // Unique by node ID
    const unique = new Map<string, ConstructionDagNode>();
    for (const node of this.dagNodes.values()) {
      unique.set(node.id, node);
    }
    return Array.from(unique.values());
  }

  /**
   * Remove a node from DAG
   */
  remove(entityId: string): void {
    this.nodes.delete(entityId);
    this.dagNodes.delete(entityId);
    this.childMap.delete(entityId);
    for (const set of this.childMap.values()) {
      set.delete(entityId);
    }
  }

  /**
   * Clear or reset the DAG
   */
  clear(): void {
    this.nodes.clear();
    this.dagNodes.clear();
    this.childMap.clear();
  }
}
