/**
 * CanvasRotationBar Component — Bottom Rotation Controls & View Rotation
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { RotateCw } from 'lucide-react';

interface CanvasRotationBarProps {
  readonly rotationDeg: number;
  readonly onRotationChange: (deg: number) => void;
  readonly onStepRotation: (stepDeg: number) => void;
  readonly onResetRotation: () => void;
}

export const CanvasRotationBar: React.FC<CanvasRotationBarProps> = ({
  rotationDeg,
  onRotationChange,
  onStepRotation,
  onResetRotation
}) => {
  return (
    <div className="h-10 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between gap-4 text-xs select-none z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[11px] tracking-wide">
          <RotateCw className="w-3.5 h-3.5" />
          <span>ВРАЩЕНИЕ::</span>
        </div>

        {/* Quick Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onResetRotation}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              rotationDeg === 0
                ? 'bg-purple-900/60 text-purple-200 border-purple-600'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            0°
          </button>
          <button
            onClick={() => onStepRotation(-15)}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 transition-colors"
          >
            -15°
          </button>
          <button
            onClick={() => onStepRotation(15)}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 transition-colors"
          >
            +15°
          </button>
        </div>

        {/* Continuous Slider */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotationDeg}
            onChange={(e) => onRotationChange(Number(e.target.value))}
            className="w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="font-mono text-slate-300 w-12 text-right">
            {rotationDeg > 0 ? `+${rotationDeg}°` : `${rotationDeg}°`}
          </span>
        </div>
      </div>

      {/* Right notice badge */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[10px]">
          ROTATION
        </span>
        <span>Поверните диск для удобного доступа к вершинам</span>
      </div>
    </div>
  );
};
