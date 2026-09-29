import {
  calculateChordLength,
  RADIUS_TO_APOTHEM_RATIO,
  SQUARE_TO_CIRCLE_AREA_RATIO,
} from '../constants/geometryFoundation';
import { CyclicChordEngine } from '../engines/cyclicChordEngine';
import { Point } from '../types/geometry';

export function runPackage00Tests() {
  console.log('====================================================');
  console.log('PACKAGE 00: FOUNDATION & CYCLIC CHORD ENGINE TESTS');
  console.log('====================================================');

  // TEST 1: Foundation Constants Verification
  console.log('--- TEST 1: Mathematical Foundation Constants ---');
  const expectedSquareRatio = 2 / Math.PI;
  const expectedApothemRatio = Math.SQRT2;

  if (Math.abs(SQUARE_TO_CIRCLE_AREA_RATIO - expectedSquareRatio) > 1e-12) {
    throw new Error('TEST 1 FAILED: SQUARE_TO_CIRCLE_AREA_RATIO mismatch');
  }
  if (Math.abs(RADIUS_TO_APOTHEM_RATIO - expectedApothemRatio) > 1e-12) {
    throw new Error('TEST 1 FAILED: RADIUS_TO_APOTHEM_RATIO mismatch');
  }
  console.log(`SQUARE_TO_CIRCLE_AREA_RATIO: ${SQUARE_TO_CIRCLE_AREA_RATIO} (2/π)`);
  console.log(`RADIUS_TO_APOTHEM_RATIO: ${RADIUS_TO_APOTHEM_RATIO} (√2)`);
  console.log('RESULT: PASS\n');

  // TEST 2: Valid Chord Length Calculations
  console.log('--- TEST 2: calculateChordLength on Valid Domain ---');
  const R = 160;

  // θ = 0 -> Chord = 0
  const chord0 = calculateChordLength(0, R);
  if (chord0 !== 0) {
    throw new Error(`TEST 2 FAILED: Expected chord 0 for θ=0, got ${chord0}`);
  }

  // θ = π -> Diameter = 2R = 320
  const chordPi = calculateChordLength(Math.PI, R);
  if (Math.abs(chordPi - 2 * R) > 1e-10) {
    throw new Error(`TEST 2 FAILED: Expected chord 320 for θ=π, got ${chordPi}`);
  }

  // θ = π/2 -> Side of inscribed square = R * √2
  const chordPi2 = calculateChordLength(Math.PI / 2, R);
  if (Math.abs(chordPi2 - R * Math.SQRT2) > 1e-10) {
    throw new Error(`TEST 2 FAILED: Expected chord ${R * Math.SQRT2} for θ=π/2, got ${chordPi2}`);
  }

  console.log(`θ=0: ${chord0}, θ=π (diameter): ${chordPi}, θ=π/2 (square side): ${chordPi2.toFixed(4)}`);
  console.log('RESULT: PASS\n');

  // TEST 3: Strict Error Semantics (Correction 2: Fail-Fast on Invalid Domain)
  console.log('--- TEST 3: Error Semantics & Domain Validation ---');
  const invalidCases = [
    { name: 'radius = 0', fn: () => calculateChordLength(1.0, 0) },
    { name: 'radius = -10', fn: () => calculateChordLength(1.0, -10) },
    { name: 'radius = NaN', fn: () => calculateChordLength(1.0, NaN) },
    { name: 'radius = Infinity', fn: () => calculateChordLength(1.0, Infinity) },
    { name: 'theta < 0', fn: () => calculateChordLength(-0.01, 100) },
    { name: 'theta > 2π', fn: () => calculateChordLength(2 * Math.PI + 0.01, 100) },
    { name: 'theta = NaN', fn: () => calculateChordLength(NaN, 100) },
  ];

  for (const { name, fn } of invalidCases) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      if (e instanceof RangeError) {
        threw = true;
      }
    }
    if (!threw) {
      throw new Error(`TEST 3 FAILED: ${name} did not throw RangeError (silent error masking detected!)`);
    }
  }
  console.log(`Successfully verified RangeError on all ${invalidCases.length} invalid domain scenarios.`);
  console.log('RESULT: PASS (Fail-fast error transparency strictly enforced)\n');

  // TEST 4: CyclicChordEngine Analytical Delegations (Correction 1: Single Source of Truth)
  console.log('--- TEST 4: CyclicChordEngine Integration & Reuse ---');
  const engineChord = CyclicChordEngine.chordFromAngle(Math.PI, R);
  if (Math.abs(engineChord - 320) > 1e-10) {
    throw new Error(`TEST 4 FAILED: CyclicChordEngine.chordFromAngle failed: ${engineChord}`);
  }

  const pO: Point = { id: 'O', name: 'O', x: 0, y: 0, role: 'center' };
  const pA: Point = { id: 'A', name: 'A', x: 160, y: 0, role: 'vertex' };
  const pB: Point = { id: 'B', name: 'B', x: 0, y: 160, role: 'vertex' };
  const chordAB = CyclicChordEngine.chordBetweenPoints(pA, pB, pO, R);
  const expectedAB = R * Math.SQRT2;
  if (Math.abs(chordAB - expectedAB) > 1e-10) {
    throw new Error(`TEST 4 FAILED: chordBetweenPoints mismatch: got ${chordAB}, expected ${expectedAB}`);
  }

  const squareMetrics = CyclicChordEngine.inscribedSquareMetrics(R);
  if (Math.abs(squareMetrics.side - R * Math.SQRT2) > 1e-10) {
    throw new Error('TEST 4 FAILED: Square side mismatch in metrics');
  }
  if (Math.abs(squareMetrics.areaRatio - SQUARE_TO_CIRCLE_AREA_RATIO) > 1e-10) {
    throw new Error('TEST 4 FAILED: Square area ratio mismatch with foundation constant');
  }
  console.log(`CyclicChordEngine Square Metrics for R=${R}:`, {
    side: +squareMetrics.side.toFixed(2),
    apothem: +squareMetrics.apothem.toFixed(2),
    squareArea: +squareMetrics.squareArea.toFixed(2),
    circleArea: +squareMetrics.circleArea.toFixed(2),
    areaRatio: +squareMetrics.areaRatio.toFixed(4),
  });
  console.log('RESULT: PASS\n');

  console.log('====================================================');
  console.log('PACKAGE 00 ALL TESTS PASSED (4/4)');
  console.log('====================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPackage00Tests();
}
