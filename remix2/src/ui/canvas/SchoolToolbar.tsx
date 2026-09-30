/**
 * SchoolToolbar Component — 12 Canonical School Geometry Tools
 * R2-05.2 — Canonical Geometry Stand Active Tools
 * 
 * Strict 12-tool order:
 * 1. Выделение (SELECT)
 * 2. Точка (POINT)
 * 3. Отрезок (SEGMENT)
 * 4. Линейка (RULER)
 * 5. Циркуль (COMPASS)
 * 6. Прямая / Окружность (LINE_CIRCLE)
 * 7. Параллель (PARALLEL)
 * 8. Перпендикуляр (PERPENDICULAR)
 * 9. Деление угла пополам (ANGLE_BISECTOR)
 * 10. Диагональ (DIAGONAL)
 * 11. Пересечение (INTERSECTION)
 * 12. Ластик (ERASER)
 */

import React from 'react';
import {
  MousePointer,
  Dot,
  Slash,
  Ruler,
  Compass,
  Circle as CircleIcon,
  AlignJustify,
  GitCommit,
  Divide,
  CornerDownRight,
  Crosshair,
  Eraser
} from 'lucide-react';
import { CanonicalToolId } from '../types/uiTypes';

export interface ToolItem {
  readonly id: CanonicalToolId;
  readonly labelRu: string;
  readonly labelEn: string;
  readonly descRu: string;
  readonly icon: React.ReactNode;
}

export const CANONICAL_TOOLS: readonly ToolItem[] = [
  {
    id: 'SELECT',
    labelRu: 'Выделение',
    labelEn: 'Select',
    descRu: 'Выделение объектов и перемещение вершин мышью',
    icon: <MousePointer className="w-4 h-4" />
  },
  {
    id: 'POINT',
    labelRu: 'Точка',
    labelEn: 'Point',
    descRu: 'Построение свободной или привязанной точки',
    icon: <Dot className="w-5 h-5" />
  },
  {
    id: 'SEGMENT',
    labelRu: 'Отрезок',
    labelEn: 'Segment',
    descRu: 'Отрезок между двумя точками с резиновой нитью',
    icon: <Slash className="w-4 h-4" />
  },
  {
    id: 'RULER',
    labelRu: 'Линейка',
    labelEn: 'Ruler',
    descRu: 'Измерение расстояния между двумя точками в мм',
    icon: <Ruler className="w-4 h-4" />
  },
  {
    id: 'COMPASS',
    labelRu: 'Циркуль',
    labelEn: 'Compass',
    descRu: 'Классический школьный циркуль: фиксация иглы и раствор второй ножки',
    icon: <Compass className="w-4 h-4" />
  },
  {
    id: 'LINE_CIRCLE',
    labelRu: 'Прямая / Окружность',
    labelEn: 'Line / Circle',
    descRu: 'Бесконечная прямая через 2 точки или окружность по центру и радиусу',
    icon: <CircleIcon className="w-4 h-4" />
  },
  {
    id: 'PARALLEL',
    labelRu: 'Параллель',
    labelEn: 'Parallel',
    descRu: 'Прямая через точку, параллельная выбранному отрезку',
    icon: <AlignJustify className="w-4 h-4" />
  },
  {
    id: 'PERPENDICULAR',
    labelRu: 'Перпендикуляр',
    labelEn: 'Perpendicular',
    descRu: 'Прямая через точку, перпендикулярная выбранному отрезку',
    icon: <GitCommit className="w-4 h-4" />
  },
  {
    id: 'ANGLE_BISECTOR',
    labelRu: 'Деление угла пополам',
    labelEn: 'Angle Bisector',
    descRu: 'Деление угла пополам по 3 точкам (луч 1, вершина, луч 2)',
    icon: <Divide className="w-4 h-4" />
  },
  {
    id: 'DIAGONAL',
    labelRu: 'Диагональ',
    labelEn: 'Diagonal',
    descRu: 'Построение диагоналей AC или BD четырёхугольника',
    icon: <CornerDownRight className="w-4 h-4" />
  },
  {
    id: 'INTERSECTION',
    labelRu: 'Пересечение',
    labelEn: 'Intersection',
    descRu: 'Точка пересечения двух отрезков или прямых P = L₁ ∩ L₂',
    icon: <Crosshair className="w-4 h-4" />
  },
  {
    id: 'ERASER',
    labelRu: 'Ластик',
    labelEn: 'Eraser',
    descRu: 'Удаление вспомогательного геометрического объекта',
    icon: <Eraser className="w-4 h-4" />
  }
];

interface SchoolToolbarProps {
  readonly activeTool: CanonicalToolId;
  readonly onSelectTool: (tool: CanonicalToolId) => void;
}

export const SchoolToolbar: React.FC<SchoolToolbarProps> = ({
  activeTool,
  onSelectTool
}) => {
  return (
    <aside className="absolute left-3 top-24 z-20 flex flex-col gap-1 p-1 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-xl shadow-2xl touch-none">
      {CANONICAL_TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            aria-label={tool.labelRu}
            title={tool.labelRu}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all relative group ${
              isActive
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700'
            }`}
          >
            {tool.icon}

            {/* Floating Tooltip on Hover */}
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-md text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-purple-300">{tool.labelRu}</span>
                <span className="text-[10px] text-slate-500 font-mono">({tool.labelEn})</span>
              </div>
              <span className="text-slate-400 block text-[11px] mt-0.5 max-w-xs whitespace-normal">
                {tool.descRu}
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
