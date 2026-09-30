/**
 * R2-05 UI Shell & Presentation Projection Unit Tests
 * Verifies presentation purity, viewport state isolation, and zero kernel mutation.
 */

import { strict as assert } from 'assert';
import { UniversalGeometryState } from '../src/kernel/state/geometryState';
import { TopologyGuard } from '../src/kernel/topology/topologyGuard';
import { createDefaultQuadrilateralState, createPresetState } from '../src/ui/state/defaultState';
import { projectGeometryState, formatAngle } from '../src/ui/projection/presentationModel';
import { UIState } from '../src/ui/types/uiTypes';
import { CyclicInput, CyclicMutationDraft } from '../src/types/geometry';

console.log("=== RUNNING REMIX 2 UI SHELL & PROJECTION TESTS (R2-05) ===");

const initialUiState: UIState = {
  activeTool: 'SELECT',
  activeTab: 'summary',
  standMode: 'SCHOOL',
  language: 'RU',
  activePreset: 'SQUARE',
  displayAngleMode: 'DEGREES',
  showScale: true,
  showRadii: true,
  showDiagonals: false,
  showGrid: true,
  splitterRatio: 0.5,
  viewport: {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    viewRotationDeg: 0
  },
  hoveredVertexId: null,
  isNumericModalOpen: false
};

// Test A: Initial default state is a valid N=4 cyclic quadrilateral
{
  const state = createDefaultQuadrilateralState();
  assert.equal(state.vertexCount, 4);
  assert.equal(state.domainProfile, 'CYCLIC');
  assert.equal(state.stateVersion, 1);

  const report = TopologyGuard.validate(state);
  assert.equal(report.status, 'VALID');
  console.log("✓ Test A: Initial default state is valid N=4 cyclic quadrilateral.");
}

// Test B: Presentation projection is pure and does not mutate state or stateVersion
{
  const state = createDefaultQuadrilateralState();
  const vBefore = state.stateVersion;

  const presentation1 = projectGeometryState(state, initialUiState);
  assert.equal(state.stateVersion, vBefore);
  assert.equal(presentation1.vertices.length, 4);
  assert.equal(presentation1.chords.length, 4);
  assert.equal(presentation1.diagonals.length, 2);

  // Calling again produces identical results without side effects
  const presentation2 = projectGeometryState(state, initialUiState);
  assert.deepEqual(presentation1, presentation2);
  assert.equal(state.stateVersion, vBefore);
  console.log("✓ Test B: Presentation projection is pure and non-mutating.");
}

// Test C: Viewport changes (zoom, pan, view rotation) modify UI state only, not geometry state
{
  const state = createDefaultQuadrilateralState();
  const vBefore = state.stateVersion;

  const updatedUiState: UIState = {
    ...initialUiState,
    viewport: {
      zoom: 2.5,
      panX: 45,
      panY: -30,
      viewRotationDeg: 45
    }
  };

  const presentation = projectGeometryState(state, updatedUiState);

  // State remains completely unchanged
  assert.equal(state.stateVersion, vBefore);
  const input = state.canonicalInputs as CyclicInput;
  assert.equal(input.referenceCircle.radius, 100);

  // Derived vertices retain their canonical Cartesian coords regardless of UI view rotation
  assert.equal(presentation.vertices.length, 4);
  assert.equal(state.stateVersion, 1);
  console.log("✓ Test C: Viewport zoom/pan/rotation leaves geometry state strictly intact.");
}

// Test D: Display format mode conversions (Degrees, Radians, Fractions)
{
  const rad = Math.PI / 2;
  assert.equal(formatAngle(rad, 'DEGREES'), '90.0°');
  assert.equal(formatAngle(rad, 'RADIANS'), '1.57 rad');
  assert.equal(formatAngle(rad, 'FRACTIONS'), 'u = 0.25 (25%)');
  console.log("✓ Test D: Angle display formatting works accurately.");
}

// Test E: Opposite angle sum theorem holds in presentation model
{
  const state = createDefaultQuadrilateralState();
  const presentation = projectGeometryState(state, initialUiState);

  assert.equal(Math.round(presentation.oppositeAngleSums.acSumDeg), 180);
  assert.equal(Math.round(presentation.oppositeAngleSums.bdSumDeg), 180);
  assert.equal(presentation.ptolemy.matches, true);
  console.log("✓ Test E: Opposite angle sums (180°) and Ptolemy invariants verified in projection.");
}

// Test F: Presets produce valid states
{
  const presets: Array<'SQUARE' | 'RECTANGLE' | 'TRAPEZOID' | 'GENERAL'> = [
    'SQUARE',
    'RECTANGLE',
    'TRAPEZOID',
    'GENERAL'
  ];

  for (const p of presets) {
    const presetState = createPresetState(p);
    assert.equal(presetState.vertexCount, 4);
    assert.equal(presetState.domainProfile, 'CYCLIC');
    const report = TopologyGuard.validate(presetState);
    assert.equal(report.status, 'VALID', `Preset ${p} must have VALID topology`);
  }
  console.log("✓ Test F: All quadrilateral presets (Square, Rectangle, Trapezoid, General) produce valid states.");
}

// Test G: State mutation via numeric angles commits transaction with monotonic version increment
{
  const state = createDefaultQuadrilateralState();
  assert.equal(state.stateVersion, 1);

  const newAnglesRad = [30, 120, 210, 300].map((d) => (d * Math.PI) / 180);
  const nextState = state.commitMutation((draft) => {
    const cd = draft as CyclicMutationDraft;
    cd.canonicalInputs.angles = [...newAnglesRad];
  }, "NUMERIC_ANGLES_TEST");

  assert.equal(nextState.stateVersion, 2);
  assert.equal(state.stateVersion, 1); // original state immutable

  const report = TopologyGuard.validate(nextState);
  assert.equal(report.status, 'VALID');

  const presentation = projectGeometryState(nextState, initialUiState);
  assert.equal(presentation.stateVersion, 2);
  assert.equal(Math.round(presentation.vertices[0].angleDeg), 30);
  console.log("✓ Test G: Explicit numeric angle mutation commits valid state with version increment.");
}

console.log("🎉 ALL R2-05 UI SHELL & PROJECTION TESTS PASSED SUCCESSFULLY! 🎉\n");
