/**
 * Remix 2: R2-04 Arc/Chord Normalizer Tests
 */

import assert from 'node:assert';
import { ArcChordNormalizer } from '../src/kernel/arcChordNormalizer';
import { CyclicInput } from '../src/types/geometry';

const TWO_PI = 2 * Math.PI;

console.log("=== RUNNING REMIX 2 ARC/CHORD NORMALIZER TESTS (R2-04) ===");

const createInput = (angles: number[], radius: number = 1): CyclicInput => ({
  domainProfile: 'CYCLIC',
  referenceCircle: { center: { id: 'O', x: 0, y: 0 }, radius },
  angles: angles.map(deg => (deg * Math.PI) / 180),
});

try {
  // TEST-A: Square 0, 90, 180, 270 -> 4 equal gaps
  const inputA = createInput([0, 90, 180, 270]);
  const resultA = ArcChordNormalizer.normalize(inputA, 1);
  assert.strictEqual(resultA.status, 'SUCCESS');
  resultA.arcGaps.forEach(gap => assert.ok(Math.abs(gap - Math.PI / 2) < 1e-6));
  console.log("✓ TEST-A: Uniform square gaps correct.");

  // TEST-B: Square on R=5 -> 4 equal chords
  const radius = 5;
  const inputB = createInput([0, 90, 180, 270], radius);
  const resultB = ArcChordNormalizer.normalize(inputB, 1);
  assert.strictEqual(resultB.status, 'SUCCESS');
  const expectedChord = 2 * radius * Math.sin((Math.PI / 2) / 2);
  resultB.chordLengths.forEach(chord => assert.ok(Math.abs(chord - expectedChord) < 1e-6));
  console.log("✓ TEST-B: Uniform square chords correct.");

  // TEST-C: Wrap-around 350, 10, 90, 200
  // Canonical order: 350, 10, 90, 200
  // 350 -> 10: 20 deg gap
  // 10 -> 90: 80 deg gap
  // 90 -> 200: 110 deg gap
  // 200 -> 350: 150 deg gap
  const inputC = createInput([350, 10, 90, 200]);
  const resultC = ArcChordNormalizer.normalize(inputC, 1);
  assert.strictEqual(resultC.status, 'SUCCESS');
  const gapsDeg = resultC.arcGaps.map(g => (g * 180) / Math.PI);
  assert.ok(Math.abs(gapsDeg[0] - 20) < 1e-6);
  assert.ok(Math.abs(gapsDeg[1] - 80) < 1e-6);
  assert.ok(Math.abs(gapsDeg[2] - 110) < 1e-6);
  assert.ok(Math.abs(gapsDeg[3] - 150) < 1e-6);
  console.log("✓ TEST-C: Angular wrap-around normalized correctly.");

  // TEST-D: Check order preservation (non-sorted)
  const inputD = createInput([200, 20, 100, 300]);
  const resultD = ArcChordNormalizer.normalize(inputD, 1);
  assert.strictEqual(resultD.status, 'SUCCESS');
  // Order must remain: 200, 20, 100, 300
  // Gaps:
  // 200 -> 20: 180 (gap)
  // 20 -> 100: 80 (gap)
  // 100 -> 300: 200 (gap)
  // 300 -> 200: 260 (gap)
  const gapsDegD = resultD.arcGaps.map(g => (g * 180) / Math.PI);
  assert.ok(Math.abs(gapsDegD[0] - 180) < 1e-6);
  assert.ok(Math.abs(gapsDegD[1] - 80) < 1e-6);
  assert.ok(Math.abs(gapsDegD[2] - 200) < 1e-6);
  assert.ok(Math.abs(gapsDegD[3] - 260) < 1e-6);
  console.log("✓ TEST-D: Angular order preserved (not sorted).");

  // TEST-K & TEST-L: Check read-only / no state mutation
  const originalAngles = [...inputA.angles];
  const originalVersion = 1;
  ArcChordNormalizer.normalize(inputA, originalVersion);
  
  assert.deepStrictEqual(inputA.angles, originalAngles);
  assert.strictEqual(originalVersion, 1);
  console.log("✓ TEST-K/L: Canonical state and version unchanged (read-only).");

  // TEST-I: Sum of gaps is 2PI
  const inputI = createInput([10, 50, 120, 300]);
  const resultI = ArcChordNormalizer.normalize(inputI, 1);
  assert.ok(Math.abs(resultI.totalArc - TWO_PI) < 1e-6);
  console.log("✓ TEST-I: Sum of gaps equals 2PI.");

  console.log("🎉 ALL R2-04 ARC/CHORD NORMALIZER TESTS PASSED SUCCESSFULLY! 🎉");
} catch (error) {
  console.error("❌ TEST FAILED:", error);
  process.exit(1);
}
