/**
 * CQNS-001 — Relation Graph
 * Strictly PASSIVE Epistemic & Provenance Ledger.
 * Stores verified observations and derivation links.
 * Zero independent calculations; zero heuristic inferences.
 */

import { EpistemicStatus, RelationNode } from '../types/geometry';

export class RelationGraph {
  private static instance: RelationGraph;

  private relations: Map<string, RelationNode> = new Map();

  private constructor() {}

  public static getInstance(): RelationGraph {
    if (!RelationGraph.instance) {
      RelationGraph.instance = new RelationGraph();
    }
    return RelationGraph.instance;
  }

  /**
   * Sync passive ledger with authoritative verification batch emitted by VerificationLayer
   */
  public updateLedger(batch: RelationNode[]): void {
    this.relations.clear();
    for (const rel of batch) {
      this.relations.set(rel.id, rel);
    }
  }

  /**
   * Query all registered relations
   */
  public getAll(): RelationNode[] {
    return Array.from(this.relations.values());
  }

  /**
   * Query relation by ID
   */
  public get(id: string): RelationNode | undefined {
    return this.relations.get(id);
  }

  /**
   * Query relations filtered by Epistemic Status
   */
  public getByStatus(status: EpistemicStatus): RelationNode[] {
    return Array.from(this.relations.values()).filter(r => r.status === status);
  }

  /**
   * Clear the ledger
   */
  public clear(): void {
    this.relations.clear();
  }
}
