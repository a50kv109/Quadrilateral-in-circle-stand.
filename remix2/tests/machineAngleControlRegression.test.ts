/**
 * Headless Regression Sequence for Machine Angle Control (SET/SHIFT)
 * Verification of R2 Machine Control Primitives
 */

import { strict as assert } from 'assert';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { AuxiliaryState } from '../src/ui/types/auxiliaryTypes';

console.log('=== RUNNING MACHINE ANGLE CONTROL REGRESSION TESTS ===');

// 1. Initialize cyclic state with exact user parameters:
//    A = 40°, B = 130°, C = 220°, D = 310°
const center = { id: 'O', x: 0, y: 0 };
const radius = 160;
const initialAnglesDeg = [40, 130, 220, 310];
const initialAnglesRad = initialAnglesDeg.map(deg => (deg * Math.PI) / 180);

let geometryState = UniversalGeometryState.createCyclic(center, radius, initialAnglesRad);
let auxiliaryState = createEmptyAuxiliaryState();

// Helper to construct execution context
function getContext(geo = geometryState, aux = auxiliaryState): CommandExecutionContext {
  const derived = geo.getDerivedCartesianVertices();
  const activeVertices = derived.map((v, i) => {
    const id = ['A', 'B', 'C', 'D'][i];
    return { id, cartesian: v, label: id };
  });

  const activeChords = [
    { id: 'chord_AB', p1: derived[0], p2: derived[1], label: 'AB' },
    { id: 'chord_BC', p1: derived[1], p2: derived[2], label: 'BC' },
    { id: 'chord_CD', p1: derived[2], p2: derived[3], label: 'CD' },
    { id: 'chord_DA', p1: derived[3], p2: derived[0], label: 'DA' }
  ];

  return {
    canonicalVertices: activeVertices,
    circumcircle: { center: { id: 'O', x: 0, y: 0 }, radius },
    baseChords: activeChords,
    auxiliaryState: aux,
    geometryState: geo
  };
}

// 2. Create several dependent constructions involving A
let diagACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_DIAGONAL',
    vertex1Id: 'A',
    vertex2Id: 'C'
  }, getContext());
  assert(res.success, 'CONSTRUCT_DIAGONAL AC failed');
  diagACId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let bisectorAId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_ANGLE_BISECTOR',
    arm1PointId: 'D',
    vertexPointId: 'A',
    arm2PointId: 'B'
  }, getContext());
  assert(res.success, 'CONSTRUCT_ANGLE_BISECTOR at A failed');
  bisectorAId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let lineACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_LINE',
    p1Id: 'A',
    p2Id: 'C'
  }, getContext());
  assert(res.success, 'CONSTRUCT_LINE AC failed');
  lineACId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let parallelAId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_BC',
    throughPointId: 'A'
  }, getContext());
  assert(res.success, 'CONSTRUCT_PARALLEL A failed');
  parallelAId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let diagBDId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_DIAGONAL',
    vertex1Id: 'B',
    vertex2Id: 'D'
  }, getContext());
  assert(res.success, 'CONSTRUCT_DIAGONAL BD failed');
  diagBDId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let interPId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_INTERSECTION',
    entity1Id: parallelAId,
    entity2Id: diagBDId
  }, getContext());
  assert(res.success, 'CONSTRUCT_INTERSECTION parallelA & diagBD failed');
  interPId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

let measureACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'MEASURE_DISTANCE',
    p1Id: 'A',
    p2Id: 'C'
  }, getContext());
  assert(res.success, 'MEASURE_DISTANCE AC failed');
  measureACId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

// Record initial metrics
const initialPtA = geometryState.getDerivedCartesianVertices()[0];
const initialP = auxiliaryState.points.find(p => p.id === interPId)!;
const initialLine = auxiliaryState.lines.find(l => l.id === lineACId)!;
const initialMeasure = auxiliaryState.measurements.find(m => m.id === measureACId)!;

console.log(`Initial A: (${initialPtA.x.toFixed(4)}, ${initialPtA.y.toFixed(4)})`);
console.log(`Initial Intersection P: (${initialP.x.toFixed(4)}, ${initialP.y.toFixed(4)})`);
console.log(`Initial Distance AC: ${initialMeasure.distanceMm.toFixed(4)} mm`);

