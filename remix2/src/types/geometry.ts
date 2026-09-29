/**
 * Remix 2 Geometry Type Definitions
 * Discriminated union patterns to prevent union leakage and ensure domain safety.
 */

export interface Point {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface ReferenceCircle {
  readonly center: Point;
  readonly radius: number;
}

export interface CartesianInput {
  readonly domainProfile: 'CARTESIAN';
  readonly vertices: readonly Point[];
}

export interface CyclicInput {
  readonly domainProfile: 'CYCLIC';
  readonly referenceCircle: ReferenceCircle;
  readonly angles: readonly number[];
}

export type DomainProfile = 'CARTESIAN' | 'CYCLIC';

export type CanonicalInputs = CartesianInput | CyclicInput;

export interface DraftReferenceCircle {
  center: Point;
  radius: number;
}

export interface CartesianMutationDraft {
  readonly domainProfile: 'CARTESIAN';
  vertexCount: number;
  canonicalInputs: {
    vertices: Point[];
  };
  provenance: string;
  constructionLineage: string[];
}

export interface CyclicMutationDraft {
  readonly domainProfile: 'CYCLIC';
  vertexCount: number;
  canonicalInputs: {
    referenceCircle: DraftReferenceCircle;
    angles: number[];
  };
  provenance: string;
  constructionLineage: string[];
}

export type MutationDraft = CartesianMutationDraft | CyclicMutationDraft;
