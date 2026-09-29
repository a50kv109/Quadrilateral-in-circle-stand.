/**
 * CQNS-001 — Cyclic Quadrilateral Normalization Stand
 * Root Application Component with bilingual UI (RU / EN, default RU)
 * and interactive geometry stand tooling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { GeometryState } from './engines/geometryState';
import { SOLGateway } from './engines/solGateway';
import { VerificationEvaluation } from './engines/verificationLayer';
import { CanvasStage, RulerMeasurementState } from './components/CanvasStage';
import { CQNSInformationPanel } from './components/CQNSInformationPanel';
import { WorkspaceSplitter } from './components/layout/WorkspaceSplitter';
import { Language, translations } from './i18n/translations';
import { CheckCircle2, AlertTriangle, RotateCcw, RefreshCw, Globe, Sliders } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>('ru');
  const t = translations[language];

  const [state, setState] = useState<GeometryState>(() => GeometryState.getInstance());
  const [evaluation, setEvaluation] = useState<VerificationEvaluation>(() =>
    SOLGateway.getInstance().syncEvaluation()
  );
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [rulerMeasurement, setRulerMeasurement] = useState<RulerMeasurementState | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Resizable Right Panel Splitter State (defaults to 384px = w-96)
  const DEFAULT_PANEL_WIDTH = 384;
  const [panelWidth, setPanelWidth] = useState<number>(DEFAULT_PANEL_WIDTH);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to state updates
  useEffect(() => {
    const geoState = GeometryState.getInstance();
    const unsubscribe = geoState.subscribe((updatedState) => {
      setState(updatedState);
      const newEval = SOLGateway.getInstance().syncEvaluation();
      setEvaluation(newEval);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    const newEval = SOLGateway.getInstance().syncEvaluation();
    setEvaluation(newEval);
  };

  const handleReset = () => {
    SOLGateway.getInstance().resetToCanon();
    setRotationAngle(0);
    handleRefresh();
  };

  const handleVerify = () => {
    const res = SOLGateway.getInstance().requestVerification('all');
    setEvaluation(res.evaluation);
  };

  const handleToggleMode = () => {
    const newMode = state.provenanceMode === 'CANONICAL' ? 'EXTENSION_SCENARIO' : 'CANONICAL';
    SOLGateway.getInstance().setProvenanceMode(newMode);
    handleRefresh();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Application Navigation & Stand Status Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 font-bold font-mono text-sm shadow-inner">
            CQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                {t.appTitle}
              </h1>
              <span className="text-xs text-slate-400 font-normal">
                {t.appSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>{t.canonTag}</span>
              <span>•</span>
              <span className="text-indigo-400">{t.architectureTag}</span>
            </div>
          </div>
        </div>

        {/* Live Epistemic Health Summary & Actions in Header */}
        <div className="flex items-center gap-3">
          {/* Explicit Vertex Mode Switcher: School Mode (S¹) vs Research Mode (R²) */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => {
                SOLGateway.getInstance().setVertexMode('SCHOOL');
                handleRefresh();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                state.vertexMode === 'SCHOOL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.modeSchoolDesc}
            >
              <span>🎓 {t.modeSchool}</span>
            </button>
            <button
              onClick={() => {
                SOLGateway.getInstance().setVertexMode('RESEARCH');
                handleRefresh();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                state.vertexMode === 'RESEARCH'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.modeResearchDesc}
            >
              <span>🔬 {t.modeResearch}</span>
            </button>
          </div>

          {/* Cyclicity Status Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            evaluation.isCyclic
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : 'bg-amber-950/80 text-amber-300 border-amber-800'
          }`}>
            {evaluation.isCyclic ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.stateVerified}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.stateVanished}</span>
              </>
            )}
          </div>

          {/* Explicit Verification Button (Verify) */}
          <button
            onClick={handleVerify}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
            title="Explicit contract verification"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.verify}</span>
          </button>

          {/* Reset to Canon */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title={t.resetCanon}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetCanon}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* RU / EN Language Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setLanguage('ru')}
              className={`px-2 py-0.5 rounded-md transition ${
                language === 'ru'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Русский интерфейс (по умолчанию)"
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded-md transition ${
                language === 'en'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English interface"
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (Canvas on Left, CQNS Suite on Right with Resizable Divider) */}
      <div ref={workspaceContainerRef} className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-[350px]">
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              <CanvasStage
                state={state}
                selectedPointId={selectedPointId}
                onSelectPoint={setSelectedPointId}
                rulerMeasurement={rulerMeasurement}
                onRulerMeasurementChange={setRulerMeasurement}
                language={language}
              />
            </div>
          </div>

          {/* Global Rotation Control Panel */}
          <div className="h-16 bg-slate-900 border-t border-slate-800 px-6 flex items-center gap-6 shrink-0 text-slate-300 text-xs">
            <div className="flex items-center gap-2 select-none">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="font-bold uppercase tracking-wider text-slate-400">
                {language === 'ru' ? 'ВРАЩЕНИЕ:' : 'ROTATION:'}
              </span>
              <span className="font-mono font-bold text-indigo-300 text-sm bg-indigo-950/60 border border-indigo-900/60 px-2 py-0.5 rounded shadow-sm">
                {rotationAngle}°
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  SOLGateway.getInstance().rotateVertices((-15 * Math.PI) / 180);
                  setRotationAngle((prev) => (prev - 15 + 360) % 360);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 active:scale-95 transition"
                title="Rotate 15 degrees counter-clockwise"
              >
                ↺ -15°
              </button>
              <button
                onClick={() => {
                  SOLGateway.getInstance().rotateVertices((15 * Math.PI) / 180);
                  setRotationAngle((prev) => (prev + 15) % 360);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 active:scale-95 transition"
                title="Rotate 15 degrees clockwise"
              >
                ↻ +15°
              </button>
            </div>

            {/* Continuous range slider */}
            <div className="flex-1 flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="360"
                value={rotationAngle}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const diff = val - rotationAngle;
                  if (diff !== 0) {
                    SOLGateway.getInstance().rotateVertices((diff * Math.PI) / 180);
                    setRotationAngle(val);
                  }
                }}
                className="flex-1 accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer border border-slate-800"
              />
            </div>

            {/* Reset angle button */}
            <button
              onClick={() => {
                const diff = 0 - rotationAngle;
                if (diff !== 0) {
                  SOLGateway.getInstance().rotateVertices((diff * Math.PI) / 180);
                  setRotationAngle(0);
                }
              }}
              className="px-3 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 font-medium active:scale-95 transition"
              title="Reset rotation to 0"
            >
              {language === 'ru' ? 'Сбросить угол' : 'Reset angle'}
            </button>
          </div>
        </div>

        {/* Draggable Vertical Divider (Workspace Splitter) */}
        <WorkspaceSplitter
          containerRef={workspaceContainerRef}
          panelWidth={panelWidth}
          onPanelWidthChange={setPanelWidth}
          minPanelWidth={300}
          minCanvasWidth={350}
          maxPanelWidth={800}
          onResetDefault={() => setPanelWidth(DEFAULT_PANEL_WIDTH)}
        />

        <CQNSInformationPanel
          state={state}
          evaluation={evaluation}
          rulerMeasurement={rulerMeasurement}
          onRefresh={handleRefresh}
          language={language}
          width={panelWidth}
        />
      </div>
    </div>
  );
}
