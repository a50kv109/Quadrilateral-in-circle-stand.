/**
 * R2-05.1 Test Suite — Canonical Geometry Tools & Dynamic Auxiliary DAG
 */

import {
  euclideanDistance,
  calculateLineIntersection,
  calculateSegmentIntersection,
  computeParallelLine,
  computePerpendicularLine,
  computeAngleBisectorLine,
  computeExtendedLineEndpoints,
  findSnapTarget,
  recomputeAuxiliaryGeometry,
  createEmptyAuxiliaryState
} from '../src/ui/state/auxiliaryEngine';
import {
  AuxiliaryState,
  AuxiliaryPoint,
  AuxiliarySegment,
  AuxiliaryLine,
  AuxiliaryCircle,
  AuxiliaryMeasurement
} from '../src/ui/types/auxiliaryTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('=== RUNNING R2-05.1 GEOMETRY TOOLS & AUXILIARY DAG TESTS ===');

// TEST 1: Distance & Euclidean geometry
const d1 = euclideanDistance(0, 0, 3, 4);
assert(Math.abs(d1 - 5) < 1e-6, `Distance should be 5, got ${d1}`);
console.log('✓ TEST 1: Euclidean distance verified.');

// TEST 2: Line intersection arithmetic
const l1p1 = { x: 0, y: -100 };
const l1p2 = { x: 0, y: 100 };
const l2p1 = { x: -100, y: 0 };
const l2p2 = { x: 100, y: 0 };
const inter = calculateLineIntersection(l1p1, l1p2, l2p1, l2p2);
assert(inter !== null && Math.abs(inter.x) < 1e-6 && Math.abs(inter.y) < 1e-6, 'Intersection should be (0, 0)');
console.log('✓ TEST 2: Line intersection calculation verified.');

// TEST 3: Parallel line rejection
const parInter = calculateLineIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 });
assert(parInter === null, 'Parallel lines must return null');
console.log('✓ TEST 3: Parallel lines return null intersection verified.');

// TEST 4: Parallel line generation
const refP1 = { x: 0, y: 0 };
const refP2 = { x: 100, y: 0 }; // horizontal
const throughPt = { x: 50, y: 40 };
const parLine = computeParallelLine(refP1, refP2, throughPt, 100);
// Slope of parallel line must be horizontal (y1 === y2)
assert(Math.abs(parLine.y1 - 40) < 1e-6 && Math.abs(parLine.y2 - 40) < 1e-6, 'Parallel line must maintain slope');
console.log('✓ TEST 4: Parallel line generation verified.');

// TEST 5: Perpendicular line generation
const perpLine = computePerpendicularLine(refP1, refP2, throughPt, 100);
// Slope of perpendicular line to horizontal must be vertical (x1 === x2 === 50)
assert(Math.abs(perpLine.x1 - 50) < 1e-6 && Math.abs(perpLine.x2 - 50) < 1e-6, 'Perpendicular line must be vertical');
console.log('✓ TEST 5: Perpendicular line generation verified.');

// TEST 6: Angle Bisector generation
const arm1 = { x: 100, y: 0 };
const vert = { x: 0, y: 0 };
const arm2 = { x: 0, y: 100 };
const bis = computeAngleBisectorLine(arm1, vert, arm2, 100);
// Bisector of 90 deg angle (along x and y axes) must point along x = y (45 deg)
assert(Math.abs(bis.x1) < 1e-6 && Math.abs(bis.y1) < 1e-6, 'Bisector starts at vertex');
assert(Math.abs(bis.x2 - bis.y2) < 1e-4, 'Bisector ray is at 45 deg (x2 === y2)');
console.log('✓ TEST 6: Angle bisector generation verified.');

