/**
 * Normalization Step 1 Test Suite
 * Verification of Viewport-Independent Canonical Geometry for Auxiliary Lines
 */

import { strict as assert } from 'assert';
import { dispatchSemanticCommand, CommandExecutionContext } from '../src/ui/state/commandDispatcher';
import { createEmptyAuxiliaryState, getLineRenderEndpoints } from '../src/ui/state/auxiliaryEngine';
import { AuxiliaryState } from '../src/ui/types/auxiliaryTypes';

console.log('=== RUNNING NORMALIZATION STEP 1: GEOMETRY vs VIEWPORT TESTS ===');

// Setup canonical test quadrilateral ABCD (cyclic square in 160 mm radius circle)
const R = 160;
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

function createContext(auxiliaryState: AuxiliaryState, bounds?: number): CommandExecutionContext {
  return {
    canonicalVertices: vertices,
    circumcircle: { center: { id: 'O', x: 0, y: 0 }, radius: R },
    baseChords: chords,
    auxiliaryState,
    bounds // Notice: bounds may be undefined or varied
  };
}

let state = createEmptyAuxiliaryState();

// 1. Создание линии без viewport (bounds undefined)
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_LINE',
    p1Id: 'A',
    p2Id: 'C'
  }, createContext(state));

  assert(res.success, 'Line creation without viewport failed');
  assert(res.createdEntityIds.length === 1, 'Expected 1 created line');
  state = res.updatedAuxiliaryState;

  const line = state.lines.find(l => l.id === res.createdEntityIds[0]);
  assert(line !== undefined, 'Created line not found in state');
  assert(line.anchorPoint !== undefined, 'Line must contain mathematical anchorPoint');
  assert(line.direction !== undefined, 'Line must contain mathematical direction unit vector');
  assert(Math.abs(line.anchorPoint.x - 0) < 1e-6 && Math.abs(line.anchorPoint.y - R) < 1e-6, 'Anchor point must match A');
  assert(Math.abs(line.direction.dx - 0) < 1e-6 && Math.abs(line.direction.dy - (-1)) < 1e-6, 'Direction must be vertical downward');
  assert(line.equation !== undefined, 'Line must have canonical LineEquation');

  console.log('✓ TEST 1: CONSTRUCT_LINE without viewport bounds verified.');
}

// 2. Создание parallel без viewport
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_AB',
    throughPointId: 'C'
  }, createContext(state));

  assert(res.success, 'Parallel line creation without viewport failed');
  state = res.updatedAuxiliaryState;

  const line = state.lines.find(l => l.id === res.createdEntityIds[0]);
  assert(line !== undefined, 'Parallel line not found');
  assert(line.anchorPoint !== undefined, 'Parallel line must contain anchorPoint');
  assert(line.direction !== undefined, 'Parallel line must contain direction vector');
  assert(line.equation !== undefined, 'Parallel line must contain LineEquation');
  assert(Math.abs(line.anchorPoint.x - 0) < 1e-6 && Math.abs(line.anchorPoint.y - (-R)) < 1e-6, 'Anchor point must be C');

  // AB direction is from (0, R) to (R, 0) -> dx = R, dy = -R -> unit dir = (1/sqrt(2), -1/sqrt(2))
  const expectedUx = 1 / Math.SQRT2;
  const expectedUy = -1 / Math.SQRT2;
  assert(Math.abs(line.direction.dx - expectedUx) < 1e-4, 'Parallel direction dx matches chord AB');
  assert(Math.abs(line.direction.dy - expectedUy) < 1e-4, 'Parallel direction dy matches chord AB');

  console.log('✓ TEST 2: CONSTRUCT_PARALLEL without viewport bounds verified.');
}

// 3. Создание perpendicular без viewport
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_PERPENDICULAR',
    referenceSegmentId: 'chord_AB',
    throughPointId: 'C'
  }, createContext(state));

  assert(res.success, 'Perpendicular line creation without viewport failed');
  state = res.updatedAuxiliaryState;

  const line = state.lines.find(l => l.id === res.createdEntityIds[0]);
  assert(line !== undefined, 'Perpendicular line not found');
  assert(line.anchorPoint !== undefined, 'Perpendicular line must contain anchorPoint');
  assert(line.direction !== undefined, 'Perpendicular line must contain direction vector');
  assert(line.equation !== undefined, 'Perpendicular line must contain LineEquation');

  // Perpendicular to (1/sqrt(2), -1/sqrt(2)) has dot product = 0
  const dot = line.direction.dx * (1 / Math.SQRT2) + line.direction.dy * (-1 / Math.SQRT2);
  assert(Math.abs(dot) < 1e-6, 'Perpendicular line dot product with ref segment must be 0');

  console.log('✓ TEST 3: CONSTRUCT_PERPENDICULAR without viewport bounds verified.');
}

