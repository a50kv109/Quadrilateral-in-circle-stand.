/**
 * Remix 2 Research Namespace
 * Isolated sandbox for experimental DFT harmonic spectrum analysis and SVD, 
 * plus State Snapshot projections for autonomous agents.
 */

import { UniversalGeometryState } from '../kernel/state/geometryState';
import { AuxiliaryState } from '../ui/types/auxiliaryTypes';
import { Point } from '../types/geometry';
import { dispatchSemanticCommand, CommandExecutionContext } from '../ui/state/commandDispatcher';
import { GeometryCore } from '../kernel/dag/geometryCore';
import {
  GeometryStateSnapshot,
  SnapshotMetadata,
  SnapshotParameters,
  SnapshotPoint,
  SnapshotConstruction,
  SnapshotMeasurement
} from '../types/snapshot';

export const RESEARCH_NAMESPACE = "remix2.research";

export * from './checkpointBuffer';
export * from './snapshotDiff';

/**
 * Pure projection function:
 * Converts current UniversalGeometryState and AuxiliaryState into a deterministic,
 * read-only, headless GeometryStateSnapshot.
 * Does NOT mutate the input states, does NOT contain any viewport/rendering data.
 */
export function createGeometryStateSnapshot(
  geometryState: UniversalGeometryState,
  auxiliaryState: AuxiliaryState
): GeometryStateSnapshot {
  // 1. Metadata
  const metadata: SnapshotMetadata = {
    stateVersion: geometryState.stateVersion,
    domainProfile: geometryState.domainProfile,
    vertexCount: geometryState.vertexCount,
    provenance: geometryState.provenance
  };

  // 2. Parameters (Cyclic parameters in radians if profile is CYCLIC)
  let parameters: SnapshotParameters = {};
  if (geometryState.domainProfile === 'CYCLIC') {
    const cyclicInputs = geometryState.canonicalInputs as any;
    const cyclicAngles: Record<string, number> = {};
    cyclicInputs.angles.forEach((angle: number, idx: number) => {
      const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx] || `P${idx}`;
      cyclicAngles[letter] = angle;
    });

    parameters = {
      referenceCircle: {
        center: { ...cyclicInputs.referenceCircle.center },
        radius: cyclicInputs.referenceCircle.radius
      },
      cyclicAngles
    };
  }

  // 3. Points (Canonical projected points + auxiliary points)
  const derivedVertices = geometryState.getDerivedCartesianVertices();
  const points: SnapshotPoint[] = derivedVertices.map((v, idx) => {
    const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx] || v.id;
    return {
      id: letter,
      label: letter,
      x: v.x,
      y: v.y,
      type: 'canonical'
    };
  });

  auxiliaryState.points.forEach((p) => {
    points.push({
      id: p.id,
      label: p.label,
      x: p.x,
      y: p.y,
      type: p.type as any
    });
  });

  // 4. Constructions (Auxiliary segments, lines, and circles)
  const constructions: SnapshotConstruction[] = [];

  // Auxiliary segments (including diagonals)
  auxiliaryState.segments.forEach((seg) => {
    constructions.push({
      id: seg.id,
      type: seg.type,
      label: seg.label,
      parentIds: [seg.p1Id, seg.p2Id],
      mathValue: seg.lengthMm
    });
  });

  // Auxiliary lines (with anchorPoint, direction, and line equation standard normalization)
  auxiliaryState.lines.forEach((line) => {
    const parentIds: string[] = [line.throughPointId];
    if (line.referenceSegmentId) {
      parentIds.push(line.referenceSegmentId);
    }
    if (line.point1Id && line.point1Id !== line.throughPointId) parentIds.push(line.point1Id);
    if (line.point2Id && line.point2Id !== line.throughPointId) parentIds.push(line.point2Id);
    if (line.point3Id) parentIds.push(line.point3Id);

    constructions.push({
      id: line.id,
      type: line.type,
      label: line.label,
      parentIds,
      lineEquation: line.equation ? { a: line.equation.a, b: line.equation.b, c: line.equation.c } : undefined,
      anchorPoint: line.anchorPoint ? { id: `${line.id}_anchor`, x: line.anchorPoint.x, y: line.anchorPoint.y } : undefined,
      direction: line.direction ? { dx: line.direction.dx, dy: line.direction.dy } : undefined
    });
  });

  // Auxiliary circles
  auxiliaryState.circles.forEach((circ) => {
    const parentIds: string[] = [circ.centerPointId];
    if (circ.radiusPoint1Id) parentIds.push(circ.radiusPoint1Id);
    if (circ.radiusPoint2Id) parentIds.push(circ.radiusPoint2Id);

    constructions.push({
      id: circ.id,
      type: circ.type,
      label: circ.label,
      parentIds,
      mathValue: circ.radius
    });
  });

  // 5. Measurements
  const measurements: SnapshotMeasurement[] = auxiliaryState.measurements.map((m) => {
    return {
      id: m.id,
      label: m.label,
      type: 'distance',
      value: m.distanceMm,
      units: 'mm'
    };
  });

  // 6. Calculate derived canonical polygon area, reference area, and gap/ratio metrics
  let radius = 160;
  if (geometryState.domainProfile === 'CYCLIC') {
    const cyclicInputs = geometryState.canonicalInputs as any;
    if (cyclicInputs.referenceCircle && typeof cyclicInputs.referenceCircle.radius === 'number') {
      radius = cyclicInputs.referenceCircle.radius;
    }
  }

  const referenceValue = GeometryCore.calculateCircleArea(radius);
  const signedArea = GeometryCore.calculateSignedArea(derivedVertices);
  const absoluteArea = Math.abs(signedArea);
  const gapValue = referenceValue - absoluteArea;
  const fillRatio = GeometryCore.calculateFillRatio(absoluteArea, referenceValue);
  const gapRatio = 1 - fillRatio;

  return {
    metadata,
    parameters,
    points,
    constructions,
    measurements,
    area: {
      value: absoluteArea,
      units: 'mm²',
      signedValue: signedArea,
      referenceValue,
      gapValue,
      fillRatio,
      gapRatio
    }
  };
}

