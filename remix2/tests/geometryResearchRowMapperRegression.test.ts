/**
 * Headless Regression Tests for GEOMETRY RESEARCH ROW MAPPER v0.1
 */

import { strict as assert } from 'assert';
import {
  mapSnapshotsToResearchRows,
  GeometryStateSnapshot,
  ExplorationStepMetadata
} from '../src/research/index';

console.log('=== RUNNING GEOMETRY RESEARCH ROW MAPPER REGRESSION TESTS ===');

// Mock snapshot helper
function makeMockSnapshot(override: {
  stateVersion?: number;
  radius?: number;
  omitReferenceCircle?: boolean;
  referenceValue?: number;
  value?: number;
  gapValue?: number;
  fillRatio?: number;
  gapRatio?: number;
  provenance?: string;
} = {}): GeometryStateSnapshot {
  return {
    metadata: {
      stateVersion: override.stateVersion ?? 1,
      domainProfile: 'CYCLIC',
      vertexCount: 4,
      provenance: override.provenance ?? 'test_provenance'
    },
    parameters: override.omitReferenceCircle
      ? { cyclicAngles: { A: 0.5, B: 1.5, C: 2.5, D: 3.5 } }
      : {
          referenceCircle: {
            center: { id: 'O', x: 0, y: 0 },
            radius: override.radius ?? 160
          },
          cyclicAngles: { A: 0.5, B: 1.5, C: 2.5, D: 3.5 }
        },
    points: [],
    constructions: [],
    measurements: [],
    area: {
      value: override.value ?? 100,
      units: 'mm²',
      signedValue: override.value ?? 100,
      referenceValue: override.referenceValue ?? 200,
      gapValue: override.gapValue ?? 100,
      fillRatio: override.fillRatio ?? 0.5,
      gapRatio: override.gapRatio ?? 0.5
    }
  };
}

// ============================================================
// A. ONE SNAPSHOT -> ONE RESEARCH ROW
// ============================================================
{
  const snapshots = [makeMockSnapshot()];
  const steps = [{ step: 0, parameterName: 'theta_A', parameterValue: 45 }];
  const rows = mapSnapshotsToResearchRows(snapshots, steps);

  assert.equal(rows.length, 1, 'Should output exactly 1 row');
  console.log('✓ A. One snapshot maps to exactly one research row.');
}

// ============================================================
// B & C. CORRECT STATEVERSION & ACTIVEPARAMETER MAPPING
// ============================================================
{
  const snapshots = [makeMockSnapshot({ stateVersion: 42 })];
  const steps = [{ step: 0, parameterName: 'target_angle', parameterValue: 57.5 }];
  const rows = mapSnapshotsToResearchRows(snapshots, steps);

  assert.equal(rows[0].stateVersion, 42, 'stateVersion must match exactly');
  assert.equal(rows[0].activeParameter.name, 'target_angle', 'activeParameter name must match');
  assert.equal(rows[0].activeParameter.value, 57.5, 'activeParameter value must match');
  console.log('✓ B & C. stateVersion and activeParameter mapped correctly.');
}

// ============================================================
// D & E & F. CORRECT R, SIX AREA METRICS, AND PROVENANCE MAPPING
// ============================================================
{
  const snapshots = [makeMockSnapshot({
    radius: 125,
    referenceValue: 9999,
    value: 4444,
    gapValue: 5555,
    fillRatio: 0.44,
    gapRatio: 0.56,
    provenance: 'custom_prov_123'
  })];
  const steps = [{ step: 0, parameterName: 'A', parameterValue: 90 }];
  const rows = mapSnapshotsToResearchRows(snapshots, steps);

  const r = rows[0];
  assert.equal(r.r, 125, 'Radius must map correctly');
  assert.equal(r.sCircle, 9999, 'sCircle must map correctly');
  assert.equal(r.sQuad, 4444, 'sQuad must map correctly');
  assert.equal(r.sGap, 5555, 'sGap must map correctly');
  assert.equal(r.kFill, 0.44, 'kFill must map correctly');
  assert.equal(r.kGap, 0.56, 'kGap must map correctly');
  assert.equal(r.provenance, 'custom_prov_123', 'provenance must map correctly');
  console.log('✓ D & E & F. Radius, area metrics, and provenance mapped accurately.');
}