// 4. Создание angle bisector без viewport
{
  const res = dispatchSemanticCommand({
    type: 'CONSTRUCT_ANGLE_BISECTOR',
    arm1PointId: 'A',
    vertexPointId: 'B',
    arm2PointId: 'C'
  }, createContext(state));

  assert(res.success, 'Angle bisector creation without viewport failed');
  state = res.updatedAuxiliaryState;

  const line = state.lines.find(l => l.id === res.createdEntityIds[0]);
  assert(line !== undefined, 'Angle bisector not found');
  assert(line.anchorPoint !== undefined, 'Angle bisector must contain anchorPoint');
  assert(line.direction !== undefined, 'Angle bisector must contain direction vector');
  assert(Math.abs(line.anchorPoint.x - R) < 1e-6 && Math.abs(line.anchorPoint.y - 0) < 1e-6, 'Bisector anchor must be vertex B');

  console.log('✓ TEST 4: CONSTRUCT_ANGLE_BISECTOR without viewport bounds verified.');
}

// 5. КРИТИЧЕСКИЙ ТЕСТ: Изменение viewport НЕ меняет математическую конструкцию
{
  const stateEmpty = createEmptyAuxiliaryState();

  // Executed with bounds = 240
  const res240 = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_AB',
    throughPointId: 'C'
  }, createContext(stateEmpty, 240));

  // Executed with bounds = 500
  const res500 = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_AB',
    throughPointId: 'C'
  }, createContext(stateEmpty, 500));

  // Executed with bounds = 1000
  const res1000 = dispatchSemanticCommand({
    type: 'CONSTRUCT_PARALLEL',
    referenceSegmentId: 'chord_AB',
    throughPointId: 'C'
  }, createContext(stateEmpty, 1000));

  const line240 = res240.updatedAuxiliaryState.lines[0];
  const line500 = res500.updatedAuxiliaryState.lines[0];
  const line1000 = res1000.updatedAuxiliaryState.lines[0];

  // Mathematical definitions must be STRICTLY IDENTICAL
  assert.deepStrictEqual(line240.anchorPoint, line500.anchorPoint, 'Anchor point must not depend on viewport');
  assert.deepStrictEqual(line240.anchorPoint, line1000.anchorPoint, 'Anchor point must not depend on viewport');
  assert.deepStrictEqual(line240.direction, line500.direction, 'Direction vector must not depend on viewport');
  assert.deepStrictEqual(line240.direction, line1000.direction, 'Direction vector must not depend on viewport');
  assert.deepStrictEqual(line240.equation, line500.equation, 'LineEquation must not depend on viewport');
  assert.deepStrictEqual(line240.equation, line1000.equation, 'LineEquation must not depend on viewport');

  console.log('✓ TEST 5: Mathematical line invariance under bounds = [240, 500, 1000] verified.');
}

// 6. Изменение viewport меняет ТОЛЬКО rendered x1, y1, x2, y2 через presentation helper
{
  const line = state.lines.find(l => l.type === 'two_points')!;
  assert(line !== undefined, 'Line must exist');

  const render240 = getLineRenderEndpoints(line, 240);
  const render500 = getLineRenderEndpoints(line, 500);
  const render1000 = getLineRenderEndpoints(line, 1000);

  // Line length on canvas scales with viewport bounds
  const len240 = Math.hypot(render240.x2 - render240.x1, render240.y2 - render240.y1);
  const len500 = Math.hypot(render500.x2 - render500.x1, render500.y2 - render500.y1);
  const len1000 = Math.hypot(render1000.x2 - render1000.x1, render1000.y2 - render1000.y1);

  assert(len500 > len240, 'Rendered endpoints span must scale with viewport bounds');
  assert(len1000 > len500, 'Rendered endpoints span must scale with viewport bounds');

  // Both endpoints must lie on the exact mathematical line
  const distP1ToLine = Math.abs(line.equation!.a * render1000.x1 + line.equation!.b * render1000.y1 + line.equation!.c);
  const distP2ToLine = Math.abs(line.equation!.a * render1000.x2 + line.equation!.b * render1000.y2 + line.equation!.c);
  assert(distP1ToLine < 1e-4, 'Rendered endpoint 1 must strictly lie on mathematical line');
  assert(distP2ToLine < 1e-4, 'Rendered endpoint 2 must strictly lie on mathematical line');

  console.log('✓ TEST 6: Viewport bounds scale only presentation endpoints, not geometry.');
}

// 7. Headless command execution has ZERO DOM/SVG dependencies
{
  assert(typeof window === 'undefined', 'Test running in headless Node environment without window/DOM');
  assert(typeof document === 'undefined', 'Test running in headless Node environment without document');
  console.log('✓ TEST 7: Headless execution verified with zero browser/SVG dependencies.');
}

console.log('🎉 ALL NORMALIZATION STEP 1 TESTS PASSED SUCCESSFULLY! 🎉');
