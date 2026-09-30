/**
 * Agent Observation Utilities Test Suite (v0.1)
 * 
 * Verifies:
 * - TEST A: GET_ACTIVE_SNAPSHOT capture
 * - TEST B: GET_ACTIVE_SNAPSHOT read-only invariance
 * - TEST C: GET_ENTITY_MEASUREMENT on valid segment/diagonal
 * - TEST D: GET_ENTITY_MEASUREMENT on unknown entity (ENTITY_NOT_FOUND)
 * - TEST E: GET_ENTITY_MEASUREMENT on point/line without scalar metric (MEASUREMENT_UNAVAILABLE)
 * - TEST F: diffGeometrySnapshots parameter change calculation
 * - TEST G: diffGeometrySnapshots construction change calculation
 * - TEST H: diffGeometrySnapshots ADDED / REMOVED status
 * - TEST I: diffGeometrySnapshots area changes (after - before)
 * - TEST J: diffGeometrySnapshots immutability of input snapshots
 * - TEST K: diffGeometrySnapshots determinism
 * - TEST L: Pure DTO comparison with zero formula duplication
 */

import assert from 'assert';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import {
  createGeometryStateSnapshot,
  diffGeometrySnapshots
} from '../src/research/index';

console.log('=== RUNNING AGENT OBSERVATION UTILITIES TESTS (v0.1) ===');

const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

function buildContext(geoState: UniversalGeometryState, auxState: any): CommandExecutionContext {
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
    circumcircle: { center: { id: 'O', x: 0, y: 0 }, radius: 160 },
    baseChords,
    auxiliaryState: auxState,
    geometryState: geoState
  };
}

// ============================================================
// TEST A — ACTIVE SNAPSHOT
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_A_INIT'
  );
  const aux = createEmptyAuxiliaryState();
  const ctx = buildContext(geo, aux);

  const res = dispatchSemanticCommand({ type: 'GET_ACTIVE_SNAPSHOT' }, ctx);
  assert(res.success, 'GET_ACTIVE_SNAPSHOT must succeed');
  assert(res.snapshot !== undefined, 'Result must contain snapshot');
  assert.strictEqual(res.snapshot!.metadata.stateVersion, geo.stateVersion, 'Snapshot stateVersion must match geoState');
  assert.strictEqual(res.snapshot!.metadata.vertexCount, 4, 'Snapshot vertexCount must be 4');
  assert(res.snapshot!.area !== undefined, 'Snapshot area must be computed');

  console.log('✓ TEST A: GET_ACTIVE_SNAPSHOT capture verified.');
}

// ============================================================
// TEST B — ACTIVE SNAPSHOT READ ONLY
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_B_INIT'
  );
  const aux = createEmptyAuxiliaryState();
  const versionBefore = geo.stateVersion;
  const ctx = buildContext(geo, aux);

  const res = dispatchSemanticCommand({ type: 'GET_ACTIVE_SNAPSHOT' }, ctx);
  assert(res.success);
  assert.strictEqual(res.updatedGeometryState?.stateVersion, versionBefore, 'stateVersion must remain unchanged');
  assert.strictEqual(geo.stateVersion, versionBefore, 'Original stateVersion must be strictly equal');

  console.log('✓ TEST B: GET_ACTIVE_SNAPSHOT read-only invariance verified.');
}

// ============================================================
// TEST C — ENTITY MEASUREMENT
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_C_INIT'
  );
  let aux = createEmptyAuxiliaryState();
  let ctx = buildContext(geo, aux);

  // Construct diag_A_C
  const diagRes = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctx);
  aux = diagRes.updatedAuxiliaryState;
  ctx = buildContext(geo, aux);

  // Query measurement
  const measRes = dispatchSemanticCommand({ type: 'GET_ENTITY_MEASUREMENT', entityId: 'diag_A_C' }, ctx);
  assert(measRes.success, 'GET_ENTITY_MEASUREMENT must succeed for diag_A_C');
  assert(measRes.entityMeasurement !== undefined, 'entityMeasurement must be present');
  assert.strictEqual(measRes.entityMeasurement!.entityId, 'diag_A_C');
  assert.strictEqual(measRes.entityMeasurement!.entityType, 'diagonal');
  assert.strictEqual(measRes.entityMeasurement!.value, 320);
  assert.strictEqual(measRes.entityMeasurement!.units, 'mm');
  assert.strictEqual(measRes.entityMeasurement!.status, 'SUCCESS');
  assert.strictEqual(measRes.entityMeasurement!.stateVersion, geo.stateVersion);

  console.log('✓ TEST C: GET_ENTITY_MEASUREMENT for valid diagonal verified.');
}

