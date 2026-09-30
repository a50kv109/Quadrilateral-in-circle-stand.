/**
 * Checkpoint Buffer Regression & Isolation Test Suite (v0.1)
 * 
 * Verifies:
 * - TEST A: SAVE immutability
 * - TEST B: Monotonic RESTORE
 * - TEST C: Dependent construction (diag_A_C) dynamic recomputation & restore
 * - TEST D: Three-slot independent isolation & overwrite
 * - TEST E: CLEAR slot & deterministic EMPTY_SLOT failure
 * - TEST F: Snapshot separation (100 external snapshots do not affect 3 internal slots)
 * - TEST G: Deep immutability (no shared mutable references)
 * - TEST H: Full Machine Workflow (Save -> Mutate -> Snapshot -> Restore -> Verify)
 */

import assert from 'assert';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import {
  createCheckpointBuffer,
  CheckpointBuffer,
  createGeometryStateSnapshot
} from '../src/research/index';

console.log('=== RUNNING CHECKPOINT BUFFER REGRESSION TESTS (v0.1) ===');

const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

function buildContext(
  geoState: UniversalGeometryState,
  auxState: any,
  buffer?: CheckpointBuffer
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
    circumcircle: { center: { id: 'O', x: 0, y: 0 }, radius: 160 },
    baseChords,
    auxiliaryState: auxState,
    geometryState: geoState,
    checkpointBuffer: buffer
  };
}

// ============================================================
// TEST A — SAVE IMMUTABILITY
// ============================================================
{
  const buffer = createCheckpointBuffer();
  let geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_A_INIT'
  );
  let aux = createEmptyAuxiliaryState();

  const ctx = buildContext(geo, aux, buffer);
  const saveRes = dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1, label: 'baseline' }, ctx);
  assert(saveRes.success, 'SAVE_CHECKPOINT(1) must succeed');

  const slot1Before = buffer.get(1);
  assert(slot1Before !== null, 'Slot 1 must be occupied');
  const angleBefore = radToDeg((slot1Before.geoState.canonicalInputs as any).angles[0]);
  assert.strictEqual(angleBefore, 40, 'Slot 1 angle must be 40°');

  // Mutate live state
  const ctx2 = buildContext(geo, aux, buffer);
  const moveRes = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 60 }, ctx2);
  geo = moveRes.updatedGeometryState!;

  const slot1After = buffer.get(1);
  assert(slot1After !== null, 'Slot 1 must still be occupied');
  const angleAfter = radToDeg((slot1After.geoState.canonicalInputs as any).angles[0]);
  assert.strictEqual(angleAfter, 40, 'Slot 1 angle must remain 40° despite live mutation');

  console.log('✓ TEST A: SAVE immutability verified.');
}

// ============================================================
// TEST B — MONOTONIC RESTORE
// ============================================================
{
  const buffer = createCheckpointBuffer();
  let geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_B_INIT'
  );
  let aux = createEmptyAuxiliaryState();
  const v1 = geo.stateVersion;

  // Save Baseline (v1)
  let ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1, label: 'baseline' }, ctx);

  // Mutate to 60° (v2)
  ctx = buildContext(geo, aux, buffer);
  const moveRes = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 60 }, ctx);
  geo = moveRes.updatedGeometryState!;
  aux = moveRes.updatedAuxiliaryState;
  const v2 = geo.stateVersion;
  assert(v2 > v1, 'v2 must be greater than v1');

  // Restore Slot 1
  ctx = buildContext(geo, aux, buffer);
  const restoreRes = dispatchSemanticCommand({ type: 'RESTORE_CHECKPOINT', slot: 1 }, ctx);
  assert(restoreRes.success, 'RESTORE_CHECKPOINT(1) must succeed');

  geo = restoreRes.updatedGeometryState!;
  aux = restoreRes.updatedAuxiliaryState;
  const v3 = geo.stateVersion;

  assert(v3 > v2, `v3 (${v3}) must be strictly greater than v2 (${v2}) (monotonicity)`);
  const angleRestored = radToDeg((geo.canonicalInputs as any).angles[0]);
  assert(Math.abs(angleRestored - 40) < 1e-9, `Restored angle must be 40°, got ${angleRestored}`);
  assert(geo.provenance.includes('RESTORE_CHECKPOINT_1_FROM_V1'), `Provenance must indicate restore: ${geo.provenance}`);

  console.log('✓ TEST B: Monotonic RESTORE verified.');
}

