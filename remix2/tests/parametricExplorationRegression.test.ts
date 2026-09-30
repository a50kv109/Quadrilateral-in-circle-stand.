/**
 * Regression Test Suite for Parametric Exploration Engine v0.1
 * Verification of Headless Deterministic Parameter Sweep Experiments
 */

import { strict as assert } from 'assert';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { runParametricExploration, ExplorationConfig } from '../src/research/index';

console.log('=== RUNNING PARAMETRIC EXPLORATION ENGINE TESTS ===');

// Setup initial state: A=40°, B=130°, C=220°, D=310°
const center = { id: 'O', x: 0, y: 0 };
const radius = 160;
const initialAnglesRad = [40, 130, 220, 310].map(deg => (deg * Math.PI) / 180);

let initialGeometryState = UniversalGeometryState.createCyclic(center, radius, initialAnglesRad);
let initialAuxiliaryState = createEmptyAuxiliaryState();

// Helper to construct execution context
function getContext(geo = initialGeometryState, aux = initialAuxiliaryState): CommandExecutionContext {
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

// Create dependent constructions in initialAuxiliaryState
let diagACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_DIAGONAL',
    vertex1Id: 'A',
    vertex2Id: 'C'
  }, getContext());
  diagACId = res.createdEntityIds[0];
  initialAuxiliaryState = res.updatedAuxiliaryState;
}

let parallelAId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_BC',
    throughPointId: 'A'
  }, getContext());
  parallelAId = res.createdEntityIds[0];
  initialAuxiliaryState = res.updatedAuxiliaryState;
}

let diagBDId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_DIAGONAL',
    vertex1Id: 'B',
    vertex2Id: 'D'
  }, getContext());
  diagBDId = res.createdEntityIds[0];
  initialAuxiliaryState = res.updatedAuxiliaryState;
}

let interPId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_INTERSECTION',
    entity1Id: parallelAId,
    entity2Id: diagBDId
  }, getContext());
  assert(res.success, 'CONSTRUCT_INTERSECTION failed');
  interPId = res.createdEntityIds[0];
  initialAuxiliaryState = res.updatedAuxiliaryState;
}

let measureACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'MEASURE_DISTANCE',
    p1Id: 'A',
    p2Id: 'C'
  }, getContext());
  measureACId = res.createdEntityIds[0];
  initialAuxiliaryState = res.updatedAuxiliaryState;
}

// Record initial state version for purity verification
const originalVersion = initialGeometryState.stateVersion;

// ============================================================
// VALID SWEEP EXPERIMENT: 40° to 80° with step 5°
// ============================================================
const validConfig: ExplorationConfig = {
  initialGeometryState,
  initialAuxiliaryState,
  targetVertexId: 'A',
  startAngleDegrees: 40,
  endAngleDegrees: 80,
  stepDegrees: 5
};

console.log('Running valid parametric sweep (40° -> 80°, step 5°)...');
const snapshots = runParametricExploration(validConfig);

// 1. Verify exactly 9 snapshots are generated
assert.equal(snapshots.length, 9, 'Should generate exactly 9 snapshots');

// 2. Verify parameter sequence: 40, 45, 50, 55, 60, 65, 70, 75, 80
const expectedSequence = [40, 45, 50, 55, 60, 65, 70, 75, 80];
snapshots.forEach((snap, idx) => {
  const angleRad = snap.parameters.cyclicAngles!['A'];
  const angleDeg = (angleRad * 180) / Math.PI;
  const expectedDeg = expectedSequence[idx];
  assert(Math.abs(angleDeg - expectedDeg) < 1e-6, `Snapshot ${idx} angle should be ${expectedDeg}°, got ${angleDeg}°`);
});

// 3. Verify strictly increasing stateVersion across snapshots
for (let i = 1; i < snapshots.length; i++) {
  assert(snapshots[i].metadata.stateVersion > snapshots[i - 1].metadata.stateVersion, 'stateVersion must be strictly increasing');
}

// 4. Verify A coordinates change as expected
snapshots.forEach((snap, idx) => {
  const ptA = snap.points.find(p => p.id === 'A')!;
  const expectedAngleRad = (expectedSequence[idx] * Math.PI) / 180;
  const expectedX = radius * Math.cos(expectedAngleRad);
  const expectedY = radius * Math.sin(expectedAngleRad);
  assert(Math.abs(ptA.x - expectedX) < 1e-6, `Snapshot ${idx} A.x matches expected`);
  assert(Math.abs(ptA.y - expectedY) < 1e-6, `Snapshot ${idx} A.y matches expected`);
});

