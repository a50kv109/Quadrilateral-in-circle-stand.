/**
 * UniversalGeometryState — Remix 2 Canonical State Store
 * R2-02: Domain Profile Contract Integration
 * 
 * Implements an immutable, versioned, single Source of Truth for geometric data.
 * Purely structural store — completely decoupled from math calculations,
 * topology validation, and epistemic statuses.
 */

import {
  Point,
  ReferenceCircle,
  CartesianInput,
  CyclicInput,
  DomainProfile,
  CanonicalInputs,
  MutationDraft,
  CartesianMutationDraft,
  CyclicMutationDraft
} from '../../types/geometry';

export class UniversalGeometryState {
  readonly vertexCount: number;
  readonly domainProfile: DomainProfile;
  readonly canonicalInputs: CanonicalInputs;
  readonly stateVersion: number;
  readonly provenance: string;
  readonly constructionLineage: readonly string[];

  private constructor(
    vertexCount: number,
    domainProfile: DomainProfile,
    canonicalInputs: CanonicalInputs,
    stateVersion: number,
    provenance: string,
    constructionLineage: readonly string[]
  ) {
    this.vertexCount = vertexCount;
    this.domainProfile = domainProfile;
    this.canonicalInputs = canonicalInputs;
    this.stateVersion = stateVersion;
    this.provenance = provenance;
    this.constructionLineage = constructionLineage;
    Object.freeze(this);
  }

  /**
   * Helper to validate a Cartesian point has finite coordinates.
   */
  private static validatePoint(p: Point): void {
    if (!p || typeof p.id !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      throw new Error("Invalid point: properties must be finite numbers.");
    }
  }

  /**
   * Factory: Create a Cartesian profile state.
   */
  static createCartesian(
    vertices: readonly Point[],
    provenance: string = "INITIAL_CARTESIAN",
    lineage: readonly string[] = []
  ): UniversalGeometryState {
    if (vertices.length < 3) {
      throw new Error("A geometric state must have at least 3 vertices.");
    }

    // Freeze inputs to enforce deep immutability and validate coordinates
    const frozenVertices = vertices.map(v => {
      UniversalGeometryState.validatePoint(v);
      const copy = { ...v };
      Object.freeze(copy);
      return copy;
    });
    Object.freeze(frozenVertices);

    const canonicalInputs: CartesianInput = {
      domainProfile: 'CARTESIAN',
      vertices: frozenVertices
    };
    Object.freeze(canonicalInputs);

    return new UniversalGeometryState(
      vertices.length,
      'CARTESIAN',
      canonicalInputs,
      1, // Initial stateVersion is 1
      provenance,
      Object.freeze([...lineage])
    );
  }

  /**
   * Factory: Create a Cyclic profile state.
   */
  static createCyclic(
    center: Point,
    radius: number,
    angles: readonly number[],
    provenance: string = "INITIAL_CYCLIC",
    lineage: readonly string[] = []
  ): UniversalGeometryState {
    if (angles.length < 3) {
      throw new Error("A geometric state must have at least 3 vertices.");
    }
    UniversalGeometryState.validatePoint(center);

    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("Circle radius must be a positive finite number.");
    }

    // Validate angles are finite
    angles.forEach(angle => {
      if (!Number.isFinite(angle)) {
        throw new Error("Angles must be finite numbers.");
      }
    });

    const frozenCenter = { ...center };
    Object.freeze(frozenCenter);

    const referenceCircle: ReferenceCircle = { center: frozenCenter, radius };
    Object.freeze(referenceCircle);

    const frozenAngles = [...angles];
    Object.freeze(frozenAngles);

    const canonicalInputs: CyclicInput = {
      domainProfile: 'CYCLIC',
      referenceCircle,
      angles: frozenAngles
    };
    Object.freeze(canonicalInputs);

