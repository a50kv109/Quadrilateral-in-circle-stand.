/**
 * NumericAnglesModal Component — Modal for Explicit Angular State Mutation
 * R2-05: Common Geometry Stand UI Shell
 */

import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { UniversalGeometryState } from '../../kernel/state/geometryState';
import { CyclicInput, CyclicMutationDraft } from '../../types/geometry';
import { TopologyGuard } from '../../kernel/topology/topologyGuard';

interface NumericAnglesModalProps {
  readonly state: UniversalGeometryState;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCommitAngles: (newAnglesRad: number[]) => void;
}

export const NumericAnglesModal: React.FC<NumericAnglesModalProps> = ({
  state,
  isOpen,
  onClose,
  onCommitAngles
}) => {
  if (!isOpen) return null;

  const cyclicInput = state.canonicalInputs as CyclicInput;
  const currentAnglesDeg = cyclicInput.angles.map(
    (rad) => (((rad * 180) / Math.PI) % 360 + 360) % 360
  );

  const [inputValues, setInputValues] = useState<string[]>(
    currentAnglesDeg.map((deg) => deg.toFixed(1))
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const labels = ['A', 'B', 'C', 'D'];

  const handleChange = (index: number, val: string) => {
    const updated = [...inputValues];
    updated[index] = val;
    setInputValues(updated);
    setValidationError(null);
  };

  const handleApply = () => {
    const parsedAnglesDeg = inputValues.map((v) => parseFloat(v));

    for (let i = 0; i < parsedAnglesDeg.length; i++) {
      if (!Number.isFinite(parsedAnglesDeg[i])) {
        setValidationError(`Некорректное значение угла для вершины ${labels[i]}.`);
        return;
      }
    }

    const newAnglesRad = parsedAnglesDeg.map((deg) => (deg * Math.PI) / 180);

    // Dry-run validate against TopologyGuard before committing state
    try {
      const draftState = state.commitMutation((draft) => {
        const cd = draft as CyclicMutationDraft;
        cd.canonicalInputs.angles = [...newAnglesRad];
      }, "NUMERIC_ANGLES_MUTATION");

      const report = TopologyGuard.validate(draftState);
      if (report.status !== 'VALID') {
        setValidationError(
          `Ошибка топологии: ${report.status}. ${report.issues.join(' ')}`
        );
        return;
      }

      onCommitAngles(newAnglesRad);
      onClose();
    } catch (err) {
      setValidationError(`Ошибка валидации: ${(err as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-xs select-none">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100 text-sm">
            Задать углы вершин числом
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-slate-400 text-[11px]">
            Введите значения полярных углов (0°..360°) для вершин A, B, C, D. Углы должны следовать в строго возрастающем циклическом порядке.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {labels.map((label, idx) => (
              <div key={label} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-purple-400 text-sm">Вершина {label}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="360"
                    value={inputValues[idx]}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-slate-400">°</span>
                </div>
              </div>
            ))}
          </div>

          {validationError && (
            <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
