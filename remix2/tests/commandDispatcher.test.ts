/**
 * Headless Semantic Command Dispatcher Test Suite
 * R2 — Verifies autonomous agent and human common command layer
 */

import {
  dispatchSemanticCommand,
  CommandExecutionContext,
  resolvePoint,
  resolveSegmentOrLine
} from '../src/ui/state/commandDispatcher';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { Point } from '../src/types/geometry';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('=== RUNNING HEADLESS SEMANTIC COMMAND DISPATCHER TESTS ===');

// Setup mock geometric context: Cyclic quadrilateral ABCD with center O(0,0) and R=100
const canonicalVertices = [
  { id: 'A', cartesian: { id: 'A', x: 100, y: 0 }, label: 'A' },
  { id: 'B', cartesian: { id: 'B', x: 0, y: 100 }, label: 'B' },
  { id: 'C', cartesian: { id: 'C', x: -100, y: 0 }, label: 'C' },
  { id: 'D', cartesian: { id: 'D', x: 0, y: -100 }, label: 'D' }
];

const circumcircle = {
  center: { id: 'O', x: 0, y: 0 },
  radius: 100
};

const baseChords = [
  { id: 'chord_AB', p1: canonicalVertices[0].cartesian, p2: canonicalVertices[1].cartesian, label: 'AB' },
  { id: 'chord_BC', p1: canonicalVertices[1].cartesian, p2: canonicalVertices[2].cartesian, label: 'BC' },
  { id: 'chord_CD', p1: canonicalVertices[2].cartesian, p2: canonicalVertices[3].cartesian, label: 'CD' },
  { id: 'chord_DA', p1: canonicalVertices[3].cartesian, p2: canonicalVertices[0].cartesian, label: 'DA' }
];

let state = createEmptyAuxiliaryState();

function getContext(): CommandExecutionContext {
  return {
    canonicalVertices,
    circumcircle,
    baseChords,
    auxiliaryState: state,
    bounds: 240
  };
}

// TEST 1: SELECT command
{
  const res = dispatchSemanticCommand({ type: 'SELECT', targetId: 'A', targetType: 'vertex' }, getContext());
  assert(res.success && res.status === 'SUCCESS', 'SELECT vertex failed');
  assert(res.updatedAuxiliaryState.selectedEntityId === 'A', 'selectedEntityId should be A');
  state = res.updatedAuxiliaryState;

  const clearRes = dispatchSemanticCommand({ type: 'SELECT', targetId: null }, getContext());
  assert(clearRes.success && clearRes.updatedAuxiliaryState.selectedEntityId === null, 'Clear select failed');
  state = clearRes.updatedAuxiliaryState;
  console.log('✓ TEST 1: SELECT command verified.');
}

// TEST 2: CONSTRUCT_POINT command (free, on_circle, on_segment)
let freePtId = '';
{
  const resFree = dispatchSemanticCommand({ type: 'CONSTRUCT_POINT', x: 50, y: 50, pointType: 'free' }, getContext());
  assert(resFree.success && resFree.createdEntityIds.length === 1, 'Free point creation failed');
  freePtId = resFree.createdEntityIds[0];
  state = resFree.updatedAuxiliaryState;

  // On circle (projected to radius 100)
  const resCirc = dispatchSemanticCommand({ type: 'CONSTRUCT_POINT', x: 200, y: 0, pointType: 'on_circle' }, getContext());
  assert(resCirc.success, 'On-circle point creation failed');
  const ptCirc = resCirc.updatedAuxiliaryState.points.find(p => p.id === resCirc.createdEntityIds[0]);
  assert(ptCirc !== undefined && Math.abs(ptCirc.x - 100) < 1e-4 && Math.abs(ptCirc.y - 0) < 1e-4, 'Point should project onto circle');
  state = resCirc.updatedAuxiliaryState;
  console.log('✓ TEST 2: CONSTRUCT_POINT command verified.');
}

