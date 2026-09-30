/**
 * Geometry State Snapshot Diff Utility (v0.1)
 * 
 * Pure DTO comparison utility for autonomous research agents.
 * 
 * Architectural Invariants:
 * - Pure observation comparison (after - before).
 * - Zero geometry calculations, zero formula duplication, zero theorem proving.
 * - Does not mutate input snapshots or global state.
 * - Deterministic, headless, browser-independent.
 */

import { GeometryStateSnapshot, SnapshotConstruction } from '../types/snapshot';

export interface ParameterChange {
  readonly name: string;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
}

export interface AreaChanges {
  readonly sQuadBefore?: number;
  readonly sQuadAfter?: number;
  readonly sQuadDelta?: number;

  readonly sGapBefore?: number;
  readonly sGapAfter?: number;
  readonly sGapDelta?: number;

  readonly referenceValueBefore?: number;
  readonly referenceValueAfter?: number;
  readonly referenceValueDelta?: number;

  readonly fillRatioBefore?: number;
  readonly fillRatioAfter?: number;
  readonly fillRatioDelta?: number;

  readonly gapRatioBefore?: number;
  readonly gapRatioAfter?: number;
  readonly gapRatioDelta?: number;
}

export type ConstructionDiffStatus = 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';

export interface ConstructionChange {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly before?: number;
  readonly after?: number;
  readonly delta?: number;
  readonly status: ConstructionDiffStatus;
}

export interface GeometrySnapshotDiff {
  readonly stateVersionA: number;
  readonly stateVersionB: number;
  readonly domainProfileA: string;
  readonly domainProfileB: string;
  readonly provenanceA: string;
  readonly provenanceB: string;

  readonly parameterChanges: readonly ParameterChange[];
  readonly areaChanges?: AreaChanges;
  readonly constructionChanges: readonly ConstructionChange[];
}

/**
 * Pure DTO comparison utility:
 * Computes deterministic differences between two GeometryStateSnapshots.
 * Does NOT perform any geometric math, recomputation, or verification.
 */
export function diffGeometrySnapshots(
  snapA: GeometryStateSnapshot,
  snapB: GeometryStateSnapshot
): GeometrySnapshotDiff {
  if (!snapA || !snapB || !snapA.metadata || !snapB.metadata) {
    throw new Error("Invalid snapshots provided to diffGeometrySnapshots: both snapshots must be valid GeometryStateSnapshot DTOs.");
  }

  // 1. Parameter changes (e.g. cyclicAngles)
  const paramChanges: ParameterChange[] = [];
  const anglesA = snapA.parameters.cyclicAngles ?? {};
  const anglesB = snapB.parameters.cyclicAngles ?? {};
  const allParamKeys = Array.from(new Set([...Object.keys(anglesA), ...Object.keys(anglesB)])).sort();

  for (const key of allParamKeys) {
    const valA = anglesA[key];
    const valB = anglesB[key];
    if (valA !== undefined && valB !== undefined) {
      paramChanges.push({
        name: `θ_${key}`,
        before: valA,
        after: valB,
        delta: valB - valA
      });
    } else if (valA !== undefined) {
      paramChanges.push({
        name: `θ_${key}`,
        before: valA,
        after: 0,
        delta: -valA
      });
    } else if (valB !== undefined) {
      paramChanges.push({
        name: `θ_${key}`,
        before: 0,
        after: valB,
        delta: valB
      });
    }
  }

  // 2. Area changes
  let areaChanges: AreaChanges | undefined = undefined;
  if (snapA.area || snapB.area) {
    const a = snapA.area;
    const b = snapB.area;
    areaChanges = {
      sQuadBefore: a?.value,
      sQuadAfter: b?.value,
      sQuadDelta: (a && b) ? (b.value - a.value) : undefined,

      sGapBefore: a?.gapValue,
      sGapAfter: b?.gapValue,
      sGapDelta: (a && b) ? (b.gapValue - a.gapValue) : undefined,

      referenceValueBefore: a?.referenceValue,
      referenceValueAfter: b?.referenceValue,
      referenceValueDelta: (a && b) ? (b.referenceValue - a.referenceValue) : undefined,

      fillRatioBefore: a?.fillRatio,
      fillRatioAfter: b?.fillRatio,
      fillRatioDelta: (a && b) ? (b.fillRatio - a.fillRatio) : undefined,

      gapRatioBefore: a?.gapRatio,
      gapRatioAfter: b?.gapRatio,
      gapRatioDelta: (a && b) ? (b.gapRatio - a.gapRatio) : undefined
    };
  }

  // 3. Construction changes
  const constructionChanges: ConstructionChange[] = [];
  const mapA = new Map<string, SnapshotConstruction>();
  snapA.constructions.forEach((c) => mapA.set(c.id, c));

  const mapB = new Map<string, SnapshotConstruction>();
  snapB.constructions.forEach((c) => mapB.set(c.id, c));

  const allConstructionIds = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

  for (const id of allConstructionIds) {
    const itemA = mapA.get(id);
    const itemB = mapB.get(id);

    if (itemA && itemB) {
      const valA = itemA.mathValue;
      const valB = itemB.mathValue;
      const hasDelta = valA !== undefined && valB !== undefined;
      const delta = hasDelta ? valB - valA : undefined;
      const isChanged = hasDelta ? Math.abs(delta!) > 1e-12 : itemA.type !== itemB.type;

      constructionChanges.push({
        id,
        type: itemB.type,
        label: itemB.label,
        before: valA,
        after: valB,
        delta,
        status: isChanged ? 'CHANGED' : 'UNCHANGED'
      });
    } else if (itemA && !itemB) {
      constructionChanges.push({
        id,
        type: itemA.type,
        label: itemA.label,
        before: itemA.mathValue,
        status: 'REMOVED'
      });
    } else if (!itemA && itemB) {
      constructionChanges.push({
        id,
        type: itemB.type,
        label: itemB.label,
        after: itemB.mathValue,
        status: 'ADDED'
      });
    }
  }

  return Object.freeze({
    stateVersionA: snapA.metadata.stateVersion,
    stateVersionB: snapB.metadata.stateVersion,
    domainProfileA: snapA.metadata.domainProfile,
    domainProfileB: snapB.metadata.domainProfile,
    provenanceA: snapA.metadata.provenance,
    provenanceB: snapB.metadata.provenance,
    parameterChanges: Object.freeze(paramChanges),
    areaChanges: areaChanges ? Object.freeze(areaChanges) : undefined,
    constructionChanges: Object.freeze(constructionChanges)
  });
}
