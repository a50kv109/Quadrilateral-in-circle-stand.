/**
 * CQNS-001 — Information and Inspection Panel
 * Sourced strictly from GeometryState, GeometryCore, VerificationLayer, and CyclicChordEngine.
 * Adapts Triangle Stand Information Architecture to Canonical Cyclic Quadrilateral inspection.
 *
 * READ-ONLY PROJECTION: ZERO direct state mutations.
 * ZERO internal geometry calculations (delegates exclusively to GeometryCore / CyclicChordEngine / VerificationLayer).
 */

import React, { useState } from 'react';
import { GeometryState } from '../engines/geometryState';
import { VerificationEvaluation } from '../engines/verificationLayer';
import { GeometryCore } from '../engines/geometryCore';
import { CyclicChordEngine } from '../engines/cyclicChordEngine';
import { SOLGateway } from '../engines/solGateway';
import { EpistemicStatus, Point } from '../types/geometry';
import { RulerMeasurementState, RulerPointRef } from './CanvasStage';
import { Language, translations } from '../i18n/translations';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Layers,
  Compass,
  Ruler,
  FileText,
  PieChart,
  Table,
  Network,
  Award,
  ListFilter,
} from 'lucide-react';

interface CQNSInformationPanelProps {
  state: GeometryState;
  evaluation: VerificationEvaluation;
  rulerMeasurement?: RulerMeasurementState | null;
  onRefresh: () => void;
  language: Language;
  width?: number;
}

