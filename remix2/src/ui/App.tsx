/**
 * App Component — Root UI Shell for Remix 2 Canonical Geometry Stand
 * R2-05.1 — Canonical Geometry Stand Active Tools
 */

import React, { useState, useCallback, useEffect } from 'react';
import { HeaderBar } from './components/header/HeaderBar';
import { WorkspaceSplitter } from './layout/WorkspaceSplitter';
import { GeometryCanvas } from './canvas/GeometryCanvas';
import { CanvasControlRibbon } from './canvas/CanvasControlRibbon';
import { CanvasRotationBar } from './canvas/CanvasRotationBar';
import { SchoolToolbar } from './canvas/SchoolToolbar';
import { InformationPanel } from './panels/InformationPanel';
import { NumericAnglesModal } from './dialogs/NumericAnglesModal';
import { UIState, StandMode, Language, PresetType, ActiveTool, ActiveTab, DisplayAngleMode } from './types/uiTypes';
import { createDefaultQuadrilateralState, createPresetState } from './state/defaultState';
import { projectGeometryState } from './projection/presentationModel';
import { UniversalGeometryState } from '../kernel/state/geometryState';
import { CyclicMutationDraft, CartesianMutationDraft } from '../types/geometry';
import { AuxiliaryState } from './types/auxiliaryTypes';
import { createEmptyAuxiliaryState, recomputeAuxiliaryGeometry } from './state/auxiliaryEngine';
import { createGeometryStateSnapshot, mapSnapshotsToResearchRows, GeometryResearchRow } from '../research/index';

