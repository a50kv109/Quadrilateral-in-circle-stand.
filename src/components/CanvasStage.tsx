/**
 * CQNS-001 — Interactive Canvas Stage with Toolset & Radial Degree Scale
 * Full bilingual (RU/EN) interactive geometry canvas.
 * Inherits and adapts generic visual infrastructure from Triangle Stand.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GeometryState } from '../engines/geometryState';
import { GeometryCore } from '../engines/geometryCore';
import { SOLGateway } from '../engines/solGateway';
import { Point, Segment, CanvasTool } from '../types/geometry';
import { Language, translations } from '../i18n/translations';
import {
  MousePointer,
  CircleDot,
  Minus,
  ArrowLeftRight,
  Circle as CircleIcon,
  Ruler,
  Compass,
  Divide,
  CornerDownRight,
  CornerDownLeft,
  Equal,
  Eraser,
  RotateCcw,
  Trash2,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Grid,
  ArrowUpRight,
} from 'lucide-react';

function getOppositeVertexId(vertexId: string): string | null {
  switch (vertexId) {
    case 'pt_A': return 'pt_C';
    case 'pt_B': return 'pt_D';
    case 'pt_C': return 'pt_A';
    case 'pt_D': return 'pt_B';
    default: return null;
  }
}

export interface RulerPointRef {
  id?: string;
  name: string;
  x: number;
  y: number;
}

export interface RulerMeasurementState {
  p1: RulerPointRef;
  p2: RulerPointRef;
  isLocked: boolean;
}

interface CanvasStageProps {
  state: GeometryState;
  onPointMoved?: (pointId: string, x: number, y: number) => void;
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string | null) => void;
  language: Language;
  activeTool?: CanvasTool;
  onToolChange?: (tool: CanvasTool) => void;
  activeSourceSegment?: string | null;
  onActiveSourceSegmentChange?: (segId: string | null) => void;
  rulerMeasurement?: RulerMeasurementState | null;
  onRulerMeasurementChange?: (measurement: RulerMeasurementState | null) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  state,
  onPointMoved,
  selectedPointId,
  onSelectPoint,
  language,
  activeTool: controlledTool,
  onToolChange,
  activeSourceSegment: controlledSourceSegment,
  onActiveSourceSegmentChange,
  rulerMeasurement: controlledRulerMeasurement,
  onRulerMeasurementChange,
}) => {
  const t = translations[language];
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction State (Controlled or Uncontrolled fallback)
  const [internalTool, setInternalTool] = useState<CanvasTool>('move');
  const activeTool = controlledTool !== undefined ? controlledTool : internalTool;
  const setActiveTool = (tool: CanvasTool) => {
    setInternalTool(tool);
    onToolChange?.(tool);
  };

  const [internalSourceSegment, setInternalSourceSegment] = useState<string | null>(null);
  const activeSourceSegment = controlledSourceSegment !== undefined ? controlledSourceSegment : internalSourceSegment;
  const setActiveSourceSegment = (segId: string | null) => {
    setInternalSourceSegment(segId);
    onActiveSourceSegmentChange?.(segId);
  };

  const [internalRulerMeasurement, setInternalRulerMeasurement] = useState<RulerMeasurementState | null>(null);
  const rulerMeasurement = controlledRulerMeasurement !== undefined ? controlledRulerMeasurement : internalRulerMeasurement;
  const setRulerMeasurement = useCallback(
    (val: RulerMeasurementState | null | ((prev: RulerMeasurementState | null) => RulerMeasurementState | null)) => {
      if (typeof val === 'function') {
        setInternalRulerMeasurement(prev => {
          const next = val(prev);
          onRulerMeasurementChange?.(next);
          return next;
        });
      } else {
        setInternalRulerMeasurement(val);
        onRulerMeasurementChange?.(val);
      }
    },
    [onRulerMeasurementChange]
  );

  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // Triangle Stand Interaction Pattern State (Hover crosshair, snap point, preview line)
  const [hoveredSegment, setHoveredSegment] = useState<{
    id: string;
    name: string;
    projX: number;
    projY: number;
    dist: number;
  } | null>(null);
  const [hoveredAngle, setHoveredAngle] = useState<{
    vertex: Point;
    ray1Pt: Point;
    ray2Pt: Point;
    name: string;
  } | null>(null);
  const [mouseWorldCoords, setMouseWorldCoords] = useState<{ x: number; y: number } | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<Point | null>(null);
  const [isSnappedToCircle, setIsSnappedToCircle] = useState<boolean>(false);
  const [lastConstructedMessage, setLastConstructedMessage] = useState<string | null>(null);

  // Display toggles
  const [showDegreeScale, setShowDegreeScale] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToCircle, setSnapToCircle] = useState<boolean>(false);

  // Multi-step tool buffers (for Segment, Compass, Line/Circle)
  const [toolBufferPoints, setToolBufferPoints] = useState<string[]>([]);
  const [segmentCreatedP1, setSegmentCreatedP1] = useState<boolean>(false);
  const [rulerHoverSnap, setRulerHoverSnap] = useState<RulerPointRef | null>(null);
  const [hoveredDiagonalPreview, setHoveredDiagonalPreview] = useState<{
    p1: Point;
    p2: Point;
    name: string;
  } | null>(null);

  // Radial Geometry Tool State ("Прямая / окружность")
  const [radialSubmode, setRadialSubmode] = useState<'line' | 'circle'>('line');
  const [wheelAngleOffset, setWheelAngleOffset] = useState<number>(0);

  // Viewport bounds & pan/zoom state
  const [viewBox, setViewBox] = useState({ x: -250, y: -250, width: 500, height: 500 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ clientX: number; clientY: number; viewBoxX: number; viewBoxY: number } | null>(null);

  // Wheel zoom handler centered around pointer in SVG coordinate space
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Intercept scroll wheel when Radial Line tool is active with locked pivot P
      if (
        (activeTool === 'line_circle' || activeTool === 'line') &&
        toolBufferPoints.length === 1 &&
        radialSubmode === 'line'
      ) {
        const step = e.shiftKey ? 1 : (e.altKey ? 15 : 5);
        const delta = e.deltaY < 0 ? step : -step;
        setWheelAngleOffset(prev => (prev + delta) % 360);
        return;
      }

      const ctm = svgEl.getScreenCTM();
      if (!ctm) return;
      if (!ctm) return;

      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorWorld = pt.matrixTransform(ctm.inverse());

      const zoomFactor = e.deltaY < 0 ? 0.88 : 1.14;
      setViewBox(prev => {
        const minDim = 120;
        const maxDim = 3500;
        const targetWidth = Math.max(minDim, Math.min(maxDim, prev.width * zoomFactor));
        const targetHeight = Math.max(minDim, Math.min(maxDim, prev.height * zoomFactor));
        const actualFactor = targetWidth / prev.width;

        const newX = cursorWorld.x - (cursorWorld.x - prev.x) * actualFactor;
        const newY = cursorWorld.y - (cursorWorld.y - prev.y) * actualFactor;
        return {
          x: newX,
          y: newY,
          width: targetWidth,
          height: targetHeight,
        };
      });
    };

    svgEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => svgEl.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomIn = () => {
    setViewBox(prev => {
      const f = 0.8;
      const targetWidth = Math.max(120, prev.width * f);
      const targetHeight = Math.max(120, prev.height * f);
      const cx = prev.x + prev.width / 2;
      const cy = prev.y + prev.height / 2;
      return {
        x: cx - targetWidth / 2,
        y: cy - targetHeight / 2,
        width: targetWidth,
        height: targetHeight,
      };
    });
  };

  const handleZoomOut = () => {
    setViewBox(prev => {
      const f = 1.25;
      const targetWidth = Math.min(3500, prev.width * f);
      const targetHeight = Math.min(3500, prev.height * f);
      const cx = prev.x + prev.width / 2;
      const cy = prev.y + prev.height / 2;
      return {
        x: cx - targetWidth / 2,
        y: cy - targetHeight / 2,
        width: targetWidth,
        height: targetHeight,
      };
    });
  };

  const handleResetView = () => {
    setViewBox({ x: -250, y: -250, width: 500, height: 500 });
  };

  // Escape key handler to cancel preview / active source / tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSourceSegment) {
          setActiveSourceSegment(null);
          setHoveredSegment(null);
          setSnappedPoint(null);
          setIsSnappedToCircle(false);
        } else if (activeTool === 'parallel' || activeTool === 'perpendicular' || activeTool === 'ruler' || activeTool === 'segment') {
          setActiveTool('move');
          setHoveredSegment(null);
          setToolBufferPoints([]);
          setRulerMeasurement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSourceSegment, activeTool]);

  const circle = state.circles.get('circle_main');
  const ptO = state.points.get('pt_O');
  const ptA = state.points.get('pt_A');
  const ptB = state.points.get('pt_B');
  const ptC = state.points.get('pt_C');
  const ptD = state.points.get('pt_D');
  const ptP = state.points.get('pt_P');

  const diagAC = state.segments.get('diag_AC');
  const diagBD = state.segments.get('diag_BD');

  const constructionIntersections = state.getConstructionIntersections();

  // Pure viewport line clipping helper for infinite construction lines (Parallel & Perpendicular)
  const clipInfiniteLineToViewport = useCallback(
    (
      p1: { x: number; y: number },
      p2: { x: number; y: number }
    ): { p1: { x: number; y: number }; p2: { x: number; y: number } } => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-8) {
        return { p1, p2 };
      }

      const minX = viewBox.x;
      const maxX = viewBox.x + viewBox.width;
      const minY = viewBox.y;
      const maxY = viewBox.y + viewBox.height;

      const hits: { x: number; y: number }[] = [];
      const EPS = 1e-4;

      // Intersect with left x = minX and right x = maxX
      if (Math.abs(dx) > EPS) {
        const tMinX = (minX - p1.x) / dx;
        const yMinX = p1.y + tMinX * dy;
        if (yMinX >= minY - EPS && yMinX <= maxY + EPS) {
          hits.push({ x: minX, y: Math.max(minY, Math.min(maxY, yMinX)) });
        }

        const tMaxX = (maxX - p1.x) / dx;
        const yMaxX = p1.y + tMaxX * dy;
        if (yMaxX >= minY - EPS && yMaxX <= maxY + EPS) {
          hits.push({ x: maxX, y: Math.max(minY, Math.min(maxY, yMaxX)) });
        }
      }

      // Intersect with top y = minY and bottom y = maxY
      if (Math.abs(dy) > EPS) {
        const tMinY = (minY - p1.y) / dy;
        const xMinY = p1.x + tMinY * dx;
        if (xMinY >= minX - EPS && xMinY <= maxX + EPS) {
          hits.push({ x: Math.max(minX, Math.min(maxX, xMinY)), y: minY });
        }

        const tMaxY = (maxY - p1.y) / dy;
        const xMaxY = p1.x + tMaxY * dx;
        if (xMaxY >= minX - EPS && xMaxY <= maxX + EPS) {
          hits.push({ x: Math.max(minX, Math.min(maxX, xMaxY)), y: maxY });
        }
      }

      // Deduplicate coincident box corners
      const uniqueHits: { x: number; y: number }[] = [];
      for (const h of hits) {
        if (!uniqueHits.some(u => Math.hypot(u.x - h.x, u.y - h.y) < 1.0)) {
          uniqueHits.push(h);
        }
      }

      if (uniqueHits.length >= 2) {
        return { p1: uniqueHits[0], p2: uniqueHits[1] };
      }

      // Safe fallback
      const maxDim = Math.max(viewBox.width, viewBox.height) * 2;
      const uX = dx / Math.sqrt(lenSq);
      const uY = dy / Math.sqrt(lenSq);
      return {
        p1: { x: p1.x - uX * maxDim, y: p1.y - uY * maxDim },
        p2: { x: p1.x + uX * maxDim, y: p1.y + uY * maxDim },
      };
    },
    [viewBox]
  );

  // Ruler candidate point snapping (A, B, C, D, O, P, free points, and construction intersections)
  const getRulerSnapTarget = useCallback(
    (coords: { x: number; y: number }, excludeId?: string): RulerPointRef | null => {
      let best: { ref: RulerPointRef; dist: number } | null = null;
      const SNAP_RADIUS = 22;

      // 1. Points in state.points (A, B, C, D, O, P, free points)
      for (const pt of state.points.values()) {
        if (excludeId && pt.id === excludeId) continue;
        const d = Math.hypot(coords.x - pt.x, coords.y - pt.y);
        if (d <= SNAP_RADIUS && (!best || d < best.dist)) {
          best = { ref: { id: pt.id, name: pt.name, x: pt.x, y: pt.y }, dist: d };
        }
      }

      // 2. Construction intersection points (P1, P2, P3, ...)
      for (const pt of constructionIntersections) {
        if (excludeId && pt.id === excludeId) continue;
        const d = Math.hypot(coords.x - pt.x, coords.y - pt.y);
        if (d <= SNAP_RADIUS && (!best || d < best.dist)) {
          best = { ref: { id: pt.id, name: pt.name, x: pt.x, y: pt.y }, dist: d };
        }
      }

      return best ? best.ref : null;
    },
    [state.points, constructionIntersections]
  );

  // Dynamically resolve live point coordinates for ruler measurement (tracking geometry drag)
  const resolveLiveRulerPoint = useCallback(
    (pRef: RulerPointRef): { x: number; y: number; name: string } => {
      if (pRef.id) {
        const pt = state.points.get(pRef.id);
        if (pt) return { x: pt.x, y: pt.y, name: pt.name };
        const isect = constructionIntersections.find(c => c.id === pRef.id);
        if (isect) return { x: isect.x, y: isect.y, name: isect.name };
      }
      return { x: pRef.x, y: pRef.y, name: pRef.name };
    },
    [state.points, constructionIntersections]
  );

  // Convert client pointer coordinates to SVG world coordinates
  const getSVGCoordinates = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!svgRef.current) return null;
      const ctm = svgRef.current.getScreenCTM();
      if (!ctm) return null;

      const pt = svgRef.current.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    []
  );

  // Radial degree scale geometry generator
  const renderDegreeScale = () => {
    if (!showDegreeScale || !circle || !ptO) return null;

    const ticks = [];
    const R = circle.radius;

    for (let deg = 0; deg < 360; deg += 10) {
      const isMajor = deg % 30 === 0;
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const rInner = R;
      const rOuter = isMajor ? R + 9 : R + 4;

      const x1 = ptO.x + rInner * cos;
      const y1 = ptO.y + rInner * sin;
      const x2 = ptO.x + rOuter * cos;
      const y2 = ptO.y + rOuter * sin;

      ticks.push(
        <line
          key={`tick_${deg}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isMajor ? '#818cf8' : '#475569'}
          strokeWidth={isMajor ? 1.5 : 1}
        />
      );

      if (isMajor) {
        const rText = R + 20;
        const tx = ptO.x + rText * cos;
        const ty = ptO.y + rText * sin + 3;

        ticks.push(
          <text
            key={`label_${deg}`}
            x={tx}
            y={ty}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="middle"
            className="select-none pointer-events-none"
          >
            {deg}°
          </text>
        );
      }
    }

    return (
      <g className="degree-scale opacity-80 transition-opacity">
        {/* Outer subtle guide circle */}
        <circle
          cx={ptO.x}
          cy={ptO.y}
          r={R + 9}
          fill="none"
          stroke="#334155"
          strokeWidth="0.75"
          strokeDasharray="2 4"
        />
        {ticks}
      </g>
    );
  };

  // Keyboard listener for Escape key to cancel source selection or active tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSourceSegment) {
          setActiveSourceSegment(null);
          setHoveredSegment(null);
          setSnappedPoint(null);
          setIsSnappedToCircle(false);
        } else if (
          activeTool === 'parallel' ||
          activeTool === 'perpendicular' ||
          activeTool === 'compass' ||
          activeTool === 'line_circle' ||
          activeTool === 'line' ||
          activeTool === 'circle' ||
          activeTool === 'segment' ||
          activeTool === 'diagonal'
        ) {
          if (activeTool === 'segment' && toolBufferPoints.length === 1 && segmentCreatedP1) {
            SOLGateway.getInstance().removeUnusedFreePoint(toolBufferPoints[0]);
          }
          setActiveTool('move');
          setToolBufferPoints([]);
          setSegmentCreatedP1(false);
          setHoveredDiagonalPreview(null);
          setWheelAngleOffset(0);
          setSnappedPoint(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSourceSegment, activeTool]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent, pointId: string) => {
    e.stopPropagation();
    const pt = state.points.get(pointId);
    if (!pt) return;

    onSelectPoint?.(pointId);

    // Tool: Move or Select
    if (activeTool === 'move' || activeTool === 'select') {
      if (pt.pinned) return;
      setDraggingPointId(pointId);
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    // Tool: Diagonal (click vertex A/B/C/D -> automatically constructs diagonal to opposite vertex C/D/A/B)
    if (activeTool === 'diagonal') {
      const oppId = getOppositeVertexId(pointId);
      if (oppId) {
        SOLGateway.getInstance().addDiagonal('quad_ABCD', pointId, oppId);
        const p1 = state.points.get(pointId);
        const p2 = state.points.get(oppId);
        setLastConstructedMessage(
          language === 'ru'
            ? `Диагональ ${p1?.name || ''}${p2?.name || ''} построена`
            : `Diagonal ${p1?.name || ''}${p2?.name || ''} constructed`
        );
        setTimeout(() => setLastConstructedMessage(null), 4000);
        setHoveredDiagonalPreview(null);
        setSnappedPoint(null);
      }
      return;
    }

    // Tool: Segment (two-click point buffer)
    if (activeTool === 'segment') {
      if (toolBufferPoints.length === 0) {
        setToolBufferPoints([pointId]);
        setSegmentCreatedP1(false);
      } else if (toolBufferPoints.length === 1 && toolBufferPoints[0] !== pointId) {
        const p1Id = toolBufferPoints[0];
        const p2Id = pointId;
        SOLGateway.getInstance().addFreeSegment(p1Id, p2Id);
        const p1 = state.points.get(p1Id);
        const p2 = state.points.get(p2Id);
        setLastConstructedMessage(
          language === 'ru'
            ? `Отрезок ${p1?.name || ''}${p2?.name || ''} построен`
            : `Segment ${p1?.name || ''}${p2?.name || ''} constructed`
        );
        setTimeout(() => setLastConstructedMessage(null), 4000);
        setToolBufferPoints([]);
        setSegmentCreatedP1(false);
        setSnappedPoint(null);
      }
      return;
    }

    // Tool: Radial Geometry ("Прямая / окружность" относительно опорной точки P)
    if (activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') {
      if (toolBufferPoints.length === 0) {
        setToolBufferPoints([pointId]);
        setWheelAngleOffset(0);
      } else if (toolBufferPoints.length === 1) {
        const centerId = toolBufferPoints[0];
        const centerPt = state.points.get(centerId);
        if (centerPt) {
          if (radialSubmode === 'line') {
            let qId = pointId;
            if (qId === centerId) {
              const angleRad = (mouseWorldCoords ? Math.atan2(mouseWorldCoords.y - centerPt.y, mouseWorldCoords.x - centerPt.x) : 0) + (wheelAngleOffset * Math.PI / 180);
              const qX = Math.round(centerPt.x + 100 * Math.cos(angleRad));
              const qY = Math.round(centerPt.y + 100 * Math.sin(angleRad));
              const newPt = SOLGateway.getInstance().addFreePoint(qX, qY);
              qId = newPt.entityId || centerId;
            }
            if (qId !== centerId) {
              SOLGateway.getInstance().addFreeLine(centerId, qId);
              setLastConstructedMessage(
                language === 'ru' ? `Прямая через ${centerPt.name} построена` : `Line through ${centerPt.name} constructed`
              );
              setTimeout(() => setLastConstructedMessage(null), 4000);
            }
          } else {
            const radiusPoint = pt;
            const radius = Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y));
            if (radius > 2.0) {
              SOLGateway.getInstance().addFreeCircle(centerId, radius);
              setLastConstructedMessage(
                language === 'ru' ? `Окружность(⊙${centerPt.name}, R = ${radius} мм) построена` : `Circle(⊙${centerPt.name}, R = ${radius} mm) constructed`
              );
              setTimeout(() => setLastConstructedMessage(null), 4000);
            }
          }
        }
        setToolBufferPoints([]);
        setWheelAngleOffset(0);
        setSnappedPoint(null);
      }
      return;
    }

    // Tool: Ruler (click or drag to measure between points)
    if (activeTool === 'ruler') {
      const pRef: RulerPointRef = { id: pt.id, name: pt.name, x: pt.x, y: pt.y };
      if (!rulerMeasurement || rulerMeasurement.isLocked) {
        setRulerMeasurement({
          p1: pRef,
          p2: pRef,
          isLocked: false,
        });
      } else {
        setRulerMeasurement({
          p1: rulerMeasurement.p1,
          p2: pRef,
          isLocked: true,
        });
      }
      return;
    }

    // Tool: Compass (two-click model: Click 1 Center, Move Radius, Click 2 Commit)
    if (activeTool === 'compass') {
      if (toolBufferPoints.length === 0) {
        // Step 1: Select/Lock Center Point
        setToolBufferPoints([pointId]);
      } else if (toolBufferPoints.length === 1) {
        // Step 2: Lock current radius and commit circle at center
        const centerId = toolBufferPoints[0];
        const centerPt = state.points.get(centerId);
        if (centerPt) {
          const radiusPoint = pt;
          const radius = Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y));
          if (radius > 2.0) {
            SOLGateway.getInstance().addFreeCircle(centerId, radius);
            setLastConstructedMessage(`Compass(⊙${centerPt.name || centerId}, R = ${radius}px)`);
            setTimeout(() => setLastConstructedMessage(null), 4000);
          }
        }
        setToolBufferPoints([]);
        setSnappedPoint(null);
      }
      return;
    }

    // Tool: Angle Bisector (Деление угла пополам: click angle to construct bisector via SOL Gateway)
    if (activeTool === 'angle') {
      if (hoveredAngle) {
        SOLGateway.getInstance().constructAngleBisector(
          hoveredAngle.vertex.id,
          hoveredAngle.ray1Pt.id,
          hoveredAngle.ray2Pt.id
        );
        const name = hoveredAngle.name;
        setLastConstructedMessage(
          language === 'ru'
            ? `Биссектриса ${name} построена`
            : `Bisector of ${name} constructed`
        );
        setTimeout(() => setLastConstructedMessage(null), 4000);
        setHoveredAngle(null);
        return;
      }

      // Fallback: direct click on a vertex with incident segments
      const incidentSegs = Array.from(state.segments.values()).filter(
        s => s.p1Id === pointId || s.p2Id === pointId
      );
      if (incidentSegs.length >= 2) {
        const r1Id = incidentSegs[0].p1Id === pointId ? incidentSegs[0].p2Id : incidentSegs[0].p1Id;
        const r2Id = incidentSegs[1].p1Id === pointId ? incidentSegs[1].p2Id : incidentSegs[1].p1Id;
        const r1Pt = state.points.get(r1Id);
        const r2Pt = state.points.get(r2Id);
        if (r1Pt && r2Pt) {
          SOLGateway.getInstance().constructAngleBisector(pointId, r1Id, r2Id);
          setLastConstructedMessage(
            language === 'ru'
              ? `Биссектриса угла ∠${r1Pt.name}${pt.name}${r2Pt.name} построена`
              : `Bisector of angle ∠${r1Pt.name}${pt.name}${r2Pt.name} constructed`
          );
          setTimeout(() => setLastConstructedMessage(null), 4000);
          setHoveredAngle(null);
        }
      }
      return;
    }

    // Tool: Parallel or Perpendicular (Step 5: Click existing point as through-point)
    if (activeTool === 'parallel' || activeTool === 'perpendicular') {
      if (activeSourceSegment) {
        if (activeTool === 'parallel') {
          SOLGateway.getInstance().constructParallel(pointId, activeSourceSegment);
        } else {
          SOLGateway.getInstance().constructPerpendicular(pointId, activeSourceSegment);
        }

        const sourceSeg = state.segments.get(activeSourceSegment);
        const opSym = activeTool === 'parallel' ? '∥' : '⟂';
        const msg = `${opSym} ${sourceSeg?.name || activeSourceSegment} via ${pt.name}`;
        setLastConstructedMessage(msg);
        setTimeout(() => setLastConstructedMessage(null), 4000);

        setActiveSourceSegment(null);
        setHoveredSegment(null);
        setSnappedPoint(null);
        setIsSnappedToCircle(false);
      }
      return;
    }
  };

  const handleSegmentClick = (e: React.PointerEvent, segId: string) => {
    if ((activeTool === 'parallel' || activeTool === 'perpendicular') && !activeSourceSegment) {
      e.stopPropagation();
      // Click hovered line to select as ACTIVE SOURCE
      setActiveSourceSegment(segId);
      setHoveredSegment(null);
      return;
    }

    // Delegate to handleCanvasClick for all other tools (segment, point, compass, ruler, angle, etc.)
    handleCanvasClick(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getSVGCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    setMouseWorldCoords(coords);

    // Case 0: Canvas Panning with pointer drag
    if (isPanning && panStart && svgRef.current) {
      const scaleX = viewBox.width / svgRef.current.clientWidth;
      const scaleY = viewBox.height / svgRef.current.clientHeight;
      const dx = (e.clientX - panStart.clientX) * scaleX;
      const dy = (e.clientY - panStart.clientY) * scaleY;
      setViewBox(prev => ({
        ...prev,
        x: panStart.viewBoxX - dx,
        y: panStart.viewBoxY - dy,
      }));
      return;
    }

    // Case 1: Dragging a point (canonical vertex or free auxiliary point)
    if (draggingPointId) {
      SOLGateway.getInstance().movePoint(draggingPointId, coords.x, coords.y);
      onPointMoved?.(draggingPointId, coords.x, coords.y);
      return;
    }

    // Case: Diagonal tool active (detect hovered vertex A/B/C/D and compute opposite vertex for preview)
    if (activeTool === 'diagonal') {
      let nearestPt: Point | null = null;
      let minPtDist = 20;
      for (const pt of state.points.values()) {
        const dist = Math.hypot(coords.x - pt.x, coords.y - pt.y);
        if (dist < minPtDist) {
          minPtDist = dist;
          nearestPt = pt;
        }
      }
      setSnappedPoint(nearestPt);

      if (nearestPt) {
        const oppId = getOppositeVertexId(nearestPt.id);
        const oppPt = oppId ? state.points.get(oppId) : null;
        if (oppPt) {
          setHoveredDiagonalPreview({
            p1: nearestPt,
            p2: oppPt,
            name: `${nearestPt.name}${oppPt.name}`,
          });
        } else {
          setHoveredDiagonalPreview(null);
        }
      } else {
        setHoveredDiagonalPreview(null);
      }
      return;
    }

    // Case 2: Ruler tool active (live point snapping & real-time measurement line)
    if (activeTool === 'ruler') {
      if (rulerMeasurement && !rulerMeasurement.isLocked) {
        const snap = getRulerSnapTarget(coords, rulerMeasurement.p1.id);
        const target: RulerPointRef = snap || {
          name: `(${Math.round(coords.x)}, ${Math.round(coords.y)})`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
        };
        setRulerMeasurement({
          ...rulerMeasurement,
          p2: target,
        });
        setRulerHoverSnap(snap);
      } else {
        const snap = getRulerSnapTarget(coords);
        setRulerHoverSnap(snap);
      }
      return;
    }

    // Case 2: Compass, Segment & Radial Line/Circle tools active
    if (
      activeTool === 'compass' ||
      activeTool === 'segment' ||
      activeTool === 'line_circle' ||
      activeTool === 'line' ||
      activeTool === 'circle'
    ) {
      if (toolBufferPoints.length === 1) {
        let nearestPt: Point | null = null;
        let minPtDist = 18;
        for (const pt of state.points.values()) {
          const dist = Math.hypot(coords.x - pt.x, coords.y - pt.y);
          if (dist < minPtDist) {
            minPtDist = dist;
            nearestPt = pt;
          }
        }
        setSnappedPoint(nearestPt);
      } else {
        setSnappedPoint(null);
      }
      return;
    }

    // Case 2b: Angle Bisector tool active (detect closest angle vertex & adjacent rays)
    if (activeTool === 'angle') {
      interface CandidateAngle {
        vertex: Point;
        ray1Pt: Point;
        ray2Pt: Point;
        name: string;
      }

      const candidateAngles: CandidateAngle[] = [];

      // 1. Primary Quadrilateral boundary angles (∠DAB, ∠ABC, ∠BCD, ∠CDA)
      if (ptA && ptB && ptD) {
        candidateAngles.push({ vertex: ptA, ray1Pt: ptD, ray2Pt: ptB, name: '∠DAB' });
      }
      if (ptB && ptA && ptC) {
        candidateAngles.push({ vertex: ptB, ray1Pt: ptA, ray2Pt: ptC, name: '∠ABC' });
      }
      if (ptC && ptB && ptD) {
        candidateAngles.push({ vertex: ptC, ray1Pt: ptB, ray2Pt: ptD, name: '∠BCD' });
      }
      if (ptD && ptC && ptA) {
        candidateAngles.push({ vertex: ptD, ray1Pt: ptC, ray2Pt: ptA, name: '∠CDA' });
      }

      // 2. All other angles formed by incident segments on any vertex/point
      for (const pt of state.points.values()) {
        const incidentSegs = Array.from(state.segments.values()).filter(
          s => s.p1Id === pt.id || s.p2Id === pt.id
        );
        if (incidentSegs.length >= 2) {
          const neighborIds = incidentSegs.map(s => (s.p1Id === pt.id ? s.p2Id : s.p1Id));
          const uniqueNeighbors = Array.from(new Set(neighborIds));
          for (let i = 0; i < uniqueNeighbors.length; i++) {
            for (let j = i + 1; j < uniqueNeighbors.length; j++) {
              const n1 = state.points.get(uniqueNeighbors[i]);
              const n2 = state.points.get(uniqueNeighbors[j]);
              if (n1 && n2) {
                const angleName = `∠${n1.name}${pt.name}${n2.name}`;
                if (!candidateAngles.some(c => c.vertex.id === pt.id && ((c.ray1Pt.id === n1.id && c.ray2Pt.id === n2.id) || (c.ray1Pt.id === n2.id && c.ray2Pt.id === n1.id)))) {
                  candidateAngles.push({ vertex: pt, ray1Pt: n1, ray2Pt: n2, name: angleName });
                }
              }
            }
          }
        }
      }

      let bestMatch: CandidateAngle | null = null;
      let bestScore = Infinity;

      for (const cand of candidateAngles) {
        const d = Math.hypot(coords.x - cand.vertex.x, coords.y - cand.vertex.y);
        const uX = cand.ray1Pt.x - cand.vertex.x;
        const uY = cand.ray1Pt.y - cand.vertex.y;
        const vX = cand.ray2Pt.x - cand.vertex.x;
        const vY = cand.ray2Pt.y - cand.vertex.y;
        const lenU = Math.hypot(uX, uY);
        const lenV = Math.hypot(vX, vY);
        if (lenU < 1 || lenV < 1) continue;

        const uNormX = uX / lenU;
        const uNormY = uY / lenU;
        const vNormX = vX / lenV;
        const vNormY = vY / lenV;

        const bX = uNormX + vNormX;
        const bY = uNormY + vNormY;
        const lenB = Math.hypot(bX, bY);
        if (lenB < 1e-4) continue; // Opposite rays (180 deg)

        const bNormX = bX / lenB;
        const bNormY = bY / lenB;

        let score = Infinity;
        if (d <= 36) {
          score = d;
        } else if (d <= 95) {
          const mNormX = (coords.x - cand.vertex.x) / d;
          const mNormY = (coords.y - cand.vertex.y) / d;
          const cosWithBisector = mNormX * bNormX + mNormY * bNormY;
          if (cosWithBisector > 0.25) {
            score = d * (2.2 - cosWithBisector);
          }
        }

        if (score < 100 && score < bestScore) {
          bestScore = score;
          bestMatch = cand;
        }
      }

      setHoveredAngle(bestMatch);
      return;
    }

    // Case 2: Parallel or Perpendicular tool active
    if (activeTool === 'parallel' || activeTool === 'perpendicular') {
      if (!activeSourceSegment) {
        // Step 2: Hover over line detection with crosshair projection
        const candidateSegments: Segment[] = [];
        for (const sId of ['seg_AB', 'seg_BC', 'seg_CD', 'seg_DA']) {
          const s = state.segments.get(sId);
          if (s) candidateSegments.push(s);
        }
        if (diagAC) candidateSegments.push(diagAC);
        if (diagBD) candidateSegments.push(diagBD);
        for (const s of state.segments.values()) {
          if (!candidateSegments.some(c => c.id === s.id)) {
            candidateSegments.push(s);
          }
        }

        let bestHit: { id: string; name: string; projX: number; projY: number; dist: number } | null = null;
        const HIT_THRESHOLD = 18; // SVG pixels hit tolerance

        for (const seg of candidateSegments) {
          const p1 = state.points.get(seg.p1Id);
          const p2 = state.points.get(seg.p2Id);
          if (!p1 || !p2) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1e-4) continue;

          let t = ((coords.x - p1.x) * dx + (coords.y - p1.y) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));

          const projX = p1.x + t * dx;
          const projY = p1.y + t * dy;
          const dist = Math.hypot(coords.x - projX, coords.y - projY);

          if (dist <= HIT_THRESHOLD) {
            if (!bestHit || dist < bestHit.dist) {
              bestHit = {
                id: seg.id,
                name: seg.name,
                projX,
                projY,
                dist,
              };
            }
          }
        }

        setHoveredSegment(bestHit);
        setSnappedPoint(null);
        setIsSnappedToCircle(false);
      } else {
        // Step 5: Active source is selected! Check for snapping to points or circumcircle
        setHoveredSegment(null);

        // Check point snapping (A, B, C, D, O, P, or auxiliary points)
        let nearestPt: Point | null = null;
        let minPtDist = 18; // Snap radius in SVG pixels

        for (const pt of state.points.values()) {
          const dist = Math.hypot(coords.x - pt.x, coords.y - pt.y);
          if (dist < minPtDist) {
            minPtDist = dist;
            nearestPt = pt;
          }
        }

        if (nearestPt) {
          setSnappedPoint(nearestPt);
          setIsSnappedToCircle(false);
        } else if (circle && ptO) {
          // Check snap to circumcircle S¹
          const distToCenter = Math.hypot(coords.x - ptO.x, coords.y - ptO.y);
          if (Math.abs(distToCenter - circle.radius) <= 14) {
            setSnappedPoint(null);
            setIsSnappedToCircle(true);
          } else {
            setSnappedPoint(null);
            setIsSnappedToCircle(false);
          }
        } else {
          setSnappedPoint(null);
          setIsSnappedToCircle(false);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }

    if (draggingPointId) {
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingPointId(null);
    }

    // Ruler tool: Lock measurement on pointer up if dragged
    if (activeTool === 'ruler' && rulerMeasurement && !rulerMeasurement.isLocked) {
      const liveP1 = resolveLiveRulerPoint(rulerMeasurement.p1);
      const liveP2 = resolveLiveRulerPoint(rulerMeasurement.p2);
      const d = Math.hypot(liveP2.x - liveP1.x, liveP2.y - liveP1.y);
      if (d > 12) {
        setRulerMeasurement({
          ...rulerMeasurement,
          isLocked: true,
        });
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
    if (draggingPointId) {
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingPointId(null);
    }
  };

  // Canvas background pointer down (for pan initiation, adding free points, or completing parallel/perp construction)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const coords = getSVGCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    // Pan with middle mouse button or with move/select tool on empty canvas background
    if (e.button === 1 || activeTool === 'move' || activeTool === 'select') {
      setIsPanning(true);
      setPanStart({ clientX: e.clientX, clientY: e.clientY, viewBoxX: viewBox.x, viewBoxY: viewBox.y });
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {}
      if (activeTool === 'select') {
        onSelectPoint?.(null);
        setRulerMeasurement(null);
      }
      return;
    }

    handleCanvasClick(e);
  };

  const handleCanvasClick = (e: React.PointerEvent) => {
    const coords = getSVGCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    if (activeTool === 'ruler') {
      const snap = getRulerSnapTarget(coords, rulerMeasurement && !rulerMeasurement.isLocked ? rulerMeasurement.p1.id : undefined);
      const ptTarget: RulerPointRef = snap || {
        name: `(${Math.round(coords.x)}, ${Math.round(coords.y)})`,
        x: Math.round(coords.x),
        y: Math.round(coords.y),
      };

      if (!rulerMeasurement || rulerMeasurement.isLocked) {
        // Start new measurement
        setRulerMeasurement({
          p1: ptTarget,
          p2: ptTarget,
          isLocked: false,
        });
      } else {
        // Complete / Lock measurement
        setRulerMeasurement({
          p1: rulerMeasurement.p1,
          p2: ptTarget,
          isLocked: true,
        });
      }
      return;
    }

    if (activeTool === 'point') {
      if (!snappedPoint) {
        SOLGateway.getInstance().addFreePoint(coords.x, coords.y);
      }
      return;
    }

    if (activeTool === 'angle') {
      if (hoveredAngle) {
        SOLGateway.getInstance().constructAngleBisector(
          hoveredAngle.vertex.id,
          hoveredAngle.ray1Pt.id,
          hoveredAngle.ray2Pt.id
        );
        const name = hoveredAngle.name;
        setLastConstructedMessage(
          language === 'ru'
            ? `Биссектриса ${name} построена`
            : `Bisector of ${name} constructed`
        );
        setTimeout(() => setLastConstructedMessage(null), 4000);
        setHoveredAngle(null);
      }
      return;
    }

    if (activeTool === 'select') {
      onSelectPoint?.(null);
      setRulerMeasurement(null);
      return;
    }

    if (activeTool === 'segment') {
      if (toolBufferPoints.length === 0) {
        // Step 1: If snapped to existing vertex (A, B, C, D, etc.), use it; otherwise create free point P1
        if (snappedPoint) {
          setToolBufferPoints([snappedPoint.id]);
          setSegmentCreatedP1(false);
        } else {
          const newPt1 = SOLGateway.getInstance().addFreePoint(Math.round(coords.x), Math.round(coords.y));
          if (newPt1.entityId) {
            setToolBufferPoints([newPt1.entityId]);
            setSegmentCreatedP1(true);
          }
        }
        return;
      }
      if (toolBufferPoints.length === 1) {
        // Step 2: Click empty canvas space -> create new free point P2 and construct Segment(P1, P2)
        const p1Id = toolBufferPoints[0];
        let p2Id: string;
        if (snappedPoint && snappedPoint.id !== p1Id) {
          p2Id = snappedPoint.id;
        } else {
          const newPt2 = SOLGateway.getInstance().addFreePoint(Math.round(coords.x), Math.round(coords.y));
          p2Id = newPt2.entityId || p1Id;
        }
        if (p2Id !== p1Id) {
          SOLGateway.getInstance().addFreeSegment(p1Id, p2Id);
          const p1 = state.points.get(p1Id);
          const p2 = state.points.get(p2Id);
          setLastConstructedMessage(
            language === 'ru'
              ? `Отрезок ${p1?.name || ''}${p2?.name || ''} построен`
              : `Segment ${p1?.name || ''}${p2?.name || ''} constructed`
          );
          setTimeout(() => setLastConstructedMessage(null), 4000);
        }
        setToolBufferPoints([]);
        setSegmentCreatedP1(false);
        setSnappedPoint(null);
        return;
      }
    }

    if (activeTool === 'compass') {
      if (toolBufferPoints.length === 0) {
        if (snappedPoint) {
          setToolBufferPoints([snappedPoint.id]);
        } else {
          const newPt = SOLGateway.getInstance().addFreePoint(Math.round(coords.x), Math.round(coords.y));
          if (newPt.entityId) {
            setToolBufferPoints([newPt.entityId]);
          }
        }
        return;
      }
      if (toolBufferPoints.length === 1) {
        // Click 2: Click empty canvas space to lock the current cursor radius and commit
        const centerId = toolBufferPoints[0];
        const centerPt = state.points.get(centerId);
        if (centerPt) {
          const radiusPoint = snappedPoint || coords;
          const radius = Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y));
          if (radius > 2.0) {
            SOLGateway.getInstance().addFreeCircle(centerId, radius);
            setLastConstructedMessage(`Compass(⊙${centerPt.name || centerId}, R = ${radius}px)`);
            setTimeout(() => setLastConstructedMessage(null), 4000);
          }
        }
        setToolBufferPoints([]);
        setSnappedPoint(null);
        return;
      }
    }

    if (activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') {
      if (toolBufferPoints.length === 0) {
        if (snappedPoint) {
          setToolBufferPoints([snappedPoint.id]);
          setWheelAngleOffset(0);
        } else {
          const newPt = SOLGateway.getInstance().addFreePoint(Math.round(coords.x), Math.round(coords.y));
          if (newPt.entityId) {
            setToolBufferPoints([newPt.entityId]);
            setWheelAngleOffset(0);
          }
        }
        return;
      }
      if (toolBufferPoints.length === 1) {
        const centerId = toolBufferPoints[0];
        const centerPt = state.points.get(centerId);
        if (centerPt) {
          if (radialSubmode === 'line') {
            let qId: string;
            if (snappedPoint && snappedPoint.id !== centerId) {
              qId = snappedPoint.id;
            } else {
              const baseAngle = Math.atan2(coords.y - centerPt.y, coords.x - centerPt.x);
              const finalAngle = baseAngle + (wheelAngleOffset * Math.PI / 180);
              const qX = Math.round(centerPt.x + 100 * Math.cos(finalAngle));
              const qY = Math.round(centerPt.y + 100 * Math.sin(finalAngle));
              const newPt = SOLGateway.getInstance().addFreePoint(qX, qY);
              qId = newPt.entityId || centerId;
            }
            if (qId !== centerId) {
              SOLGateway.getInstance().addFreeLine(centerId, qId);
              setLastConstructedMessage(
                language === 'ru' ? `Прямая через ${centerPt.name} построена` : `Line through ${centerPt.name} constructed`
              );
              setTimeout(() => setLastConstructedMessage(null), 4000);
            }
          } else {
            // Circle mode
            const radiusPoint = snappedPoint || coords;
            const radius = Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y));
            if (radius > 2.0) {
              SOLGateway.getInstance().addFreeCircle(centerId, radius);
              setLastConstructedMessage(
                language === 'ru' ? `Окружность(⊙${centerPt.name}, R = ${radius} мм) построена` : `Circle(⊙${centerPt.name}, R = ${radius} mm) constructed`
              );
              setTimeout(() => setLastConstructedMessage(null), 4000);
            }
          }
        }
        setToolBufferPoints([]);
        setWheelAngleOffset(0);
        setSnappedPoint(null);
        return;
      }
    }

    if (activeTool === 'parallel' || activeTool === 'perpendicular') {
      if (!activeSourceSegment) {
        if (hoveredSegment) {
          setActiveSourceSegment(hoveredSegment.id);
          setHoveredSegment(null);
        }
        return;
      }

      // Step 5: Complete construction through snapped point or new point on plane
      let throughPtId: string;

      if (snappedPoint) {
        throughPtId = snappedPoint.id;
      } else {
        let posX = coords.x;
        let posY = coords.y;

        if (isSnappedToCircle && circle && ptO) {
          const angle = Math.atan2(coords.y - ptO.y, coords.x - ptO.x);
          posX = ptO.x + circle.radius * Math.cos(angle);
          posY = ptO.y + circle.radius * Math.sin(angle);
        }

        const newPt = SOLGateway.getInstance().addFreePoint(Math.round(posX), Math.round(posY));
        throughPtId = newPt.entityId || 'pt_A';
      }

      if (activeTool === 'parallel') {
        SOLGateway.getInstance().constructParallel(throughPtId, activeSourceSegment);
      } else {
        SOLGateway.getInstance().constructPerpendicular(throughPtId, activeSourceSegment);
      }

      const sourceSeg = state.segments.get(activeSourceSegment);
      const throughPt = state.points.get(throughPtId);
      const opSym = activeTool === 'parallel' ? '∥' : '⟂';
      const msg = `${opSym} ${sourceSeg?.name || activeSourceSegment} via ${throughPt?.name || throughPtId}`;
      setLastConstructedMessage(msg);
      setTimeout(() => setLastConstructedMessage(null), 4000);

      setActiveSourceSegment(null);
      setSnappedPoint(null);
      setIsSnappedToCircle(false);
    }
  };

  // Special CQNS Tool executions
  const handleTriggerDiagonals = () => {
    SOLGateway.getInstance().addBothDiagonals('quad_ABCD');
  };

  const handleTriggerIntersection = () => {
    SOLGateway.getInstance().constructIntersection('diag_AC', 'diag_BD');
  };

  // Compute point distance deviation
  const getPointDeviation = (p?: Point) => {
    if (!p || !ptO || !circle) return 0;
    return GeometryCore.radialDeviation(p, ptO, circle.radius);
  };

  const isPointOnCircle = (p?: Point) => getPointDeviation(p) <= 1.5;

  // Polygon path for ABCD
  const polygonPoints = [ptA, ptB, ptC, ptD]
    .filter((p): p is Point => !!p)
    .map(p => `${p.x},${p.y}`)
    .join(' ');

  // Get active instruction message for current tool
  const getToolInstruction = () => {
    switch (activeTool) {
      case 'select':
      case 'move':
        return language === 'ru'
          ? 'Кликните и перетащите любую точку чертежа'
          : 'Click and drag any point on the canvas';
      case 'point':
        return t.instructionPoint;
      case 'diagonal':
        return language === 'ru'
          ? 'Наведите на вершину (A, B, C, D) для предпросмотра диагонали. Кликните для построения'
          : 'Hover over vertex (A, B, C, D) for diagonal preview. Click to construct';
      case 'segment':
        return toolBufferPoints.length === 0
          ? `${t.instructionSegment} (1/2)`
          : language === 'ru'
          ? 'Выберите вторую точку (2/2)'
          : 'Select second point (2/2)';
      case 'line_circle':
      case 'line':
      case 'circle':
        if (toolBufferPoints.length === 0) {
          return language === 'ru'
            ? 'Кликните для выбора опорной точки P (Прямая / окружность)'
            : 'Click to select pivot point P (Line / Circle)';
        }
        if (toolBufferPoints.length === 1) {
          const pPt = state.points.get(toolBufferPoints[0]);
          if (radialSubmode === 'line') {
            return language === 'ru'
              ? `Прямая через ${pPt?.name || 'P'}. Двигайте мышь/колесо для угла. Клик для фиксации`
              : `Line through ${pPt?.name || 'P'}. Move mouse/wheel for angle. Click to commit`;
          } else {
            const radiusPoint = snappedPoint || mouseWorldCoords;
            const r = pPt && radiusPoint ? Math.round(Math.hypot(radiusPoint.x - pPt.x, radiusPoint.y - pPt.y)) : 0;
            return language === 'ru'
              ? `Окружность с центром ${pPt?.name || 'P'}. Радиус: R = ${r} мм. Клик для фиксации`
              : `Circle centered at ${pPt?.name || 'P'}. Radius: R = ${r} mm. Click to commit`;
          }
        }
        return t.instructionLine;
      case 'angle':
        if (hoveredAngle) {
          return language === 'ru'
            ? `Кликните для построения биссектрисы ${hoveredAngle.name}`
            : `Click to construct bisector of ${hoveredAngle.name}`;
        }
        return language === 'ru'
          ? 'Наведите курсор на угол (вершину A, B, C или D) для деления пополам'
          : 'Hover over any angle vertex to bisect';
      case 'ruler':
        return !rulerMeasurement || rulerMeasurement.isLocked ? t.rulerClickFirst : t.rulerClickSecond;
      case 'parallel':
        if (activeSourceSegment) {
          const seg = state.segments.get(activeSourceSegment);
          const name = seg ? seg.name : activeSourceSegment;
          return t.toolParallelActiveSource.replace('{seg}', name);
        }
        if (hoveredSegment) {
          return language === 'ru'
            ? `Кликните для выбора основы: ${hoveredSegment.name}`
            : `Click to select source line: ${hoveredSegment.name}`;
        }
        return t.instructionParallel;
      case 'perpendicular':
        if (activeSourceSegment) {
          const seg = state.segments.get(activeSourceSegment);
          const name = seg ? seg.name : activeSourceSegment;
          return t.toolPerpActiveSource.replace('{seg}', name);
        }
        if (hoveredSegment) {
          return language === 'ru'
            ? `Кликните для выбора основы: ${hoveredSegment.name}`
            : `Click to select source line: ${hoveredSegment.name}`;
        }
        return t.instructionPerpendicular;
      case 'compass':
        if (toolBufferPoints.length === 0) {
          return language === 'ru'
            ? 'Кликните центр для ножки циркуля'
            : 'Click center to place needle of compass';
        }
        if (toolBufferPoints.length === 1) {
          const centerPt = state.points.get(toolBufferPoints[0]);
          const radiusPoint = snappedPoint || mouseWorldCoords;
          const r = centerPt && radiusPoint ? Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y)) : 0;
          return language === 'ru'
            ? `Раздвигайте циркуль. Радиус: R = ${r} мм. Кликните для фиксации`
            : `Spread the compass. Radius: R = ${r} mm. Click to commit`;
        }
        return t.instructionCompass;
      default:
        return language === 'ru'
          ? 'Кликните и перетащите любую точку чертежа'
          : 'Click and drag any point on the canvas';
    }
  };

  // Dynamic Preview Compass Circle Calculation
  let compassPreview: {
    centerX: number;
    centerY: number;
    radius: number;
    p1Name: string;
    p2Name: string;
  } | null = null;

  if (activeTool === 'compass' && toolBufferPoints.length === 1 && mouseWorldCoords) {
    const centerPt = state.points.get(toolBufferPoints[0]);
    if (centerPt) {
      const radiusPoint = snappedPoint || mouseWorldCoords;
      const radius = Math.round(Math.hypot(radiusPoint.x - centerPt.x, radiusPoint.y - centerPt.y));
      compassPreview = {
        centerX: centerPt.x,
        centerY: centerPt.y,
        radius,
        p1Name: centerPt.name,
        p2Name: snappedPoint ? snappedPoint.name : '',
      };
    }
  }

  // Dynamic Segment Live Preview (P1 -> Cursor / Snapped P2)
  let segmentPreview: {
    p1: { x: number; y: number; name: string };
    p2: { x: number; y: number; name: string };
    length: number;
  } | null = null;

  if (activeTool === 'segment' && toolBufferPoints.length === 1 && mouseWorldCoords) {
    const p1 = state.points.get(toolBufferPoints[0]);
    if (p1) {
      const p2Coords = snappedPoint || mouseWorldCoords;
      const len = Math.round(Math.hypot(p2Coords.x - p1.x, p2Coords.y - p1.y));
      segmentPreview = {
        p1: { x: p1.x, y: p1.y, name: p1.name },
        p2: { x: p2Coords.x, y: p2Coords.y, name: snappedPoint ? snappedPoint.name : '' },
        length: len,
      };
    }
  }

  // Dynamic Radial Geometry Tool Preview (Line / Circle around Pivot P)
  let radialLinePreview: { p1: { x: number; y: number }; p2: { x: number; y: number } } | null = null;
  let radialCirclePreview: { centerX: number; centerY: number; radius: number; pName: string } | null = null;
  let radialAngleDeg: number = 0;

  if (
    (activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') &&
    toolBufferPoints.length === 1 &&
    mouseWorldCoords
  ) {
    const pivotPt = state.points.get(toolBufferPoints[0]);
    if (pivotPt) {
      if (radialSubmode === 'line') {
        const targetPt = snappedPoint || mouseWorldCoords;
        const baseAngle = Math.atan2(targetPt.y - pivotPt.y, targetPt.x - pivotPt.x);
        const finalAngle = baseAngle + (wheelAngleOffset * Math.PI / 180);
        const p2Temp = {
          x: pivotPt.x + 100 * Math.cos(finalAngle),
          y: pivotPt.y + 100 * Math.sin(finalAngle),
        };
        radialLinePreview = clipInfiniteLineToViewport(pivotPt, p2Temp);
        const rawDeg = (finalAngle * 180 / Math.PI) % 360;
        radialAngleDeg = Math.round((rawDeg + 360) % 360);
      } else {
        const radiusPoint = snappedPoint || mouseWorldCoords;
        const radius = Math.round(Math.hypot(radiusPoint.x - pivotPt.x, radiusPoint.y - pivotPt.y));
        radialCirclePreview = {
          centerX: pivotPt.x,
          centerY: pivotPt.y,
          radius,
          pName: pivotPt.name,
        };
      }
    }
  }

  // Dynamic Preview Line Calculation for Parallel & Perpendicular
  let previewLineCoords: { p1: { x: number; y: number }; p2: { x: number; y: number } } | null = null;
  let previewTargetPoint: { x: number; y: number } | null = null;

  if ((activeTool === 'parallel' || activeTool === 'perpendicular') && activeSourceSegment && mouseWorldCoords) {
    const sourceSeg = state.segments.get(activeSourceSegment);
    if (sourceSeg) {
      const sP1 = state.points.get(sourceSeg.p1Id);
      const sP2 = state.points.get(sourceSeg.p2Id);
      if (sP1 && sP2) {
        if (snappedPoint) {
          previewTargetPoint = { x: snappedPoint.x, y: snappedPoint.y };
        } else if (isSnappedToCircle && circle && ptO) {
          const angle = Math.atan2(mouseWorldCoords.y - ptO.y, mouseWorldCoords.x - ptO.x);
          previewTargetPoint = {
            x: Math.round(ptO.x + circle.radius * Math.cos(angle)),
            y: Math.round(ptO.y + circle.radius * Math.sin(angle)),
          };
        } else {
          previewTargetPoint = { x: mouseWorldCoords.x, y: mouseWorldCoords.y };
        }

        if (activeTool === 'parallel') {
          const dx = sP2.x - sP1.x;
          const dy = sP2.y - sP1.y;
          const p2 = { x: previewTargetPoint.x + dx, y: previewTargetPoint.y + dy };
          previewLineCoords = clipInfiniteLineToViewport(previewTargetPoint, p2);
        } else {
          // Perpendicular: normal vector (-dy, dx)
          const dx = -(sP2.y - sP1.y);
          const dy = sP2.x - sP1.x;
          const p2 = { x: previewTargetPoint.x + dx, y: previewTargetPoint.y + dy };
          previewLineCoords = clipInfiniteLineToViewport(previewTargetPoint, p2);
        }
      }
    }
  }

  return (
    <div className="relative flex-1 h-full w-full bg-slate-950 select-none overflow-hidden flex flex-col">
      {/* Top Controls & School Drawing Workbench (Triangle Stand Model) */}
      <div className="absolute top-2 left-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {/* Primary School Drawing Toolset */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl text-slate-300 pointer-events-auto">
          {/* Tag */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-950/80 border border-indigo-800/60 text-[10px] font-bold font-mono text-indigo-300 mr-1 select-none">
            <span>GEOMETRY</span>
          </div>

          {/* 1. Selection / Move */}
          <button
            onClick={() => {
              setActiveTool('move');
              setToolBufferPoints([]);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'move' || activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolSelect}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>{language === 'ru' ? 'Выделение' : 'Select'}</span>
          </button>

          {/* 2. Point */}
          <button
            onClick={() => {
              setActiveTool('point');
              setToolBufferPoints([]);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'point'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolPoint}
          >
            <CircleDot className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.toolPoint}</span>
          </button>

          {/* 3. Segment */}
          <button
            onClick={() => {
              setActiveTool('segment');
              setToolBufferPoints([]);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'segment'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolSegment}
          >
            <Minus className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.toolSegment}</span>
          </button>

          {/* 4. Unified Radial Geometry Tool: Line / Circle */}
          <button
            onClick={() => {
              if (activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') {
                setActiveTool('move');
                setToolBufferPoints([]);
                setWheelAngleOffset(0);
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setSnappedPoint(null);
              } else {
                setActiveTool('line_circle');
                setToolBufferPoints([]);
                setWheelAngleOffset(0);
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setSnappedPoint(null);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={language === 'ru' ? 'Прямая / окружность относительно точки' : 'Line / Circle relative to pivot'}
          >
            <CircleIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>{language === 'ru' ? 'Прямая / окружность' : 'Line / Circle'}</span>
          </button>

          {/* Compact Submode Switcher when Pivot P is locked */}
          {(activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') && toolBufferPoints.length === 1 && (
            <div className="flex items-center gap-1 bg-purple-950/90 border border-purple-500/60 rounded-lg p-0.5 shadow-md">
              <button
                onClick={() => setRadialSubmode('line')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  radialSubmode === 'line'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-white'
                }`}
              >
                {language === 'ru' ? '── Прямая' : '── Line'}
              </button>
              <button
                onClick={() => setRadialSubmode('circle')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  radialSubmode === 'circle'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-purple-300 hover:bg-purple-900/50 hover:text-white'
                }`}
              >
                {language === 'ru' ? '◯ Окружность' : '◯ Circle'}
              </button>
            </div>
          )}

          {/* 6. Ruler */}
          <button
            onClick={() => {
              setActiveTool('ruler');
              setToolBufferPoints([]);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'ruler'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolRuler}
          >
            <Ruler className="w-3.5 h-3.5 text-pink-400" />
            <span>{t.toolRuler}</span>
          </button>

          {/* 7. Compass */}
          <button
            onClick={() => {
              if (activeTool === 'compass') {
                setActiveTool('move');
                setToolBufferPoints([]);
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setSnappedPoint(null);
              } else {
                setActiveTool('compass');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setToolBufferPoints([]);
                setSnappedPoint(null);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'compass'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolCompass}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.toolCompass}</span>
          </button>

          {/* 8. Diagonal ("Диагональ") */}
          <button
            onClick={() => {
              if (activeTool === 'diagonal') {
                setActiveTool('move');
                setHoveredDiagonalPreview(null);
              } else {
                setActiveTool('diagonal');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setToolBufferPoints([]);
                setHoveredDiagonalPreview(null);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'diagonal'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={language === 'ru' ? 'Диагональ четырёхугольника' : 'Quadrilateral Diagonal'}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ru' ? 'Диагональ' : 'Diagonal'}</span>
          </button>

          {/* 9. Angle Bisector (Деление угла пополам) */}
          <button
            onClick={() => {
              setActiveTool('angle');
              setToolBufferPoints([]);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'angle'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={language === 'ru' ? 'Деление угла пополам' : 'Bisect Angle'}
          >
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ru' ? 'Деление угла пополам' : 'Bisect Angle'}</span>
          </button>

          {/* 10. Perpendicular to L */}
          <button
            onClick={() => {
              if (activeTool === 'perpendicular') {
                setActiveTool('move');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
              } else {
                setActiveTool('perpendicular');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setToolBufferPoints([]);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'perpendicular'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolPerpendicular}
          >
            <CornerDownLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>{language === 'ru' ? 'Перпендикуляр к L' : 'Perp. to L'}</span>
          </button>

          {/* 11. Parallel to L */}
          <button
            onClick={() => {
              if (activeTool === 'parallel') {
                setActiveTool('move');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
              } else {
                setActiveTool('parallel');
                setActiveSourceSegment(null);
                setHoveredSegment(null);
                setToolBufferPoints([]);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTool === 'parallel'
                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400/60'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={t.toolParallel}
          >
            <Equal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ru' ? 'Параллель к L' : 'Parallel to L'}</span>
          </button>

          {/* 12. Eraser */}
          <button
            onClick={() => {
              setActiveTool('move');
              setRulerMeasurement(null);
              onSelectPoint?.(null);
              setActiveSourceSegment(null);
              setHoveredSegment(null);
              setToolBufferPoints([]);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition text-slate-300 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-800 border border-transparent"
            title={language === 'ru' ? 'Ластик (очистить выбор/измерение)' : 'Eraser'}
          >
            <Eraser className="w-3.5 h-3.5 text-rose-400" />
            <span>{language === 'ru' ? 'Ластик' : 'Eraser'}</span>
          </button>
        </div>

        {/* Secondary Actions & Active Status Sub-bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Action & View Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 shadow-lg text-xs pointer-events-auto">
            <button
              onClick={() => {
                SOLGateway.getInstance().resetToCanon();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title={language === 'ru' ? 'Отменить последние построения' : 'Undo'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'ru' ? 'Отменить' : 'Undo'}</span>
            </button>
            <button
              onClick={() => {
                SOLGateway.getInstance().resetToCanon();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition"
              title={language === 'ru' ? 'Очистить чертёж и вернуть канон' : 'Clear canvas'}
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'ru' ? 'Очистить чертёж' : 'Clear canvas'}</span>
            </button>

            <div className="h-3 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={() => setShowDegreeScale(!showDegreeScale)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                showDegreeScale
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>{t.degreeScale}</span>
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                showGrid
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>{t.gridToggle}</span>
            </button>

            <div className="h-3 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Reset View (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Center: Ruler active measurement summary pill */}
          {rulerMeasurement && (() => {
            const liveP1 = resolveLiveRulerPoint(rulerMeasurement.p1);
            const liveP2 = resolveLiveRulerPoint(rulerMeasurement.p2);
            const dist = Math.hypot(liveP2.x - liveP1.x, liveP2.y - liveP1.y);
            return (
              <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-pink-500/60 rounded-lg px-3 py-1 shadow-lg text-xs pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                <span className="text-[11px] font-mono text-pink-300 font-semibold">
                  {liveP1.name && liveP2.name && liveP1.name !== liveP2.name
                    ? `${liveP1.name} → ${liveP2.name}: `
                    : ''}
                  <strong className="text-white font-bold">{dist.toFixed(1)} mm</strong> ({Math.round(dist)} px)
                </span>
                <button
                  onClick={() => setRulerMeasurement(null)}
                  className="text-pink-400 hover:text-pink-200 text-xs font-bold ml-1 transition"
                  title="Clear measurement"
                >
                  ✕
                </button>
              </div>
            );
          })()}

          {/* Right: Active Instruction Notice with Cancel button */}
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1 shadow-lg text-xs font-medium text-slate-300 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] text-slate-300">{getToolInstruction()}</span>
            {(activeSourceSegment || (activeTool === 'compass' && toolBufferPoints.length > 0)) && (
              <button
                onClick={() => {
                  setActiveSourceSegment(null);
                  setHoveredSegment(null);
                  setSnappedPoint(null);
                  setIsSnappedToCircle(false);
                  setToolBufferPoints([]);
                }}
                className="ml-2 text-rose-400 hover:text-rose-200 bg-rose-950/80 hover:bg-rose-900 px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-800 transition"
                title="Cancel (Esc)"
              >
                ✕ {t.cancel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas Viewport */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="flex-1 w-full h-full cursor-crosshair touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handleCanvasPointerDown}
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.6" />
          </pattern>
        </defs>

        {/* Coordinate Grid Background */}
        {showGrid && <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#grid)" />}

        {/* Coordinate Axes */}
        <line x1="-240" y1="0" x2="240" y2="0" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1="-240" x2="0" y2="240" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

        {/* Circumcircle C(O, R) */}
        {circle && ptO && (
          <g className="pointer-events-none">
            <circle
              cx={ptO.x}
              cy={ptO.y}
              r={circle.radius}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeOpacity="0.85"
            />
            {/* Center crosshair */}
            <circle cx={ptO.x} cy={ptO.y} r="3" fill="#818cf8" />
            <text x={ptO.x + 8} y={ptO.y - 8} fill="#94a3b8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
              O (0, 0)
            </text>
          </g>
        )}

        {/* Auxiliary Circles (Constructed via Compass) */}
        {Array.from(state.circles.values()).map(c => {
          if (c.id === 'circle_main') return null;
          const centerPt = state.points.get(c.centerId);
          if (!centerPt) return null;

          return (
            <g key={c.id} className="aux-compass-circle pointer-events-none">
              <circle
                cx={centerPt.x}
                cy={centerPt.y}
                r={c.radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6 3"
                strokeOpacity="0.75"
              />
              <circle cx={centerPt.x} cy={centerPt.y} r="2.5" fill="#f59e0b" />
              <text
                x={centerPt.x + 8}
                y={centerPt.y - c.radius + 14}
                fill="#fbbf24"
                fontSize="10"
                fontFamily="monospace"
              >
                {c.name}
              </text>
            </g>
          );
        })}

        {/* Radial Degree Scale (0°..360°) */}
        {renderDegreeScale()}

        {/* Quadrilateral Fill */}
        {ptA && ptB && ptC && ptD && (
          <polygon
            points={polygonPoints}
            fill="#3b82f6"
            fillOpacity="0.12"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}

        {/* 4 Boundary Sides (AB, BC, CD, DA) with interactive hit targets */}
        {['seg_AB', 'seg_BC', 'seg_CD', 'seg_DA'].map(sId => {
          const seg = state.segments.get(sId);
          if (!seg) return null;
          const p1 = state.points.get(seg.p1Id);
          const p2 = state.points.get(seg.p2Id);
          if (!p1 || !p2) return null;

          const isBuffered = activeSourceSegment === sId;
          const isHovered = hoveredSegment?.id === sId && !activeSourceSegment;
          return (
            <g
              key={sId}
              className="cursor-pointer"
              onPointerDown={e => handleSegmentClick(e, sId)}
            >
              {/* Invisible wide hit target for effortless clicking */}
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="18" />
              {/* Highlight halo when buffered or hovered */}
              {(isBuffered || isHovered) && (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#22d3ee"
                  strokeWidth={isBuffered ? 6 : 5}
                  strokeOpacity={isBuffered ? 0.7 : 0.45}
                />
              )}
              {/* Visible side */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isBuffered || isHovered ? '#22d3ee' : '#38bdf8'}
                strokeWidth={isBuffered || isHovered ? 3 : 2.5}
              />
            </g>
          );
        })}

        {/* Explicit Auxiliary Diagonals (AC, BD) */}
        {diagAC && ptA && ptC && (
          <g
            className="cursor-pointer"
            onPointerDown={e => handleSegmentClick(e, 'diag_AC')}
          >
            {/* Invisible wide hit target */}
            <line x1={ptA.x} y1={ptA.y} x2={ptC.x} y2={ptC.y} stroke="transparent" strokeWidth="18" />
            {(activeSourceSegment === 'diag_AC' || (hoveredSegment?.id === 'diag_AC' && !activeSourceSegment)) && (
              <line
                x1={ptA.x}
                y1={ptA.y}
                x2={ptC.x}
                y2={ptC.y}
                stroke="#22d3ee"
                strokeWidth={activeSourceSegment === 'diag_AC' ? 6 : 5}
                strokeOpacity={activeSourceSegment === 'diag_AC' ? 0.7 : 0.45}
              />
            )}
            <line
              x1={ptA.x}
              y1={ptA.y}
              x2={ptC.x}
              y2={ptC.y}
              stroke={activeSourceSegment === 'diag_AC' || (hoveredSegment?.id === 'diag_AC' && !activeSourceSegment) ? '#22d3ee' : '#f59e0b'}
              strokeWidth={2.5}
              strokeDasharray="6 4"
            />
            <text
              x={(ptA.x + ptC.x) / 2 + 6}
              y={(ptA.y + ptC.y) / 2 - 6}
              fill="#fbbf24"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              AC
            </text>
          </g>
        )}

        {diagBD && ptB && ptD && (
          <g
            className="cursor-pointer"
            onPointerDown={e => handleSegmentClick(e, 'diag_BD')}
          >
            {/* Invisible wide hit target */}
            <line x1={ptB.x} y1={ptB.y} x2={ptD.x} y2={ptD.y} stroke="transparent" strokeWidth="18" />
            {(activeSourceSegment === 'diag_BD' || (hoveredSegment?.id === 'diag_BD' && !activeSourceSegment)) && (
              <line
                x1={ptB.x}
                y1={ptB.y}
                x2={ptD.x}
                y2={ptD.y}
                stroke="#22d3ee"
                strokeWidth={activeSourceSegment === 'diag_BD' ? 6 : 5}
                strokeOpacity={activeSourceSegment === 'diag_BD' ? 0.7 : 0.45}
              />
            )}
            <line
              x1={ptB.x}
              y1={ptB.y}
              x2={ptD.x}
              y2={ptD.y}
              stroke={activeSourceSegment === 'diag_BD' || (hoveredSegment?.id === 'diag_BD' && !activeSourceSegment) ? '#22d3ee' : '#f59e0b'}
              strokeWidth={2.5}
              strokeDasharray="6 4"
            />
            <text
              x={(ptB.x + ptD.x) / 2 - 12}
              y={(ptB.y + ptD.y) / 2 + 14}
              fill="#fbbf24"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              BD
            </text>
          </g>
        )}

        {/* Hovered Line Crosshair & Marker */}
        {hoveredSegment && !activeSourceSegment && (
          <g className="hovered-line-crosshair pointer-events-none">
            <line
              x1={hoveredSegment.projX - 9}
              y1={hoveredSegment.projY}
              x2={hoveredSegment.projX + 9}
              y2={hoveredSegment.projY}
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
            <line
              x1={hoveredSegment.projX}
              y1={hoveredSegment.projY - 9}
              x2={hoveredSegment.projX}
              y2={hoveredSegment.projY + 9}
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
            <circle
              cx={hoveredSegment.projX}
              cy={hoveredSegment.projY}
              r="3.5"
              fill="#22d3ee"
              stroke="#083344"
              strokeWidth="1.5"
            />
            <g transform={`translate(${hoveredSegment.projX + 12}, ${hoveredSegment.projY - 14})`}>
              <rect
                x="-4"
                y="-10"
                width={Math.max(65, hoveredSegment.name.length * 8 + 14)}
                height="20"
                rx="4"
                fill="#083344"
                fillOpacity="0.9"
                stroke="#06b6d4"
                strokeWidth="1"
              />
              <text
                x="4"
                y="4"
                fill="#67e8f9"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {hoveredSegment.name}
              </text>
            </g>
          </g>
        )}

        {/* Dynamic Angle Bisector Live Preview */}
        {activeTool === 'angle' && hoveredAngle && (() => {
          const bisCoords = GeometryCore.angleBisector(hoveredAngle.vertex, hoveredAngle.ray1Pt, hoveredAngle.ray2Pt, 'INTERNAL');
          if (!bisCoords) return null;
          const renderCoords = clipInfiniteLineToViewport(bisCoords.p1, bisCoords.p2);

          const uX = hoveredAngle.ray1Pt.x - hoveredAngle.vertex.x;
          const uY = hoveredAngle.ray1Pt.y - hoveredAngle.vertex.y;
          const vX = hoveredAngle.ray2Pt.x - hoveredAngle.vertex.x;
          const vY = hoveredAngle.ray2Pt.y - hoveredAngle.vertex.y;
          const lenU = Math.hypot(uX, uY) || 1;
          const lenV = Math.hypot(vX, vY) || 1;
          const rayExtent = 50;

          return (
            <g className="angle-bisector-live-preview pointer-events-none">
              {/* Pulsing ring around hovered angle vertex */}
              <circle
                cx={hoveredAngle.vertex.x}
                cy={hoveredAngle.vertex.y}
                r="16"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.2"
                strokeDasharray="3 3"
                className="animate-pulse"
              />
              <circle
                cx={hoveredAngle.vertex.x}
                cy={hoveredAngle.vertex.y}
                r="4.5"
                fill="#34d399"
                stroke="#0f172a"
                strokeWidth="1.5"
              />

              {/* Angle guide rays along the two sides */}
              <line
                x1={hoveredAngle.vertex.x}
                y1={hoveredAngle.vertex.y}
                x2={hoveredAngle.vertex.x + (uX / lenU) * rayExtent}
                y2={hoveredAngle.vertex.y + (uY / lenU) * rayExtent}
                stroke="#34d399"
                strokeWidth="3"
                strokeOpacity="0.75"
              />
              <line
                x1={hoveredAngle.vertex.x}
                y1={hoveredAngle.vertex.y}
                x2={hoveredAngle.vertex.x + (vX / lenV) * rayExtent}
                y2={hoveredAngle.vertex.y + (vY / lenV) * rayExtent}
                stroke="#34d399"
                strokeWidth="3"
                strokeOpacity="0.75"
              />

              {/* Extended preview dashed bisector line */}
              <line
                x1={renderCoords.p1.x}
                y1={renderCoords.p1.y}
                x2={renderCoords.p2.x}
                y2={renderCoords.p2.y}
                stroke="#34d399"
                strokeWidth="2.2"
                strokeDasharray="6 4"
                strokeOpacity="0.95"
              />

              {/* Preview Badge Label */}
              <g transform={`translate(${hoveredAngle.vertex.x + 14}, ${hoveredAngle.vertex.y - 14})`}>
                <rect
                  x="-4"
                  y="-10"
                  width={Math.max(130, hoveredAngle.name.length * 8 + 65)}
                  height="20"
                  rx="4"
                  fill="#064e3b"
                  fillOpacity="0.95"
                  stroke="#34d399"
                  strokeWidth="1"
                />
                <text
                  x="4"
                  y="4"
                  fill="#a7f3d0"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {language === 'ru' ? `Биссектриса ${hoveredAngle.name}` : `Bisector ${hoveredAngle.name}`}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Dynamic Parallel / Perpendicular Live Preview */}
        {previewLineCoords && previewTargetPoint && activeSourceSegment && (
          <g className="parallel-live-preview pointer-events-none">
            {/* Extended preview dashed line */}
            <line
              x1={previewLineCoords.p1.x}
              y1={previewLineCoords.p1.y}
              x2={previewLineCoords.p2.x}
              y2={previewLineCoords.p2.y}
              stroke={activeTool === 'parallel' ? '#22d3ee' : '#c084fc'}
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeOpacity="0.9"
            />
            {/* Target snap / cursor point */}
            <circle
              cx={previewTargetPoint.x}
              cy={previewTargetPoint.y}
              r="5"
              fill={snappedPoint ? '#34d399' : activeTool === 'parallel' ? '#22d3ee' : '#c084fc'}
              stroke="#0f172a"
              strokeWidth="2"
            />
            <circle
              cx={previewTargetPoint.x}
              cy={previewTargetPoint.y}
              r="9"
              fill="none"
              stroke={snappedPoint ? '#34d399' : activeTool === 'parallel' ? '#22d3ee' : '#c084fc'}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.8"
            />
            {/* Preview Badge Label */}
            <g transform={`translate(${previewTargetPoint.x + 12}, ${previewTargetPoint.y + 16})`}>
              <rect
                x="-4"
                y="-10"
                width={language === 'ru' ? 140 : 120}
                height="20"
                rx="4"
                fill="#0f172a"
                fillOpacity="0.9"
                stroke={activeTool === 'parallel' ? '#22d3ee' : '#c084fc'}
                strokeWidth="1"
              />
              <text
                x="4"
                y="4"
                fill={activeTool === 'parallel' ? '#67e8f9' : '#e9d5ff'}
                fontSize="10"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {activeTool === 'parallel' ? '∥ ' : '⟂ '}
                {state.segments.get(activeSourceSegment)?.name || activeSourceSegment}
                {language === 'ru' ? ' (клик: построить)' : ' (click: build)'}
              </text>
            </g>
          </g>
        )}

        {/* Radial Pivot Marker P */}
        {(activeTool === 'line_circle' || activeTool === 'line' || activeTool === 'circle') && toolBufferPoints.length === 1 && (() => {
          const pivotPt = state.points.get(toolBufferPoints[0]);
          if (!pivotPt) return null;
          return (
            <g className="radial-pivot-marker pointer-events-none">
              <circle cx={pivotPt.x} cy={pivotPt.y} r="14" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="3 3" className="animate-pulse" />
              <circle cx={pivotPt.x} cy={pivotPt.y} r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          );
        })()}

        {/* Radial Line Preview */}
        {radialLinePreview && (
          <g className="radial-line-preview pointer-events-none">
            <line
              x1={radialLinePreview.p1.x}
              y1={radialLinePreview.p1.y}
              x2={radialLinePreview.p2.x}
              y2={radialLinePreview.p2.y}
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              strokeOpacity="0.95"
            />
            {mouseWorldCoords && (() => {
              const pivotPt = state.points.get(toolBufferPoints[0]);
              if (!pivotPt) return null;
              return (
                <g transform={`translate(${pivotPt.x + 20}, ${pivotPt.y - 20})`}>
                  <rect x="-4" y="-10" width="85" height="18" rx="3" fill="#3b0764" fillOpacity="0.95" stroke="#c084fc" strokeWidth="1.2" />
                  <text x="38" y="2" fill="#e9d5ff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    {language === 'ru' ? 'Угол:' : 'Angle:'} {radialAngleDeg}°
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Radial Circle Preview */}
        {radialCirclePreview && (
          <g className="radial-circle-preview pointer-events-none">
            <circle
              cx={radialCirclePreview.centerX}
              cy={radialCirclePreview.centerY}
              r={radialCirclePreview.radius}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              strokeOpacity="0.9"
            />
            {mouseWorldCoords && (
              <line
                x1={radialCirclePreview.centerX}
                y1={radialCirclePreview.centerY}
                x2={snappedPoint ? snappedPoint.x : mouseWorldCoords.x}
                y2={snappedPoint ? snappedPoint.y : mouseWorldCoords.y}
                stroke="#c084fc"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeOpacity="0.8"
              />
            )}
            {mouseWorldCoords && (() => {
              const pX = snappedPoint ? snappedPoint.x : mouseWorldCoords.x;
              const pY = snappedPoint ? snappedPoint.y : mouseWorldCoords.y;
              const textX = (radialCirclePreview.centerX + pX) / 2;
              const textY = (radialCirclePreview.centerY + pY) / 2 - 12;
              return (
                <g transform={`translate(${textX}, ${textY})`}>
                  <rect x="-55" y="-10" width="110" height="18" rx="3" fill="#3b0764" fillOpacity="0.95" stroke="#c084fc" strokeWidth="1.2" />
                  <text x="0" y="2" fill="#e9d5ff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    R = {radialCirclePreview.radius} мм
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Live Preview for Diagonal Tool (Hover A -> Preview A-C, Hover B -> Preview B-D) */}
        {activeTool === 'diagonal' && hoveredDiagonalPreview && (
          <g className="diagonal-live-preview pointer-events-none">
            {/* Dashed preview line */}
            <line
              x1={hoveredDiagonalPreview.p1.x}
              y1={hoveredDiagonalPreview.p1.y}
              x2={hoveredDiagonalPreview.p2.x}
              y2={hoveredDiagonalPreview.p2.y}
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="6 3"
              strokeOpacity="0.9"
            />
            {/* Highlight ring on hover vertex P1 */}
            <circle
              cx={hoveredDiagonalPreview.p1.x}
              cy={hoveredDiagonalPreview.p1.y}
              r="14"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
            {/* Target marker on opposite vertex P2 */}
            <circle
              cx={hoveredDiagonalPreview.p2.x}
              cy={hoveredDiagonalPreview.p2.y}
              r="14"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            {/* Floating label badge */}
            <g transform={`translate(${(hoveredDiagonalPreview.p1.x + hoveredDiagonalPreview.p2.x) / 2}, ${(hoveredDiagonalPreview.p1.y + hoveredDiagonalPreview.p2.y) / 2 - 14})`}>
              <rect x="-60" y="-10" width="120" height="20" rx="4" fill="#451a03" fillOpacity="0.95" stroke="#f59e0b" strokeWidth="1.2" />
              <text x="0" y="3" fill="#fef3c7" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                {language === 'ru' ? `Диагональ ${hoveredDiagonalPreview.p1.name}${hoveredDiagonalPreview.p2.name}` : `Diagonal ${hoveredDiagonalPreview.p1.name}${hoveredDiagonalPreview.p2.name}`}
              </text>
            </g>
          </g>
        )}

        {/* Live Segment Preview */}
        {segmentPreview && (
          <g className="segment-live-preview pointer-events-none">
            {/* Dashed preview line from P1 to cursor/snapped P2 */}
            <line
              x1={segmentPreview.p1.x}
              y1={segmentPreview.p1.y}
              x2={segmentPreview.p2.x}
              y2={segmentPreview.p2.y}
              stroke="#60a5fa"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              strokeOpacity="0.95"
            />
            {/* P1 highlight marker */}
            <circle cx={segmentPreview.p1.x} cy={segmentPreview.p1.y} r="12" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx={segmentPreview.p1.x} cy={segmentPreview.p1.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />

            {/* P2 cursor target dot */}
            <circle cx={segmentPreview.p2.x} cy={segmentPreview.p2.y} r="5" fill={snappedPoint ? '#34d399' : '#60a5fa'} stroke="#ffffff" strokeWidth="1.5" />

            {/* Floating length badge */}
            {(() => {
              const textX = (segmentPreview.p1.x + segmentPreview.p2.x) / 2;
              const textY = (segmentPreview.p1.y + segmentPreview.p2.y) / 2 - 12;
              const nameLabel = segmentPreview.p2.name ? `${segmentPreview.p1.name}${segmentPreview.p2.name}` : segmentPreview.p1.name;
              return (
                <g transform={`translate(${textX}, ${textY})`}>
                  <rect x="-55" y="-10" width="110" height="18" rx="3" fill="#1e3a8a" fillOpacity="0.95" stroke="#60a5fa" strokeWidth="1.2" />
                  <text x="0" y="2" fill="#bfdbfe" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    |{nameLabel}| = {segmentPreview.length} мм
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Compass Locked Center visual needle highlight */}
        {activeTool === 'compass' && toolBufferPoints.length === 1 && (() => {
          const centerPt = state.points.get(toolBufferPoints[0]);
          if (!centerPt) return null;
          return (
            <g className="compass-center-marker pointer-events-none">
              {/* Red Cross Marker for Center (Needle Pin) */}
              <line x1={centerPt.x - 10} y1={centerPt.y} x2={centerPt.x + 10} y2={centerPt.y} stroke="#ef4444" strokeWidth="2" />
              <line x1={centerPt.x} y1={centerPt.y - 10} x2={centerPt.x} y2={centerPt.y + 10} stroke="#ef4444" strokeWidth="2" />
              <circle cx={centerPt.x} cy={centerPt.y} r="5" fill="#1e1b4b" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          );
        })()}

        {/* Live Compass Preview */}
        {compassPreview && (
          <g className="compass-live-preview pointer-events-none">
            {/* Dashed Preview Circle */}
            <circle
              cx={compassPreview.centerX}
              cy={compassPreview.centerY}
              r={compassPreview.radius}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeOpacity="0.85"
            />
            {/* Compass Joint/Leg: drawing needle to cursor */}
            <line
              x1={compassPreview.centerX}
              y1={compassPreview.centerY}
              x2={mouseWorldCoords ? (snappedPoint ? snappedPoint.x : mouseWorldCoords.x) : compassPreview.centerX}
              y2={mouseWorldCoords ? (snappedPoint ? snappedPoint.y : mouseWorldCoords.y) : compassPreview.centerY}
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeOpacity="0.6"
            />
            {/* Pencil at the cursor position */}
            {mouseWorldCoords && (() => {
              const pX = snappedPoint ? snappedPoint.x : mouseWorldCoords.x;
              const pY = snappedPoint ? snappedPoint.y : mouseWorldCoords.y;
              return (
                <circle
                  cx={pX}
                  cy={pY}
                  r="6"
                  fill="#8b5cf6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              );
            })()}
            {/* Real-time Distance Tooltip directly above the compass leg center */}
            {mouseWorldCoords && (() => {
              const pX = snappedPoint ? snappedPoint.x : mouseWorldCoords.x;
              const pY = snappedPoint ? snappedPoint.y : mouseWorldCoords.y;
              const textX = (compassPreview.centerX + pX) / 2;
              const textY = (compassPreview.centerY + pY) / 2 - 12;
              return (
                <g transform={`translate(${textX}, ${textY})`}>
                  <rect
                    x="-55"
                    y="-10"
                    width="110"
                    height="18"
                    rx="3"
                    fill="#1e1b4b"
                    fillOpacity="0.95"
                    stroke="#8b5cf6"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="2"
                    fill="#a78bfa"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    R = {compassPreview.radius} мм
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Diagonal Intersection Point P */}
        {ptP && (
          <g
            className="cursor-pointer"
            onPointerDown={e => handlePointerDown(e, ptP.id)}
            onPointerEnter={() => setHoveredPointId(ptP.id)}
            onPointerLeave={() => setHoveredPointId(null)}
          >
            {/* Hit target buffer */}
            <circle cx={ptP.x} cy={ptP.y} r="16" fill="transparent" />
            {/* Pulsing ring if selected */}
            {(selectedPointId === ptP.id || toolBufferPoints.includes(ptP.id)) && (
              <circle cx={ptP.x} cy={ptP.y} r="12" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
            )}
            <circle cx={ptP.x} cy={ptP.y} r="6.5" fill="#10b981" stroke="#064e3b" strokeWidth="2.5" />
            <text x={ptP.x + 8} y={ptP.y + 14} fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
              P (AC ∩ BD)
            </text>
          </g>
        )}

        {/* Free Auxiliary Points (Constructed via Point tool) */}
        {Array.from(state.points.values()).map(p => {
          if (p.role !== 'auxiliary' || p.id.startsWith('pt_par_') || p.id.startsWith('pt_perp_')) return null;
          const isSelected = selectedPointId === p.id || toolBufferPoints.includes(p.id);
          const isDragging = draggingPointId === p.id;
          return (
            <g
              key={p.id}
              className="cursor-pointer"
              onPointerDown={e => handlePointerDown(e, p.id)}
              onPointerEnter={() => setHoveredPointId(p.id)}
              onPointerLeave={() => setHoveredPointId(null)}
            >
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
              {(isSelected || isDragging) && (
                <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3 3" />
              )}
              <circle cx={p.x} cy={p.y} r="4" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={p.x + (p.x >= 0 ? 8 : -18)}
                y={p.y + (p.y >= 0 ? 12 : -8)}
                fill="#ddd6fe"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                className="select-none pointer-events-none drop-shadow"
              >
                {p.name}
              </text>
            </g>
          );
        })}

        {/* Dynamic Construction Intersection Points (Line × Circle, Line × Line, Circle × Circle) */}
        {constructionIntersections.map(pt => (
          <g
            key={pt.id}
            className="construction-intersection pointer-events-none"
          >
            {/* Subtle dashed indicator ring */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="7"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.8"
            />
            {/* Small solid point dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#a855f7"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Small readable label */}
            <text
              x={pt.x + (pt.x >= 0 ? 8 : -18)}
              y={pt.y + (pt.y >= 0 ? 12 : -8)}
              fill="#e9d5ff"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
              className="drop-shadow select-none"
            >
              {pt.name}
            </text>
          </g>
        ))}

        {/* Auxiliary Segments (Parallel & Perpendicular lines) */}
        {Array.from(state.segments.values()).map(seg => {
          if (seg.segmentType !== 'parallel' && seg.segmentType !== 'perpendicular' && seg.segmentType !== 'auxiliary') {
            return null;
          }
          const p1 = state.points.get(seg.p1Id);
          const p2 = state.points.get(seg.p2Id);
          if (!p1 || !p2) return null;

          const isParallel = seg.segmentType === 'parallel';
          const isPerp = seg.segmentType === 'perpendicular';
          const isInfinite = seg.isInfiniteLine || isParallel || isPerp;
          const isBuffered = activeSourceSegment === seg.id;
          const isHovered = hoveredSegment?.id === seg.id && !activeSourceSegment;

          const isBisector = seg.name.includes('AngleBisector') || seg.name.includes('Bisector') || seg.name.startsWith('Bis_');
          const strokeColor = isParallel ? '#22d3ee' : isPerp ? '#c084fc' : isBisector ? '#34d399' : '#94a3b8';
          const renderCoords = isInfinite ? clipInfiniteLineToViewport(p1, p2) : { p1, p2 };

          return (
            <g
              key={seg.id}
              className="cursor-pointer"
              onPointerDown={e => handleSegmentClick(e, seg.id)}
            >
              {/* Invisible wide hit target across full visible extent */}
              <line x1={renderCoords.p1.x} y1={renderCoords.p1.y} x2={renderCoords.p2.x} y2={renderCoords.p2.y} stroke="transparent" strokeWidth="18" />
              {(isBuffered || isHovered) && (
                <line
                  x1={renderCoords.p1.x}
                  y1={renderCoords.p1.y}
                  x2={renderCoords.p2.x}
                  y2={renderCoords.p2.y}
                  stroke={isParallel ? '#22d3ee' : isPerp ? '#c084fc' : isBisector ? '#34d399' : '#38bdf8'}
                  strokeWidth={isBuffered ? 6 : 5}
                  strokeOpacity={isBuffered ? 0.7 : 0.45}
                />
              )}
              <line
                x1={renderCoords.p1.x}
                y1={renderCoords.p1.y}
                x2={renderCoords.p2.x}
                y2={renderCoords.p2.y}
                stroke={isBuffered || isHovered ? (isParallel ? '#22d3ee' : isPerp ? '#c084fc' : isBisector ? '#6ee7b7' : '#38bdf8') : strokeColor}
                strokeWidth={isParallel || isPerp ? 2 : isBisector ? 2 : 1.5}
                strokeDasharray={isInfinite ? '8 4' : undefined}
              />
              <text
                x={(renderCoords.p1.x + renderCoords.p2.x) / 2 + 6}
                y={(renderCoords.p1.y + renderCoords.p2.y) / 2 - 6}
                fill={strokeColor}
                fontSize="10"
                fontFamily="monospace"
                className="select-none pointer-events-none drop-shadow"
              >
                {isParallel ? `|| (${seg.name})` : isPerp ? `⟂ (${seg.name})` : isBisector ? `∠bis (${seg.name})` : seg.name}
              </text>
            </g>
          );
        })}

        {/* Interactive Ruler Measurement Dimension Layer */}
        {rulerMeasurement && (() => {
          const liveP1 = resolveLiveRulerPoint(rulerMeasurement.p1);
          const liveP2 = resolveLiveRulerPoint(rulerMeasurement.p2);
          const dist = Math.hypot(liveP2.x - liveP1.x, liveP2.y - liveP1.y);
          const dx = liveP2.x - liveP1.x;
          const dy = liveP2.y - liveP1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const capSize = 7;
          const midX = (liveP1.x + liveP2.x) / 2;
          const midY = (liveP1.y + liveP2.y) / 2;
          const hasNames = liveP1.name && liveP2.name && liveP1.name !== liveP2.name;
          const labelText = hasNames
            ? `|${liveP1.name}${liveP2.name}| = ${dist.toFixed(1)} mm`
            : `${dist.toFixed(1)} mm`;
          const badgeWidth = Math.max(90, labelText.length * 8 + 20);

          return (
            <g className="ruler-measurement-layer">
              {/* Origin Marker at P1 */}
              <circle cx={liveP1.x} cy={liveP1.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={liveP1.x} cy={liveP1.y} r="9" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />

              {/* Target Marker at P2 */}
              <circle cx={liveP2.x} cy={liveP2.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={liveP2.x} cy={liveP2.y} r="9" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />

              {/* End cap tick marks */}
              <line
                x1={liveP1.x - nx * capSize}
                y1={liveP1.y - ny * capSize}
                x2={liveP1.x + nx * capSize}
                y2={liveP1.y + ny * capSize}
                stroke="#f43f5e"
                strokeWidth="2.5"
              />
              <line
                x1={liveP2.x - nx * capSize}
                y1={liveP2.y - ny * capSize}
                x2={liveP2.x + nx * capSize}
                y2={liveP2.y + ny * capSize}
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* Main dimension line */}
              <line
                x1={liveP1.x}
                y1={liveP1.y}
                x2={liveP2.x}
                y2={liveP2.y}
                stroke="#f43f5e"
                strokeWidth="1.8"
                strokeDasharray={rulerMeasurement.isLocked ? undefined : '5 3'}
              />

              {/* Lightweight unobtrusive measurement tag floating offset along the normal */}
              <g
                transform={`translate(${midX + nx * 10}, ${midY + ny * 10})`}
                className="pointer-events-none select-none"
              >
                <text
                  x="0"
                  y="3"
                  fill="#fecdd3"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                  className="drop-shadow"
                >
                  {dist.toFixed(1)} mm
                </text>
              </g>
            </g>
          );
        })()}

        {/* Live Snap Halo Ring for Hovering over points with Ruler */}
        {activeTool === 'ruler' && rulerHoverSnap && (
          <g className="ruler-hover-snap pointer-events-none">
            <circle
              cx={rulerHoverSnap.x}
              cy={rulerHoverSnap.y}
              r="14"
              fill="none"
              stroke="#fb7185"
              strokeWidth="2"
              strokeDasharray="3 3"
              className="animate-pulse"
            />
            <circle cx={rulerHoverSnap.x} cy={rulerHoverSnap.y} r="3.5" fill="#fb7185" />
          </g>
        )}

        {/* Active Point Degree Ray (when hovering or dragging) */}
        {(draggingPointId || hoveredPointId) && ptO && (
          (() => {
            const activeId = draggingPointId || hoveredPointId;
            const pt = activeId ? state.points.get(activeId) : null;
            if (!pt || pt.role !== 'vertex') return null;
            const deg = GeometryCore.pointToDegree(pt, ptO);

            return (
              <g className="degree-ray pointer-events-none">
                <line
                  x1={ptO.x}
                  y1={ptO.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="#818cf8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle cx={pt.x} cy={pt.y} r="10" fill="none" stroke="#818cf8" strokeWidth="1" />
              </g>
            );
          })()
        )}

        {/* 4 Interactive Canonical Vertices A, B, C, D */}
        {[ptA, ptB, ptC, ptD].map(p => {
          if (!p) return null;
          const onCircle = isPointOnCircle(p);
          const isSelected = selectedPointId === p.id || toolBufferPoints.includes(p.id);
          const isDragging = draggingPointId === p.id;
          const deg = ptO ? GeometryCore.pointToDegree(p, ptO) : 0;

          // Vertex color coding:
          // Cyan if concyclic, Rose if dragged off circle!
          const fillColor = onCircle ? '#0284c7' : '#f43f5e';
          const strokeColor = onCircle ? '#38bdf8' : '#fda4af';

          return (
            <g
              key={p.id}
              className="cursor-grab active:cursor-grabbing transition-transform"
              onPointerDown={e => handlePointerDown(e, p.id)}
              onPointerEnter={() => setHoveredPointId(p.id)}
              onPointerLeave={() => setHoveredPointId(null)}
            >
              {/* Hit target buffer */}
              <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

              {/* Pulsing ring if selected or dragging */}
              {(isSelected || isDragging) && (
                <circle cx={p.x} cy={p.y} r="13" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
              )}

              {/* Visible Vertex Node */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isDragging ? 7.5 : 6}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
              />

              {/* Point Name Label */}
              <text
                x={p.x + (p.x >= 0 ? 10 : -20)}
                y={p.y + (p.y >= 0 ? 14 : -10)}
                fill="#f8fafc"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
                className="drop-shadow select-none pointer-events-none"
              >
                {p.name}
              </text>

              {/* Angular and coordinate callout */}
              <text
                x={p.x + (p.x >= 0 ? 10 : -35)}
                y={p.y + (p.y >= 0 ? 28 : 6)}
                fill={onCircle ? '#94a3b8' : '#fb7185'}
                fontSize="9"
                fontFamily="monospace"
                className="select-none pointer-events-none"
              >
                {onCircle ? `${deg.toFixed(0)}° (${p.x}, ${p.y})` : `OFF S¹ (VANISHED)`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Canvas Bottom Status Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            <span>{language === 'ru' ? 'Вершины A, B, C, D' : 'Vertices A, B, C, D'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span>Circle(O, R)</span>
          </span>
          {diagAC && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>AC</span>
            </span>
          )}
          {diagBD && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>BD</span>
            </span>
          )}
          {ptP && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>P (AC ∩ BD)</span>
            </span>
          )}
        </div>

        <div className="font-mono text-slate-500 text-[11px] flex items-center gap-3">
          <span>{t.stateVersionLabel} {state.stateVersion}</span>
          <span>•</span>
          <span>Event: {state.lastEventId}</span>
        </div>
      </div>
    </div>
  );
};
