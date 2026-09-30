/**
 * CanvasControlRibbon Component — Metrics, Toggles, Scale & Center Status
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { DisplayAngleMode, UIState } from '../types/uiTypes';
import { GeometryPresentationData } from '../projection/presentationModel';

interface CanvasControlRibbonProps {
  readonly uiState: UIState;
  readonly presentation: GeometryPresentationData;
  readonly onAngleModeChange: (mode: DisplayAngleMode) => void;
  readonly onToggleScale: () => void;
  readonly onToggleRadii: () => void;
  readonly onZoomChange: (zoom: number) => void;
}

export const CanvasControlRibbon: React.FC<CanvasControlRibbonProps> = ({
  uiState,
  presentation,
  onAngleModeChange,
  onToggleScale,
  onToggleRadii,
  onZoomChange
}) => {
  const centerStatusText =
    presentation.centerPosition === 'INSIDE'
      ? 'Центр O строго внутри четырёхугольника'
      : presentation.centerPosition === 'ON CHORD'
      ? 'Центр O лежит на хорде (Фалес)'
      : 'Центр O вне четырёхугольника';

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 flex flex-col gap-2 select-none text-xs">
      {/* 1. Header Badges & Hints */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono font-semibold bg-purple-600 text-white text-[11px]">
            GEOMETRY
          </span>
          <span className="text-slate-300 font-medium">Интерактивный циферблат</span>
        </div>
        <span className="text-slate-400 text-[11px]">
          Тяните вершины A, B, C, D или вращайте диск ↻
        </span>
      </div>

      {/* 2. Metric Chips, Scale & Zoom Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-slate-200">R = {presentation.radius.toFixed(1)} мм</span>
            <span className="text-slate-500">({Math.round(presentation.radius)} px)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-200">D = {presentation.diameter.toFixed(1)} мм</span>
            <span className="text-slate-500">({Math.round(presentation.diameter)} px)</span>
            <span className="px-1 text-[10px] rounded bg-purple-900/60 text-purple-300 font-semibold border border-purple-700/60">
              D = 2R
            </span>
          </div>

          <div className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            1 px = 1 мм (учебный)
          </div>

          {/* Zoom Multipliers */}
          <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5">
            {[0.5, 1.0, 2.0].map((z) => (
              <button
                key={z}
                onClick={() => onZoomChange(z)}
                className={`px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                  Math.abs(uiState.viewport.zoom - z) < 0.05
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        {/* Center Position Indicator */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-700/60 text-blue-300 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>{centerStatusText}</span>
        </div>
      </div>

      {/* 3. Angle Display Mode & Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
        {/* Angle Modes */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAngleModeChange('DEGREES')}
            className={`px-2 py-0.5 rounded transition-colors ${
              uiState.displayAngleMode === 'DEGREES'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Градусы (0°..360°)
          </button>
          <button
            onClick={() => onAngleModeChange('RADIANS')}
            className={`px-2 py-0.5 rounded transition-colors ${
              uiState.displayAngleMode === 'RADIANS'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Радианы (0..2π)
          </button>
          <button
            onClick={() => onAngleModeChange('FRACTIONS')}
            className={`px-2 py-0.5 rounded transition-colors ${
              uiState.displayAngleMode === 'FRACTIONS'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Доли цикла (u ∈ [0, 1))
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleScale}
            className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
              uiState.showScale
                ? 'bg-purple-900/60 text-purple-300 border-purple-600'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Шкала {uiState.showScale ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onToggleRadii}
            className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
              uiState.showRadii
                ? 'bg-purple-900/60 text-purple-300 border-purple-600'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Радиусы {uiState.showRadii ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