// Ensure initial counts are recorded for duplicate checks
const initialCounts = {
  points: auxiliaryState.points.length,
  segments: auxiliaryState.segments.length,
  lines: auxiliaryState.lines.length,
  circles: auxiliaryState.circles.length,
  measurements: auxiliaryState.measurements.length
};

const initialLineIds = auxiliaryState.lines.map(l => l.id);
const initialSegmentIds = auxiliaryState.segments.map(s => s.id);
const initialPointIds = auxiliaryState.points.map(p => p.id);

// ============================================================
// STEP A: SHIFT A +5° (from 40° to 45°)
// ============================================================
{
  const prevVersion = geometryState.stateVersion;
  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 5
  }, getContext());

  assert(res.success, 'First SHIFT_CANONICAL_VERTEX_ANGLE failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  // 1. Verify stateVersion increments correctly
  assert.equal(geometryState.stateVersion, prevVersion + 1, 'stateVersion must increment by 1');

  // 2. Verify angle of A has changed to 45°
  const activeAngles = (geometryState.canonicalInputs as any).angles;
  const angleDeg = (activeAngles[0] * 180) / Math.PI;
  assert(Math.abs(angleDeg - 45) < 1e-6, 'A angle must be 45°');

  // 3. Verify Cartesian coordinates of A changed
  const derived = geometryState.getDerivedCartesianVertices();
  const ptA = derived[0];
  assert(Math.abs(ptA.x - radius * Math.cos(45 * Math.PI / 180)) < 1e-6, 'A.x must match 45°');
  assert(Math.abs(ptA.y - radius * Math.sin(45 * Math.PI / 180)) < 1e-6, 'A.y must match 45°');

  // 4. Verify dependent constructions recomputed
  const ptP = auxiliaryState.points.find(p => p.id === interPId)!;
  assert(Math.abs(ptP.x - initialP.x) > 1e-3 || Math.abs(ptP.y - initialP.y) > 1e-3, 'Intersection P must update coordinates');

  const line = auxiliaryState.lines.find(l => l.id === lineACId)!;
  assert(Math.abs(line.anchorPoint.x - ptA.x) < 1e-6, 'Line anchorPoint must update to A');

  // 5. Verify measurements change where expected
  const measure = auxiliaryState.measurements.find(m => m.id === measureACId)!;
  const expectedDist = 2 * radius * Math.sin((175 * Math.PI) / 360); // Angle difference (220 - 45) = 175°
  assert(Math.abs(measure.distanceMm - expectedDist) < 0.1, `Expected dist ≈ ${expectedDist.toFixed(4)}, got ${measure.distanceMm.toFixed(4)}`);

  // 6. Verify construction IDs remain stable
  assert.deepStrictEqual(auxiliaryState.lines.map(l => l.id), initialLineIds, 'Line IDs must remain stable');
  assert.deepStrictEqual(auxiliaryState.segments.map(s => s.id), initialSegmentIds, 'Segment IDs must remain stable');
  assert.deepStrictEqual(auxiliaryState.points.map(p => p.id), initialPointIds, 'Point IDs must remain stable');

  // 7. Verify no duplicate constructions appear
  assert.equal(auxiliaryState.points.length, initialCounts.points, 'Points count must be stable');
  assert.equal(auxiliaryState.segments.length, initialCounts.segments, 'Segments count must be stable');
  assert.equal(auxiliaryState.lines.length, initialCounts.lines, 'Lines count must be stable');
  assert.equal(auxiliaryState.measurements.length, initialCounts.measurements, 'Measurements count must be stable');

  console.log(`✓ Shift A +5°: A=45°, version=${geometryState.stateVersion}, P=(${ptP.x.toFixed(4)}, ${ptP.y.toFixed(4)}), Dist AC=${measure.distanceMm.toFixed(4)} mm`);
}

