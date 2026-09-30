/**
 * WorkspaceSplitter — Resizable Horizontal Splitter
 * R2-05: Common Geometry Stand UI Shell
 */

import React, { useCallback, useRef } from 'react';

interface WorkspaceSplitterProps {
  readonly onRatioChange: (newRatio: number) => void;
  readonly onReset: () => void;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
}

export const WorkspaceSplitter: React.FC<WorkspaceSplitterProps> = ({
  onRatioChange,
  onReset,
  isDragging,
  setIsDragging
}) => {
  const splitterRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (splitterRef.current) {
      splitterRef.current.setPointerCapture(e.pointerId);
      setIsDragging(true);
    }
  }, [setIsDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const windowWidth = window.innerWidth;
    if (windowWidth <= 0) return;

    // Enforce bounds: min 360px left, min 320px right
    const minLeft = 360 / windowWidth;
    const maxLeft = (windowWidth - 320) / windowWidth;

    const currentX = e.clientX;
    const newRatio = Math.max(minLeft, Math.min(maxLeft, currentX / windowWidth));
    onRatioChange(newRatio);
  }, [isDragging, onRatioChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (splitterRef.current && isDragging) {
      try {
        splitterRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already lost
      }
      setIsDragging(false);
    }
  }, [isDragging, setIsDragging]);

  return (
    <div
      ref={splitterRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={onReset}
      title="Потяните для изменения пропорций (Двойной клик: сброс 50/50)"
      className={`relative z-20 w-3 -mx-1.5 flex items-center justify-center cursor-ew-resize select-none touch-none transition-colors ${
        isDragging ? 'bg-purple-600' : 'hover:bg-purple-500/50 bg-transparent'
      }`}
    >
      <div className="w-[2px] h-full bg-slate-800" />
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-9 rounded bg-slate-800 border border-slate-700 flex flex-col items-center justify-center gap-1 shadow-md hover:bg-slate-700">
        <div className="w-1 h-1 rounded-full bg-slate-400" />
        <div className="w-1 h-1 rounded-full bg-slate-400" />
        <div className="w-1 h-1 rounded-full bg-slate-400" />
      </div>
    </div>
  );
};