export const CQNSInformationPanel: React.FC<CQNSInformationPanelProps> = ({
  state,
  evaluation,
  rulerMeasurement,
  onRefresh,
  language,
  width,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<
    'passport' | 'summary' | 'arcs_chords' | 'relations' | 'theorems' | 'ledger'
  >('passport');

  const circle = state.circles.get('circle_main');
  const ptO = state.points.get('pt_O');
  const ptA = state.points.get('pt_A');
  const ptB = state.points.get('pt_B');
  const ptC = state.points.get('pt_C');
  const ptD = state.points.get('pt_D');
  const diagAC = state.segments.get('diag_AC');
  const diagBD = state.segments.get('diag_BD');
  const ptP = state.points.get('pt_P');

  const constructionIntersections = state.getConstructionIntersections();

  // Dynamically resolve live point coordinates for active ruler measurement
  const resolveLiveRulerPoint = (pRef: RulerPointRef): { x: number; y: number; name: string } => {
    if (pRef.id) {
      const pt = state.points.get(pRef.id);
      if (pt) return { x: pt.x, y: pt.y, name: pt.name };
      const isect = constructionIntersections.find(c => c.id === pRef.id);
      if (isect) return { x: isect.x, y: isect.y, name: isect.name };
    }
    return { x: pRef.x, y: pRef.y, name: pRef.name };
  };

  const liveRulerP1 = rulerMeasurement ? resolveLiveRulerPoint(rulerMeasurement.p1) : null;
  const liveRulerP2 = rulerMeasurement ? resolveLiveRulerPoint(rulerMeasurement.p2) : null;
  const liveDist =
    liveRulerP1 && liveRulerP2
      ? GeometryCore.distance(liveRulerP1, liveRulerP2)
      : 0;

  // Sourced normalization from CyclicChordEngine
  const vertices = [ptA, ptB, ptC, ptD].filter((p): p is Point => p !== undefined);
  const refCircle = circle && ptO ? { center: ptO, radius: circle.radius } : null;
  const normalization =
    refCircle && vertices.length === 4
      ? CyclicChordEngine.normalizeCyclicQuadrilateral(refCircle, vertices)
      : null;

  // Sourced side lengths via GeometryCore.distance
  const sideAB = ptA && ptB ? GeometryCore.distance(ptA, ptB) : 0;
  const sideBC = ptB && ptC ? GeometryCore.distance(ptB, ptC) : 0;
  const sideCD = ptC && ptD ? GeometryCore.distance(ptC, ptD) : 0;
  const sideDA = ptD && ptA ? GeometryCore.distance(ptD, ptA) : 0;
  const perimeter = sideAB + sideBC + sideCD + sideDA;

  // Diagonal lengths via GeometryCore.distance (if constructed)
  const lenAC = diagAC && ptA && ptC ? GeometryCore.distance(ptA, ptC) : null;
  const lenBD = diagBD && ptB && ptD ? GeometryCore.distance(ptB, ptD) : null;

  // Helper badge color by Epistemic Status
  const getBadge = (status: EpistemicStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> VERIFIED
          </span>
        );
      case 'VANISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> VANISHED
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800 shrink-0">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> INVALID
          </span>
        );
      case 'DERIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> DERIVED
          </span>
        );
      case 'GIVEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
            <Info className="w-3.5 h-3.5 text-blue-400" /> GIVEN
          </span>
        );
      case 'HYPOTHESIS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-950 text-yellow-300 border border-yellow-800 shrink-0">
            <Compass className="w-3.5 h-3.5 text-yellow-400" /> HYPOTHESIS
          </span>
        );
    }
  };

  // Acceptance Test SOL Gateway action triggers (delegated to SOLGateway, no local state mutation)
  const handleTestVanished = () => {
    SOLGateway.getInstance().setVertexMode('RESEARCH');
    SOLGateway.getInstance().movePoint('pt_D', 0, -225);
    onRefresh();
  };

  const handleRestoreD = () => {
    const rad = (315 * Math.PI) / 180;
    const x = Math.round(160 * Math.cos(rad));
    const y = Math.round(160 * Math.sin(rad));
    SOLGateway.getInstance().movePoint('pt_D', x, y);
    onRefresh();
  };

  const handleExplicitVerification = () => {
    SOLGateway.getInstance().requestVerification('all');
    onRefresh();
  };

  const handleResetCanon = () => {
    SOLGateway.getInstance().resetToCanon();
    onRefresh();
  };

  return (
    <div
      className="h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden text-slate-200 shrink-0"
      style={{ width: width !== undefined ? `${width}px` : '24rem' }}
    >
      {/* Stand Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              {t.panelTitle}
            </h2>
            <p className="text-xs text-slate-400">{t.panelSubtitle}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                state.vertexMode === 'SCHOOL'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {state.vertexMode === 'SCHOOL' ? '🎓 S¹ SCHOOL' : '🔬 R² RESEARCH'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-950 text-indigo-300 border border-indigo-800">
              v{state.stateVersion}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar (6 tabs adapting Triangle Stand Architecture) */}
      <div className="flex border-b border-slate-800 bg-slate-950 text-[11px] shrink-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('passport')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'passport'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabPassport}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabPassport}</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'summary'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabSummary}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabSummary}</span>
        </button>

        <button
          onClick={() => setActiveTab('arcs_chords')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'arcs_chords'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabArcsChords}
        >
          <Table className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabArcsChords}</span>
        </button>

        <button
          onClick={() => setActiveTab('relations')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'relations'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabRelationMap}
        >
          <Network className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabRelationMap}</span>
        </button>

        <button
          onClick={() => setActiveTab('theorems')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'theorems'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabTheorems}
        >
          <Award className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabTheorems}</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 min-w-[60px] py-2 px-1 text-center font-medium transition flex flex-col items-center gap-0.5 ${
            activeTab === 'ledger'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t.tabLedger}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span className="truncate">{t.tabLedger} ({evaluation.relations.length})</span>
        </button>
      </div>

      {/* Active Ruler Measurement Card (Observation Data) */}
      {rulerMeasurement && liveRulerP1 && liveRulerP2 && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-slate-950/90 border border-pink-500/50 shadow-lg shrink-0">
          <div className="flex items-center justify-between text-xs text-pink-400 font-semibold mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5" />
                {language === 'ru' ? 'ИЗМЕРЕНИЕ — ЛИНЕЙКА' : 'MEASUREMENT — RULER'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-950/60 border border-pink-900/80 text-pink-300">
              1 px ≈ 1 mm
            </span>
          </div>

          <div className="bg-slate-900/90 rounded p-2.5 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 font-mono">
                {liveRulerP1.name && liveRulerP2.name && liveRulerP1.name !== liveRulerP2.name
                  ? `${liveRulerP1.name} → ${liveRulerP2.name}`
                  : 'P₁ → P₂'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                ({Math.round(liveRulerP1.x)}, {Math.round(liveRulerP1.y)}) → ({Math.round(liveRulerP2.x)}, {Math.round(liveRulerP2.y)})
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold font-mono text-pink-300">
                L = {liveDist.toFixed(1)} mm
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {Math.round(liveDist)} px
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================================================================= */}
        {/* TAB 1: PASSPORT & STATUS */}
        {/* ================================================================= */}
        {activeTab === 'passport' && (
          <div className="space-y-4">
            {/* Configuration Passport Card */}
            <div className="p-3 rounded-lg border border-indigo-900/60 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Configuration Passport
                </span>
                {getBadge(evaluation.isCyclic ? 'VERIFIED' : 'VANISHED')}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500">State Version:</div>
                  <div className="text-slate-200 font-bold">v{state.stateVersion}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Provenance:</div>
                  <div className="text-slate-200">{state.provenanceMode}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Vertex Constraint:</div>
                  <div className="text-slate-200">{state.vertexMode}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Circumcircle:</div>
                  <div className="text-slate-200">Circle(O, R={circle?.radius || 160})</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Read-only projection over GeometryState. All derived facts are recomputed deterministically.
              </p>
            </div>

            {/* Primary Cyclicity Card */}
            <div
              className={`p-3 rounded-lg border transition ${
                evaluation.isCyclic
                  ? 'bg-slate-950/80 border-emerald-900/60'
                  : 'bg-amber-950/20 border-amber-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  {t.cyclicQuadTitle}
                </span>
                {getBadge(evaluation.isCyclic ? 'VERIFIED' : 'VANISHED')}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {evaluation.isCyclic ? t.cyclicQuadVerifiedDesc : t.cyclicQuadVanishedDesc}
              </p>
            </div>

            {/* Acceptance Testing SOL Gateway Actions */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.acceptanceSectionTitle}
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={handleTestVanished}
                  className="w-full py-1.5 px-2.5 rounded bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/80 text-amber-200 text-xs font-medium text-left transition flex items-center justify-between"
                >
                  <span>{t.btnTestVanished}</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <button
                  onClick={handleRestoreD}
                  className="w-full py-1.5 px-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium text-left transition flex items-center justify-between"
                >
                  <span>{t.btnRestoreD}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <button
                  onClick={handleExplicitVerification}
                  className="w-full py-1.5 px-2.5 rounded bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800 text-indigo-200 text-xs font-medium text-left transition flex items-center justify-between"
                >
                  <span>{t.btnRunVerification}</span>
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                </button>
                <button
                  onClick={handleResetCanon}
                  className="w-full py-1.5 px-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium text-left transition"
                >
                  {t.btnResetCanonical}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: GEOMETRY SUMMARY */}
        {/* ================================================================= */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Overall Geometry Card */}
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                {t.summaryOverallTitle}
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800">
                <div>
                  <span className="text-slate-500">{t.summaryRadius}:</span>{' '}
                  <span className="text-slate-200 font-semibold">{circle?.radius || 0} px</span>
                </div>
                <div>
                  <span className="text-slate-500">{t.summaryDiameter}:</span>{' '}
                  <span className="text-slate-200 font-semibold">{(circle?.radius || 0) * 2} px</span>
                </div>
                <div>
                  <span className="text-slate-500">{t.summaryPerimeter}:</span>{' '}
                  <span className="text-emerald-400 font-semibold">{perimeter.toFixed(1)} px</span>
                </div>
                <div>
                  <span className="text-slate-500">{t.summaryArea}:</span>{' '}
                  <span className="text-amber-400/80 text-[10px] font-sans">{t.summaryAreaGap}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t.summaryOrientation}:</span>{' '}
                  <span className="text-cyan-300 font-semibold">
                    {normalization?.orientation || 'CCW'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Center O:</span>{' '}
                  <span className="text-slate-200">({ptO?.x || 0}, {ptO?.y || 0})</span>
                </div>
              </div>
            </div>

            {/* Canonical Vertices List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.canonicalVerticesTitle}
              </h3>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/40 overflow-hidden text-xs">
                {[
                  { p: ptA, opp: 'CD', adj: 'DA, AB' },
                  { p: ptB, opp: 'DA', adj: 'AB, BC' },
                  { p: ptC, opp: 'AB', adj: 'BC, CD' },
                  { p: ptD, opp: 'BC', adj: 'CD, DA' },
                ].map(({ p, opp, adj }) => {
                  if (!p || !circle || !ptO) return null;
                  const dist = GeometryCore.distance(p, ptO);
                  const dev = GeometryCore.radialDeviation(p, ptO, circle.radius);
                  const onCircle = dev <= 1.0;
                  const deg = GeometryCore.pointToDegree(p, ptO);

                  return (
                    <div key={p.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100">{p.name}</span>
                          <span className="font-mono text-indigo-400 text-[11px] px-1 bg-indigo-950/60 rounded">
                            θ = {deg}°
                          </span>
                        </div>
                        <div className="font-mono text-slate-400 text-[10px] mt-0.5">
                          ({p.x}, {p.y}) • Adj: {adj} • Opp: {opp}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[10px] text-slate-400">
                          dist: {dist.toFixed(1)}px
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            onCircle ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {onCircle ? t.onCircleLabel : `${t.offCircleLabel} (Δ=${dev.toFixed(1)})`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagonals AC & BD Section */}
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                {t.diagonalsTitle}
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-400 font-bold">Diagonal AC:</div>
                  {lenAC !== null ? (
                    <div className="text-emerald-300 font-semibold">L = {lenAC.toFixed(1)} px</div>
                  ) : (
                    <div className="text-slate-500 italic font-sans text-[10px]">
                      {t.diagNotConstructed}
                    </div>
                  )}
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-400 font-bold">Diagonal BD:</div>
                  {lenBD !== null ? (
                    <div className="text-emerald-300 font-semibold">L = {lenBD.toFixed(1)} px</div>
                  ) : (
                    <div className="text-slate-500 italic font-sans text-[10px]">
                      {t.diagNotConstructed}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ARCS / CHORDS TABLE */}
        {/* ================================================================= */}
        {activeTab === 'arcs_chords' && (
          <div className="space-y-3 text-xs">
            <p className="text-[11px] text-slate-400 leading-normal">
              Direct parametric chord-arc normalization sourced from CyclicChordEngine.
            </p>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="p-2">{t.tableChordHeader}</th>
                    <th className="p-2">{t.tableArcHeader}</th>
                    <th className="p-2">{t.tableAngleHeader}</th>
                    <th className="p-2 text-right">{t.tableLengthHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {[
                    { chord: 'AB', arc: 'arc AB', p1: ptA, p2: ptB },
                    { chord: 'BC', arc: 'arc BC', p1: ptB, p2: ptC },
                    { chord: 'CD', arc: 'arc CD', p1: ptC, p2: ptD },
                    { chord: 'DA', arc: 'arc DA', p1: ptD, p2: ptA },
                  ].map((row, idx) => {
                    const len = row.p1 && row.p2 ? GeometryCore.distance(row.p1, row.p2) : 0;
                    const interval = normalization?.arcIntervals?.[idx];
                    const angleRad = interval
                      ? interval.subtendedAngleRad
                      : row.p1 && row.p2 && ptO
                      ? GeometryCore.angleAtVertex(ptO, row.p1, row.p2)
                      : 0;
                    const angleDeg = (angleRad * 180) / Math.PI;

                    return (
                      <tr key={row.chord} className="hover:bg-slate-900/40">
                        <td className="p-2 font-bold text-indigo-300">{row.chord}</td>
                        <td className="p-2 text-slate-400">{row.arc}</td>
                        <td className="p-2 text-amber-300">{angleDeg.toFixed(1)}°</td>
                        <td className="p-2 text-right text-emerald-300 font-semibold">
                          {len.toFixed(1)} px
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: RELATION MAP */}
        {/* ================================================================= */}
        {activeTab === 'relations' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
              <h3 className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                {t.relationMapTitle}
              </h3>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-indigo-300">Vertex A</span>
                  <span className="text-slate-400">→ Opposite Arc BCD (Chord CD)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-indigo-300">Vertex B</span>
                  <span className="text-slate-400">→ Opposite Arc CDA (Chord DA)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-indigo-300">Vertex C</span>
                  <span className="text-slate-400">→ Opposite Arc DAB (Chord AB)</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-indigo-300">Vertex D</span>
                  <span className="text-slate-400">→ Opposite Arc ABC (Chord BC)</span>
                </div>
              </div>
            </div>

            {/* Confirmed Relations from VerificationLayer */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
                  Supplementary Inscribed Angles
                </span>
                {getBadge(evaluation.isCyclic ? 'DERIVED' : 'VANISHED')}
              </div>
              <div className="space-y-1 font-mono text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between">
                  <span>∠A + ∠C =</span>
                  <span className={Math.abs(evaluation.oppositeAngleSum1 - 180) < 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                    {evaluation.oppositeAngleSum1.toFixed(1)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>∠B + ∠D =</span>
                  <span className={Math.abs(evaluation.oppositeAngleSum2 - 180) < 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                    {evaluation.oppositeAngleSum2.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: THEOREMS / INVARIANTS */}
        {/* ================================================================= */}
        {activeTab === 'theorems' && (
          <div className="space-y-4">
            {/* Inscribed Opposite Angles Theorem Card */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {t.oppAnglesTitle}
                </span>
                {getBadge(evaluation.isCyclic ? 'DERIVED' : 'VANISHED')}
              </div>
              <div className="text-xs space-y-1 font-mono text-slate-300 bg-slate-900/80 p-2 rounded">
                <div className="flex justify-between">
                  <span>∠A + ∠C =</span>
                  <span className={Math.abs(evaluation.oppositeAngleSum1 - 180) < 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                    {evaluation.oppositeAngleSum1.toFixed(1)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>∠B + ∠D =</span>
                  <span className={Math.abs(evaluation.oppositeAngleSum2 - 180) < 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                    {evaluation.oppositeAngleSum2.toFixed(1)}°
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                {t.oppAnglesRule}
              </p>
            </div>

            {/* Ptolemy's Theorem Metric Card */}
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {t.ptolemyTitle}
                </span>
                {diagAC && diagBD
                  ? getBadge(evaluation.isCyclic ? 'DERIVED' : 'VANISHED')
                  : <span className="text-[10px] text-slate-500 font-mono">NEEDS DIAGONALS</span>}
              </div>
              {diagAC && diagBD ? (
                <div className="text-xs space-y-1 font-mono text-slate-300 bg-slate-900/80 p-2 rounded">
                  <div className="flex justify-between">
                    <span>{t.ptolemyDiagProduct}</span>
                    <span className="text-amber-300">{Math.round(evaluation.ptolemyDetails.diagProduct)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.ptolemySideSum}</span>
                    <span className="text-amber-300">{Math.round(evaluation.ptolemyDetails.sideProductSum)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-[11px]">
                    <span className="text-slate-400">{t.ptolemyDelta}</span>
                    <span className={evaluation.ptolemyHolds ? 'text-emerald-400' : 'text-amber-400'}>
                      {evaluation.ptolemyDetails.delta.toFixed(2)} px
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {t.ptolemyNeedsDiags}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: FACT LEDGER */}
        {/* ================================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 leading-normal">
              {t.ledgerHint}
            </div>
            <div className="space-y-2 text-xs">
              {evaluation.relations.map(rel => (
                <div key={rel.id} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-300 text-[11px]">
                      {rel.verificationContractId || 'RULE'}
                    </span>
                    {getBadge(rel.status)}
                  </div>
                  <div className="text-slate-300 text-[11px] font-medium">
                    {rel.description}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span>{t.originLabel} {rel.origin}</span>
                    <span>{t.stateVersionLabel} v{rel.stateVersion}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