export * from '../types/snapshot';

export interface ExplorationConfig {
  readonly initialGeometryState: UniversalGeometryState;
  readonly initialAuxiliaryState: AuxiliaryState;
  readonly targetVertexId: string; // e.g. 'A', 'B', 'C', 'D'
  readonly startAngleDegrees: number;
  readonly endAngleDegrees: number;
  readonly stepDegrees: number;
  readonly maxIterations?: number; // Protection against infinite loop
}

/**
 * Pure helper to reconstruct CommandExecutionContext dynamically.
 */
function buildExecutionContext(
  geoState: UniversalGeometryState,
  auxState: AuxiliaryState
): CommandExecutionContext {
  const derived = geoState.getDerivedCartesianVertices();
  const canonicalVertices = derived.map((v, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    return { id, cartesian: v, label: id };
  });

  const baseChords = [
    { id: 'chord_AB', p1: derived[0], p2: derived[1], label: 'AB' },
    { id: 'chord_BC', p1: derived[1], p2: derived[2], label: 'BC' },
    { id: 'chord_CD', p1: derived[2], p2: derived[3], label: 'CD' },
    { id: 'chord_DA', p1: derived[3], p2: derived[0], label: 'DA' }
  ];

  return {
    canonicalVertices,
    circumcircle: {
      center: { id: 'O', x: 0, y: 0 },
      radius: (geoState.canonicalInputs as any).referenceCircle?.radius ?? 160
    },
    baseChords,
    auxiliaryState: auxState,
    geometryState: geoState
  };
}

/**
 * Parametric Exploration Engine v0.1:
 * Headless, deterministic orchestrator for running parameter sweep experiments.
 * Generates an array of immutable GeometryStateSnapshot reports.
 */
