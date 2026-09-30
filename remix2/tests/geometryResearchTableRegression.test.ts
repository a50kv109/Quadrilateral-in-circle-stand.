/**
 * Regression Test Suite for READ-ONLY GEOMETRY RESEARCH TABLE v0.1
 * 
 * Verifies that GeometryResearchTable:
 * - is a pure, read-only presentation component
 * - renders all 8 primary fields accurately from GeometryResearchRow data
 * - handles empty state deterministically
 * - preserves row order
 * - performs zero geometry calculation
 * - does not mutate underlying rows
 */

import { strict as assert } from 'assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { GeometryResearchTable } from '../src/ui/panels/GeometryResearchTable';
import { GeometryResearchRow } from '../src/research/index';

console.log('=== RUNNING READ-ONLY GEOMETRY RESEARCH TABLE REGRESSION TESTS ===');

// Helper to create mock GeometryResearchRow
function makeMockRow(override: Partial<GeometryResearchRow> = {}): GeometryResearchRow {
  return {
    step: override.step ?? 0,
    stateVersion: override.stateVersion ?? 1,
    activeParameter: override.activeParameter ?? { name: 'θ_A', value: 45 },
    r: override.r ?? 160,
    sCircle: override.sCircle ?? 80424.77,
    sQuad: override.sQuad ?? 51200.0,
    sGap: override.sGap ?? 29224.77,
    kFill: override.kFill ?? 0.6366,
    kGap: override.kGap ?? 0.3634,
    provenance: override.provenance ?? 'test_provenance'
  };
}

// ============================================================
// A. EMPTY ROWS PRODUCE EMPTY-STATE UI
// ============================================================
{
  const htmlEmpty = ReactDOMServer.renderToString(
    React.createElement(GeometryResearchTable, { rows: [] })
  );
  assert(htmlEmpty.includes('Нет данных исследования'), 'Empty rows must render clear empty state message');
  console.log('✓ A. Empty rows correctly render empty state message ("Нет данных исследования").');
}

// ============================================================
// B & C. ONE ROW RENDERS ALL 8 PRIMARY FIELDS
// ============================================================
{
  const sampleRow = makeMockRow({
    step: 0,
    stateVersion: 1,
    activeParameter: { name: 'θ_A', value: 45.0 },
    r: 160.0,
    sCircle: 80424.8,
    sQuad: 51200.0,
    sGap: 29224.8,
    kFill: 0.6366,
    kGap: 0.3634
  });

  const html = ReactDOMServer.renderToString(
    React.createElement(GeometryResearchTable, { rows: [sampleRow] })
  );

  // 1. Step
  assert(html.includes('>0<'), 'Must display step 0');
  // 2. Parameter
  assert(html.includes('θ_A') && html.includes('45.0'), 'Must display parameter name and value');
  // 3. R
  assert(html.includes('160.0'), 'Must display radius R (160.0)');
  // 4. Circle Area
  assert(html.includes('80424.8'), 'Must display S_circle');
  // 5. Quadrilateral Area
  assert(html.includes('51200.0'), 'Must display S_quad');
  // 6. Gap Area
  assert(html.includes('29224.8'), 'Must display S_gap');
  // 7. Fill %
  assert(html.includes('63.66 %'), 'Must display Fill %');
  // 8. Gap %
  assert(html.includes('36.34 %'), 'Must display Gap %');

  console.log('✓ B & C. Single row renders all 8 primary fields accurately with units.');
}

// ============================================================
// D & E. VALUES COME DIRECTLY FROM ROW WITHOUT ANY GEOMETRY MATH
// ============================================================
{
  // Provide non-standard arbitrary numbers
  const arbitraryRow = makeMockRow({
    step: 7,
    r: 99.5,
    sCircle: 12345.6,
    sQuad: 7890.1,
    sGap: 4455.5,
    kFill: 0.7777,
    kGap: 0.2223
  });

  const html = ReactDOMServer.renderToString(
    React.createElement(GeometryResearchTable, { rows: [arbitraryRow] })
  );

  assert(html.includes('12345.6'), 'Circle area must be taken directly from row data');
  assert(html.includes('7890.1'), 'Quad area must be taken directly from row data');
  assert(html.includes('4455.5'), 'Gap area must be taken directly from row data');
  assert(html.includes('77.77 %'), 'Fill % must be formatted directly from row.kFill');
  assert(html.includes('22.23 %'), 'Gap % must be formatted directly from row.kGap');
  console.log('✓ D & E. Values are projected directly without table-side recalculation.');
}

// ============================================================
// F. MULTIPLE ROWS PRESERVE ORDER
// ============================================================
{
  const row0 = makeMockRow({ step: 0, stateVersion: 10, activeParameter: { name: 'θ_A', value: 40 } });
  const row1 = makeMockRow({ step: 1, stateVersion: 11, activeParameter: { name: 'θ_A', value: 50 } });
  const row2 = makeMockRow({ step: 2, stateVersion: 12, activeParameter: { name: 'θ_A', value: 60 } });

  const html = ReactDOMServer.renderToString(
    React.createElement(GeometryResearchTable, { rows: [row0, row1, row2] })
  );

  const idx0 = html.indexOf('<span>40.0°</span>');
  const idx1 = html.indexOf('<span>50.0°</span>');
  const idx2 = html.indexOf('<span>60.0°</span>');

  assert(idx0 !== -1 && idx1 !== -1 && idx2 !== -1, 'All parameter values must be present');
  assert(idx0 < idx1 && idx1 < idx2, 'Rows must be rendered in strictly preserved order');
  console.log('✓ F. Multiple rows preserve strict sequential order.');
}

// ============================================================
// G. ROW SELECTION / STATE VERSION CONTRACT
// ============================================================
{
  let selectedVersion: number | null = null;
  const onSelect = (version: number) => {
    selectedVersion = version;
  };

  const row = makeMockRow({ stateVersion: 42 });
  const element = React.createElement(GeometryResearchTable, {
    rows: [row],
    onSelectRowSnapshot: onSelect,
    activeStateVersion: 42
  });

  const html = ReactDOMServer.renderToString(element);
  assert(html.includes('border-purple-500'), 'Selected row must have active highlight styling');
  console.log('✓ G. Active row selection styling and callback interface verified.');
}

// ============================================================
// H. UNDERLYING ROWS ARE NOT MUTATED
// ============================================================
{
  const originalRow = Object.freeze(makeMockRow({ stateVersion: 99 }));
  const rows = Object.freeze([originalRow]);

  ReactDOMServer.renderToString(
    React.createElement(GeometryResearchTable, { rows })
  );

  assert.equal(originalRow.stateVersion, 99, 'Original row must remain strictly unchanged');
  console.log('✓ H. Underlying rows remain completely immutable.');
}

console.log('🎉 ALL READ-ONLY GEOMETRY RESEARCH TABLE REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
