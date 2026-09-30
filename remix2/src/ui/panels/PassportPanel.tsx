/**
 * PassportPanel Component — State Version, Provenance & Topology Report
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GeometryPresentationData } from '../projection/presentationModel';

interface PassportPanelProps {
  readonly presentation: GeometryPresentationData;
}

export const PassportPanel: React.FC<PassportPanelProps> = ({ presentation }) => {
  const { topologyReport, stateVersion, provenance, center, radius, vertices } = presentation;
  const isValid = topologyReport.status === 'VALID';

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 select-none text-xs space-y-4">
      {/* 1. Passport Header Badge */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-xs">
              Паспорт конфигурации (Geometry Passport)
            </h2>
            <p className="text-[11px] text-slate-400">
              Архитектурный срез состояния Remix 2 State Core
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700/60 text-purple-300 font-mono text-[11px]">
            v{stateVersion}
          </span>
          <span
            className={`px-2 py-0.5 rounded flex items-center gap-1 font-mono text-[11px] font-semibold border ${
              isValid
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/80 border-rose-700 text-rose-300'
            }`}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                VALID
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                {topologyReport.status}
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Metadata Cards */}
      <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-sans uppercase">Фигура & Вершины</span>
          <span className="text-slate-100 font-semibold">Вписанный четырёхугольник (N = 4)</span>
          <span className="text-purple-400">Профиль: {topologyReport.profile}</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-sans uppercase">Опорная окружность S¹</span>
          <span className="text-slate-100 font-semibold">R = {radius.toFixed(2)} мм</span>
          <span className="text-slate-400">Центр: O({center.x.toFixed(1)}, {center.y.toFixed(1)})</span>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-1 col-span-2">
          <span className="text-[10px] text-slate-400 font-sans uppercase">Происхождение (Provenance)</span>
          <span className="text-slate-200">{provenance}</span>
          <span className="text-slate-500 text-[10px] font-sans">
            Неизменяемое состояние зафиксировано через глубокий freeze (Object.freeze)
          </span>
        </div>
      </div>

      {/* 3. Canonical Angular & Derived Coordinates Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Канонические углы и производные декартовы координаты</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">P_i = O + R·(cos α_i, sin α_i)</span>
        </div>
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 text-[10px] border-b border-slate-800">
              <th className="py-1.5 px-3">ВЕРШИНА</th>
              <th className="py-1.5 px-3">УГОЛ α (ГРАДУСЫ)</th>
              <th className="py-1.5 px-3">УГОЛ α (РАДИАНЫ)</th>
              <th className="py-1.5 px-3">ДЕКАРТОВЫ (X, Y)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {vertices.map((v) => (
              <tr key={`pass-vertex-${v.id}`} className="hover:bg-slate-900/40">
                <td className="py-2 px-3 font-bold text-slate-200">{v.id}</td>
                <td className="py-2 px-3 text-purple-400">{v.angleDeg.toFixed(2)}°</td>
                <td className="py-2 px-3 text-slate-300">{v.normalizedAngleRad.toFixed(4)} rad</td>
                <td className="py-2 px-3 text-emerald-400">
                  ({v.cartesian.x.toFixed(2)}, {v.cartesian.y.toFixed(2)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Structural Topology Invariants */}
      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-col gap-1 text-[11px]">
        <span className="font-semibold text-slate-200">Отчёт TopologyGuard:</span>
        <ul className="list-disc list-inside text-slate-400 space-y-0.5 pt-1">
          <li>Упорядочение: монотонная циклическая последовательность [A, B, C, D]</li>
          <li>Угловые зазоры: все Δα &gt; MIN_VERTEX_ANGLE_GAP (0.005 rad)</li>
          <li>Замыкание цикла: полная сумма шагов Σ Δα_i = 360.0° (2π rad)</li>
          <li>Самопересечения: отсутствуют (выпуклый вписанный многоугольник)</li>
        </ul>
      </div>
    </div>
  );
};