    return new UniversalGeometryState(
      angles.length,
      'CYCLIC',
      canonicalInputs,
      1, // Initial stateVersion is 1
      provenance,
      Object.freeze([...lineage])
    );
  }

  /**
   * Execute a mutation on the state.
   * Runs the provided mutator function against a mutable draft.
   * Returns a new instance with stateVersion incremented by 1 on success.
   * If the mutator or validations fail, state is unchanged and no new version is produced.
   */
  commitMutation(
    mutatorFn: (draft: MutationDraft) => void,
    nextProvenance: string
  ): UniversalGeometryState {
    const draftLineage = [...this.constructionLineage];
    let draft: MutationDraft;

    // 1. Create a deep clone draft matching the current domain profile
    if (this.domainProfile === 'CARTESIAN') {
      const inputs = this.canonicalInputs as CartesianInput;
      draft = {
        domainProfile: 'CARTESIAN',
        vertexCount: this.vertexCount,
        canonicalInputs: {
          vertices: inputs.vertices.map(v => ({ ...v }))
        },
        provenance: nextProvenance,
        constructionLineage: draftLineage
      };
    } else {
      const inputs = this.canonicalInputs as CyclicInput;
      draft = {
        domainProfile: 'CYCLIC',
        vertexCount: this.vertexCount,
        canonicalInputs: {
          referenceCircle: {
            center: { ...inputs.referenceCircle.center },
            radius: inputs.referenceCircle.radius
          },
          angles: [...inputs.angles]
        },
        provenance: nextProvenance,
        constructionLineage: draftLineage
      };
    }

    // 2. Execute user mutator function inside a try-catch block
    try {
      mutatorFn(draft);
    } catch (err) {
      throw new Error(`Mutation failed: ${(err as Error).message}`);
    }

    // 3. Post-mutation structural validations (No topology checks, just format validation)
    if (draft.vertexCount < 3) {
      throw new Error("A geometric state must have at least 3 vertices.");
    }

    let finalInputs: CanonicalInputs;

    if (draft.domainProfile === 'CARTESIAN') {
      const cartesianDraft = draft as CartesianMutationDraft;
      const vertices = cartesianDraft.canonicalInputs.vertices;

      if (!vertices || vertices.length !== cartesianDraft.vertexCount) {
        throw new Error("Vertices list is missing or size does not match vertexCount.");
      }

      // Validate coordinates of each vertex
      const frozenVertices = vertices.map(v => {
        UniversalGeometryState.validatePoint(v);
        const copy = { ...v };
        Object.freeze(copy);
        return copy;
      });
      Object.freeze(frozenVertices);

      finalInputs = {
        domainProfile: 'CARTESIAN',
        vertices: frozenVertices
      };
      Object.freeze(finalInputs);
    } else if (draft.domainProfile === 'CYCLIC') {
      const cyclicDraft = draft as CyclicMutationDraft;
      const refCircle = cyclicDraft.canonicalInputs.referenceCircle;
      const angles = cyclicDraft.canonicalInputs.angles;

      if (!refCircle || !angles || angles.length !== cyclicDraft.vertexCount) {
        throw new Error("Reference circle or angles list is missing, or angles size does not match vertexCount.");
      }

      UniversalGeometryState.validatePoint(refCircle.center);

      if (!Number.isFinite(refCircle.radius) || refCircle.radius <= 0) {
        throw new Error("Circle radius must be a positive finite number.");
      }

      // Validate each angle is finite
      angles.forEach(angle => {
        if (!Number.isFinite(angle)) {
          throw new Error("Angles must be finite numbers.");
        }
      });

      const frozenCenter = { ...refCircle.center };
      Object.freeze(frozenCenter);
      const frozenCircle: ReferenceCircle = { center: frozenCenter, radius: refCircle.radius };
      Object.freeze(frozenCircle);

      const frozenAngles = [...angles];
      Object.freeze(frozenAngles);

      finalInputs = {
        domainProfile: 'CYCLIC',
        referenceCircle: frozenCircle,
        angles: frozenAngles
      };
      Object.freeze(finalInputs);
    } else {
      throw new Error("Unsupported domain profile.");
    }

    // 4. Return new immutable state instance with incremented stateVersion
    return new UniversalGeometryState(
      draft.vertexCount,
      draft.domainProfile,
      finalInputs,
      this.stateVersion + 1, // Atomic increment on success
      draft.provenance,
      Object.freeze([...draft.constructionLineage])
    );
  }

  /**
   * Pure derived projection: Compute Cartesian coordinates for all vertices.
   * - CARTESIAN: returns canonical vertices as-is.
   * - CYCLIC: derives P_i = O + R * (cos(alpha_i), sin(alpha_i)) on demand.
   * Never mutates state, caches mutable data, or acts as a second canonical source of truth.
   */
  getDerivedCartesianVertices(): readonly Point[] {
    if (this.domainProfile === 'CARTESIAN') {
      return (this.canonicalInputs as CartesianInput).vertices;
    }

    const inputs = this.canonicalInputs as CyclicInput;
    const { center, radius } = inputs.referenceCircle;
    const isDegrees = inputs.angles.some(a => Math.abs(a) > 2 * Math.PI);

    const derived = inputs.angles.map((angle, i) => {
      const rad = isDegrees ? (angle * Math.PI) / 180 : angle;
      const pt: Point = {
        id: `P${i}`,
        x: center.x + radius * Math.cos(rad),
        y: center.y + radius * Math.sin(rad)
      };
      Object.freeze(pt);
      return pt;
    });

    Object.freeze(derived);
    return derived;
  }
}