// 5. Verify dependent intersection coordinates change dynamically
const initialS0_P = snapshots[0].points.find(p => p.id === interPId)!;
const finalS8_P = snapshots[8].points.find(p => p.id === interPId)!;
assert(Math.abs(finalS8_P.x - initialS0_P.x) > 1e-3 || Math.abs(finalS8_P.y - initialS0_P.y) > 1e-3, 'Intersection coordinates must update across the sweep');

// 6. Verify dependent measurements change where mathematically expected
const initialS0_Dist = snapshots[0].measurements.find(m => m.id === measureACId)!.value;
const finalS8_Dist = snapshots[8].measurements.find(m => m.id === measureACId)!.value;
assert(Math.abs(finalS8_Dist - initialS0_Dist) > 1e-3, 'Distance AC must update across the sweep');

// 7. Verify construction and measurement IDs remain stable across snapshots
const initialLineIds = snapshots[0].constructions.map(c => c.id).sort();
const initialMeasureIds = snapshots[0].measurements.map(m => m.id).sort();
snapshots.forEach((snap, idx) => {
  const currentLineIds = snap.constructions.map(c => c.id).sort();
  const currentMeasureIds = snap.measurements.map(m => m.id).sort();
  assert.deepStrictEqual(currentLineIds, initialLineIds, `Construction IDs must remain stable in snapshot ${idx}`);
  assert.deepStrictEqual(currentMeasureIds, initialMeasureIds, `Measurement IDs must remain stable in snapshot ${idx}`);
});

// 8. Verify no duplicate constructions appear in any snapshot
const expectedPointsCount = snapshots[0].points.length;
const expectedConstructionsCount = snapshots[0].constructions.length;
const expectedMeasurementsCount = snapshots[0].measurements.length;
snapshots.forEach((snap, idx) => {
  assert.equal(snap.points.length, expectedPointsCount, `Points count must remain stable in snapshot ${idx}`);
  assert.equal(snap.constructions.length, expectedConstructionsCount, `Constructions count must remain stable in snapshot ${idx}`);
  assert.equal(snap.measurements.length, expectedMeasurementsCount, `Measurements count must remain stable in snapshot ${idx}`);
});

// 9. Verify original initial states remain completely unchanged (pure function check)
assert.equal(initialGeometryState.stateVersion, originalVersion, 'Initial geometry state must remain unchanged');
const activeAnglesInitial = (initialGeometryState.canonicalInputs as any).angles;
assert(Math.abs((activeAnglesInitial[0] * 180) / Math.PI - 40) < 1e-6, 'Initial A angle must remain 40°');

// 10. Verify JSON serialization succeeds
const serialized = JSON.stringify(snapshots);
assert(typeof serialized === 'string', 'Should serialize snapshots array successfully');
const parsed = JSON.parse(serialized);
assert.equal(parsed.length, 9, 'Parsed snapshots count matches');

console.log('✓ Valid sweep experiment validated.');

// ============================================================
// INVALID CONFIGURATIONS EXPECTED TO FAIL DETERMINISTICALLY
// ============================================================

// A. step = 0
try {
  runParametricExploration({
    ...validConfig,
    stepDegrees: 0
  });
  assert.fail('Should have failed on step = 0');
} catch (err: any) {
  assert.equal(err.message, 'Step cannot be zero.', 'Correct error message on step = 0');
}

// B. start > end with positive step
try {
  runParametricExploration({
    ...validConfig,
    startAngleDegrees: 80,
    endAngleDegrees: 40,
    stepDegrees: 5
  });
  assert.fail('Should have failed on start > end with positive step');
} catch (err: any) {
  assert.equal(err.message, 'Incompatible step direction: start is greater than end, but step is positive.', 'Correct error message on incompatible positive step');
}

// C. start < end with negative step
try {
  runParametricExploration({
    ...validConfig,
    startAngleDegrees: 40,
    endAngleDegrees: 80,
    stepDegrees: -5
  });
  assert.fail('Should have failed on start < end with negative step');
} catch (err: any) {
  assert.equal(err.message, 'Incompatible step direction: start is less than end, but step is negative.', 'Correct error message on incompatible negative step');
}

// D. non-finite values
try {
  runParametricExploration({
    ...validConfig,
    startAngleDegrees: NaN
  });
  assert.fail('Should have failed on NaN start');
} catch (err: any) {
  assert.equal(err.message, 'Start angle, end angle, and step must be finite numbers.', 'Correct error message on non-finite values');
}

console.log('✓ Invalid sweep configurations rejected deterministically.');

console.log('🎉 ALL PARAMETRIC EXPLORATION ENGINE TESTS PASSED SUCCESSFULLY! 🎉');
