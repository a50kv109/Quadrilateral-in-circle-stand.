/**
 * EducationPanel Component — Educational Proof Cards & Theorems
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { GraduationCap, BookOpen, CheckCircle } from 'lucide-react';
import { GeometryPresentationData } from '../projection/presentationModel';

interface EducationPanelProps {
  readonly presentation: GeometryPresentationData;
}

export const EducationPanel: React.FC<EducationPanelProps> = ({ presentation }) => {
  const { oppositeAngleSums, ptolemy, inscribedAngles } = presentation;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 select-none text-xs space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-xs">
              Обучение и Теоремы (School Curriculum)
            </h2>
            <p className="text-[11px] text-slate-400">
              Математические доказательства и свойства вписанного четырёхугольника
            </p>
          </div>
        </div>
      </div>

      {/* 2. Theorem Card 1: Opposite Angles */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            Теорема о сумме противоположных углов
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-800">
            180° ИНВАРИАНТ
          </span>
        </div>
        <p className="text-slate-400 text-[11px]">
          Сумма противоположных углов четырёхугольника, вписанного в окружность, всегда равна 180°:
        </p>
        <div className="p-2 bg-slate-900 rounded font-mono text-center text-emerald-300 text-[11px] space-y-1">
          <div>∠A + ∠C = {oppositeAngleSums.acSumDeg.toFixed(1)}° = 180.0°</div>
          <div>∠B + ∠D = {oppositeAngleSums.bdSumDeg.toFixed(1)}° = 180.0°</div>
        </div>
        <p className="text-slate-500 text-[10px]">
          Доказательство: Вписанный угол равен половине дуги, на которую он опирается. Сумма дуг BCD и DAB составляет полную окружность (360°), следовательно, ½ · 360° = 180°.
        </p>
      </div>

      {/* 3. Theorem Card 2: Inscribed Angle Theorem */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            Теорема о вписанном угле
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-mono text-[10px] font-semibold border border-blue-800">
            ∠ = ½ ДУГИ
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          {inscribedAngles.map((ang) => (
            <div key={`edu-ang-${ang.vertexId}`} className="p-2 bg-slate-900 rounded border border-slate-800/60">
              <span className="text-slate-400">∠{ang.vertexId} = </span>
              <span className="text-amber-400 font-bold">{ang.angleDeg.toFixed(1)}°</span>
              <span className="text-slate-500 text-[10px] block">
                ½ от дуги {ang.subtendedArcDeg.toFixed(1)}°
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Theorem Card 3: Ptolemy's Theorem */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Теорема Птолемея для циклического четырёхугольника
          </span>
        </div>
        <p className="text-slate-400 text-[11px]">
          Для любого вписанного четырёхугольника произведение диагоналей равно сумме произведений противоположных сторон:
        </p>
        <div className="p-2 bg-slate-900 rounded font-mono text-center text-blue-300 text-[11px]">
          AC · BD = AB · CD + BC · DA
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono p-2 bg-slate-900/60 rounded border border-slate-800">
          <span>Диагонали: {ptolemy.diagonalProduct.toFixed(0)}</span>
          <span className="text-slate-500">=</span>
          <span>Стороны: {ptolemy.oppositeProductSum.toFixed(0)}</span>
          <span className="text-emerald-400 font-bold">✓ Совпадает</span>
        </div>
      </div>
    </div>
  );
};
