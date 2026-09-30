/**
 * GeometryResearchTable Component — READ-ONLY Geometry Research Table v0.1
 * 
 * Pure presentation component that renders GeometryResearchRow[] data.
 * Performs ZERO geometric calculations and enforces strict read-only semantics.
 */

import React from 'react';
import { GeometryResearchRow } from '../../research/index';

export interface GeometryResearchTableProps {
  readonly rows: readonly GeometryResearchRow[];
  readonly activeStateVersion?: number;
  readonly onSelectRowSnapshot?: (stateVersion: number) => void;
}

export const GeometryResearchTable: React.FC<GeometryResearchTableProps> = ({
  rows,
  activeStateVersion,
  onSelectRowSnapshot
}) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 select-none">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 text-slate-500">
          ∅
        </div>
        <p className="text-sm font-medium text-slate-300">Нет данных исследования</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Запустите параметрическое исследование или измените положение вершин для формирования строк измерений.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 select-none text-xs">
      {/* 1. Header Information Bar */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-purple-400 font-semibold block">
            RESEARCH TABLE v0.1
          </span>
          <span className="text-slate-300 text-xs">
            Опорное пространство (Круг) ↔ Вписанный объект
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            Строк: {rows.length}
          </span>
        </div>
      </div>

      {/* 2. Scrollable Table Container (Mobile/Desktop friendly with horizontal scroll & sticky header) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400 font-medium border-b border-slate-800 shadow-sm text-[11px]">
            <tr>
              <th scope="col" className="px-3 py-2 text-center w-12 font-mono">Шаг</th>
              <th scope="col" className="px-3 py-2 font-mono">Параметр</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">R (мм)</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">S круга (мм²)</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">S 4-уг (мм²)</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">S пустоты (мм²)</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">Заполнение</th>
              <th scope="col" className="px-3 py-2 text-right font-mono">Пустота</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200 text-xs">
            {rows.map((row) => {
              const isSelected = activeStateVersion !== undefined && row.stateVersion === activeStateVersion;
              const isClickable = !!onSelectRowSnapshot;

              return (
                <tr
                  key={`step-${row.step}-v${row.stateVersion}`}
                  onClick={() => onSelectRowSnapshot?.(row.stateVersion)}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-purple-950/60 text-purple-200 font-medium border-l-2 border-purple-500'
                      : 'hover:bg-slate-800/40'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                >
                  {/* 1. Step */}
                  <td className="px-3 py-2 text-center text-slate-400 font-semibold">
                    {row.step}
                  </td>

                  {/* 2. Parameter */}
                  <td className="px-3 py-2 text-slate-300">
                    <span className="text-purple-400 font-medium">{row.activeParameter.name}</span>
                    <span className="text-slate-400"> = </span>
                    <span>{`${row.activeParameter.value.toFixed(1)}°`}</span>
                  </td>

                  {/* 3. R (Radius) */}
                  <td className="px-3 py-2 text-right text-slate-400">
                    {row.r.toFixed(1)}
                  </td>

                  {/* 4. Circle Area (S_circle) */}
                  <td className="px-3 py-2 text-right text-cyan-300 font-medium">
                    {row.sCircle.toFixed(1)}
                  </td>

                  {/* 5. Quadrilateral Area (S_quad) */}
                  <td className="px-3 py-2 text-right text-emerald-300 font-medium">
                    {row.sQuad.toFixed(1)}
                  </td>

                  {/* 6. Gap Area (S_gap) */}
                  <td className="px-3 py-2 text-right text-amber-300/90">
                    {row.sGap.toFixed(1)}
                  </td>

                  {/* 7. Fill Ratio (K_fill) */}
                  <td className="px-3 py-2 text-right text-emerald-400 font-semibold">
                    {`${(row.kFill * 100).toFixed(2)} %`}
                  </td>

                  {/* 8. Gap Ratio (K_gap) */}
                  <td className="px-3 py-2 text-right text-amber-400/90">
                    {`${(row.kGap * 100).toFixed(2)} %`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Legend / Invariant Reminder Footer */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 font-mono">
          <span>S_круг = const</span>
          <span className="text-slate-600">•</span>
          <span>S_4уг + S_пустоты = S_круг</span>
          <span className="text-slate-600">•</span>
          <span>K_зап + K_пуст = 100%</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Только чтение (Read-Only)
        </div>
      </div>
    </div>
  );
};