// ============================================================
// TEST C — DEPENDENT CONSTRUCTION DYNAMIC RECOMPUTATION & RESTORE
// ============================================================
{
  const buffer = createCheckpointBuffer();
  let geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_C_INIT'
  );
  let aux = createEmptyAuxiliaryState();

  // 1. Construct Diagonal AC
  let ctx = buildContext(geo, aux, buffer);
  const diagRes = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctx);
  aux = diagRes.updatedAuxiliaryState;

  const diagInit = aux.segments.find((s) => s.id === 'diag_A_C');
  assert(diagInit, 'diag_A_C must exist');
  assert.strictEqual(diagInit.lengthMm, 320, 'Initial AC length must be 320 mm (2R)');
  assert.deepStrictEqual(diagInit.parentIds, ['A', 'C'], 'parentIds must be ["A", "C"]');

  // 2. Save slot 1
  ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1 }, ctx);

  // 3. Mutate A to 70°
  ctx = buildContext(geo, aux, buffer);
  const moveRes = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 70 }, ctx);
  geo = moveRes.updatedGeometryState!;
  aux = moveRes.updatedAuxiliaryState;

  const diagMoved = aux.segments.find((s) => s.id === 'diag_A_C');
  assert(diagMoved, 'diag_A_C must still exist after move');
  assert(diagMoved.lengthMm < 315, `AC length must have changed during move: ${diagMoved.lengthMm}`);

  // 4. Restore slot 1
  ctx = buildContext(geo, aux, buffer);
  const restoreRes = dispatchSemanticCommand({ type: 'RESTORE_CHECKPOINT', slot: 1 }, ctx);
  geo = restoreRes.updatedGeometryState!;
  aux = restoreRes.updatedAuxiliaryState;

  const diagRestored = aux.segments.find((s) => s.id === 'diag_A_C');
  assert(diagRestored, 'diag_A_C must exist after restore');
  assert(Math.abs(diagRestored.lengthMm - 320) < 1e-9, `AC length must return to 320 mm: ${diagRestored.lengthMm}`);
  assert.deepStrictEqual(diagRestored.parentIds, ['A', 'C'], 'parentIds must remain ["A", "C"]');

  console.log('✓ TEST C: Dependent construction recomputation & restore verified.');
}

// ============================================================
// TEST D — THREE SLOT ISOLATION & OVERWRITE
// ============================================================
{
  const buffer = createCheckpointBuffer();
  let geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_D_INIT'
  );
  let aux = createEmptyAuxiliaryState();

  // Save Slot 1 = 40°
  let ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1, label: 'A40' }, ctx);

  // Save Slot 2 = 60°
  ctx = buildContext(geo, aux, buffer);
  let res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 60 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;
  ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 2, label: 'A60' }, ctx);

  // Save Slot 3 = 80°
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 80 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;
  ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 3, label: 'A80' }, ctx);

  // Overwrite Slot 2 with 70°
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 70 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;
  ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 2, label: 'A70' }, ctx);

  // Verify Slot 1 is still 40°
  const s1 = buffer.get(1);
  assert.strictEqual(radToDeg((s1!.geoState.canonicalInputs as any).angles[0]), 40);
  assert.strictEqual(s1!.label, 'A40');

  // Verify Slot 2 is now 70°
  const s2 = buffer.get(2);
  assert.strictEqual(radToDeg((s2!.geoState.canonicalInputs as any).angles[0]), 70);
  assert.strictEqual(s2!.label, 'A70');

  // Verify Slot 3 is still 80°
  const s3 = buffer.get(3);
  assert.strictEqual(radToDeg((s3!.geoState.canonicalInputs as any).angles[0]), 80);
  assert.strictEqual(s3!.label, 'A80');

  console.log('✓ TEST D: Three slot isolation and overwrite verified.');
}