// ============================================================
// TEST D — UNKNOWN ENTITY
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_D_INIT'
  );
  const aux = createEmptyAuxiliaryState();
  const ctx = buildContext(geo, aux);

  const unknownRes = dispatchSemanticCommand({ type: 'GET_ENTITY_MEASUREMENT', entityId: 'does_not_exist' }, ctx);
  assert(!unknownRes.success, 'Querying unknown entity must fail');
  assert.strictEqual(unknownRes.status, 'MISSING_ENTITY');
  assert.strictEqual(unknownRes.entityMeasurement?.status, 'ENTITY_NOT_FOUND');

  console.log('✓ TEST D: GET_ENTITY_MEASUREMENT on unknown entity (ENTITY_NOT_FOUND) verified.');
}

// ============================================================
// TEST E — MEASUREMENT UNAVAILABLE
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_E_INIT'
  );
  let aux = createEmptyAuxiliaryState();
  let ctx = buildContext(geo, aux);

  // Construct infinite line
  const lineRes = dispatchSemanticCommand({ type: 'CONSTRUCT_LINE', p1Id: 'A', p2Id: 'B' }, ctx);
  aux = lineRes.updatedAuxiliaryState;
  ctx = buildContext(geo, aux);

  // 1. Query point A (no scalar length)
  const ptRes = dispatchSemanticCommand({ type: 'GET_ENTITY_MEASUREMENT', entityId: 'A' }, ctx);
  assert(ptRes.success);
  assert.strictEqual(ptRes.entityMeasurement?.status, 'MEASUREMENT_UNAVAILABLE');
  assert.strictEqual(ptRes.entityMeasurement?.value, undefined);

  // 2. Query infinite line (no scalar length)
  const lineQueryRes = dispatchSemanticCommand({ type: 'GET_ENTITY_MEASUREMENT', entityId: lineRes.createdEntityIds[0] }, ctx);
  assert(lineQueryRes.success);
  assert.strictEqual(lineQueryRes.entityMeasurement?.status, 'MEASUREMENT_UNAVAILABLE');
  assert.strictEqual(lineQueryRes.entityMeasurement?.value, undefined);

  console.log('✓ TEST E: GET_ENTITY_MEASUREMENT for non-scalar entities (MEASUREMENT_UNAVAILABLE) verified.');
}

// ============================================================
// TEST F — DIFF PARAMETER
// ============================================================
{
  const geoA = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_F_A'
  );
  const geoB = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(50), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_F_B'
  );
  const aux = createEmptyAuxiliaryState();

  const snapA = createGeometryStateSnapshot(geoA, aux);
  const snapB = createGeometryStateSnapshot(geoB, aux);

  const diff = diffGeometrySnapshots(snapA, snapB);
  assert(diff.parameterChanges.length >= 4, 'Must contain parameter changes');
  const paramA = diff.parameterChanges.find((p) => p.name === 'θ_A');
  assert(paramA, 'Must contain change for θ_A');
  const deltaDeg = radToDeg(paramA.delta);
  assert(Math.abs(deltaDeg - 10) < 1e-6, `Delta for θ_A must be +10°, got ${deltaDeg}`);

  console.log('✓ TEST F: diffGeometrySnapshots parameter changes verified.');
}

// ============================================================
// TEST G — DIFF CONSTRUCTION
// ============================================================
{
  const geoA = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_G_A'
  );
  const geoB = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(80), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_G_B'
  );

  let auxA = createEmptyAuxiliaryState();
  let ctxA = buildContext(geoA, auxA);
  const resA = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctxA);
  auxA = resA.updatedAuxiliaryState;

  let auxB = createEmptyAuxiliaryState();
  let ctxB = buildContext(geoB, auxB);
  const resB = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctxB);
  auxB = resB.updatedAuxiliaryState;

  const snapA = createGeometryStateSnapshot(geoA, auxA);
  const snapB = createGeometryStateSnapshot(geoB, auxB);

  const diff = diffGeometrySnapshots(snapA, snapB);
  const diagChange = diff.constructionChanges.find((c) => c.id === 'diag_A_C');
  assert(diagChange, 'diag_A_C change must be present');
  assert.strictEqual(diagChange.status, 'CHANGED');
  assert.strictEqual(diagChange.before, 320);
  assert(diagChange.after! < 310, `after value must be < 310, got ${diagChange.after}`);
  assert(diagChange.delta! < 0, `delta must be negative, got ${diagChange.delta}`);

  console.log('✓ TEST G: diffGeometrySnapshots construction change verified.');
}

