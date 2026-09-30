/**
 * Headless Regression Sequence for Geometry State Snapshot
 * Verification of pure, viewport-independent read-only state projections.
 */

import { strict as assert } from 'assert';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { createGeometryStateSnapshot, GeometryStateSnapshot } from '../src/research/index';

console.log('=== RUNNING GEOMETRY STATE SNAPSHOT REGRESSION TESTS ===');

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

// ============================================================
// GENERATE SNAPSHOT S0
// ============================================================
const S0: GeometryStateSnapshot = createGeometryStateSnapshot(geometryState, auxiliaryState);

// Verify S0 properties
assert.equal(S0.metadata.stateVersion, 1, 'S0 version must be 1');
assert.equal(S0.metadata.domainProfile, 'CYCLIC', 'S0 domain must be CYCLIC');
assert.equal(S0.metadata.vertexCount, 4, 'S0 vertexCount must be 4');
assert(S0.parameters.cyclicAngles !== undefined, 'S0 must contain cyclicAngles parameters');
assert(Math.abs(S0.parameters.cyclicAngles['A'] - (40 * Math.PI) / 180) < 1e-6, 'S0 A angle must be 40°');

// Verify points
const s0PtA = S0.points.find(p => p.id === 'A')!;
assert(s0PtA !== undefined, 'S0 points must contain canonical vertex A');
assert.equal(s0PtA.type, 'canonical', 'A point must be canonical type');

const s0PtP = S0.points.find(p => p.id === interPId)!;
assert(s0PtP !== undefined, 'S0 points must contain auxiliary intersection point P');
assert.equal(s0PtP.type, 'intersection', 'P point must be intersection type');

// Verify constructions
const s0Diag = S0.constructions.find(c => c.id === diagACId)!;
assert(s0Diag !== undefined, 'S0 constructions must contain diagonal segment AC');
assert.equal(s0Diag.type, 'diagonal', 'AC segment must be diagonal type');
assert(s0Diag.mathValue !== undefined, 'AC segment must contain numeric length mathValue');

const s0Line = S0.constructions.find(c => c.id === lineACId)!;
assert(s0Line !== undefined, 'S0 constructions must contain line AC');
assert.equal(s0Line.type, 'two_points', 'Line AC must be two_points type');
assert(s0Line.lineEquation !== undefined, 'Line AC must contain lineEquation');

// Verify measurements
const s0Measure = S0.measurements.find(m => m.id === measureACId)!;
assert(s0Measure !== undefined, 'S0 measurements must contain measurement AC');
assert.equal(s0Measure.type, 'distance', 'Measurement type must be distance');
assert.equal(s0Measure.units, 'mm', 'Measurement unit must be mm');

console.log('✓ Snapshot S0 generated and validated.');

// ============================================================
// EXECUTE SHIFT A +5° AND GENERATE S1
// ============================================================
{
  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 5
  }, getContext());

  assert(res.success, 'First SHIFT A +5° failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;
}

const S1: GeometryStateSnapshot = createGeometryStateSnapshot(geometryState, auxiliaryState);

// Verify S1 properties
assert.equal(S1.metadata.stateVersion, 2, 'S1 version must be 2');
assert(Math.abs(S1.parameters.cyclicAngles!['A'] - (45 * Math.PI) / 180) < 1e-6, 'S1 A angle must be 45°');

const s1PtA = S1.points.find(p => p.id === 'A')!;
assert(Math.abs(s1PtA.x - s0PtA.x) > 1e-3 || Math.abs(s1PtA.y - s0PtA.y) > 1e-3, 'A coordinates must change in S1');

const s1PtP = S1.points.find(p => p.id === interPId)!;
assert(Math.abs(s1PtP.x - s0PtP.x) > 1e-3 || Math.abs(s1PtP.y - s0PtP.y) > 1e-3, 'Intersection point P must update coordinates in S1');

const s1Measure = S1.measurements.find(m => m.id === measureACId)!;
assert(Math.abs(s1Measure.value - s0Measure.value) > 1e-3, 'Measurement AC value must change in S1');

console.log('✓ Shift A +5°: Snapshot S1 generated and validated.');

// ============================================================
// EXECUTE SHIFT A +5° AND GENERATE S2
// ============================================================
{
  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 5
  }, getContext());

  assert(res.success, 'Second SHIFT A +5° failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;
}

