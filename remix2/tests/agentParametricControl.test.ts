/**
 * Agent Parametric Control & Dynamic Intersection Recomputation Test Suite
 */

import { strict as assert } from 'assert';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import { createDefaultQuadrilateralState } from '../src/ui/state/defaultState';
import { createEmptyAuxiliaryState } from '../src/ui/state/auxiliaryEngine';
import { AuxiliaryState } from '../src/ui/types/auxiliaryTypes';

console.log('=== RUNNING AGENT PARAMETRIC CONTROL & DYNAMIC INTERSECTION TESTS ===');

// Setup base states
let geometryState = createDefaultQuadrilateralState();
let auxiliaryState = createEmptyAuxiliaryState();

const R = 100.0; // Canonical radius
const vertices = [
  { id: 'A', cartesian: { id: 'A', x: 0, y: R }, label: 'A' },
  { id: 'B', cartesian: { id: 'B', x: R, y: 0 }, label: 'B' },
  { id: 'C', cartesian: { id: 'C', x: 0, y: -R }, label: 'C' },
  { id: 'D', cartesian: { id: 'D', x: -R, y: 0 }, label: 'D' }
];

const chords = [
  { id: 'chord_AB', p1: vertices[0].cartesian, p2: vertices[1].cartesian, label: 'AB' },
  { id: 'chord_BC', p1: vertices[1].cartesian, p2: vertices[2].cartesian, label: 'BC' },
  { id: 'chord_CD', p1: vertices[2].cartesian, p2: vertices[3].cartesian, label: 'CD' },
  { id: 'chord_DA', p1: vertices[3].cartesian, p2: vertices[0].cartesian, label: 'DA' }
];

function getContext(geo = geometryState, aux = auxiliaryState): CommandExecutionContext {
  // Extract real Cartesian vertices from geometryState on demand
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
    circumcircle: { center: { id: 'O', x: 0, y: 0 }, radius: 100 },
    baseChords: activeChords,
    auxiliaryState: aux,
    geometryState: geo
  };
}

// 1. Create a diagonal (AuxiliarySegment) depending on A
let diagACId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_DIAGONAL',
    vertex1Id: 'A',
    vertex2Id: 'C'
  }, getContext());
  assert(res.success, 'CONSTRUCT_DIAGONAL failed');
  diagACId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;
}

// 2. Create a parallel through A to chord BC (AuxiliaryLine depending on A)
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

// 3. Create diagonal BD (AuxiliarySegment)
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

// 4. Create an intersection between:
//    - Parallel A (Line)
//    - Diagonal BD (Segment)
// This strictly tests LINE x SEGMENT intersection dynamic recomputation!
let interPId = '';
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_INTERSECTION',
    entity1Id: parallelAId,
    entity2Id: diagBDId
  }, getContext());
  if (!res.success) {
    console.error('CONSTRUCT_INTERSECTION failed with message:', res.message);
  }
  assert(res.success, 'CONSTRUCT_INTERSECTION failed');
  interPId = res.createdEntityIds[0];
  auxiliaryState = res.updatedAuxiliaryState;

  const pt = auxiliaryState.points.find(p => p.id === interPId)!;
  assert(pt !== undefined, 'Intersection point not found');
  console.log(`✓ Initial Intersection P coordinates: (${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`);
}

// 5. TEST: SHIFT_CANONICAL_VERTEX_ANGLE (A, +15 degrees)
{
  const initialPt = auxiliaryState.points.find(p => p.id === interPId)!;
  const initialX = initialPt.x;
  const initialY = initialPt.y;

  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 15
  }, getContext());

  assert(res.success, 'SHIFT_CANONICAL_VERTEX_ANGLE failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  const updatedPt = auxiliaryState.points.find(p => p.id === interPId)!;
  
  console.log(`Debug coordinates: initial=(${initialX.toFixed(4)}, ${initialY.toFixed(4)}), updated=(${updatedPt.x.toFixed(4)}, ${updatedPt.y.toFixed(4)})`);

  // Verify state version incremented
  assert(geometryState.stateVersion > 1, 'stateVersion must increment on mutation');

  // Verify that mathematical coordinates of intersection changed dynamically!
  assert(
    Math.abs(updatedPt.x - initialX) > 1e-3 || Math.abs(updatedPt.y - initialY) > 1e-3,
    'Intersection coordinates must update dynamically when source vertex shifts'
  );

  console.log(`✓ Shifted +15° Intersection P coordinates: (${updatedPt.x.toFixed(2)}, ${updatedPt.y.toFixed(2)})`);
  console.log('✓ TEST: SHIFT_CANONICAL_VERTEX_ANGLE and dependent recomputation verified.');
}

// 6. TEST: SET_CANONICAL_VERTEX_ANGLE (A, 90 degrees)
{
  const res = dispatchSemanticCommand({
    type: 'SET_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    angle: 90
  }, getContext());

  assert(res.success, 'SET_CANONICAL_VERTEX_ANGLE failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  const derived = geometryState.getDerivedCartesianVertices();
  const ptA = derived[0]; // Vertex A is at index 0
  
  // 90 degrees on unit circle is (0, R)
  assert(Math.abs(ptA.x - 0) < 1e-6, 'A.x must be 0 at 90°');
  assert(Math.abs(ptA.y - R) < 1e-6, 'A.y must be R at 90°');

  console.log('✓ TEST: SET_CANONICAL_VERTEX_ANGLE setting exact angle verified.');
}

// 7. TEST: Repeated shifts and identity preservation
{
  const initialCount = auxiliaryState.points.length + auxiliaryState.lines.length + auxiliaryState.segments.length;
  const initialLineIds = auxiliaryState.lines.map(l => l.id);

  // Apply another +10 degrees shift
  const res = dispatchSemanticCommand({
    type: 'SHIFT_CANONICAL_VERTEX_ANGLE',
    vertexId: 'A',
    deltaAngle: 10
  }, getContext());

  assert(res.success, 'Second SHIFT_CANONICAL_VERTEX_ANGLE failed');
  geometryState = res.updatedGeometryState!;
  auxiliaryState = res.updatedAuxiliaryState;

  const currentCount = auxiliaryState.points.length + auxiliaryState.lines.length + auxiliaryState.segments.length;
  assert(currentCount === initialCount, 'Repeated mutations must NOT accumulate duplicate or stale objects');

  const currentLineIds = auxiliaryState.lines.map(l => l.id);
  assert.deepStrictEqual(currentLineIds, initialLineIds, 'Object IDs must remain stable and preserved during recomputation');

  console.log('✓ TEST: Construction identity and object count stability verified.');
}

// 8. TEST: Headless capability (no window/document)
{
  assert(typeof window === 'undefined', 'Must execute fully in headless Node environment');
  assert(typeof document === 'undefined', 'Must execute fully in headless Node environment');
  console.log('✓ TEST: Headless execution capability verified.');
}

console.log('🎉 ALL AGENT PARAMETRIC CONTROL & DYNAMIC INTERSECTION TESTS PASSED SUCCESSFULLY! 🎉');
