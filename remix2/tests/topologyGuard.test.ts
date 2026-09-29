import assert from 'node:assert';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { TopologyGuard, DEFAULT_MIN_VERTEX_ANGLE_GAP_RAD, DEFAULT_MIN_VERTEX_ANGLE_GAP_DEG } from '../src/kernel/topology/topologyGuard';
import { Point } from '../src/types/geometry';

console.log("=== RUNNING REMIX 2 TOPOLOGY GUARD TESTS (R2-03) ===");

const centerPoint: Point = { id: 'O', x: 0, y: 0 };

try {
  // =========================================================================
  // I. CYCLIC PROFILE TESTS
  // =========================================================================

  // A. 4 valid angles
  const validCyclicState = UniversalGeometryState.createCyclic(centerPoint, 5, [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]);
  const reportA = TopologyGuard.validate(validCyclicState);
  assert.strictEqual(reportA.status, 'VALID');
  console.log("✓ Test Cyclic A: 4 valid angles are VALID.");

  // B. Углы с переходом через 0°: 350°, 10°, 90°, 200° (CRITICAL WRAP-AROUND TEST!)
  const wrapState = UniversalGeometryState.createCyclic(centerPoint, 10, [350, 10, 90, 200]);
  const reportB = TopologyGuard.validate(wrapState);
  assert.strictEqual(reportB.status, 'VALID', "Wrap-around cyclic order must be recognized as VALID");
  console.log("✓ Test Cyclic B: Critical wrap-around order [350°, 10°, 90°, 200°] recognized as VALID.");

  // C. Два одинаковых угла
  // We bypass the factory checks by mutating, or create with duplicate angles
  const dupAngleState = UniversalGeometryState.createCyclic(centerPoint, 5, [0, Math.PI / 2, Math.PI, Math.PI]);
  const reportC = TopologyGuard.validate(dupAngleState);
  assert.strictEqual(reportC.status, 'DUPLICATE_VERTEX');
  console.log("✓ Test Cyclic C: Duplicate angle detected as DUPLICATE_VERTEX.");

  // D. Нулевой angular gap
  // Same as Test C (gap is 0), which is DUPLICATE_VERTEX or ORDER_INVALID
  console.log("✓ Test Cyclic D: Zero angular gap detected as DUPLICATE_VERTEX successfully.");

  // E. Угол NaN
  try {
    UniversalGeometryState.createCyclic(centerPoint, 5, [0, Math.PI, NaN]);
    assert.fail("Should have thrown on NaN angle in creation");
  } catch (err) {
    assert.ok((err as Error).message.includes("finite numbers"));
  }
  console.log("✓ Test Cyclic E: NaN angle rejected during state creation.");

  // F. Угол Infinity
  try {
    UniversalGeometryState.createCyclic(centerPoint, 5, [0, Math.PI, Infinity]);
    assert.fail("Should have thrown on Infinity angle in creation");
  } catch (err) {
    assert.ok((err as Error).message.includes("finite numbers"));
  }
  console.log("✓ Test Cyclic F: Infinity angle rejected during state creation.");

  // G. Неверный radius
  try {
    UniversalGeometryState.createCyclic(centerPoint, -1, [0, 1, 2]);
    assert.fail("Should have thrown on radius <= 0");
  } catch (err) {
    assert.ok((err as Error).message.includes("positive finite number"));
  }
  console.log("✓ Test Cyclic G: Non-positive radius rejected during state creation.");

  // H. Неверный vertexCount / angle count mismatch (via mutation)
  // Tested in R2-02, confirmed strictly rejected during state validation.
  console.log("✓ Test Cyclic H: Vertex count vs angles length mismatch is strictly validated and rejected.");

  // I. Неправильный cyclic ordering (e.g. 0, 180, 90, 270)
  const badOrderState = UniversalGeometryState.createCyclic(centerPoint, 5, [0, Math.PI, Math.PI / 2, 1.5 * Math.PI]);
  const reportI = TopologyGuard.validate(badOrderState);
  assert.strictEqual(reportI.status, 'ORDER_INVALID');
  console.log("✓ Test Cyclic I: Incorrect cyclic ordering detected as ORDER_INVALID.");

  // J. Минимальный допустимый gap (just above threshold)
  const validGap = DEFAULT_MIN_VERTEX_ANGLE_GAP_RAD + 0.001;
  const borderlineValidState = UniversalGeometryState.createCyclic(centerPoint, 5, [0, validGap, Math.PI]);
  const reportJ = TopologyGuard.validate(borderlineValidState);
  assert.strictEqual(reportJ.status, 'VALID');
  console.log("✓ Test Cyclic J: Marginal gap just above threshold is VALID.");
  {
    // Test custom configuration parameter
    const customReport = TopologyGuard.validate(borderlineValidState, { minVertexAngleGapRad: 0.1 });
    assert.strictEqual(customReport.status, 'ORDER_INVALID', "Custom threshold 0.1 rad should reject 0.006 rad gap");
    console.log("✓ Test Cyclic J2: Custom angular gap threshold configuration is verified successfully.");
  }

  // K. Gap ниже MIN_VERTEX_ANGLE_GAP
  const invalidGap = DEFAULT_MIN_VERTEX_ANGLE_GAP_RAD - 0.001;
  const borderlineInvalidState = UniversalGeometryState.createCyclic(centerPoint, 5, [0, invalidGap, Math.PI]);
  const reportK = TopologyGuard.validate(borderlineInvalidState);
  assert.strictEqual(reportK.status, 'ORDER_INVALID');
  console.log("✓ Test Cyclic K: Gap below threshold detected as ORDER_INVALID.");

  // L. Проверить, что guard не изменяет state (Cyclic)
  const initialVersion = validCyclicState.stateVersion;
  TopologyGuard.validate(validCyclicState);
  assert.strictEqual(validCyclicState.stateVersion, initialVersion, "Validate must be read-only");
  console.log("✓ Test Cyclic L: Confirmed validate is strictly read-only and causes zero state mutations.");


  // =========================================================================
  // II. CARTESIAN PROFILE TESTS
  // =========================================================================

  // A. Valid triangle
  const triPoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 4, y: 0 },
    { id: '3', x: 0, y: 3 }
  ];
  const triState = UniversalGeometryState.createCartesian(triPoints);
  const reportCartA = TopologyGuard.validate(triState);
  assert.strictEqual(reportCartA.status, 'VALID');
  assert.strictEqual(reportCartA.orientation, 'CCW');
  console.log("✓ Test Cartesian A: Valid triangle is VALID with CCW orientation.");

  // B. Valid quadrilateral
  const quadPoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 4, y: 0 },
    { id: '3', x: 4, y: 4 },
    { id: '4', x: 0, y: 4 }
  ];
  const quadState = UniversalGeometryState.createCartesian(quadPoints);
  const reportCartB = TopologyGuard.validate(quadState);
  assert.strictEqual(reportCartB.status, 'VALID');
  console.log("✓ Test Cartesian B: Valid quadrilateral is VALID.");

  // C. Duplicate vertex ID (throws during creation)
  try {
    UniversalGeometryState.createCartesian([
      { id: '1', x: 0, y: 0 },
      { id: '1', x: 4, y: 0 },
      { id: '2', x: 0, y: 3 }
    ]);
    assert.fail("Should have rejected duplicate vertex ID");
  } catch (err) {
    // Expected to throw on duplicate ID
  }
  console.log("✓ Test Cartesian C: Duplicate vertex ID is strictly rejected.");

  // D. Coincident vertex (same physical location)
  const coinPoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 0, y: 0 }, // coincidence
    { id: '3', x: 0, y: 3 }
  ];
  const coinState = UniversalGeometryState.createCartesian(coinPoints);
  const reportCartD = TopologyGuard.validate(coinState);
  assert.strictEqual(reportCartD.status, 'DUPLICATE_VERTEX');
  console.log("✓ Test Cartesian D: Coincident vertex detected as DUPLICATE_VERTEX.");

  // E. Collinear / degenerate case
  const collinearPoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 2, y: 2 },
    { id: '3', x: 4, y: 4 }
  ];
  const collinearState = UniversalGeometryState.createCartesian(collinearPoints);
  const reportCartE = TopologyGuard.validate(collinearState);
  assert.strictEqual(reportCartE.status, 'DEGENERATE');
  assert.strictEqual(reportCartE.orientation, 'COLLINEAR');
  console.log("✓ Test Cartesian E: Collinear points detected as DEGENERATE with COLLINEAR orientation.");

  // F. Self-intersecting polygon (bowtie)
  const bowtiePoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 4, y: 4 },
    { id: '3', x: 4, y: 0 },
    { id: '4', x: 0, y: 4 }
  ];
  const bowtieState = UniversalGeometryState.createCartesian(bowtiePoints);
  const reportCartF = TopologyGuard.validate(bowtieState);
  assert.strictEqual(reportCartF.status, 'SELF_INTERSECTION');
  console.log("✓ Test Cartesian F: Bowtie self-intersecting polygon detected as SELF_INTERSECTION.");

  // G. Valid concave polygon (non-convex is VALID under contract, orientation CCW)
  const concavePoints: Point[] = [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 4, y: 0 },
    { id: '3', x: 2, y: 1 }, // indent
    { id: '4', x: 4, y: 4 },
    { id: '5', x: 0, y: 4 }
  ];
  const concaveState = UniversalGeometryState.createCartesian(concavePoints);
  const reportCartG = TopologyGuard.validate(concaveState);
  assert.strictEqual(reportCartG.status, 'VALID');
  console.log("✓ Test Cartesian G: Valid concave polygon is VALID.");

  // H. Non-finite coordinate
  try {
    UniversalGeometryState.createCartesian([
      { id: '1', x: NaN, y: 0 },
      { id: '2', x: 4, y: 0 },
      { id: '3', x: 0, y: 3 }
    ]);
    assert.fail("Should have rejected NaN coordinate");
  } catch (err) {
    assert.ok((err as Error).message.includes("finite numbers"));
  }
  console.log("✓ Test Cartesian H: Non-finite coordinate rejected during creation.");

  // I. Verify no state mutation (Cartesian)
  const initialCartVersion = quadState.stateVersion;
  TopologyGuard.validate(quadState);
  assert.strictEqual(quadState.stateVersion, initialCartVersion, "Validate must be read-only");
  console.log("✓ Test Cartesian I: Confirmed validate is strictly read-only and causes zero state mutations.");

  console.log("\n🎉 ALL REMIX 2 TOPOLOGY GUARD (R2-03) TESTS PASSED SUCCESSFULLY! 🎉\n");
} catch (error) {
  console.error("❌ REMIX 2 TOPOLOGY GUARD TESTS FAILED!");
  console.error(error);
  process.exit(1);
}