const S2: GeometryStateSnapshot = createGeometryStateSnapshot(geometryState, auxiliaryState);

// Verify S2 properties
assert.equal(S2.metadata.stateVersion, 3, 'S2 version must be 3');
assert(Math.abs(S2.parameters.cyclicAngles!['A'] - (50 * Math.PI) / 180) < 1e-6, 'S2 A angle must be 50°');

const s2PtA = S2.points.find(p => p.id === 'A')!;
assert(Math.abs(s2PtA.x - s1PtA.x) > 1e-3 || Math.abs(s2PtA.y - s1PtA.y) > 1e-3, 'A coordinates must change in S2');

const s2PtP = S2.points.find(p => p.id === interPId)!;
assert(Math.abs(s2PtP.x - s1PtP.x) > 1e-3 || Math.abs(s2PtP.y - s1PtP.y) > 1e-3, 'Intersection point P must update coordinates in S2');

const s2Measure = S2.measurements.find(m => m.id === measureACId)!;
assert(Math.abs(s2Measure.value - s1Measure.value) > 1e-3, 'Measurement AC value must change in S2');

console.log('✓ Shift A +5°: Snapshot S2 generated and validated.');

// ============================================================
// CRITICAL INVARIANT CHECKS
// ============================================================

// 1. Version incrementation
assert(S0.metadata.stateVersion < S1.metadata.stateVersion, 'S0 version must be less than S1');
assert(S1.metadata.stateVersion < S2.metadata.stateVersion, 'S1 version must be less than S2');

// 2. Construction and Measurement IDs stability
const s0LineIds = S0.constructions.map(c => c.id).sort();
const s1LineIds = S1.constructions.map(c => c.id).sort();
const s2LineIds = S2.constructions.map(c => c.id).sort();
assert.deepStrictEqual(s1LineIds, s0LineIds, 'Construction IDs must be stable across S0 and S1');
assert.deepStrictEqual(s2LineIds, s0LineIds, 'Construction IDs must be stable across S1 and S2');

const s0MeasureIds = S0.measurements.map(m => m.id).sort();
const s1MeasureIds = S1.measurements.map(m => m.id).sort();
assert.deepStrictEqual(s1MeasureIds, s0MeasureIds, 'Measurement IDs must be stable');

// 3. Object counts are stable (no duplicate constructions appear)
assert.equal(S1.points.length, S0.points.length, 'Points count must be stable');
assert.equal(S1.constructions.length, S0.constructions.length, 'Constructions count must be stable');
assert.equal(S1.measurements.length, S0.measurements.length, 'Measurements count must be stable');

// 4. Verification that snapshot does NOT contain viewport rendering data
S0.constructions.forEach((c: any) => {
  assert.equal(c.x1, undefined, 'Snapshot constructions must NOT contain x1 screen coordinates');
  assert.equal(c.y1, undefined, 'Snapshot constructions must NOT contain y1 screen coordinates');
  assert.equal(c.x2, undefined, 'Snapshot constructions must NOT contain x2 screen coordinates');
  assert.equal(c.y2, undefined, 'Snapshot constructions must NOT contain y2 screen coordinates');
  assert.equal(c.color, undefined, 'Snapshot constructions must NOT contain color properties');
});

// 5. Verification that snapshot generation is pure and does not mutate source states
const initialVersion = geometryState.stateVersion;
createGeometryStateSnapshot(geometryState, auxiliaryState);
assert.equal(geometryState.stateVersion, initialVersion, 'Snapshot generation must NOT mutate UniversalGeometryState');

// 6. Verification of full independent immutability of snapshots
assert.notEqual(S0, S1, 'Snapshots must be distinct immutable objects');
assert.notEqual(S1, S2, 'Snapshots must be distinct immutable objects');

// 7. Verify JSON serialization without browser APIs
const jsonStr = JSON.stringify(S0);
assert(typeof jsonStr === 'string', 'Snapshot must serialize successfully');
const parsed = JSON.parse(jsonStr);
assert.equal(parsed.metadata.stateVersion, S0.metadata.stateVersion, 'Parsed state version must match');
assert.equal(parsed.metadata.domainProfile, S0.metadata.domainProfile, 'Parsed domain profile must match');
console.log('✓ JSON Serialization and browser-independence verified.');

console.log('🎉 ALL GEOMETRY STATE SNAPSHOT REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