// ============================================================
// STEP B: SHIFT A +5° (from 45° to 50°)
// ============================================================
{
  const prevVersion = geometryState.stateVersion;
  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 5
  }, getContext());

  assert(res.success, 'Second SHIFT_CANONICAL_VERTEX_ANGLE failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  // 1. Verify stateVersion increments correctly
  assert.equal(geometryState.stateVersion, prevVersion + 1, 'stateVersion must increment by 1');

  // 2. Verify angle of A has changed to 50°
  const activeAngles = (geometryState.canonicalInputs as any).angles;
  const angleDeg = (activeAngles[0] * 180) / Math.PI;
  assert(Math.abs(angleDeg - 50) < 1e-6, 'A angle must be 50°');

  // 3. Verify Cartesian coordinates of A changed
  const derived = geometryState.getDerivedCartesianVertices();
  const ptA = derived[0];
  assert(Math.abs(ptA.x - radius * Math.cos(50 * Math.PI / 180)) < 1e-6, 'A.x must match 50°');
  assert(Math.abs(ptA.y - radius * Math.sin(50 * Math.PI / 180)) < 1e-6, 'A.y must match 50°');

  // 4. Verify dependent constructions recomputed
  const ptP = auxiliaryState.points.find(p => p.id === interPId)!;
  const line = auxiliaryState.lines.find(l => l.id === lineACId)!;
  assert(Math.abs(line.anchorPoint.x - ptA.x) < 1e-6, 'Line anchorPoint must update to A');

  // 5. Verify measurements change where expected
  const measure = auxiliaryState.measurements.find(m => m.id === measureACId)!;
  const expectedDist = 2 * radius * Math.sin((170 * Math.PI) / 360); // Angle difference (220 - 50) = 170°
  assert(Math.abs(measure.distanceMm - expectedDist) < 0.1, `Expected dist ≈ ${expectedDist.toFixed(4)}, got ${measure.distanceMm.toFixed(4)}`);

  // 6. Verify construction IDs remain stable
  assert.deepStrictEqual(auxiliaryState.lines.map(l => l.id), initialLineIds, 'Line IDs must remain stable');

  // 7. Verify no duplicate constructions appear
  assert.equal(auxiliaryState.points.length, initialCounts.points, 'Points count must be stable');

  console.log(`✓ Shift A +5°: A=50°, version=${geometryState.stateVersion}, P=(${ptP.x.toFixed(4)}, ${ptP.y.toFixed(4)}), Dist AC=${measure.distanceMm.toFixed(4)} mm`);
}

// ============================================================
// STEP C: SET A = 60°
// ============================================================
{
  const prevVersion = geometryState.stateVersion;
  const res = dispatchSemanticCommand({
    type: 'SET_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    angle: 60
  }, getContext());

  assert(res.success, 'SET_CANONICAL_VERTEX_ANGLE to 60° failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  // 1. Verify stateVersion increments correctly
  assert.equal(geometryState.stateVersion, prevVersion + 1, 'stateVersion must increment by 1');

  // 2. Verify angle of A has changed to 60°
  const activeAngles = (geometryState.canonicalInputs as any).angles;
  const angleDeg = (activeAngles[0] * 180) / Math.PI;
  assert(Math.abs(angleDeg - 60) < 1e-6, 'A angle must be 60°');

  // 3. Verify Cartesian coordinates of A changed to exact values: x = 160 * cos(60) = 80
  const derived = geometryState.getDerivedCartesianVertices();
  const ptA = derived[0];
  assert(Math.abs(ptA.x - 80) < 1e-6, 'A.x must be exactly 80 at 60°');
  assert(Math.abs(ptA.y - 138.564) < 1e-3, 'A.y must be exactly 138.564 at 60°');

  // 4. Verify dependent constructions recomputed
  const ptP = auxiliaryState.points.find(p => p.id === interPId)!;
  const line = auxiliaryState.lines.find(l => l.id === lineACId)!;
  assert(Math.abs(line.anchorPoint.x - ptA.x) < 1e-6, 'Line anchorPoint must update to A');

  // 5. Verify measurements change where expected
  const measure = auxiliaryState.measurements.find(m => m.id === measureACId)!;
  const expectedDist = 2 * radius * Math.sin((160 * Math.PI) / 360); // Angle difference (220 - 60) = 160°
  assert(Math.abs(measure.distanceMm - expectedDist) < 0.1, `Expected dist ≈ ${expectedDist.toFixed(4)}, got ${measure.distanceMm.toFixed(4)}`);

  // 6. Verify construction IDs remain stable
  assert.deepStrictEqual(auxiliaryState.lines.map(l => l.id), initialLineIds, 'Line IDs must remain stable');

  // 7. Verify no duplicate constructions appear
  assert.equal(auxiliaryState.points.length, initialCounts.points, 'Points count must be stable');

  console.log(`✓ Set A = 60°: A=60°, version=${geometryState.stateVersion}, P=(${ptP.x.toFixed(4)}, ${ptP.y.toFixed(4)}), Dist AC=${measure.distanceMm.toFixed(4)} mm`);
}

console.log('🎉 ALL MACHINE ANGLE CONTROL REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