// ============================================================
// G & H. MULTIPLE SNAPSHOTS PRESERVE ORDER AND COUNT
// ============================================================
{
  const snapshots = [
    makeMockSnapshot({ stateVersion: 10 }),
    makeMockSnapshot({ stateVersion: 20 }),
    makeMockSnapshot({ stateVersion: 30 })
  ];
  const steps = [
    { step: 0, parameterName: 'P', parameterValue: 1 },
    { step: 1, parameterName: 'P', parameterValue: 2 },
    { step: 2, parameterName: 'P', parameterValue: 3 }
  ];
  const rows = mapSnapshotsToResearchRows(snapshots, steps);

  assert.equal(rows.length, 3, 'Output row count must equal input snapshot count');
  assert.equal(rows[0].stateVersion, 10);
  assert.equal(rows[1].stateVersion, 20);
  assert.equal(rows[2].stateVersion, 30);
  console.log('✓ G & H. Order and count are perfectly preserved across multiple snapshots.');
}

// ============================================================
// I. MAPPER PERFORMS NO GEOMETRY CALCULATIONS
// ============================================================
{
  // Provide non-mathematical, completely mismatched area values (e.g. S_circle = 10, S_quad = 100, gap = 999)
  // If the mapper performed recalculations of circle or gap areas, these would change.
  const snapshots = [makeMockSnapshot({
    radius: 5, // actual πr² is ~78.5, but we inject 10
    referenceValue: 10,
    value: 100,
    gapValue: 999
  })];
  const steps = [{ step: 0, parameterName: 'A', parameterValue: 10 }];
  const rows = mapSnapshotsToResearchRows(snapshots, steps);

  assert.equal(rows[0].r, 5);
  assert.equal(rows[0].sCircle, 10, 'Must output the factual reference value in snapshot directly');
  assert.equal(rows[0].sQuad, 100, 'Must output the factual polygon value directly');
  assert.equal(rows[0].sGap, 999, 'Must output the factual gap value directly');
  console.log('✓ I. Verified: mapper performs ZERO geometric math and acts as a pure projection layer.');
}

// ============================================================
// J. SOURCE SNAPSHOTS REMAIN UNCHANGED
// ============================================================
{
  const snapshot = makeMockSnapshot({ stateVersion: 5 });
  const steps = [{ step: 0, parameterName: 'A', parameterValue: 0 }];
  mapSnapshotsToResearchRows([snapshot], steps);

  assert.equal(snapshot.metadata.stateVersion, 5, 'Source snapshot must remain unmodified');
  console.log('✓ J. Source snapshots remain strictly unchanged (immutable read-only).');
}

// ============================================================
// K. DETERMINISTIC REPEATED MAPPING PRODUCES IDENTICAL JSON
// ============================================================
{
  const snapshots = [makeMockSnapshot({ stateVersion: 1 }), makeMockSnapshot({ stateVersion: 2 })];
  const steps = [
    { step: 0, parameterName: 'x', parameterValue: 10 },
    { step: 1, parameterName: 'x', parameterValue: 20 }
  ];

  const run1 = mapSnapshotsToResearchRows(snapshots, steps);
  const run2 = mapSnapshotsToResearchRows(snapshots, steps);

  assert.deepStrictEqual(run1, run2, 'Repeated mapping must be deterministic');
  assert.equal(JSON.stringify(run1), JSON.stringify(run2), 'Serialized representations must be identical');
  console.log('✓ K. Repeated mapping is 100% deterministic.');
}

// ============================================================
// L. MISMATCHED METADATA/SNAPSHOT LENGTHS PRODUCE ERROR
// ============================================================
{
  const snapshots = [makeMockSnapshot()];
  const steps: ExplorationStepMetadata[] = []; // Empty, length mismatch

  assert.throws(() => {
    mapSnapshotsToResearchRows(snapshots, steps);
  }, /Length mismatch/, 'Must throw deterministic error on length mismatch');

  // Mismatched step index sequence
  const invalidSteps = [{ step: 5, parameterName: 'A', parameterValue: 10 }];
  assert.throws(() => {
    mapSnapshotsToResearchRows(snapshots, invalidSteps);
  }, /Step index mismatch/, 'Must throw deterministic error on index mismatch');
  console.log('✓ L. Length and index mismatches safely produce deterministic errors.');
}

// ============================================================
// M. MISSING REFERENCE CIRCLE THROWS DETERMINISTIC ERROR (NO SILENT RADIUS FALLBACK)
// ============================================================
{
  const invalidSnapshot = makeMockSnapshot({ omitReferenceCircle: true });
  const steps = [{ step: 0, parameterName: 'A', parameterValue: 10 }];

  assert.throws(() => {
    mapSnapshotsToResearchRows([invalidSnapshot], steps);
  }, /does not contain valid referenceCircle\.radius/, 'Must throw deterministic error when referenceCircle is absent');
  console.log('✓ M. Verified: absence of referenceCircle throws deterministic error without fabricating a fallback radius.');
}

console.log('🎉 ALL GEOMETRY RESEARCH ROW MAPPER REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