// ============================================================
// TEST E — CLEAR SLOT & DETERMINISTIC EMPTY_SLOT FAILURE
// ============================================================
{
  const buffer = createCheckpointBuffer();
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_E_INIT'
  );
  const aux = createEmptyAuxiliaryState();

  const ctx = buildContext(geo, aux, buffer);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1 }, ctx);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 2 }, ctx);
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 3 }, ctx);

  assert.strictEqual(buffer.occupiedCount, 3);

  // Clear slot 2
  const clearRes = dispatchSemanticCommand({ type: 'CLEAR_CHECKPOINT', slot: 2 }, ctx);
  assert(clearRes.success, 'CLEAR_CHECKPOINT(2) must succeed');
  assert.strictEqual(buffer.occupiedCount, 2);

  const list = buffer.list();
  assert(list[0].isOccupied, 'Slot 1 must be occupied');
  assert(!list[1].isOccupied, 'Slot 2 must NOT be occupied');
  assert(list[2].isOccupied, 'Slot 3 must be occupied');

  // Restore cleared slot 2 must fail deterministically
  const restoreEmpty = dispatchSemanticCommand({ type: 'RESTORE_CHECKPOINT', slot: 2 }, ctx);
  assert(!restoreEmpty.success, 'Restoring empty slot must fail');
  assert.strictEqual(restoreEmpty.status, 'MISSING_ENTITY');
  assert(restoreEmpty.message?.includes('EMPTY_SLOT'), `Error must report EMPTY_SLOT: ${restoreEmpty.message}`);

  console.log('✓ TEST E: CLEAR slot & deterministic EMPTY_SLOT failure verified.');
}

// ============================================================
// TEST F — SNAPSHOT SEPARATION
// ============================================================
{
  const buffer = createCheckpointBuffer();
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_F_INIT'
  );
  const aux = createEmptyAuxiliaryState();
  const ctx = buildContext(geo, aux, buffer);

  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1 }, ctx);
  assert.strictEqual(buffer.occupiedCount, 1);

  // Create 100 external snapshots
  const externalSnapshots = [];
  for (let i = 0; i < 100; i++) {
    const snap = createGeometryStateSnapshot(geo, aux);
    externalSnapshots.push(snap);
  }

  assert.strictEqual(externalSnapshots.length, 100);
  assert.strictEqual(buffer.occupiedCount, 1, 'Checkpoint buffer must still have exactly 1 occupied slot');
  assert.strictEqual(buffer.list().length, 3, 'Checkpoint buffer slots count must strictly remain 3');

  console.log('✓ TEST F: Snapshot separation verified (100 external snapshots isolated from 3 slots).');
}

// ============================================================
// TEST G — DEEP IMMUTABILITY & NO SHARED MUTABLE REFERENCES
// ============================================================
{
  const buffer = createCheckpointBuffer();
  const geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'TEST_G_INIT'
  );
  let aux = createEmptyAuxiliaryState();

  const ctx = buildContext(geo, aux, buffer);
  const diagRes = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctx);
  aux = diagRes.updatedAuxiliaryState;

  // Save to slot 1
  dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1 }, ctx);

  const slotRecord = buffer.get(1)!;

  // Mutate auxiliaryState in live session by adding another entity
  const lineRes = dispatchSemanticCommand({
    type: 'CONSTRUCT_LINE',
    p1Id: 'A',
    p2Id: 'B'
  }, { ...ctx, auxiliaryState: aux });

  aux = lineRes.updatedAuxiliaryState;
  assert.strictEqual(aux.lines.length, 1, 'Live auxState now has 1 line');
  assert.strictEqual(slotRecord.auxState.lines.length, 0, 'Saved checkpoint auxState lines must remain 0');

  console.log('✓ TEST G: Deep immutability and lack of shared references verified.');
}