// TEST 3: CONSTRUCT_SEGMENT command
let segId = '';
{
  const resSeg = dispatchSemanticCommand({ type: 'CONSTRUCT_SEGMENT', p1Id: 'A', p2Id: freePtId }, getContext());
  assert(resSeg.success && resSeg.createdEntityIds.length === 1, 'Segment creation failed');
  segId = resSeg.createdEntityIds[0];
  state = resSeg.updatedAuxiliaryState;

  // Error case: self connection
  const resSelf = dispatchSemanticCommand({ type: 'CONSTRUCT_SEGMENT', p1Id: 'A', p2Id: 'A' }, getContext());
  assert(!resSelf.success && resSelf.status === 'INVALID_GEOMETRY', 'Connecting point to itself should fail');

  // Error case: missing point
  const resMissing = dispatchSemanticCommand({ type: 'CONSTRUCT_SEGMENT', p1Id: 'A', p2Id: 'NON_EXISTENT' }, getContext());
  assert(!resMissing.success && resMissing.status === 'MISSING_ENTITY', 'Missing point should fail');
  console.log('✓ TEST 3: CONSTRUCT_SEGMENT command verified.');
}

// TEST 4: MEASURE_DISTANCE command
{
  const resDist = dispatchSemanticCommand({ type: 'MEASURE_DISTANCE', p1Id: 'A', p2Id: 'C' }, getContext());
  assert(resDist.success && resDist.observation?.distanceMm !== undefined, 'Distance measurement failed');
  assert(Math.abs((resDist.observation?.distanceMm ?? 0) - 200) < 1e-4, 'Distance AC should be 200');
  state = resDist.updatedAuxiliaryState;
  console.log('✓ TEST 4: MEASURE_DISTANCE command verified.');
}

// TEST 5: CONSTRUCT_COMPASS command
{
  const resComp = dispatchSemanticCommand({ type: 'CONSTRUCT_COMPASS', centerId: 'O', radius: 50, radiusPointId: 'A' }, getContext());
  assert(resComp.success && resComp.createdEntityIds.length === 1, 'Compass creation failed');
  const compCirc = resComp.updatedAuxiliaryState.circles.find(c => c.id === resComp.createdEntityIds[0]);
  assert(compCirc !== undefined && Math.abs(compCirc.radius - 100) < 1e-4, 'Compass circle radius should match distance O to A');
  state = resComp.updatedAuxiliaryState;

  // Invalid radius
  const resInvalid = dispatchSemanticCommand({ type: 'CONSTRUCT_COMPASS', centerId: 'O', radius: 0 }, getContext());
  assert(!resInvalid.success && resInvalid.status === 'INVALID_GEOMETRY', 'Zero radius compass should fail');
  console.log('✓ TEST 5: CONSTRUCT_COMPASS command verified.');
}

// TEST 6: CONSTRUCT_LINE command
{
  const resLine = dispatchSemanticCommand({ type: 'CONSTRUCT_LINE', p1Id: 'A', p2Id: 'C' }, getContext());
  assert(resLine.success && resLine.createdEntityIds.length === 1, 'Line creation failed');
  state = resLine.updatedAuxiliaryState;
  console.log('✓ TEST 6: CONSTRUCT_LINE command verified.');
}

// TEST 7: CONSTRUCT_CIRCLE command
{
  const resCircle = dispatchSemanticCommand({ type: 'CONSTRUCT_CIRCLE', centerId: 'B', radius: 60 }, getContext());
  assert(resCircle.success && resCircle.createdEntityIds.length === 1, 'Circle creation failed');
  state = resCircle.updatedAuxiliaryState;
  console.log('✓ TEST 7: CONSTRUCT_CIRCLE command verified.');
}

// TEST 8: CONSTRUCT_PARALLEL command
{
  const resPar = dispatchSemanticCommand({ type: 'CONSTRUCT_PARALLEL', referenceSegmentId: 'chord_AB', throughPointId: 'C' }, getContext());
  assert(resPar.success && resPar.createdEntityIds.length === 1, 'Parallel line creation failed');
  state = resPar.updatedAuxiliaryState;
  console.log('✓ TEST 8: CONSTRUCT_PARALLEL command verified.');
}

// TEST 9: CONSTRUCT_PERPENDICULAR command
{
  const resPerp = dispatchSemanticCommand({ type: 'CONSTRUCT_PERPENDICULAR', referenceSegmentId: 'chord_AB', throughPointId: 'C' }, getContext());
  assert(resPerp.success && resPerp.createdEntityIds.length === 1, 'Perpendicular line creation failed');
  state = resPerp.updatedAuxiliaryState;
  console.log('✓ TEST 9: CONSTRUCT_PERPENDICULAR command verified.');
}