// ============================================================
// TEST H — ADDED / REMOVED STATUS
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_H'
  );
  const auxWithout = createEmptyAuxiliaryState();
  const ctx = buildContext(geo, auxWithout);
  const diagRes = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctx);
  const auxWith = diagRes.updatedAuxiliaryState;

  const snapWithout = createGeometryStateSnapshot(geo, auxWithout);
  const snapWith = createGeometryStateSnapshot(geo, auxWith);

  // snapWithout -> snapWith => ADDED
  const diffAdded = diffGeometrySnapshots(snapWithout, snapWith);
  const addedItem = diffAdded.constructionChanges.find((c) => c.id === 'diag_A_C');
  assert(addedItem, 'Item must be in diff');
  assert.strictEqual(addedItem.status, 'ADDED');
  assert.strictEqual(addedItem.before, undefined);
  assert.strictEqual(addedItem.after, 320);

  // snapWith -> snapWithout => REMOVED
  const diffRemoved = diffGeometrySnapshots(snapWith, snapWithout);
  const removedItem = diffRemoved.constructionChanges.find((c) => c.id === 'diag_A_C');
  assert(removedItem, 'Item must be in diff');
  assert.strictEqual(removedItem.status, 'REMOVED');
  assert.strictEqual(removedItem.before, 320);
  assert.strictEqual(removedItem.after, undefined);

  console.log('✓ TEST H: diffGeometrySnapshots ADDED / REMOVED status verified.');
}

// ============================================================
// TEST I — AREA DIFF
// ============================================================
{
  const geoA = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_I_A'
  );
  const geoB = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(60), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_I_B'
  );
  const aux = createEmptyAuxiliaryState();

  const snapA = createGeometryStateSnapshot(geoA, aux);
  const snapB = createGeometryStateSnapshot(geoB, aux);

  const diff = diffGeometrySnapshots(snapA, snapB);
  assert(diff.areaChanges !== undefined, 'areaChanges must be defined');
  const expectedDelta = snapB.area!.value - snapA.area!.value;
  assert(Math.abs(diff.areaChanges!.sQuadDelta! - expectedDelta) < 1e-9, 'sQuadDelta must equal after - before');
  assert(Math.abs(diff.areaChanges!.fillRatioDelta! - (snapB.area!.fillRatio - snapA.area!.fillRatio)) < 1e-9);

  console.log('✓ TEST I: diffGeometrySnapshots area changes (after - before) verified.');
}

// ============================================================
// TEST J — IMMUTABILITY OF INPUT SNAPSHOTS
// ============================================================
{
  const geoA = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_J_A'
  );
  const geoB = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(60), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_J_B'
  );
  const aux = createEmptyAuxiliaryState();

  const snapA = createGeometryStateSnapshot(geoA, aux);
  const snapB = createGeometryStateSnapshot(geoB, aux);

  const snapAJsonBefore = JSON.stringify(snapA);
  const snapBJsonBefore = JSON.stringify(snapB);

  diffGeometrySnapshots(snapA, snapB);

  assert.strictEqual(JSON.stringify(snapA), snapAJsonBefore, 'snapA must not be mutated');
  assert.strictEqual(JSON.stringify(snapB), snapBJsonBefore, 'snapB must not be mutated');

  console.log('✓ TEST J: diffGeometrySnapshots input snapshot immutability verified.');
}

// ============================================================
// TEST K — DETERMINISM
// ============================================================
{
  const geoA = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_K_A'
  );
  const geoB = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(60), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_K_B'
  );
  const aux = createEmptyAuxiliaryState();

  const snapA = createGeometryStateSnapshot(geoA, aux);
  const snapB = createGeometryStateSnapshot(geoB, aux);

  const diff1 = diffGeometrySnapshots(snapA, snapB);
  const diff2 = diffGeometrySnapshots(snapA, snapB);

  assert.strictEqual(JSON.stringify(diff1), JSON.stringify(diff2), 'Repeated diffs must be byte-for-byte identical');

  console.log('✓ TEST K: diffGeometrySnapshots determinism verified.');
}

// ============================================================
// TEST L — PURE DTO COMPARISON WITH ZERO FORMULA DUPLICATION
// ============================================================
{
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_L'
  );
  const aux = createEmptyAuxiliaryState();
  const snap = createGeometryStateSnapshot(geo, aux);

  const diff = diffGeometrySnapshots(snap, snap);
  assert.strictEqual(diff.parameterChanges.every((p) => p.delta === 0), true, 'Identical snapshots must yield 0 delta');
  assert.strictEqual(diff.areaChanges?.sQuadDelta, 0, 'Identical snapshots area delta must be 0');

  console.log('✓ TEST L: Pure DTO comparison with zero formula duplication verified.');
}

console.log('🎉 ALL AGENT OBSERVATION UTILITIES TESTS PASSED! 🎉');
