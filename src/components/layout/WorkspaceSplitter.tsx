/**
 * CQNS-001 — Interactive Workspace Vertical Splitter
 * Draggable divider between CanvasStage and CQNSInformationPanel.
 * Adapts visual and UX interaction pattern from reference Triangle Stand.
 *
 * UX CONTRACT:
 * - Vertical divider between Canvas and Information Panel
 * - Cursor: ew-resize
 * - Drag left/right smoothly updates panel widths in real-time
 * - Uses Pointer Capture (setPointerCapture / releasePointerCapture) for reliable drag
 * - Enforces strict min/max constraints (Canvas min 350px, Panel min 300px, Panel max 800px)
 * - Pure UI layout behavior: zero mutations of GeometryState or canvas geometry.
 */

import React, { useState, useEffect } from 'react';

export interface WorkspaceSplitterProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  panelWidth: number;
  onPanelWidthChange: (newWidth: number) => void;
  minPanelWidth?: number;
  minCanvasWidth?: number;
  maxPanelWidth?: number;
  onResetDefault?: () => void;
}

export const WorkspaceSplitter: React.FC<WorkspaceSplitterProps> = ({
  containerRef,
  panelWidth,
  onPanelWidthChange,
  minPanelWidth = 300,
  minCanvasWidth = 350,
  maxPanelWidth = 800,
  onResetDefault,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if pointer capture is not supported
    }

    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    // Raw width from right edge of container to pointer X
    const rawWidth = rect.right - e.clientX;

    // Enforce min/max boundaries
    const maxAllowed = Math.min(maxPanelWidth, rect.width - minCanvasWidth);
    const clampedWidth = Math.round(Math.max(minPanelWidth, Math.min(maxAllowed, rawWidth)));

    onPanelWidthChange(clampedWidth);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }

    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onResetDefault?.();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={panelWidth}
      aria-valuemin={minPanelWidth}
      aria-valuemax={maxPanelWidth}
      tabIndex={0}
      title="Потяните для изменения ширины (Двойной клик — сброс) / Drag to resize (Double-click to reset)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className={`relative w-1.5 shrink-0 z-20 cursor-ew-resize select-none touch-none transition-colors ${
        isDragging
          ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
          : 'bg-slate-800 hover:bg-indigo-500/80 active:bg-indigo-500'
      }`}
    >
      {/* Invisible expanded hit-area for effortless mouse grabbing (14px wide) */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-ew-resize" />

      {/* Visual Grip Handle in the vertical center */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -left-1.5 w-4 h-10 rounded-full flex flex-col items-center justify-center gap-0.5 border shadow-md transition-all pointer-events-none ${
          isDragging
            ? 'bg-indigo-600 border-indigo-400 scale-105 shadow-indigo-500/30'
            : 'bg-slate-800 border-slate-700 group-hover:border-indigo-400 group-hover:bg-slate-700'
        }`}
      >
        <span className="w-1 h-0.5 rounded-full bg-slate-400" />
        <span className="w-1 h-0.5 rounded-full bg-slate-400" />
        <span className="w-1 h-0.5 rounded-full bg-slate-400" />
      </div>
    </div>
  );
};