// TEST 10: CONSTRUCT_ANGLE_BISECTOR command
{
  const resBis = dispatchSemanticCommand({
    type: 'CONSTRUCT_ANGLE_BISECTOR',
    arm1PointId: 'A',
    vertexPointId: 'B',
    arm2PointId: 'C'
  }, getContext());
  assert(resBis.success && resBis.createdEntityIds.length === 1, 'Angle bisector creation failed');
  state = resBis.updatedAuxiliaryState;
  console.log('✓ TEST 10: CONSTRUCT_ANGLE_BISECTOR command verified.');
}

// TEST 11: CONSTRUCT_DIAGONAL command
let diagACId = '';
let diagBDId = '';
{
  // Non-adjacent AC: should succeed
  const resAC = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'C' }, getContext());
  assert(resAC.success && resAC.createdEntityIds.length === 1, 'Diagonal AC creation failed');
  diagACId = resAC.createdEntityIds[0];
  state = resAC.updatedAuxiliaryState;

  // Non-adjacent BD: should succeed
  const resBD = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'B', vertex2Id: 'D' }, getContext());
  assert(resBD.success && resBD.createdEntityIds.length === 1, 'Diagonal BD creation failed');
  diagBDId = resBD.createdEntityIds[0];
  state = resBD.updatedAuxiliaryState;

  // Adjacent AB: should be rejected
  const resAdj = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'B' }, getContext());
  assert(!resAdj.success && resAdj.status === 'INVALID_GEOMETRY', 'Adjacent vertices must be rejected as diagonals');

  // Same vertex AA: should be rejected
  const resSame = dispatchSemanticCommand({ type: 'CONSTRUCT_DIAGONAL', vertex1Id: 'A', vertex2Id: 'A' }, getContext());
  assert(!resSame.success && resSame.status === 'INVALID_GEOMETRY', 'Same vertex must be rejected as diagonal');

  console.log('✓ TEST 11: CONSTRUCT_DIAGONAL command verified.');
}

// TEST 12: CONSTRUCT_INTERSECTION command
let interPtId = '';
{
  const resInter = dispatchSemanticCommand({
    type: 'CONSTRUCT_INTERSECTION',
    entity1Id: diagACId,
    entity2Id: diagBDId
  }, getContext());
  assert(resInter.success && resInter.createdEntityIds.length === 1, 'Diagonal intersection failed');
  interPtId = resInter.createdEntityIds[0];
  const pPoint = resInter.updatedAuxiliaryState.points.find(p => p.id === interPtId);
  assert(pPoint !== undefined && pPoint.label === 'P', 'Diagonal intersection point must be labeled P');
  if (!pPoint) throw new Error('pPoint undefined');
  assert(Math.abs(pPoint.x) < 1e-4 && Math.abs(pPoint.y) < 1e-4, 'Diagonal intersection of AC and BD must be (0,0)');
  state = resInter.updatedAuxiliaryState;
  console.log('✓ TEST 12: CONSTRUCT_INTERSECTION command verified.');
}

// TEST 13: ERASE_ENTITY command
{
  // Erase intersection point
  const eraseRes = dispatchSemanticCommand({ type: 'ERASE_ENTITY', entityId: interPtId }, getContext());
  assert(eraseRes.success, 'Erasing auxiliary point failed');
  assert(!eraseRes.updatedAuxiliaryState.points.some(p => p.id === interPtId), 'Point P should be deleted');
  state = eraseRes.updatedAuxiliaryState;

  // Protect canonical vertices
  const eraseA = dispatchSemanticCommand({ type: 'ERASE_ENTITY', entityId: 'A' }, getContext());
  assert(!eraseA.success && eraseA.status === 'INVALID_COMMAND', 'Canonical vertex A must be protected from deletion');

  const eraseO = dispatchSemanticCommand({ type: 'ERASE_ENTITY', entityId: 'O' }, getContext());
  assert(!eraseO.success && eraseO.status === 'INVALID_COMMAND', 'Center O must be protected from deletion');

  console.log('✓ TEST 13: ERASE_ENTITY command verified.');
}

console.log('🎉 ALL HEADLESS SEMANTIC COMMAND DISPATCHER TESTS PASSED SUCCESSFULLY! 🎉');