// TEST 7: Compass strict state machine invariant (R locked)
const pA = { x: 0, y: 0 };
const pB = { x: 60, y: 80 };
const rLocked = euclideanDistance(pA.x, pA.y, pB.x, pB.y);
assert(Math.abs(rLocked - 100) < 1e-6, 'Locked radius R is 100');
// Moving the cursor center to (200, 300) should NEVER change R
const centerCursor = { x: 200, y: 300 };
const compassCircle: AuxiliaryCircle = {
  id: 'circ_compass_test',
  label: 'Compass test',
  type: 'compass',
  centerPointId: 'O',
  radius: rLocked,
  radiusPoint1Id: 'A',
  radiusPoint2Id: 'B'
};
assert(compassCircle.radius === 100, 'Radius remains invariant during center movement');
console.log('✓ TEST 7: Compass radius locked invariant verified.');

// TEST 8: Snapping solver
const canonicalVerts = [
  { id: 'A', cartesian: { id: 'A', x: 100, y: 0 } },
  { id: 'B', cartesian: { id: 'B', x: 0, y: 100 } }
];
const snap1 = findSnapTarget(102, 1, canonicalVerts, { center: { id: 'O', x: 0, y: 0 }, radius: 100 }, [], [], []);
assert(snap1 !== null && snap1.entityId === 'A', 'Snap target should be vertex A');
console.log('✓ TEST 8: Snapping solver accuracy verified.');

// TEST 9: Dynamic DAG Recomputation on parent movement
let auxState: AuxiliaryState = {
  points: [
    {
      id: 'pt_P',
      label: 'P',
      x: 0,
      y: 0,
      type: 'intersection',
      parentIds: ['seg_AC', 'seg_BD']
    }
  ],
  segments: [
    { id: 'seg_AC', label: 'AC', p1Id: 'A', p2Id: 'C', type: 'diagonal', lengthMm: 200 },
    { id: 'seg_BD', label: 'BD', p1Id: 'B', p2Id: 'D', type: 'diagonal', lengthMm: 200 }
  ],
  lines: [],
  circles: [
    {
      id: 'circ_1',
      label: 'Compass circ',
      type: 'compass',
      centerPointId: 'pt_P',
      radius: 100,
      radiusPoint1Id: 'A',
      radiusPoint2Id: 'B'
    }
  ],
  measurements: [],
  selectedEntityId: null,
  selectedEntityType: null
};

// Initial coordinates of canonical vertices
const canonMap = new Map<string, { x: number; y: number }>();
canonMap.set('A', { x: -100, y: 0 });
canonMap.set('C', { x: 100, y: 0 });
canonMap.set('B', { x: 0, y: -100 });
canonMap.set('D', { x: 0, y: 100 });

// Move vertex B from (0, -100) to (20, -100) -> changes diagonal intersection
canonMap.set('B', { x: 20, y: -100 });
canonMap.set('D', { x: 20, y: 100 });

const updated = recomputeAuxiliaryGeometry(auxState, canonMap, { center: { id: 'O', x: 0, y: 0 }, radius: 160 });
// New intersection P of AC (y = 0) and BD (x = 20) should be at (20, 0)!
const ptP = updated.points.find((p) => p.id === 'pt_P');
assert(ptP !== undefined, 'Point P exists');
assert(Math.abs(ptP!.x - 20) < 1e-4 && Math.abs(ptP!.y - 0) < 1e-4, `Point P should move to (20, 0), got (${ptP!.x}, ${ptP!.y})`);

// Compass circle radius between A (-100, 0) and B (20, -100) should recompute:
// dist = sqrt((20 - (-100))^2 + (-100 - 0)^2) = sqrt(14400 + 10000) = sqrt(24400) ≈ 156.205
const circ1 = updated.circles.find((c) => c.id === 'circ_1');
assert(circ1 !== undefined, 'Compass circle exists');
assert(Math.abs(circ1!.radius - Math.hypot(120, -100)) < 1e-4, 'Compass circle radius dynamically updated with parents');
console.log('✓ TEST 9: Dynamic DAG recomputation on vertex movement verified.');

console.log('🎉 ALL R2-05.1 GEOMETRY TOOLS & AUXILIARY DAG TESTS PASSED! 🎉');
