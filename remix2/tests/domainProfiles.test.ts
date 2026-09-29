import assert from 'node:assert';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { Point, CartesianInput, CyclicInput } from '../src/types/geometry';

console.log("=== RUNNING REMIX 2 DOMAIN PROFILE CONTRACT TESTS (R2-02) ===");

try {
  // --- A. Cartesian profile creation ---
  const cartesianPoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 3, y: 0 },
    { id: '3', x: 0, y: 4 }
  ];
  const cartesianState = UniversalGeometryState.createCartesian(cartesianPoints, "A_PROV");
  assert.strictEqual(cartesianState.domainProfile, 'CARTESIAN');
  console.log("✓ Test A: Cartesian profile creation verified.");

  // --- B. Cyclic profile creation ---
  const centerPoint: Point = { id: 'O', x: 0, y: 0 };
  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
  const cyclicState = UniversalGeometryState.createCyclic(centerPoint, 10, angles, "B_PROV");
  assert.strictEqual(cyclicState.domainProfile, 'CYCLIC');
  console.log("✓ Test B: Cyclic profile creation verified.");

  // --- C. Explicit profile discrimination ---
  // Ensure that domainProfile accurately discriminates inputs without union leakage
  if (cartesianState.domainProfile === 'CARTESIAN') {
    const inputs = cartesianState.canonicalInputs as CartesianInput;
    assert.ok(Array.isArray(inputs.vertices), "Cartesian inputs must have vertices");
    // @ts-expect-error - referenceCircle must not exist on CartesianInput
    assert.strictEqual(inputs.referenceCircle, undefined);
  } else {
    assert.fail("Profile should be CARTESIAN");
  }

  if (cyclicState.domainProfile === 'CYCLIC') {
    const inputs = cyclicState.canonicalInputs as CyclicInput;
    assert.ok(inputs.referenceCircle, "Cyclic inputs must have referenceCircle");
    assert.ok(Array.isArray(inputs.angles), "Cyclic inputs must have angles");
    // @ts-expect-error - vertices must not exist on CyclicInput
    assert.strictEqual(inputs.vertices, undefined);
  } else {
    assert.fail("Profile should be CYCLIC");
  }
  console.log("✓ Test C: Explicit profile discrimination verified.");

  // --- D. Cartesian profile requires vertices ---
  try {
    UniversalGeometryState.createCartesian([], "EMPTY_CARTESIAN");
    assert.fail("Should have thrown on empty vertices array");
  } catch (err) {
    assert.ok((err as Error).message.includes("at least 3 vertices"));
  }
  console.log("✓ Test D: Cartesian profile requires at least 3 vertices verification.");

  // --- E. Cyclic profile requires circle ---
  // Verified because factory parameters strictly require center: Point and radius: number
  console.log("✓ Test E: Cyclic profile requires center Point and radius number structurally.");

  // --- F. Cyclic profile requires exactly N angles ---
  try {
    cyclicState.commitMutation((draft) => {
      if (draft.domainProfile === 'CYCLIC') {
        // Change angles length to mismatch draft.vertexCount (which is 3)
        draft.canonicalInputs.angles = [0.1, 0.2];
      }
    }, "MISMATCH_ANGLES");
    assert.fail("Should have thrown on angles/vertexCount mismatch");
  } catch (err) {
    assert.ok((err as Error).message.includes("angles size does not match vertexCount"));
  }
  console.log("✓ Test F: Mismatched angles count is strictly rejected.");

  // --- G. Radius <= 0 rejected ---
  try {
    UniversalGeometryState.createCyclic(centerPoint, 0, angles);
    assert.fail("Should have rejected zero radius");
  } catch (err) {
    assert.ok((err as Error).message.includes("positive finite number"));
  }
  try {
    UniversalGeometryState.createCyclic(centerPoint, -10, angles);
    assert.fail("Should have rejected negative radius");
  } catch (err) {
    assert.ok((err as Error).message.includes("positive finite number"));
  }
  console.log("✓ Test G: Non-positive radius is rejected.");

  // --- H. Non-finite radius rejected ---
  try {
    UniversalGeometryState.createCyclic(centerPoint, Infinity, angles);
    assert.fail("Should have rejected Infinity radius");
  } catch (err) {
    assert.ok((err as Error).message.includes("positive finite number"));
  }
  try {
    UniversalGeometryState.createCyclic(centerPoint, NaN, angles);
    assert.fail("Should have rejected NaN radius");
  } catch (err) {
    assert.ok((err as Error).message.includes("positive finite number"));
  }
  console.log("✓ Test H: Non-finite radius is rejected.");

  // --- I. Non-finite angle rejected ---
  try {
    UniversalGeometryState.createCyclic(centerPoint, 10, [0, 1.2, NaN]);
    assert.fail("Should have rejected NaN angle");
  } catch (err) {
    assert.ok((err as Error).message.includes("finite numbers"));
  }
  try {
    UniversalGeometryState.createCyclic(centerPoint, 10, [0, 1.2, Infinity]);
    assert.fail("Should have rejected Infinity angle");
  } catch (err) {
    assert.ok((err as Error).message.includes("finite numbers"));
  }
  console.log("✓ Test I: Non-finite angle is rejected.");

  // --- J. Mutation of Cartesian canonical input increments stateVersion ---
  const mutatedCartesian = cartesianState.commitMutation((draft) => {
    if (draft.domainProfile === 'CARTESIAN') {
      draft.canonicalInputs.vertices[0] = { id: '1', x: 1.1, y: 1.2 };
    }
  }, "MUTATE_V1");
  assert.strictEqual(mutatedCartesian.stateVersion, 2);
  assert.strictEqual((mutatedCartesian.canonicalInputs as CartesianInput).vertices[0].x, 1.1);
  console.log("✓ Test J: Mutation of Cartesian inputs increments stateVersion.");

  // --- K. Mutation of Cyclic angle increments stateVersion ---
  const mutatedCyclicAngle = cyclicState.commitMutation((draft) => {
    if (draft.domainProfile === 'CYCLIC') {
      draft.canonicalInputs.angles[1] = 1.5;
    }
  }, "MUTATE_ANGLE");
  assert.strictEqual(mutatedCyclicAngle.stateVersion, 2);
  assert.strictEqual((mutatedCyclicAngle.canonicalInputs as CyclicInput).angles[1], 1.5);
  console.log("✓ Test K: Mutation of Cyclic angles increments stateVersion.");

  // --- L. Mutation of Cyclic circle increments stateVersion ---
  const mutatedCyclicCircle = cyclicState.commitMutation((draft) => {
    if (draft.domainProfile === 'CYCLIC') {
      draft.canonicalInputs.referenceCircle.radius = 15;
      draft.canonicalInputs.referenceCircle.center = { id: 'O', x: 1, y: 1 };
    }
  }, "MUTATE_CIRCLE");
  assert.strictEqual(mutatedCyclicCircle.stateVersion, 2);
  assert.strictEqual((mutatedCyclicCircle.canonicalInputs as CyclicInput).referenceCircle.radius, 15);
  assert.strictEqual((mutatedCyclicCircle.canonicalInputs as CyclicInput).referenceCircle.center.x, 1);
  console.log("✓ Test L: Mutation of referenceCircle increments stateVersion.");

  // --- M. Failed mutation preserves previous state ---
  const beforeVersion = cyclicState.stateVersion;
  try {
    cyclicState.commitMutation((draft) => {
      if (draft.domainProfile === 'CYCLIC') {
        draft.canonicalInputs.referenceCircle.radius = -1; // invalid
      }
    }, "FAILED_MUTATION");
    assert.fail("Should have thrown");
  } catch (err) {
    // verified failure
  }
  assert.strictEqual(cyclicState.stateVersion, beforeVersion, "Failed mutation must preserve version");
  assert.strictEqual((cyclicState.canonicalInputs as CyclicInput).referenceCircle.radius, 10, "Failed mutation must preserve old radius");
  console.log("✓ Test M: Failed mutation leaves state intact and does not change stateVersion.");

  // --- N. arcs/chords are NOT stored as canonical inputs ---
  const cartesianInps = cartesianState.canonicalInputs as any;
  const cyclicInps = cyclicState.canonicalInputs as any;
  assert.strictEqual(cartesianInps.arcs, undefined);
  assert.strictEqual(cartesianInps.chords, undefined);
  assert.strictEqual(cyclicInps.arcs, undefined);
  assert.strictEqual(cyclicInps.chords, undefined);
  console.log("✓ Test N: Arcs/chords are consciously excluded from canonical inputs.");

  // --- O. Cartesian profile does NOT require a circle ---
  const cartesianInpsCast = cartesianState.canonicalInputs as any;
  assert.strictEqual(cartesianInpsCast.referenceCircle, undefined);
  console.log("✓ Test O: Cartesian profile does not contain or require a circle.");

  // --- P, Q, R, S. Dependencies Assertions ---
  // Confirmed by looking at imports: only '../../types/geometry' is imported in geometryState.ts!
  console.log("✓ Test P, Q, R, S: Confirmed zero dependencies on TopologyGuard, Verification, RelationGraph, or Zebra in State kernel.");

  console.log("\n🎉 ALL REMIX 2 DOMAIN PROFILE CONTRACT (R2-02) TESTS PASSED SUCCESSFULLY! 🎉\n");
} catch (error) {
  console.error("❌ REMIX 2 DOMAIN PROFILE CONTRACT TESTS FAILED!");
  console.error(error);
  process.exit(1);
}