export function runParametricExploration(config: ExplorationConfig): readonly GeometryStateSnapshot[] {
  const {
    initialGeometryState,
    initialAuxiliaryState,
    targetVertexId,
    startAngleDegrees,
    endAngleDegrees,
    stepDegrees
  } = config;

  // 1. Validation Checks
  if (initialGeometryState.domainProfile !== 'CYCLIC') {
    throw new Error("Parametric Exploration Engine v0.1 only supports CYCLIC state profiles.");
  }

  if (!Number.isFinite(startAngleDegrees) || !Number.isFinite(endAngleDegrees) || !Number.isFinite(stepDegrees)) {
    throw new Error("Start angle, end angle, and step must be finite numbers.");
  }

  if (stepDegrees === 0) {
    throw new Error("Step cannot be zero.");
  }

  const vertexMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (vertexMap[targetVertexId.toUpperCase()] === undefined) {
    throw new Error(`Invalid target vertex ID: ${targetVertexId}`);
  }

  if (startAngleDegrees < endAngleDegrees && stepDegrees < 0) {
    throw new Error("Incompatible step direction: start is less than end, but step is negative.");
  }

  if (startAngleDegrees > endAngleDegrees && stepDegrees > 0) {
    throw new Error("Incompatible step direction: start is greater than end, but step is positive.");
  }

  const limit = config.maxIterations ?? 1000;
  
  // 2. Generate deterministic sequence of parameter values
  const parameterValues: number[] = [];
  let idx = 0;
  while (true) {
    const val = startAngleDegrees + idx * stepDegrees;
    
    // Stop condition with floating-point tolerance
    if (stepDegrees > 0 && val > endAngleDegrees + 1e-9) break;
    if (stepDegrees < 0 && val < endAngleDegrees - 1e-9) break;
    
    parameterValues.push(val);
    idx++;
    
    if (idx > limit) {
      throw new Error(`Excessive iterations exceeded protection limit of ${limit}`);
    }
  }

  if (parameterValues.length === 0) {
    return [];
  }

  // 3. Coordinate parametric runs
  const snapshots: GeometryStateSnapshot[] = [];
  let currentGeoState = initialGeometryState;
  let currentAuxState = initialAuxiliaryState;

  for (const angle of parameterValues) {
    const ctx = buildExecutionContext(currentGeoState, currentAuxState);
    const result = dispatchSemanticCommand({
      type: 'SET_CANONICAL_VERTEX_ANGLE',
      vertexId: targetVertexId,
      angle: angle
    }, ctx);

    if (!result.success) {
      throw new Error(`Parametric step failed at angle ${angle}°: ${result.message}`);
    }

    currentGeoState = result.updatedGeometryState!;
    currentAuxState = result.updatedAuxiliaryState;

    // Extract pure snapshot for the step
    const snapshot = createGeometryStateSnapshot(currentGeoState, currentAuxState);
    snapshots.push(snapshot);
  }

  return Object.freeze(snapshots);
}

export interface ExplorationStepMetadata {
  readonly step: number;
  readonly parameterName: string;
  readonly parameterValue: number;
}

export interface GeometryResearchRow {
  readonly step: number;
  readonly stateVersion: number;
  readonly activeParameter: {
    readonly name: string;
    readonly value: number;
  };
  readonly r: number;
  readonly sCircle: number;
  readonly sQuad: number;
  readonly sGap: number;
  readonly kFill: number;
  readonly kGap: number;
  readonly provenance: string;
}

/**
 * Pure data projection mapper from Snapshots and Exploration Metadata to Research Rows.
 * Contains ZERO geometric mathematics and never mutates snapshots/states.
 */
export function mapSnapshotsToResearchRows(
  snapshots: readonly GeometryStateSnapshot[],
  explorationSteps: readonly ExplorationStepMetadata[]
): readonly GeometryResearchRow[] {
  if (snapshots.length !== explorationSteps.length) {
    throw new Error(`Length mismatch: snapshots count (${snapshots.length}) does not match exploration steps count (${explorationSteps.length})`);
  }

  const rows: GeometryResearchRow[] = snapshots.map((snapshot, idx) => {
    const stepMeta = explorationSteps[idx];
    if (stepMeta.step !== idx) {
      throw new Error(`Step index mismatch at index ${idx}: exploration step metadata defines step as ${stepMeta.step}`);
    }

    const area = snapshot.area;
    if (!area) {
      throw new Error(`Snapshot at step ${idx} does not contain area metrics.`);
    }

    const referenceCircle = snapshot.parameters.referenceCircle;
    if (!referenceCircle || typeof referenceCircle.radius !== 'number' || !Number.isFinite(referenceCircle.radius)) {
      throw new Error(`Snapshot at step ${idx} does not contain valid referenceCircle.radius.`);
    }

    const radius = referenceCircle.radius;

    return {
      step: stepMeta.step,
      stateVersion: snapshot.metadata.stateVersion,
      activeParameter: {
        name: stepMeta.parameterName,
        value: stepMeta.parameterValue
      },
      r: radius,
      sCircle: area.referenceValue,
      sQuad: area.value,
      sGap: area.gapValue,
      kFill: area.fillRatio,
      kGap: area.gapRatio,
      provenance: snapshot.metadata.provenance
    };
  });

  return Object.freeze(rows);
}


