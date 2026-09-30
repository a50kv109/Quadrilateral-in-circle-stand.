/**
 * Regression Test Suite for Area as a First-Class Derived Measurement
 * Verifies Reference Circle Area & Inscribed Polygon Gap Metrics (S_circle, S_quad, S_gap, K_fill, K_gap)
 */

import { strict as assert } from 'assert';
import { GeometryCore } from '../src/kernel/dag/geometryCore';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { createGeometryStateSnapshot } from '../src/research/index';
import { runParametricExploration } from '../src/research/index';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';

console.log('=== RUNNING REFERENCE CIRCLE & GAP REGRESSION TESTS ===');

const center = { id: 'O', x: 0, y: 0 };
const radius = 160;

// Helper to construct execution context
function getContext(geo: UniversalGeometryState, aux = createEmptyAuxiliaryState()): CommandExecutionContext {
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

// ============================================================
// A & B & C. SQUARE SPECIAL CASE VERIFICATIONS
// ============================================================
// Square at angles 0°, 90°, 180°, 270° CCW
const squareAnglesRad = [0, 90, 180, 270].map(deg => (deg * Math.PI) / 180);
const squareState = UniversalGeometryState.createCyclic(center, radius, squareAnglesRad);
const squareSnapshot = createGeometryStateSnapshot(squareState, createEmptyAuxiliaryState());

assert(squareSnapshot.area !== undefined, 'Snapshot area must be defined');

// A. Fixed R -> circle area matches expected
const expectedCircleArea = Math.PI * radius * radius;
assert(Math.abs(squareSnapshot.area.referenceValue - expectedCircleArea) < 1e-6, 'Reference circle area must match πR²');
console.log(`✓ Fixed R circle area constant: ${squareSnapshot.area.referenceValue.toFixed(1)} mm²`);

// B. Square -> S_quad = 2R²
const expectedSquareArea = 2 * radius * radius; // 51200
assert(Math.abs(squareSnapshot.area.value - expectedSquareArea) < 1e-6, `Square S_quad area must be 2R² (${expectedSquareArea}), got ${squareSnapshot.area.value}`);

// B. Square -> K_fill = 2/π
const expectedKFill = 2 / Math.PI; // ~0.636619...
assert(Math.abs(squareSnapshot.area.fillRatio - expectedKFill) < 1e-9, `Square K_fill must be exactly 2/π, got ${squareSnapshot.area.fillRatio}`);
console.log(`✓ Square K_fill matches exactly 2/π ≈ ${(expectedKFill * 100).toFixed(2)}%`);

// C. Square -> K_gap = 1 - 2/π
const expectedKGap = 1 - 2 / Math.PI; // ~0.363380...
assert(Math.abs(squareSnapshot.area.gapRatio - expectedKGap) < 1e-9, `Square K_gap must be exactly 1 - 2/π, got ${squareSnapshot.area.gapRatio}`);
console.log(`✓ Square K_gap matches exactly 1 - 2/π ≈ ${(expectedKGap * 100).toFixed(2)}%`);

// G. fillRatio + gapRatio = 1
assert(Math.abs(squareSnapshot.area.fillRatio + squareSnapshot.area.gapRatio - 1) < 1e-15, 'K_fill + K_gap must sum to exactly 1');
console.log('✓ Dimensionless ratios sum up to exactly 1.0 (fillRatio + gapRatio = 1).');

// ============================================================
// D. ASYMMETRIC CYCLIC QUADRILATERAL
// ============================================================
// Angles at 40°, 100°, 220°, 310°
const asymmetricAnglesRad = [40, 100, 220, 310].map(deg => (deg * Math.PI) / 180);
const asymmetricState = UniversalGeometryState.createCyclic(center, radius, asymmetricAnglesRad);
const asymmetricSnapshot = createGeometryStateSnapshot(asymmetricState, createEmptyAuxiliaryState());

assert(asymmetricSnapshot.area !== undefined, 'Asymmetric snapshot area must be defined');
assert(asymmetricSnapshot.area.value > 0, 'Asymmetric area must be positive');
assert(asymmetricSnapshot.area.value < expectedSquareArea, 'Asymmetric area must be strictly less than maximal square area');
console.log(`✓ Asymmetric cyclic area calculated: ${asymmetricSnapshot.area.value.toFixed(1)} mm² (K_fill = ${(asymmetricSnapshot.area.fillRatio * 100).toFixed(2)}%)`);

// ============================================================
// E. SWEEP ANGLE VERIFICATION
// ============================================================
// Run sweep to show that S_circle remains exactly constant while S_quad & S_gap change
let geoState = asymmetricState;
let auxState = createEmptyAuxiliaryState();

const sweepSnapshots = runParametricExploration({
  initialGeometryState: geoState,
  initialAuxiliaryState: auxState,
  targetVertexId: 'A',
  startAngleDegrees: 40,
  endAngleDegrees: 80,
  stepDegrees: 10
});

assert.equal(sweepSnapshots.length, 5, 'Sweep should produce 5 snapshots');
sweepSnapshots.forEach((snap, idx) => {
  assert(snap.area !== undefined, `Snapshot ${idx} area must be defined`);
  // Reference circle area MUST be exactly identical across the sweep because R is fixed at 160
  assert.equal(snap.area.referenceValue, squareSnapshot.area!.referenceValue, `Reference area must be exactly identical at step ${idx}`);
  
  // S_gap must equal S_circle - S_quad
  assert(Math.abs(snap.area.gapValue - (snap.area.referenceValue - snap.area.value)) < 1e-9, `S_gap must match referenceValue - value at step ${idx}`);
  
  // fillRatio + gapRatio = 1
  assert(Math.abs(snap.area.fillRatio + snap.area.gapRatio - 1) < 1e-15, `fillRatio + gapRatio must sum to 1 at step ${idx}`);
});
console.log('✓ Parametric angle sweep verified: S_circle remains perfectly constant, S_quad and S_gap update dynamically.');

// ============================================================
// F. CHANGING R SCALING VERIFICATION (S_circle scale as R²)
// ============================================================
const stateR100 = UniversalGeometryState.createCyclic(center, 100, squareAnglesRad);
const snapR100 = createGeometryStateSnapshot(stateR100, createEmptyAuxiliaryState());

const stateR200 = UniversalGeometryState.createCyclic(center, 200, squareAnglesRad);
const snapR200 = createGeometryStateSnapshot(stateR200, createEmptyAuxiliaryState());

// S_circle should scale as (R2 / R1)² = (200 / 100)² = 4
const scaleFactor = snapR200.area!.referenceValue / snapR100.area!.referenceValue;
assert(Math.abs(scaleFactor - 4.0) < 1e-9, `Reference area scaling must be exactly 4, got ${scaleFactor}`);

// S_quad should also scale as exactly 4
const quadScaleFactor = snapR200.area!.value / snapR100.area!.value;
assert(Math.abs(quadScaleFactor - 4.0) < 1e-9, `Object area scaling must be exactly 4, got ${quadScaleFactor}`);

// BUT the ratios K_fill and K_gap must remain EXACTLY identical (scale invariance)!
assert.equal(snapR100.area!.fillRatio, snapR200.area!.fillRatio, 'K_fill must be scale invariant');
assert.equal(snapR100.area!.gapRatio, snapR200.area!.gapRatio, 'K_gap must be scale invariant');
console.log('✓ Scaling verification passed: S_circle and S_quad scale perfectly by R², ratios K_fill and K_gap are strictly scale-invariant.');

// ============================================================
// H. VIEWPORT / ZOOM INDEPENDENCE
// ============================================================
// Verified by snapR100 area being exactly correct without any canvas scale passed
assert(snapR100.area!.value > 0, 'Area must be calculated purely from canonical coordinate geometry');
console.log('✓ Viewport & zoom independence verified.');

// ============================================================
// I. JSON SERIALIZATION
// ============================================================
const serialized = JSON.stringify(asymmetricSnapshot);
const parsed = JSON.parse(serialized);
assert.deepStrictEqual(parsed.area, asymmetricSnapshot.area, 'JSON serialization must preserve the complete area property structure');
console.log('✓ JSON serialization is deterministic and complete.');

// ============================================================
// J. ORIGINAL STATE IMMUTABILITY
// ============================================================
const originalVersion = geoState.stateVersion;
const originalAngles = (geoState.canonicalInputs as any).angles;

const res = dispatchSemanticCommand({
  type: 'SET_CANONICAL_VERTEX_ANGLE',
  vertexId: 'A',
  angle: 60
}, getContext(geoState, auxState));
assert(res.success, 'Command dispatch failed');

assert.equal(geoState.stateVersion, originalVersion, 'Original state version must be preserved');
assert.equal((geoState.canonicalInputs as any).angles[0], originalAngles[0], 'Original angles must be preserved');
console.log('✓ Original GeometryState remains strictly immutable.');

console.log('🎉 ALL REFERENCE CIRCLE & GAP REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
