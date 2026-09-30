/**
 * GeometryCanvas Component — Interactive SVG Geometry Stand Canvas
 * R2-05.2 — Canonical Geometry Stand Active Tools
 * 
 * Implements all 12 canonical tools:
 * 1. SELECT (Выделение) — drag vertices along S¹ or free, inspect entities
 * 2. POINT (Точка) — free, on circle, on segment, snapped
 * 3. SEGMENT (Отрезок) — click P1, rubberband, click P2
 * 4. RULER (Линейка) — caliper dimension line with mm measurement
 * 5. COMPASS (Циркуль) — physical school compass: fixed needle -> dynamic radius opening -> commit
 * 6. LINE_CIRCLE (Прямая / Окружность) — extended infinite line or center-radius circle
 * 7. PARALLEL (Параллель) — bidirectional line + point
 * 8. PERPENDICULAR (Перпендикуляр) — bidirectional line + point
 * 9. ANGLE_BISECTOR (Деление угла пополам) — 3 points angle bisector ray
 * 10. DIAGONAL (Диагональ) — non-adjacent quad vertices AC, BD (strictly explicit, no auto-diagonals)
 * 11. INTERSECTION (Пересечение) — L1 ∩ L2 -> point P
 * 12. ERASER (Ластик) — delete auxiliary entities, protected canonical elements
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GeometryPresentationData } from '../projection/presentationModel';
import { UIState, CanonicalToolId } from '../types/uiTypes';
import {
  AuxiliaryState,
  AuxiliaryPoint,
  AuxiliarySegment,
  AuxiliaryLine,
  AuxiliaryCircle,
  AuxiliaryMeasurement,
  SnapTarget,
  LineCircleSubMode
} from '../types/auxiliaryTypes';
import {
  euclideanDistance,
  findSnapTarget,
  getLineRenderEndpoints,
  computeExtendedLineEndpoints,
  computeParallelLine,
  computePerpendicularLine,
  computeAngleBisectorLine
} from '../state/auxiliaryEngine';
import {
  dispatchSemanticCommand,
  CommandExecutionContext,
  CommandExecutionResult
} from '../state/commandDispatcher';
import { SemanticCommand } from '../types/semanticCommands';
import { UniversalGeometryState } from '../../kernel/state/geometryState';
import { X, AlertCircle } from 'lucide-react';

interface GeometryCanvasProps {
  readonly presentation: GeometryPresentationData;
  readonly uiState: UIState;
  readonly auxiliaryState: AuxiliaryState;
  readonly onHoverVertex: (id: string | null) => void;
  readonly onZoomByWheel: (deltaY: number, clientX: number, clientY: number) => void;
  readonly onPan: (dx: number, dy: number) => void;
  readonly onDragVertexSchool: (vertexIndex: number, newAngleRad: number) => void;
  readonly onDragVertexResearch: (vertexIndex: number, x: number, y: number) => void;
  readonly onUpdateAuxiliaryState: (updater: (prev: AuxiliaryState) => AuxiliaryState) => void;
  readonly onSelectTool: (tool: CanonicalToolId) => void;
  readonly onSelectEntity: (id: string | null, type: string | null) => void;
  readonly geometryState?: UniversalGeometryState;
  readonly onUpdateGeometryState?: (state: UniversalGeometryState) => void;
}

export const GeometryCanvas: React.FC<GeometryCanvasProps> = ({
  presentation,
  uiState,
  auxiliaryState,
  onHoverVertex,
  onZoomByWheel,
  onPan,
  onDragVertexSchool,
  onDragVertexResearch,
  onUpdateAuxiliaryState,
  onSelectTool,
  onSelectEntity,
  geometryState,
  onUpdateGeometryState
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldGroupRef = useRef<SVGGElement>(null);

  // Viewport panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  // Dragging vertex state (Select tool)
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);

  // Current snapped cursor position in world coordinates
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);

  // Tool-specific multi-step state machine
  // toolStep: 0 = IDLE, 1 = FIRST_SELECTION / CENTER_SELECTED, 2 = SECOND_STEP
  const [toolStep, setToolStep] = useState<number>(0);
  const [stepP1, setStepP1] = useState<{ id?: string; x: number; y: number; label?: string } | null>(null);
  const [stepP2, setStepP2] = useState<{ id?: string; x: number; y: number; label?: string } | null>(null);
  const [refEntity, setRefEntity] = useState<{ id: string; type: 'segment' | 'point' | 'line'; label?: string } | null>(null);
  const [lineCircleMode, setLineCircleMode] = useState<LineCircleSubMode>('LINE');

  // Error / Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Normalize tool ID check (supports both CanonicalToolId and legacy lowercase)
  const isTool = (id: CanonicalToolId): boolean => {
    const active = uiState.activeTool as string;
    return active === id || active.toLowerCase() === id.toLowerCase();
  };

  // Reset tool steps whenever active tool changes
  useEffect(() => {
    setToolStep(0);
    setStepP1(null);
    setStepP2(null);
    setRefEntity(null);
    setDraggingVertexIndex(null);
  }, [uiState.activeTool]);

  // World coordinate converter from client pointer event
  const getPointerWorldCoord = useCallback((e: React.PointerEvent | PointerEvent): { x: number; y: number } => {
    if (!svgRef.current || !worldGroupRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = worldGroupRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const worldPt = pt.matrixTransform(ctm.inverse());
    return { x: worldPt.x, y: worldPt.y };
  }, []);

  const { center, radius, vertices, chords, dialTicks } = presentation;
  const zoom = uiState.viewport.zoom;
  const panX = uiState.viewport.panX;
  const panY = uiState.viewport.panY;
  const rotation = uiState.viewport.viewRotationDeg;

  // Snapping helper: checks candidate points, circumcircle, and segments
  const resolveSnap = useCallback((worldX: number, worldY: number): { pt: { x: number; y: number }; snap: SnapTarget | null } => {
    const snap = findSnapTarget(
      worldX,
      worldY,
      vertices,
      { center, radius },
      auxiliaryState.points,
      chords,
      auxiliaryState.segments,
      14 / zoom
    );
    if (snap) {
      return { pt: { x: snap.x, y: snap.y }, snap };
    }
    return { pt: { x: worldX, y: worldY }, snap: null };
  }, [vertices, center, radius, auxiliaryState.points, chords, auxiliaryState.segments, zoom]);

  // Reset current tool step
  const handleCancelTool = useCallback(() => {
    setToolStep(0);
    setStepP1(null);
    setStepP2(null);
    setRefEntity(null);
    setDraggingVertexIndex(null);
    onSelectEntity(null, null);
  }, [onSelectEntity]);

  // Global Escape handler for tool steps
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelTool();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCancelTool]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    onZoomByWheel(e.deltaY, e.clientX, e.clientY);
  }, [onZoomByWheel]);

  // Headless Command Dispatcher Bridge for UI actions
  const executeCommand = useCallback(
    (cmd: SemanticCommand): CommandExecutionResult => {
      const ctx: CommandExecutionContext = {
        canonicalVertices: vertices,
        circumcircle: { center, radius },
        baseChords: chords,
        auxiliaryState,
        bounds: 240,
        geometryState
      };
      const result = dispatchSemanticCommand(cmd, ctx);
      if (result.success) {
        if (result.updatedGeometryState && onUpdateGeometryState) {
          onUpdateGeometryState(result.updatedGeometryState);
        }
        onUpdateAuxiliaryState(() => result.updatedAuxiliaryState);
        if (result.createdEntityIds.length > 0) {
          onSelectEntity(result.createdEntityIds[0], 'entity');
        }
      } else if (result.message) {
        showToast(result.message);
      }
      return result;
    },
    [vertices, center, radius, chords, auxiliaryState, geometryState, onUpdateGeometryState, onUpdateAuxiliaryState, onSelectEntity, showToast]
  );

  // POINTER DOWN
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 1. Check if middle mouse or panning background
    if (e.button === 1 || e.buttons === 4 || (e.shiftKey && e.button === 0)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { pt: clickPt, snap } = resolveSnap(cursorWorld.x, cursorWorld.y);

    // ==========================================
    // 1. SELECT TOOL (Выделение)
    // ==========================================
    if (isTool('SELECT')) {
      if (snap?.entityType === 'vertex' && snap.entityId) {
        const vIdx = vertices.findIndex((v) => v.id === snap.entityId);
        if (vIdx !== -1) {
          setDraggingVertexIndex(vIdx);
          executeCommand({ type: 'SELECT', targetId: snap.entityId, targetType: 'vertex' });
          onSelectEntity(snap.entityId, 'vertex');
          return;
        }
      }
      if (snap?.entityId) {
        executeCommand({ type: 'SELECT', targetId: snap.entityId, targetType: snap.entityType });
        onSelectEntity(snap.entityId, snap.entityType);
        return;
      }
      // Clicked on empty canvas
      if ((e.target as SVGElement).id === 'canvas-background') {
        executeCommand({ type: 'SELECT', targetId: null });
        onSelectEntity(null, null);
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    // ==========================================
    // 2. POINT TOOL (Точка)
    // ==========================================
    if (isTool('POINT')) {
      let ptType: 'free' | 'on_circle' | 'on_segment' = 'free';
      if (snap?.entityType === 'circle') {
        ptType = 'on_circle';
      } else if (snap?.entityType === 'segment') {
        ptType = 'on_segment';
      }

      executeCommand({
        type: 'CONSTRUCT_POINT',
        x: clickPt.x,
        y: clickPt.y,
        pointType: ptType,
        parentId: snap?.entityId
      });
      return;
    }

    // ==========================================
    // 3. SEGMENT TOOL (Отрезок)
    // ==========================================
    if (isTool('SEGMENT')) {
      if (toolStep === 0) {
        let p1Id = snap?.entityId;
        if (!p1Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: snap?.entityType === 'circle' ? 'on_circle' : 'free'
          });
          p1Id = ptRes.createdEntityIds[0];
        }
        setStepP1({ id: p1Id, x: clickPt.x, y: clickPt.y, label: snap?.label || p1Id });
        setToolStep(1);
      } else if (toolStep === 1 && stepP1) {
        let p2Id = snap?.entityId;
        if (!p2Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: snap?.entityType === 'circle' ? 'on_circle' : 'free'
          });
          p2Id = ptRes.createdEntityIds[0];
        }

        const res = executeCommand({
          type: 'CONSTRUCT_SEGMENT',
          p1Id: stepP1.id!,
          p2Id
        });
        if (res.success) {
          handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 4. RULER TOOL (Линейка)
    // ==========================================
    if (isTool('RULER')) {
      if (toolStep === 0) {
        let p1Id = snap?.entityId;
        if (!p1Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          p1Id = ptRes.createdEntityIds[0];
        }
        setStepP1({ id: p1Id, x: clickPt.x, y: clickPt.y, label: snap?.label || p1Id });
        setToolStep(1);
      } else if (toolStep === 1 && stepP1) {
        let p2Id = snap?.entityId;
        if (!p2Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          p2Id = ptRes.createdEntityIds[0];
        }
        const res = executeCommand({
          type: 'MEASURE_DISTANCE',
          p1Id: stepP1.id!,
          p2Id
        });
        if (res.success) {
          handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 5. COMPASS TOOL (Циркуль)
    // ==========================================
    if (isTool('COMPASS')) {
      if (toolStep === 0) {
        let centerId = snap?.entityId;
        if (!centerId) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: snap?.entityType === 'circle' ? 'on_circle' : 'free'
          });
          centerId = ptRes.createdEntityIds[0];
        }
        setStepP1({ id: centerId, x: clickPt.x, y: clickPt.y, label: snap?.label || centerId });
        setToolStep(1);
      } else if (toolStep === 1 && stepP1) {
        let radiusPtId = snap?.entityId;
        if (!radiusPtId) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: snap?.entityType === 'circle' ? 'on_circle' : 'free'
          });
          radiusPtId = ptRes.createdEntityIds[0];
        }
        const radius = euclideanDistance(stepP1.x, stepP1.y, clickPt.x, clickPt.y);
        const res = executeCommand({
          type: 'CONSTRUCT_COMPASS',
          centerId: stepP1.id!,
          radius,
          radiusPointId: radiusPtId
        });
        if (res.success) {
          handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 6. LINE / CIRCLE TOOL (Прямая / Окружность)
    // ==========================================
    if (isTool('LINE_CIRCLE')) {
      if (toolStep === 0) {
        let p1Id = snap?.entityId;
        if (!p1Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          p1Id = ptRes.createdEntityIds[0];
        }
        setStepP1({ id: p1Id, x: clickPt.x, y: clickPt.y, label: snap?.label || p1Id });
        setToolStep(1);
      } else if (toolStep === 1 && stepP1) {
        let p2Id = snap?.entityId;
        if (!p2Id) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          p2Id = ptRes.createdEntityIds[0];
        }

        if (lineCircleMode === 'LINE') {
          const res = executeCommand({
            type: 'CONSTRUCT_LINE',
            p1Id: stepP1.id!,
            p2Id
          });
          if (res.success) handleCancelTool();
        } else {
          const r = euclideanDistance(stepP1.x, stepP1.y, clickPt.x, clickPt.y);
          const res = executeCommand({
            type: 'CONSTRUCT_CIRCLE',
            centerId: stepP1.id!,
            radius: r,
            radiusPointId: p2Id
          });
          if (res.success) handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 7. PARALLEL TOOL (Параллель) — Bidirectional
    // ==========================================
    if (isTool('PARALLEL')) {
      if (toolStep === 0) {
        if (snap?.entityType === 'segment') {
          setRefEntity({ id: snap.entityId!, type: 'segment', label: snap.label });
          setToolStep(1);
        } else if (snap?.entityType === 'vertex' || snap?.entityType === 'point' || snap?.entityType === 'center') {
          setStepP1({ id: snap.entityId, x: clickPt.x, y: clickPt.y, label: snap.label });
          setToolStep(1);
        } else {
          showToast('Кликните опорный отрезок или точку');
        }
      } else if (toolStep === 1) {
        let segId = refEntity?.id;
        let ptId = stepP1?.id;

        if (refEntity && (snap?.entityType === 'vertex' || snap?.entityType === 'point' || snap?.entityType === 'center')) {
          ptId = snap.entityId;
        } else if (stepP1 && snap?.entityType === 'segment') {
          segId = snap.entityId;
        } else if (refEntity && !snap) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          ptId = ptRes.createdEntityIds[0];
        }

        if (segId && ptId) {
          const res = executeCommand({
            type: 'CONSTRUCT_PARALLEL',
            referenceSegmentId: segId,
            throughPointId: ptId
          });
          if (res.success) handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 8. PERPENDICULAR TOOL (Перпендикуляр) — Bidirectional
    // ==========================================
    if (isTool('PERPENDICULAR')) {
      if (toolStep === 0) {
        if (snap?.entityType === 'segment') {
          setRefEntity({ id: snap.entityId!, type: 'segment', label: snap.label });
          setToolStep(1);
        } else if (snap?.entityType === 'vertex' || snap?.entityType === 'point' || snap?.entityType === 'center') {
          setStepP1({ id: snap.entityId, x: clickPt.x, y: clickPt.y, label: snap.label });
          setToolStep(1);
        } else {
          showToast('Кликните опорный отрезок или точку');
        }
      } else if (toolStep === 1) {
        let segId = refEntity?.id;
        let ptId = stepP1?.id;

        if (refEntity && (snap?.entityType === 'vertex' || snap?.entityType === 'point' || snap?.entityType === 'center')) {
          ptId = snap.entityId;
        } else if (stepP1 && snap?.entityType === 'segment') {
          segId = snap.entityId;
        } else if (refEntity && !snap) {
          const ptRes = executeCommand({
            type: 'CONSTRUCT_POINT',
            x: clickPt.x,
            y: clickPt.y,
            pointType: 'free'
          });
          ptId = ptRes.createdEntityIds[0];
        }

        if (segId && ptId) {
          const res = executeCommand({
            type: 'CONSTRUCT_PERPENDICULAR',
            referenceSegmentId: segId,
            throughPointId: ptId
          });
          if (res.success) handleCancelTool();
        }
      }
      return;
    }

    // ==========================================
    // 9. ANGLE BISECTOR TOOL (Деление угла пополам)
    // ==========================================
    if (isTool('ANGLE_BISECTOR')) {
      if (toolStep === 0) {
        let p1Id = snap?.entityId;
        if (!p1Id) {
          const ptRes = executeCommand({ type: 'CONSTRUCT_POINT', x: clickPt.x, y: clickPt.y, pointType: 'free' });
          p1Id = ptRes.createdEntityIds[0];
        }
        setStepP1({ id: p1Id, x: clickPt.x, y: clickPt.y, label: snap?.label || p1Id });
        setToolStep(1);
      } else if (toolStep === 1 && stepP1) {
        let p2Id = snap?.entityId;
        if (!p2Id) {
          const ptRes = executeCommand({ type: 'CONSTRUCT_POINT', x: clickPt.x, y: clickPt.y, pointType: 'free' });
          p2Id = ptRes.createdEntityIds[0];
        }
        setStepP2({ id: p2Id, x: clickPt.x, y: clickPt.y, label: snap?.label || p2Id });
        setToolStep(2);
      } else if (toolStep === 2 && stepP1 && stepP2) {
        let p3Id = snap?.entityId;
        if (!p3Id) {
          const ptRes = executeCommand({ type: 'CONSTRUCT_POINT', x: clickPt.x, y: clickPt.y, pointType: 'free' });
          p3Id = ptRes.createdEntityIds[0];
        }
        const res = executeCommand({
          type: 'CONSTRUCT_ANGLE_BISECTOR',
          arm1PointId: stepP1.id!,
          vertexPointId: stepP2.id!,
          arm2PointId: p3Id
        });
        if (res.success) handleCancelTool();
      }
      return;
    }

    // ==========================================
    // 10. DIAGONAL TOOL (Диагональ) — Strictly Explicit
    // ==========================================
    if (isTool('DIAGONAL')) {
      if (toolStep === 0) {
        if (snap?.entityType === 'vertex' && snap.entityId) {
          setStepP1({ id: snap.entityId, x: clickPt.x, y: clickPt.y, label: snap.entityId });
          setToolStep(1);
        } else {
          showToast('Для диагонали кликните первую вершину четырёхугольника (A, B, C или D)');
        }
      } else if (toolStep === 1 && stepP1) {
        if (snap?.entityType === 'vertex' && snap.entityId) {
          const res = executeCommand({
            type: 'CONSTRUCT_DIAGONAL',
            vertex1Id: stepP1.id!,
            vertex2Id: snap.entityId
          });
          if (res.success) handleCancelTool();
        } else {
          showToast('Кликните вторую вершину (A, B, C или D)');
        }
      }
      return;
    }

    // ==========================================
    // 11. INTERSECTION TOOL (Пересечение)
    // ==========================================
    if (isTool('INTERSECTION')) {
      if (toolStep === 0) {
        if (snap?.entityType === 'segment') {
          setRefEntity({ id: snap.entityId!, type: 'segment', label: snap.label });
          setToolStep(1);
        } else {
          showToast('Кликните первый отрезок или прямую для пересечения');
        }
      } else if (toolStep === 1 && refEntity) {
        if (snap?.entityType === 'segment') {
          const res = executeCommand({
            type: 'CONSTRUCT_INTERSECTION',
            entity1Id: refEntity.id,
            entity2Id: snap.entityId!
          });
          if (res.success) handleCancelTool();
        } else {
          showToast('Кликните второй отрезок для пересечения');
        }
      }
      return;
    }

    // ==========================================
    // 12. ERASER TOOL (Ластик)
    // ==========================================
    if (isTool('ERASER')) {
      if (snap?.entityId) {
        executeCommand({
          type: 'ERASE_ENTITY',
          entityId: snap.entityId
        });
      }
    }
  }, [
    cursorWorld,
    resolveSnap,
    uiState.activeTool,
    vertices,
    onSelectEntity,
    toolStep,
    stepP1,
    stepP2,
    refEntity,
    lineCircleMode,
    executeCommand,
    showToast,
    handleCancelTool
  ]);

  // POINTER MOVE
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      onPan(dx, dy);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const worldPt = getPointerWorldCoord(e);
    const { pt: snappedPt, snap } = resolveSnap(worldPt.x, worldPt.y);
    setCursorWorld(snappedPt);
    setSnapTarget(snap);

    // Vertex dragging in Select mode
    if (draggingVertexIndex !== null) {
      if (uiState.standMode === 'SCHOOL') {
        const angleRad = Math.atan2(worldPt.y - center.y, worldPt.x - center.x);
        let normRad = ((angleRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

        const N = vertices.length;
        const prevIdx = (draggingVertexIndex - 1 + N) % N;
        const nextIdx = (draggingVertexIndex + 1) % N;
        const prevAngle = vertices[prevIdx].normalizedAngleRad;
        const nextAngle = vertices[nextIdx].normalizedAngleRad;

        const MIN_GAP = 0.06;

        if (prevAngle < nextAngle) {
          normRad = Math.max(prevAngle + MIN_GAP, Math.min(nextAngle - MIN_GAP, normRad));
        } else {
          if (normRad > prevAngle || normRad < nextAngle) {
            // Valid region
          } else {
            normRad = normRad > (prevAngle + nextAngle) / 2 ? prevAngle + MIN_GAP : nextAngle - MIN_GAP;
          }
        }

        onDragVertexSchool(draggingVertexIndex, normRad);
      } else {
        onDragVertexResearch(draggingVertexIndex, worldPt.x, worldPt.y);
      }
    }
  }, [
    isPanning,
    panStart,
    onPan,
    getPointerWorldCoord,
    resolveSnap,
    draggingVertexIndex,
    uiState.standMode,
    center,
    vertices,
    onDragVertexSchool,
    onDragVertexResearch
  ]);

  // POINTER UP / CANCEL
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
    setDraggingVertexIndex(null);
  }, []);

  // Floating guidance text generator with canonical labels
  const getToolGuidance = (): { title: string; subtitle: string } => {
    const active = uiState.activeTool as string;
    const toolUpper = active.toUpperCase();

    switch (toolUpper) {
      case 'SELECT':
        return {
          title: 'Инструмент «Выделение»',
          subtitle: uiState.standMode === 'SCHOOL'
            ? 'Перетаскивайте вершины A, B, C, D по окружности S¹ или кликните объект для инспекции'
            : 'Исследовательский режим: свободное перемещение вершин на плоскости ℝ²'
        };
      case 'POINT':
        return {
          title: 'Инструмент «Точка»',
          subtitle: snapTarget
            ? `Привязка к: ${snapTarget.label}`
            : 'Кликните на полотне для создания точки'
        };
      case 'SEGMENT':
        return {
          title: 'Инструмент «Отрезок»',
          subtitle: toolStep === 0
            ? 'Шаг 1 из 2: Кликните первую точку'
            : `Шаг 2 из 2: Кликните вторую точку (длина: ${euclideanDistance(stepP1!.x, stepP1!.y, cursorWorld.x, cursorWorld.y).toFixed(1)} мм)`
        };
      case 'RULER':
        return {
          title: 'Инструмент «Линейка»',
          subtitle: toolStep === 0
            ? 'Шаг 1: Выберите начальную точку для измерения'
            : `Шаг 2: Выберите конечную точку (расстояние: ${euclideanDistance(stepP1!.x, stepP1!.y, cursorWorld.x, cursorWorld.y).toFixed(1)} мм)`
        };
      case 'COMPASS':
        if (toolStep === 0) {
          return {
            title: 'Инструмент «Циркуль»',
            subtitle: 'Шаг 1 из 2: Зафиксируйте иглу (центр окружности)'
          };
        } else {
          const liveR = stepP1 ? euclideanDistance(stepP1.x, stepP1.y, cursorWorld.x, cursorWorld.y) : 0;
          return {
            title: 'Инструмент «Циркуль»',
            subtitle: `Шаг 2 из 2: Двигайте курсор для изменения раствора (R = ${liveR.toFixed(1)} мм). Кликните для построения`
          };
        }
      case 'LINE_CIRCLE':
        return {
          title: lineCircleMode === 'LINE' ? 'Инструмент «Прямая»' : 'Инструмент «Окружность»',
          subtitle: toolStep === 0
            ? (lineCircleMode === 'LINE' ? 'Кликните первую точку прямой' : 'Кликните центр окружности')
            : (lineCircleMode === 'LINE' ? 'Кликните вторую точку прямой' : `Кликните точку радиуса (R = ${euclideanDistance(stepP1!.x, stepP1!.y, cursorWorld.x, cursorWorld.y).toFixed(1)} мм)`)
        };
      case 'PARALLEL':
        return {
          title: 'Инструмент «Параллель»',
          subtitle: toolStep === 0
            ? 'Кликните опорный отрезок или точку'
            : `Кликните целевую ${refEntity ? 'точку' : 'прямую'}`
        };
      case 'PERPENDICULAR':
        return {
          title: 'Инструмент «Перпендикуляр»',
          subtitle: toolStep === 0
            ? 'Кликните опорный отрезок или точку'
            : `Кликните целевую ${refEntity ? 'точку' : 'прямую'}`
        };
      case 'ANGLE_BISECTOR':
        return {
          title: 'Инструмент «Деление угла пополам»',
          subtitle: toolStep === 0
            ? 'Шаг 1 из 3: Кликните точку первого луча угла'
            : toolStep === 1
            ? 'Шаг 2 из 3: Кликните ВЕРШИНУ угла'
            : 'Шаг 3 из 3: Кликните точку второго луча угла'
        };
      case 'DIAGONAL':
        return {
          title: 'Инструмент «Диагональ»',
          subtitle: toolStep === 0
            ? 'Кликните первую вершину четырёхугольника'
            : `Кликните противоположную вершину (для ${stepP1!.id} это ${stepP1!.id === 'A' ? 'C' : stepP1!.id === 'B' ? 'D' : stepP1!.id === 'C' ? 'A' : 'B'})`
        };
      case 'INTERSECTION':
        return {
          title: 'Инструмент «Пересечение»',
          subtitle: toolStep === 0
            ? 'Шаг 1 из 2: Кликните первый отрезок или прямую'
            : `Шаг 2 из 2: Кликните второй отрезок для пересечения с ${refEntity?.label}`
        };
      case 'ERASER':
        return {
          title: 'Инструмент «Ластик»',
          subtitle: 'Кликните любой вспомогательный объект для его удаления'
        };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const guidance = getToolGuidance();

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none touch-none ${
        isTool('SELECT') ? 'cursor-default' : 'cursor-crosshair'
      }`}
    >
      {/* 1. Top Floating Tool Guidance Banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-full shadow-2xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-400">{guidance.title}</span>
            {snapTarget && (
              <span className="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-600/50 text-[10px] text-purple-200 font-mono">
                {snapTarget.label}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-300 max-w-sm sm:max-w-md truncate">
            {guidance.subtitle}
          </span>
        </div>

        {/* Submode toggle for Line/Circle */}
        {isTool('LINE_CIRCLE') && (
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => { setLineCircleMode('LINE'); handleCancelTool(); }}
              className={`px-2 py-0.5 rounded ${lineCircleMode === 'LINE' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Прямая
            </button>
            <button
              onClick={() => { setLineCircleMode('CIRCLE'); handleCancelTool(); }}
              className={`px-2 py-0.5 rounded ${lineCircleMode === 'CIRCLE' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Окружность
            </button>
          </div>
        )}

        {/* Cancel tool button */}
        {(toolStep > 0 || !isTool('SELECT')) && (
          <button
            onClick={handleCancelTool}
            title="Отмена текущей операции (Escape)"
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Esc</span>
          </button>
        )}
      </div>

      {/* 2. Toast / Rejection Notification */}
      {toastMessage && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-amber-950/90 border border-amber-600/60 text-amber-200 text-xs rounded-lg shadow-2xl backdrop-blur-sm animate-bounce">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. SVG Canvas */}
      <svg
        ref={svgRef}
        id="geometry-svg-root"
        className="w-full h-full touch-none"
        viewBox="-250 -250 500 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          <filter id="vertex-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <marker id="arrow-start" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
            <path d="M 6 0 L 0 3 L 6 6 Z" fill="#38bdf8" />
          </marker>
          <marker id="arrow-end" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Background Click Target & Grid */}
        <rect
          id="canvas-background"
          x="-1000"
          y="-1000"
          width="2000"
          height="2000"
          fill="url(#grid-pattern)"
        />

        {/* World Transform Group (Zoom, Pan, Rotation) */}
        <g
          ref={worldGroupRef}
          id="world-group"
          transform={`translate(${panX}, ${panY}) scale(${zoom}) rotate(${rotation}, ${center.x}, ${center.y})`}
        >
          {/* 1. Coordinate Axes at Center */}
          <line x1="-220" y1={center.y} x2="220" y2={center.y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={center.x} y1="-220" x2={center.x} y2="220" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

          {/* 2. Circumcircle S¹ */}
          <circle
            cx={center.x}
            cy={center.y}
            r={radius}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            className="transition-all"
          />

          {/* 3. Outer Degree Dial Scale Ticks & Labels */}
          {uiState.showScale && (
            <g id="dial-ticks-group">
              {dialTicks.map((tick) => (
                <g key={`tick-${tick.angleDeg}`}>
                  <line
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={tick.isMajor ? '#e2e8f0' : '#475569'}
                    strokeWidth={tick.isMajor ? 1.5 : 1}
                  />
                  {tick.label && tick.labelX !== undefined && tick.labelY !== undefined && (
                    <text
                      x={tick.labelX}
                      y={tick.labelY}
                      fill="#ef4444"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-semibold select-none"
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* 4. Radii Lines OA, OB, OC, OD */}
          {uiState.showRadii && (
            <g id="radii-group">
              {vertices.map((v) => (
                <line
                  key={`radius-${v.id}`}
                  x1={center.x}
                  y1={center.y}
                  x2={v.cartesian.x}
                  y2={v.cartesian.y}
                  stroke="#a855f7"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
              ))}
            </g>
          )}

          {/* 5. Quadrilateral Boundary Chords AB, BC, CD, DA */}
          <g id="chords-group">
            {chords.map((chord) => {
              const isSelected = auxiliaryState.selectedEntityId === chord.id;
              const isRef = refEntity?.id === chord.id;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === chord.id;

              return (
                <g key={`chord-group-${chord.id}`}>
                  {(isSelected || isRef) && (
                    <line
                      x1={chord.p1.x}
                      y1={chord.p1.y}
                      x2={chord.p2.x}
                      y2={chord.p2.y}
                      stroke="#38bdf8"
                      strokeWidth="8"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                    />
                  )}
                  <line
                    x1={chord.p1.x}
                    y1={chord.p1.y}
                    x2={chord.p2.x}
                    y2={chord.p2.y}
                    stroke={isHoverEraser ? '#ef4444' : isRef ? '#38bdf8' : '#334155'}
                    strokeWidth="2.5"
                    className="hover:stroke-purple-400 transition-colors cursor-pointer"
                  />
                </g>
              );
            })}
          </g>

          {/* 6. Colored Arcs on Circumcircle */}
          <g id="arcs-group">
            {chords.map((chord, i) => {
              const vStart = vertices[i];
              const vEnd = vertices[(i + 1) % vertices.length];
              const r = radius + 3;
              const sx = center.x + r * Math.cos(vStart.normalizedAngleRad);
              const sy = center.y + r * Math.sin(vStart.normalizedAngleRad);
              const ex = center.x + r * Math.cos(vEnd.normalizedAngleRad);
              const ey = center.y + r * Math.sin(vEnd.normalizedAngleRad);

              const largeArcFlag = chord.angularGapRad > Math.PI ? 1 : 0;
              const d = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArcFlag} 1 ${ex} ${ey}`;

              return (
                <path
                  key={`arc-${chord.id}`}
                  d={d}
                  fill="none"
                  stroke={chord.strokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              );
            })}
          </g>

          {/* 7. Auxiliary Lines (Extended across canvas) */}
          <g id="auxiliary-lines-group">
            {auxiliaryState.lines.map((line) => {
              const isSelected = auxiliaryState.selectedEntityId === line.id;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === line.id;
              const endpoints = getLineRenderEndpoints(line, 240);

              return (
                <g key={`aux-line-${line.id}`}>
                  {isSelected && (
                    <line
                      x1={endpoints.x1}
                      y1={endpoints.y1}
                      x2={endpoints.x2}
                      y2={endpoints.y2}
                      stroke="#38bdf8"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                    />
                  )}
                  <line
                    x1={endpoints.x1}
                    y1={endpoints.y1}
                    x2={endpoints.x2}
                    y2={endpoints.y2}
                    stroke={isHoverEraser ? '#ef4444' : line.color || '#38bdf8'}
                    strokeWidth="1.8"
                    strokeDasharray={line.type === 'parallel' ? '6 4' : line.type === 'perpendicular' ? '4 2' : 'none'}
                    className="hover:stroke-purple-300 transition-colors"
                  />
                  <text
                    x={(endpoints.x1 + endpoints.x2) / 2}
                    y={(endpoints.y1 + endpoints.y2) / 2 - 6}
                    fill={line.color || '#38bdf8'}
                    fontSize="10"
                    fontFamily="sans-serif"
                    className="select-none"
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 8. Auxiliary Circles (Compass & Center-Radius) */}
          <g id="auxiliary-circles-group">
            {auxiliaryState.circles.map((circ) => {
              const centerPt = auxiliaryState.points.find((p) => p.id === circ.centerPointId) ||
                vertices.find((v) => v.id === circ.centerPointId)?.cartesian ||
                (circ.centerPointId === 'O' ? center : null);

              if (!centerPt) return null;
              const isSelected = auxiliaryState.selectedEntityId === circ.id;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === circ.id;

              return (
                <g key={`aux-circ-${circ.id}`}>
                  {isSelected && (
                    <circle
                      cx={centerPt.x}
                      cy={centerPt.y}
                      r={circ.radius}
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="5"
                      strokeOpacity="0.3"
                    />
                  )}
                  <circle
                    cx={centerPt.x}
                    cy={centerPt.y}
                    r={circ.radius}
                    fill="none"
                    stroke={isHoverEraser ? '#ef4444' : circ.color || '#ec4899'}
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                    className="hover:stroke-pink-300 transition-colors"
                  />
                  <text
                    x={centerPt.x + circ.radius * 0.707 + 6}
                    y={centerPt.y - circ.radius * 0.707}
                    fill="#ec4899"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    R = {circ.radius.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 9. Auxiliary Segments (Diagonals & Created Segments) */}
          <g id="auxiliary-segments-group">
            {auxiliaryState.segments.map((seg) => {
              const p1 = auxiliaryState.points.find((p) => p.id === seg.p1Id) ||
                vertices.find((v) => v.id === seg.p1Id)?.cartesian;
              const p2 = auxiliaryState.points.find((p) => p.id === seg.p2Id) ||
                vertices.find((v) => v.id === seg.p2Id)?.cartesian;

              if (!p1 || !p2) return null;
              const isSelected = auxiliaryState.selectedEntityId === seg.id;
              const isRef = refEntity?.id === seg.id;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === seg.id;

              return (
                <g key={`aux-seg-${seg.id}`}>
                  {(isSelected || isRef) && (
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#38bdf8"
                      strokeWidth="7"
                      strokeOpacity="0.4"
                    />
                  )}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isHoverEraser ? '#ef4444' : seg.color || '#38bdf8'}
                    strokeWidth={seg.type === 'diagonal' ? 2 : 1.8}
                    strokeDasharray={seg.type === 'diagonal' ? '5 3' : 'none'}
                    className="hover:stroke-purple-300 transition-colors"
                  />
                  <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}>
                    <rect
                      x="-24"
                      y="-8"
                      width="48"
                      height="16"
                      rx="8"
                      fill="#0f172a"
                      fillOpacity="0.85"
                      stroke={seg.color || '#38bdf8'}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="1"
                      fill="#f8fafc"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {seg.lengthMm.toFixed(1)}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* 10. Ruler Measurements (Dimension Lines with Calipers) */}
          <g id="measurements-group">
            {auxiliaryState.measurements.map((m) => {
              const p1 = auxiliaryState.points.find((p) => p.id === m.p1Id) ||
                vertices.find((v) => v.id === m.p1Id)?.cartesian;
              const p2 = auxiliaryState.points.find((p) => p.id === m.p2Id) ||
                vertices.find((v) => v.id === m.p2Id)?.cartesian;

              if (!p1 || !p2) return null;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === m.id;

              return (
                <g key={`meas-${m.id}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isHoverEraser ? '#ef4444' : '#06b6d4'}
                    strokeWidth="1.8"
                    markerStart="url(#arrow-start)"
                    markerEnd="url(#arrow-end)"
                  />
                  <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2 - 12})`}>
                    <rect
                      x="-36"
                      y="-9"
                      width="72"
                      height="18"
                      rx="9"
                      fill="#083344"
                      stroke="#06b6d4"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="1"
                      fill="#67e8f9"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {m.distanceMm.toFixed(1)} мм
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* 11. Center Point O */}
          <g id="center-point-o">
            <circle
              cx={center.x}
              cy={center.y}
              r="4.5"
              fill="#ec4899"
              stroke="#be185d"
              strokeWidth="1.5"
              filter="url(#vertex-shadow)"
            />
            <text
              x={center.x + 8}
              y={center.y + 12}
              fill="#ec4899"
              fontSize="12"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              O
            </text>
          </g>

          {/* 12. Auxiliary Points (Points, Intersections) */}
          <g id="auxiliary-points-group">
            {auxiliaryState.points.map((pt) => {
              const isSelected = auxiliaryState.selectedEntityId === pt.id;
              const isHoverEraser = isTool('ERASER') && snapTarget?.entityId === pt.id;

              return (
                <g key={`aux-pt-${pt.id}`}>
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="12"
                      fill="#38bdf8"
                      fillOpacity="0.3"
                      className="animate-pulse"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={isHoverEraser ? '#ef4444' : pt.color || '#38bdf8'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    filter="url(#vertex-shadow)"
                  />
                  <text
                    x={pt.x + 7}
                    y={pt.y - 7}
                    fill={isHoverEraser ? '#ef4444' : '#38bdf8'}
                    fontSize="11"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 13. Canonical Vertices A, B, C, D */}
          <g id="vertices-group">
            {vertices.map((v) => {
              const isHovered = uiState.hoveredVertexId === v.id;
              const isSelected = auxiliaryState.selectedEntityId === v.id;
              const rLabel = radius + 18;
              const lx = center.x + rLabel * Math.cos(v.normalizedAngleRad);
              const ly = center.y + rLabel * Math.sin(v.normalizedAngleRad);

              return (
                <g
                  key={`vertex-${v.id}`}
                  onMouseEnter={() => onHoverVertex(v.id)}
                  onMouseLeave={() => onHoverVertex(null)}
                  className="cursor-pointer group"
                >
                  {(isHovered || isSelected) && (
                    <circle
                      cx={v.cartesian.x}
                      cy={v.cartesian.y}
                      r="16"
                      fill="#a855f7"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                  )}

                  <circle
                    cx={v.cartesian.x}
                    cy={v.cartesian.y}
                    r="6.5"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="2"
                    filter="url(#vertex-shadow)"
                    className="transition-transform group-hover:scale-125"
                  />
                  <circle
                    cx={v.cartesian.x}
                    cy={v.cartesian.y}
                    r="2.5"
                    fill="#3b82f6"
                  />

                  <text
                    x={lx}
                    y={ly}
                    fill="#f8fafc"
                    fontSize="14"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none drop-shadow"
                  >
                    {v.id}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 14. Live Previews of Active Tool */}

          {/* Segment / Ruler / Diagonal Preview */}
          {stepP1 && (isTool('SEGMENT') || isTool('RULER') || isTool('DIAGONAL')) && (
            <g id="tool-rubberband-preview">
              <line
                x1={stepP1.x}
                y1={stepP1.y}
                x2={cursorWorld.x}
                y2={cursorWorld.y}
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="4 4"
              />
              <g transform={`translate(${(stepP1.x + cursorWorld.x) / 2}, ${(stepP1.y + cursorWorld.y) / 2 - 10})`}>
                <rect
                  x="-30"
                  y="-8"
                  width="60"
                  height="16"
                  rx="8"
                  fill="#0369a1"
                  fillOpacity="0.9"
                />
                <text
                  x="0"
                  y="1"
                  fill="#f8fafc"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {euclideanDistance(stepP1.x, stepP1.y, cursorWorld.x, cursorWorld.y).toFixed(1)} мм
                </text>
              </g>
            </g>
          )}

          {/* COMPASS LIVE PREVIEW: Fixed Needle + Guiding Ray + Moving Pencil Leg + Live Preview Circle */}
          {isTool('COMPASS') && stepP1 && (
            <g id="compass-live-preview">
              {/* Fixed Needle Marker at Center */}
              <circle
                cx={stepP1.x}
                cy={stepP1.y}
                r="5"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* Guiding Compass Leg / Ray from Center to Cursor */}
              <line
                x1={stepP1.x}
                y1={stepP1.y}
                x2={cursorWorld.x}
                y2={cursorWorld.y}
                stroke="#ec4899"
                strokeWidth="1.8"
                strokeDasharray="4 2"
              />
              {/* Moving Pencil Leg Marker at Cursor */}
              <circle
                cx={cursorWorld.x}
                cy={cursorWorld.y}
                r="4.5"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Live Preview Circle */}
              <circle
                cx={stepP1.x}
                cy={stepP1.y}
                r={euclideanDistance(stepP1.x, stepP1.y, cursorWorld.x, cursorWorld.y)}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              {/* Dynamic Radius Readout in mm */}
              <g transform={`translate(${(stepP1.x + cursorWorld.x) / 2}, ${(stepP1.y + cursorWorld.y) / 2 - 12})`}>
                <rect
                  x="-34"
                  y="-9"
                  width="68"
                  height="18"
                  rx="9"
                  fill="#831843"
                  fillOpacity="0.9"
                  stroke="#ec4899"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="1"
                  fill="#fdf2f8"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  R = {euclideanDistance(stepP1.x, stepP1.y, cursorWorld.x, cursorWorld.y).toFixed(1)}
                </text>
              </g>
            </g>
          )}

          {/* Line / Circle Mode Preview */}
          {isTool('LINE_CIRCLE') && stepP1 && (
            <g id="line-circle-preview">
              {lineCircleMode === 'LINE' ? (
                (() => {
                  const ext = computeExtendedLineEndpoints(stepP1, cursorWorld.x - stepP1.x, cursorWorld.y - stepP1.y);
                  return (
                    <line
                      x1={ext.x1}
                      y1={ext.y1}
                      x2={ext.x2}
                      y2={ext.y2}
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="6 4"
                    />
                  );
                })()
              ) : (
                <circle
                  cx={stepP1.x}
                  cy={stepP1.y}
                  r={euclideanDistance(stepP1.x, stepP1.y, cursorWorld.x, cursorWorld.y)}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="5 3"
                />
              )}
            </g>
          )}

          {/* Parallel / Perpendicular Live Preview */}
          {(isTool('PARALLEL') || isTool('PERPENDICULAR')) && refEntity && (
            <g id="parallel-perp-preview">
              {(() => {
                const chord = chords.find((c) => c.id === refEntity.id);
                const auxSeg = auxiliaryState.segments.find((s) => s.id === refEntity.id);
                const p1 = chord ? chord.p1 : auxSeg ? vertices.find((v) => v.id === auxSeg.p1Id)?.cartesian || auxiliaryState.points.find((p) => p.id === auxSeg.p1Id) : null;
                const p2 = chord ? chord.p2 : auxSeg ? vertices.find((v) => v.id === auxSeg.p2Id)?.cartesian || auxiliaryState.points.find((p) => p.id === auxSeg.p2Id) : null;

                if (p1 && p2) {
                  const endpoints = isTool('PARALLEL')
                    ? computeParallelLine(p1, p2, cursorWorld)
                    : computePerpendicularLine(p1, p2, cursorWorld);

                  return (
                    <line
                      x1={endpoints.x1}
                      y1={endpoints.y1}
                      x2={endpoints.x2}
                      y2={endpoints.y2}
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="5 3"
                    />
                  );
                }
                return null;
              })()}
            </g>
          )}

          {/* Angle Bisector Live Preview */}
          {isTool('ANGLE_BISECTOR') && stepP1 && stepP2 && (
            <g id="bisector-preview">
              {(() => {
                const endpoints = computeAngleBisectorLine(stepP1, stepP2, cursorWorld);
                return (
                  <line
                    x1={endpoints.x1}
                    y1={endpoints.y1}
                    x2={endpoints.x2}
                    y2={endpoints.y2}
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                  />
                );
              })()}
            </g>
          )}

          {/* 15. Snap Ring Indicator on Cursor */}
          {snapTarget && (
            <g id="snap-cursor-indicator">
              <circle
                cx={snapTarget.x}
                cy={snapTarget.y}
                r="10"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                className="animate-ping"
              />
              <circle
                cx={snapTarget.x}
                cy={snapTarget.y}
                r="5"
                fill="#a855f7"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