export const App: React.FC = () => {
  // 1. Authoritative Geometry State (Frozen UniversalGeometryState)
  const [geometryState, setGeometryState] = useState<UniversalGeometryState>(() =>
    createDefaultQuadrilateralState()
  );

  // 2. Auxiliary Constructions State (Living Dynamic DAG)
  const [auxiliaryState, setAuxiliaryState] = useState<AuxiliaryState>(() =>
    createEmptyAuxiliaryState()
  );

  // Undo history buffer
  const [stateHistory, setStateHistory] = useState<{
    geo: UniversalGeometryState;
    aux: AuxiliaryState;
  }[]>([]);

  // 2b. Research Rows (Read-only projection rows mapped purely from snapshots)
  const [researchRows, setResearchRows] = useState<readonly GeometryResearchRow[]>(() => {
    try {
      const initGeo = createDefaultQuadrilateralState();
      const initAux = createEmptyAuxiliaryState();
      const snap = createGeometryStateSnapshot(initGeo, initAux);
      const angleA = ((initGeo.canonicalInputs as any).angles?.[0] ?? 0) * (180 / Math.PI);
      return mapSnapshotsToResearchRows([snap], [{
        step: 0,
        parameterName: 'θ_A',
        parameterValue: Number(angleA.toFixed(1))
      }]);
    } catch {
      return [];
    }
  });

  // 3. UI State (Presentation & Interaction)
  const [uiState, setUiState] = useState<UIState>({
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
  });

  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // 4. Pure Presentation Projection
  const presentation = projectGeometryState(geometryState, uiState);

  // 5. Dynamic DAG Recomputation Helper
  const syncStateAndAuxiliary = useCallback(
    (nextGeoState: UniversalGeometryState, pushToHistory = false) => {
      if (pushToHistory) {
        setStateHistory((h) => [...h, { geo: geometryState, aux: auxiliaryState }]);
      }
      setGeometryState(nextGeoState);

      const derivedVertices = nextGeoState.getDerivedCartesianVertices();
      const pointsMap = new Map<string, { x: number; y: number }>();
      pointsMap.set('O', { x: 0, y: 0 });
      derivedVertices.forEach((v, idx) => {
        pointsMap.set(v.id, { x: v.x, y: v.y });
        const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx];
        if (letter) {
          pointsMap.set(letter, { x: v.x, y: v.y });
        }
      });

      setAuxiliaryState((prev) => {
        const nextAux = recomputeAuxiliaryGeometry(prev, pointsMap, {
          center: { id: 'O', x: 0, y: 0 },
          radius: 160
        });

        // Record research row purely from snapshot
        try {
          const snap = createGeometryStateSnapshot(nextGeoState, nextAux);
          let paramName = 'θ_A';
          let paramVal = 0;
          if (nextGeoState.domainProfile === 'CYCLIC') {
            const angles = (nextGeoState.canonicalInputs as any).angles;
            if (angles && angles.length > 0) {
              paramVal = Number(((angles[0] * 180) / Math.PI).toFixed(1));
            }
          }
          setResearchRows((prevRows) => {
            const nextStep = prevRows.length;
            const newRows = mapSnapshotsToResearchRows([snap], [{
              step: nextStep,
              parameterName: paramName,
              parameterValue: paramVal
            }]);
            return [...prevRows, ...newRows];
          });
        } catch {
          // Ignore projection failures in auxiliary updates
        }

        return nextAux;
      });
    },
    [geometryState, auxiliaryState]
  );

  // 6. Global Keyboard Handler (Escape, Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUiState((prev) => ({
          ...prev,
          activeTool: 'SELECT',
          isNumericModalOpen: false,
          hoveredVertexId: null
        }));
        setAuxiliaryState((prev) => ({
          ...prev,
          selectedEntityId: null,
          selectedEntityType: null
        }));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stateHistory]);

  // 7. Interactive Drag Handlers (60 FPS Reactive Updates)
  const handleDragVertexSchool = useCallback(
    (vertexIndex: number, newAngleRad: number) => {
      try {
        const nextState = geometryState.commitMutation((draft) => {
          const cd = draft as CyclicMutationDraft;
          cd.canonicalInputs.angles[vertexIndex] = newAngleRad;
        }, `DRAG_VERTEX_${vertexIndex}`);
        syncStateAndAuxiliary(nextState, false);
      } catch (err) {
        console.error('Drag mutation rejected by kernel:', err);
      }
    },
    [geometryState, syncStateAndAuxiliary]
  );

  const handleDragVertexResearch = useCallback(
    (vertexIndex: number, x: number, y: number) => {
      try {
        let nextState: UniversalGeometryState;
        if (geometryState.domainProfile === 'CARTESIAN') {
          nextState = geometryState.commitMutation((draft) => {
            const cd = draft as CartesianMutationDraft;
            const current = cd.canonicalInputs.vertices[vertexIndex];
            cd.canonicalInputs.vertices[vertexIndex] = {
              id: current.id,
              x,
              y
            };
          }, `DRAG_RESEARCH_${vertexIndex}`);
        } else {
          // Transition on-the-fly to Cartesian profile for free plane movement
          const currentDerived = geometryState.getDerivedCartesianVertices();
          const newVertices = currentDerived.map((v, i) =>
            i === vertexIndex ? { id: v.id, x, y } : { id: v.id, x: v.x, y: v.y }
          );
          nextState = UniversalGeometryState.createCartesian(
            newVertices,
            `DRAG_RESEARCH_CONVERSION_${vertexIndex}`
          );
        }
        syncStateAndAuxiliary(nextState, false);
      } catch (err) {
        console.error('Research drag error:', err);
      }
    },
    [geometryState, syncStateAndAuxiliary]
  );

  // 8. Header Event Handlers
  const handleModeChange = useCallback((mode: StandMode) => {
    setUiState((prev) => ({ ...prev, standMode: mode }));
  }, []);

  const handleLanguageChange = useCallback((lang: Language) => {
    setUiState((prev) => ({ ...prev, language: lang }));
  }, []);

  const handlePresetSelect = useCallback(
    (preset: PresetType) => {
      const newState = createPresetState(preset);
      syncStateAndAuxiliary(newState, true);
      setUiState((prev) => ({
        ...prev,
        activePreset: preset,
        viewport: { ...prev.viewport, viewRotationDeg: 0 }
      }));
    },
    [syncStateAndAuxiliary]
  );

  const handleReset = useCallback(() => {
    const defaultState = createDefaultQuadrilateralState();
    syncStateAndAuxiliary(defaultState, true);
    setUiState((prev) => ({
      ...prev,
      activePreset: 'SQUARE',
      activeTool: 'SELECT',
      viewport: {
        zoom: 1.0,
        panX: 0,
        panY: 0,
        viewRotationDeg: 0
      }
    }));
  }, [syncStateAndAuxiliary]);

  const handleUndo = useCallback(() => {
    setStateHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const lastEntry = prevHistory[prevHistory.length - 1];
      setGeometryState(lastEntry.geo);
      setAuxiliaryState(lastEntry.aux);
      return prevHistory.slice(0, prevHistory.length - 1);
    });
  }, []);

  const handleExportJson = useCallback(() => {
    const exportBundle = {
      kernelState: geometryState,
      auxiliaryConstructions: auxiliaryState,
      exportedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(exportBundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cqns_workspace_v${geometryState.stateVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [geometryState, auxiliaryState]);

  const handleExportSvg = useCallback(() => {
    const svgElem = document.getElementById('geometry-svg-root');
    if (!svgElem) return;
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cqns_diagram_v${geometryState.stateVersion}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [geometryState.stateVersion]);

  // 9. Canvas Ribbon Event Handlers
  const handleAngleModeChange = useCallback((mode: DisplayAngleMode) => {
    setUiState((prev) => ({ ...prev, displayAngleMode: mode }));
  }, []);

  const handleToggleScale = useCallback(() => {
    setUiState((prev) => ({ ...prev, showScale: !prev.showScale }));
  }, []);

  const handleToggleRadii = useCallback(() => {
    setUiState((prev) => ({ ...prev, showRadii: !prev.showRadii }));
  }, []);

  const handleToggleDiagonals = useCallback(() => {
    setUiState((prev) => ({ ...prev, showDiagonals: !prev.showDiagonals }));
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setUiState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, zoom }
    }));
  }, []);

  // 10. Rotation Bar Event Handlers
  const handleRotationChange = useCallback((deg: number) => {
    setUiState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, viewRotationDeg: deg }
    }));
  }, []);

  const handleStepRotation = useCallback((stepDeg: number) => {
    setUiState((prev) => {
      let nextDeg = prev.viewport.viewRotationDeg + stepDeg;
      if (nextDeg > 180) nextDeg -= 360;
      if (nextDeg < -180) nextDeg += 360;
      return {
        ...prev,
        viewport: { ...prev.viewport, viewRotationDeg: nextDeg }
      };
    });
  }, []);

  const handleResetRotation = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, viewRotationDeg: 0 }
    }));
  }, []);

  // 11. Viewport Pan & Wheel Zoom
  const handleZoomByWheel = useCallback((deltaY: number) => {
    setUiState((prev) => {
      const factor = deltaY > 0 ? 0.92 : 1.08;
      const nextZoom = Math.max(0.3, Math.min(3.5, prev.viewport.zoom * factor));
      return {
        ...prev,
        viewport: { ...prev.viewport, zoom: nextZoom }
      };
    });
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setUiState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        panX: prev.viewport.panX + dx,
        panY: prev.viewport.panY + dy
      }
    }));
  }, []);

  // 12. Toolbar & Entity Selection
  const handleSelectTool = useCallback((tool: ActiveTool) => {
    setUiState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  const handleSelectEntity = useCallback((id: string | null, type: string | null) => {
    setAuxiliaryState((prev) => ({
      ...prev,
      selectedEntityId: id,
      selectedEntityType: type
    }));
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setUiState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const handleSelectRowSnapshot = useCallback((stateVersion: number) => {
    if (geometryState.stateVersion === stateVersion) return;
    const historical = stateHistory.find((entry) => entry.geo.stateVersion === stateVersion);
    if (historical) {
      setGeometryState(historical.geo);
      setAuxiliaryState(historical.aux);
    }
  }, [geometryState.stateVersion, stateHistory]);

  const handleSplitterRatioChange = useCallback((ratio: number) => {
    setUiState((prev) => ({ ...prev, splitterRatio: ratio }));
  }, []);

  const handleResetSplitter = useCallback(() => {
    setUiState((prev) => ({ ...prev, splitterRatio: 0.5 }));
  }, []);

  // 13. Modal: Commit Numeric Angles
  const handleCommitNumericAngles = useCallback(
    (newAnglesRad: number[]) => {
      const updatedState = geometryState.commitMutation((draft) => {
        const cd = draft as CyclicMutationDraft;
        cd.canonicalInputs.angles = [...newAnglesRad];
      }, 'SET_NUMERIC_ANGLES');
      syncStateAndAuxiliary(updatedState, true);
    },
    [geometryState, syncStateAndAuxiliary]
  );

  // Width calculations based on splitterRatio
  const leftPercent = `${(uiState.splitterRatio * 100).toFixed(1)}%`;
  const rightPercent = `${((1 - uiState.splitterRatio) * 100).toFixed(1)}%`;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Header Bar */}
      <HeaderBar
        uiState={uiState}
        onModeChange={handleModeChange}
        onLanguageChange={handleLanguageChange}
        onPresetSelect={handlePresetSelect}
        onReset={handleReset}
        onUndo={handleUndo}
        onExportJson={handleExportJson}
        onExportSvg={handleExportSvg}
      />

      {/* 2. Main Two-Column Workspace with Draggable Splitter */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Geometry Canvas */}
        <section
          style={{ width: leftPercent }}
          className="flex flex-col h-full overflow-hidden relative border-r border-slate-800"
        >
          {/* Top Control Ribbon Inside Canvas */}
          <CanvasControlRibbon
            uiState={uiState}
            presentation={presentation}
            onAngleModeChange={handleAngleModeChange}
            onToggleScale={handleToggleScale}
            onToggleRadii={handleToggleRadii}
            onZoomChange={handleZoomChange}
          />

          {/* School Geometry 12 Tools Palette */}
          <SchoolToolbar
            activeTool={uiState.activeTool}
            onSelectTool={handleSelectTool}
          />

          {/* Core SVG Canvas with all 12 active tools & dynamic auxiliary rendering */}
          <div className="flex-1 relative overflow-hidden">
            <GeometryCanvas
              presentation={presentation}
              uiState={uiState}
              auxiliaryState={auxiliaryState}
              onHoverVertex={(id) => setUiState((prev) => ({ ...prev, hoveredVertexId: id }))}
              onZoomByWheel={handleZoomByWheel}
              onPan={handlePan}
              onDragVertexSchool={handleDragVertexSchool}
              onDragVertexResearch={handleDragVertexResearch}
              onUpdateAuxiliaryState={setAuxiliaryState}
              onSelectTool={handleSelectTool}
              onSelectEntity={handleSelectEntity}
              geometryState={geometryState}
              onUpdateGeometryState={syncStateAndAuxiliary}
            />
          </div>

          {/* Bottom Rotation Bar */}
          <CanvasRotationBar
            rotationDeg={uiState.viewport.viewRotationDeg}
            onRotationChange={handleRotationChange}
            onStepRotation={handleStepRotation}
            onResetRotation={handleResetRotation}
          />
        </section>

        {/* Draggable Vertical Splitter */}
        <WorkspaceSplitter
          onRatioChange={handleSplitterRatioChange}
          onReset={handleResetSplitter}
          isDragging={isDraggingSplitter}
          setIsDragging={setIsDraggingSplitter}
        />

        {/* Right Column: Information Panel */}
        <section
          style={{ width: rightPercent }}
          className="flex flex-col h-full overflow-hidden"
        >
          <InformationPanel
            uiState={uiState}
            presentation={presentation}
            auxiliaryState={auxiliaryState}
            researchRows={researchRows}
            activeStateVersion={geometryState.stateVersion}
            onTabChange={handleTabChange}
            onSelectRowSnapshot={handleSelectRowSnapshot}
            onOpenNumericModal={() => setUiState((prev) => ({ ...prev, isNumericModalOpen: true }))}
            onClearSelection={() => handleSelectEntity(null, null)}
          />
        </section>
      </main>

      {/* 3. Numeric Angles Modal */}
      <NumericAnglesModal
        state={geometryState}
        isOpen={uiState.isNumericModalOpen}
        onClose={() => setUiState((prev) => ({ ...prev, isNumericModalOpen: false }))}
        onCommitAngles={handleCommitNumericAngles}
      />
    </div>
  );
};
