/**
 * SummaryTablePanel Component — Two-Way Representation Matrix Table & Entity Inspector
 * R2-05.1 — Canonical Geometry Stand Active Tools
 */

import React from 'react';
import { Sliders, RefreshCw, Pencil, Info, X } from 'lucide-react';
import { GeometryPresentationData } from '../projection/presentationModel';
import { AuxiliaryState } from '../types/auxiliaryTypes';

interface SummaryTablePanelProps {
  readonly presentation: GeometryPresentationData;
  readonly auxiliaryState?: AuxiliaryState;
  readonly onOpenNumericModal: () => void;
  readonly onClearSelection?: () => void;
}

export const SummaryTablePanel: React.FC<SummaryTablePanelProps> = ({
  presentation,
  auxiliaryState,
  onOpenNumericModal,
  onClearSelection
}) => {
  const { vertices, chords, inscribedAngles, oppositeAngleSums, ptolemy, centerPosition, radius } = presentation;

  // Selected Entity Inspector resolution
  const selectedId = auxiliaryState?.selectedEntityId;
  const selectedType = auxiliaryState?.selectedEntityType;

  const selectedVertex = selectedId ? vertices.find((v) => v.id === selectedId) : null;
  const selectedChord = selectedId ? chords.find((c) => c.id === selectedId) : null;
  const selectedPoint = selectedId ? auxiliaryState?.points.find((p) => p.id === selectedId) : null;
  const selectedSeg = selectedId ? auxiliaryState?.segments.find((s) => s.id === selectedId) : null;
  const selectedLine = selectedId ? auxiliaryState?.lines.find((l) => l.id === selectedId) : null;
  const selectedCirc = selectedId ? auxiliaryState?.circles.find((c) => c.id === selectedId) : null;
  const selectedMeas = selectedId ? auxiliaryState?.measurements.find((m) => m.id === selectedId) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 select-none text-xs">
      {/* 1. Subheader with Numeric Angles & Live Sync */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-purple-400 font-semibold block">
            QUADRILATERAL STATE
          </span>
          <span className="text-slate-300 text-xs">
            Циклический четырёхугольник → Два способа описания
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNumericModal}
            className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm text-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Задать углы числом</span>
          </button>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-medium">
            <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* 2. Selected Entity Inspector (if an object is selected) */}
      {selectedId && (
        <div className="mb-3 p-3 bg-purple-950/30 border border-purple-800/60 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-purple-300 text-xs">
                ИНСПЕКТОР ВЫБРАННОГО ОБЪЕКТА: {selectedId} ({selectedType || 'элемент'})
              </span>
            </div>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                title="Снять выделение"
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800">
            {selectedVertex && (
              <>
                <div><span className="text-slate-500">Координаты:</span> x = {selectedVertex.cartesian.x.toFixed(1)}, y = {selectedVertex.cartesian.y.toFixed(1)}</div>
                <div><span className="text-slate-500">Угол:</span> {selectedVertex.angleDeg.toFixed(1)}° ({selectedVertex.formattedAngle})</div>
                <div><span className="text-slate-500">Доля цикла u:</span> {selectedVertex.formattedCycleFraction}</div>
                <div><span className="text-slate-500">Противоположная дуга:</span> {selectedVertex.oppositeArcName}</div>
              </>
            )}
            {selectedChord && (
              <>
                <div><span className="text-slate-500">Хорда:</span> {selectedChord.id}</div>
                <div><span className="text-slate-500">Длина:</span> {selectedChord.lengthMm.toFixed(1)} мм</div>
                <div><span className="text-slate-500">Стягиваемый угол:</span> {selectedChord.angularGapDeg.toFixed(1)}°</div>
                <div><span className="text-slate-500">Доля окружности:</span> {selectedChord.arcFractionText}</div>
              </>
            )}
            {selectedPoint && (
              <>
                <div><span className="text-slate-500">Точка:</span> {selectedPoint.label} ({selectedPoint.type})</div>
                <div><span className="text-slate-500">Координаты:</span> x = {selectedPoint.x.toFixed(1)}, y = {selectedPoint.y.toFixed(1)}</div>
                {selectedPoint.parentIds && (
                  <div className="col-span-2"><span className="text-slate-500">Родители в DAG:</span> {selectedPoint.parentIds.join(', ')}</div>
                )}
              </>
            )}
            {selectedSeg && (
              <>
                <div><span className="text-slate-500">Отрезок:</span> {selectedSeg.label} ({selectedSeg.type})</div>
                <div><span className="text-slate-500">Длина:</span> {selectedSeg.lengthMm.toFixed(1)} мм</div>
                <div><span className="text-slate-500">Концы:</span> {selectedSeg.p1Id} ↔ {selectedSeg.p2Id}</div>
              </>
            )}
            {selectedLine && (
              <>
                <div><span className="text-slate-500">Прямая:</span> {selectedLine.label} ({selectedLine.type})</div>
                <div><span className="text-slate-500">Точка прохождения:</span> {selectedLine.throughPointId}</div>
                {selectedLine.referenceSegmentId && (
                  <div><span className="text-slate-500">Опорный отрезок:</span> {selectedLine.referenceSegmentId}</div>
                )}
              </>
            )}
            {selectedCirc && (
              <>
                <div><span className="text-slate-500">Окружность:</span> {selectedCirc.label} ({selectedCirc.type})</div>
                <div><span className="text-slate-500">Центр:</span> {selectedCirc.centerPointId}</div>
                <div><span className="text-slate-500">Радиус:</span> R = {selectedCirc.radius.toFixed(1)} мм</div>
              </>
            )}
            {selectedMeas && (
              <>
                <div><span className="text-slate-500">Измерение:</span> {selectedMeas.label}</div>
                <div><span className="text-slate-500">Расстояние:</span> {selectedMeas.distanceMm.toFixed(1)} мм</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Canonical Comparison Matrix Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
              <th className="py-2 px-3 font-semibold">ЭЛЕМЕНТ</th>
              <th className="py-2 px-3 font-semibold">CLASSICAL (Trig)</th>
              <th className="py-2 px-3 font-semibold">RELATIONAL / MATRIX</th>
              <th className="py-2 px-3 font-semibold">ОТНОШЕНИЕ В СИСТЕМЕ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {/* Vertices */}
            {vertices.map((v) => (
              <tr key={`row-vertex-${v.id}`} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-2 px-3 font-bold text-slate-200">Вершина {v.id}</td>
                <td className="py-2 px-3 text-purple-400 font-medium flex items-center gap-1">
                  <span>{v.formattedAngle}</span>
                  <button
                    onClick={onOpenNumericModal}
                    title="Изменить угол"
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </td>
                <td className="py-2 px-3 text-slate-300">{v.formattedCycleFraction}</td>
                <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                  {v.id} ↔ {v.oppositeArcName}
                </td>
              </tr>
            ))}

            {/* Arcs */}
            {chords.map((chord) => (
              <tr key={`row-arc-${chord.id}`} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-2 px-3 font-semibold text-slate-300">Дуга {chord.id}</td>
                <td className="py-2 px-3 text-slate-200">{chord.angularGapDeg.toFixed(1)}°</td>
                <td className="py-2 px-3 text-slate-400">{(chord.angularGapDeg / 360).toFixed(2)} круга</td>
                <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                  Хорда {chord.id}, стягиваемая дуга
                </td>
              </tr>
            ))}

            {/* Sides / Chords */}
            {chords.map((chord) => (
              <tr key={`row-side-${chord.id}`} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-2 px-3 font-semibold text-slate-300">Сторона {chord.id}</td>
                <td className="py-2 px-3 text-purple-300 font-bold">
                  {chord.lengthMm.toFixed(1)} мм{' '}
                  <span className="text-slate-500 font-normal">({Math.round(chord.lengthMm)} px)</span>
                </td>
                <td className="py-2 px-3 text-emerald-400 font-bold">
                  {chord.lengthMm.toFixed(1)} мм
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                  2R · sin(Δα/2)
                </td>
              </tr>
            ))}

            {/* Inscribed Angles */}
            {inscribedAngles.map((ang) => (
              <tr key={`row-ang-${ang.vertexId}`} className="hover:bg-slate-900/50 transition-colors">
                <td className="py-2 px-3 font-semibold text-slate-300">∠{ang.vertexId}</td>
                <td className="py-2 px-3 text-amber-300 font-bold">{ang.angleDeg.toFixed(1)}°</td>
                <td className="py-2 px-3 text-slate-300">½ дуги ({ang.subtendedArcDeg.toFixed(1)}°)</td>
                <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                  Вписанный угол при вершине {ang.vertexId}
                </td>
              </tr>
            ))}

            {/* Opposite Angles Sum Theorem */}
            <tr className="bg-purple-950/20">
              <td className="py-2 px-3 font-bold text-purple-300">∠A + ∠C</td>
              <td className="py-2 px-3 text-emerald-300 font-bold">
                {oppositeAngleSums.acSumDeg.toFixed(1)}°
              </td>
              <td className="py-2 px-3 text-emerald-300 font-bold">180.0° (Инвариант)</td>
              <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                Теорема о сумме противоположных углов
              </td>
            </tr>
            <tr className="bg-purple-950/20">
              <td className="py-2 px-3 font-bold text-purple-300">∠B + ∠D</td>
              <td className="py-2 px-3 text-emerald-300 font-bold">
                {oppositeAngleSums.bdSumDeg.toFixed(1)}°
              </td>
              <td className="py-2 px-3 text-emerald-300 font-bold">180.0° (Инвариант)</td>
              <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                Теорема о сумме противоположных углов
              </td>
            </tr>

            {/* Ptolemy Invariant */}
            <tr className="bg-blue-950/20">
              <td className="py-2 px-3 font-bold text-blue-300">Птолемей</td>
              <td className="py-2 px-3 text-blue-300 font-bold">
                {ptolemy.diagonalProduct.toFixed(0)} (AC·BD)
              </td>
              <td className="py-2 px-3 text-blue-300 font-bold">
                {ptolemy.oppositeProductSum.toFixed(0)} (AB·CD + BC·DA)
              </td>
              <td className="py-2 px-3 text-emerald-400 font-sans text-[10px]">
                {ptolemy.matches ? 'Тождество выполняется ✓' : 'Отклонение'}
              </td>
            </tr>

            {/* Radius and Center */}
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-300">Радиус R</td>
              <td className="py-2 px-3 text-purple-300 font-bold">{radius.toFixed(1)} мм</td>
              <td className="py-2 px-3 text-emerald-400 font-bold">R = {radius.toFixed(1)} мм</td>
              <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">OA = OB = OC = OD</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-semibold text-slate-300">Центр O</td>
              <td className="py-2 px-3 text-slate-200 font-bold">{centerPosition}</td>
              <td className="py-2 px-3 text-slate-300">d_max &lt; 0.5</td>
              <td className="py-2 px-3 text-slate-400 font-sans text-[10px]">
                Положение центра относительно хорд
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