// ============================================================
// TEST H — COMPLETE MACHINE WORKFLOW
// ============================================================
{
  const buffer = createCheckpointBuffer();

  // 1. CREATE CYCLIC STATE
  let geo = UniversalGeometryState.createCyclic(
    { id: 'O', x: 0, y: 0 },
    160,
    [degToRad(40), degToRad(130), degToRad(220), degToRad(310)],
    'WORKFLOW_START'
  );
  let aux = createEmptyAuxiliaryState();
  const initialVersion = geo.stateVersion;

  // 2. CONSTRUCT_DIAGONAL AC
  let ctx = buildContext(geo, aux, buffer);
  let res = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, ctx);
  aux = res.updatedAuxiliaryState;
  assert(aux.segments.some((s) => s.id === 'diag_A_C'), 'Diagonal AC must exist');

  // 3. SAVE_CHECKPOINT slot 1 (Baseline)
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SAVE_CHECKPOINT', slot: 1, label: 'baseline' }, ctx);
  assert(res.success);

  // 4. SET_CANONICAL_VERTEX_ANGLE A=50
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 50 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;

  // 5. SET_CANONICAL_VERTEX_ANGLE A=60
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 60 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;

  // 6. CREATE SNAPSHOT (S_60)
  const snap60 = createGeometryStateSnapshot(geo, aux);
  assert.strictEqual(snap60.metadata.stateVersion, geo.stateVersion);

  // 7. SET_CANONICAL_VERTEX_ANGLE A=80
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'SET_CANONICAL_VERTEX_ANGLE', vertexId: 'A', angle: 80 }, ctx);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;

  // 8. CREATE SNAPSHOT (S_80)
  const snap80 = createGeometryStateSnapshot(geo, aux);
  assert(snap80.area!.value < snap60.area!.value, 'S_quad at 80° must be less than at 60°');

  // 9. RESTORE_CHECKPOINT slot 1
  ctx = buildContext(geo, aux, buffer);
  res = dispatchSemanticCommand({ type: 'RESTORE_CHECKPOINT', slot: 1 }, ctx);
  assert(res.success);
  geo = res.updatedGeometryState!;
  aux = res.updatedAuxiliaryState;

  // 10. CREATE SNAPSHOT (S_restored)
  const snapRestored = createGeometryStateSnapshot(geo, aux);

  // VERIFICATIONS:
  // - baseline restored
  const restoredAngle = radToDeg((geo.canonicalInputs as any).angles[0]);
  assert.strictEqual(Math.round(restoredAngle), 40, 'Restored angle A must be 40°');

  // - diagonal restored without duplicates
  const diags = aux.segments.filter((s) => s.id === 'diag_A_C');
  assert.strictEqual(diags.length, 1, 'Exactly one diag_A_C must exist (no duplicates)');
  assert.strictEqual(diags[0].lengthMm, 320, 'Diagonal length must be 320 mm');

  // - measurements restored
  assert.strictEqual(snapRestored.area?.value, 51200, 'Restored S_quad must equal baseline 51200 mm²');
  assert(Math.abs(snapRestored.area!.fillRatio - (2 / Math.PI)) < 1e-6, 'K_fill must equal 2/π');

  // - stateVersion remains monotonic
  assert(geo.stateVersion > initialVersion, `stateVersion (${geo.stateVersion}) must be monotonic`);

  // - provenance records restore
  assert(geo.provenance.startsWith('RESTORE_CHECKPOINT_1_FROM_V'), `Provenance must record restore: ${geo.provenance}`);

  console.log('✓ TEST H: Complete Machine Workflow (Save -> Mutate -> Snapshot -> Restore -> Verify) verified.');
}

console.log('🎉 ALL CHECKPOINT BUFFER REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
