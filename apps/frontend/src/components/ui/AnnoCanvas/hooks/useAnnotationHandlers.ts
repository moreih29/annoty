import { useCallback } from "react";
import Konva from "konva";
import {
  AnnotationType,
  type Annotation,
  type AnnotationTypeValue,
  type Point,
  type BrushStroke,
} from "@/types/annotation";
import { createAnnotationHandler } from "../handlers/handlerFactory";
import type { BoxFinishData } from "../handlers/types";
import type {
  BoxMoveState,
  PolygonMoveState,
  PolylineMoveState,
  BrushMoveState,
} from "../handlers/types";

interface UseAnnotationHandlersProps {
  annotationType: AnnotationTypeValue;
  eraserMode?: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  isDrawingMode: boolean;
  setIsDrawingMode: (value: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  annotations: Annotation[];
  // Box state
  firstPoint: Point | null;
  setFirstPoint: (point: Point | null) => void;
  newBox: BoxFinishData | null;
  setNewBox: (box: BoxFinishData | null) => void;
  // Polygon state
  polygonPoints: Point[];
  setPolygonPoints: (points: Point[]) => void;
  // Polyline state
  polylinePoints: Point[];
  setPolylinePoints: (points: Point[]) => void;
  // Brush state
  currentBrushStroke: BrushStroke | null;
  setCurrentBrushStroke: React.Dispatch<
    React.SetStateAction<BrushStroke | null>
  >;
  setBrushStrokes: React.Dispatch<React.SetStateAction<BrushStroke[]>>;
  isMouseDown: boolean;
  setIsMouseDown: (value: boolean) => void;
}

export function useAnnotationHandlers({
  annotationType,
  eraserMode = false,
  stageRef,
  stageSize,
  isDrawingMode,
  setIsDrawingMode,
  setSelectedId,
  setAnnotations,
  annotations,
  firstPoint,
  setFirstPoint,
  newBox,
  setNewBox,
  polygonPoints,
  setPolygonPoints,
  polylinePoints,
  setPolylinePoints,
  currentBrushStroke,
  setCurrentBrushStroke,
  setBrushStrokes,
  isMouseDown,
  setIsMouseDown,
}: UseAnnotationHandlersProps) {
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (
        !isDrawingMode &&
        e.target !== e.target.getStage()?.findOne("Image")
      ) {
        return;
      }

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Box 타입 처리
      if (annotationType === AnnotationType.Box) {
        const handler = createAnnotationHandler(AnnotationType.Box);
        if (!handler) return;
        handler.setCallbacks({
          onStartDrawing: (point) => {
            setIsDrawingMode(true);
            setFirstPoint(point);
            setSelectedId(null);
          },
          onUpdatePreview: (preview) => {
            setNewBox(preview);
          },
          onFinishDrawing: (box) => {
            if (box) {
              setAnnotations([...annotations, box]);
            }
            setIsDrawingMode(false);
            setFirstPoint(null);
            setNewBox(null);
          },
          onCancelDrawing: () => {
            setIsDrawingMode(false);
            setFirstPoint(null);
            setNewBox(null);
          },
        });

        if (!isDrawingMode) {
          handler.handleStart(stage, stageSize, pos);
        } else if (firstPoint) {
          handler.handleFinish(newBox);
        }
      }
      // Polygon 타입 처리
      else if (annotationType === AnnotationType.Polygon) {
        const handler = createAnnotationHandler(AnnotationType.Polygon);
        if (!handler) return;

        handler.setCallbacks({
          onAddPoint: (point) => {
            if (!isDrawingMode) {
              setIsDrawingMode(true);
              setPolygonPoints([point]);
              setSelectedId(null);
            } else {
              setPolygonPoints([...polygonPoints, point]);
            }
          },
          onFinishDrawing: (polygon) => {
            if (polygon) {
              setAnnotations([...annotations, polygon]);
            }
            setIsDrawingMode(false);
            setPolygonPoints([]);
          },
          onCancelDrawing: () => {
            setIsDrawingMode(false);
            setPolygonPoints([]);
          },
        });

        if (!isDrawingMode) {
          handler.handleStart(stage, stageSize, pos);
        } else {
          handler.handleMove(stage, stageSize, pos, {
            currentPoints: polygonPoints,
          } as PolygonMoveState);
        }
      }
      // Polyline 타입 처리
      else if (annotationType === AnnotationType.Polyline) {
        const handler = createAnnotationHandler(AnnotationType.Polyline);
        if (!handler) return;

        handler.setCallbacks({
          onAddPoint: (point) => {
            if (!isDrawingMode) {
              setIsDrawingMode(true);
              setPolylinePoints([point]);
              setSelectedId(null);
            } else {
              setPolylinePoints([...polylinePoints, point]);
            }
          },
          onFinishDrawing: (polyline) => {
            if (polyline) {
              setAnnotations([...annotations, polyline]);
            }
            setIsDrawingMode(false);
            setPolylinePoints([]);
          },
          onCancelDrawing: () => {
            setIsDrawingMode(false);
            setPolylinePoints([]);
          },
        });

        if (!isDrawingMode) {
          handler.handleStart(stage, stageSize, pos);
        } else {
          handler.handleMove(stage, stageSize, pos, {} as PolylineMoveState);
        }
      }
    },
    [
      annotationType,
      stageRef,
      stageSize,
      isDrawingMode,
      setIsDrawingMode,
      setSelectedId,
      setAnnotations,
      annotations,
      firstPoint,
      setFirstPoint,
      newBox,
      setNewBox,
      polygonPoints,
      setPolygonPoints,
      polylinePoints,
      setPolylinePoints,
    ]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (annotationType !== AnnotationType.Brush) return;
      if (e.target !== e.target.getStage()?.findOne("Image")) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const handler = createAnnotationHandler(AnnotationType.Brush);
      if (!handler) return;

      handler.setCallbacks({
        onAddPoint: (point) => {
          setIsDrawingMode(true);
          setCurrentBrushStroke((prevStroke) => {
            if (!prevStroke) {
              // 새 스트로크 시작
              const newStroke: BrushStroke = {
                type: eraserMode ? "eraser" : "brush",
                points: [point],
                color: "rgba(255, 0, 0, 0.7)",
                width: 20,
                opacity: 0.7,
              };
              setSelectedId(null);
              return newStroke;
            } else {
              // 기존 스트로크에 점 추가
              return {
                ...prevStroke,
                points: [...prevStroke.points, point],
              };
            }
          });
        },
        onFinishDrawing: () => {},
        onCancelDrawing: () => {},
      });

      setIsMouseDown(true);
      handler.handleStart(stage, stageSize, pos);
    },
    [
      annotationType,
      eraserMode,
      stageRef,
      stageSize,
      setIsDrawingMode,
      setCurrentBrushStroke,
      setSelectedId,
      setIsMouseDown,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (annotationType === AnnotationType.Brush && isMouseDown) {
      // 현재 스트로크가 있고 최소 2개 이상의 점을 가진 경우에만 brushStrokes에 추가
      if (currentBrushStroke && currentBrushStroke.points.length >= 2) {
        setBrushStrokes((prev) => [...prev, currentBrushStroke]);
      }

      setIsDrawingMode(false);
      setCurrentBrushStroke(null);
      setIsMouseDown(false);
    }
  }, [
    annotationType,
    isMouseDown,
    setIsDrawingMode,
    setCurrentBrushStroke,
    setBrushStrokes,
    setIsMouseDown,
    currentBrushStroke,
  ]);

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Box 타입 처리
    if (annotationType === AnnotationType.Box && isDrawingMode && firstPoint) {
      const handler = createAnnotationHandler(AnnotationType.Box);
      if (!handler) return;
      handler.setCallbacks({
        onUpdatePreview: (preview) => {
          setNewBox(preview);
        },
        onStartDrawing: () => {},
        onFinishDrawing: () => {},
        onCancelDrawing: () => {},
      });
      handler.handleMove(stage, stageSize, pos, { firstPoint } as BoxMoveState);
    }
    // Brush 타입 처리
    else if (annotationType === AnnotationType.Brush && isMouseDown) {
      const handler = createAnnotationHandler(AnnotationType.Brush);
      if (!handler) return;

      const lastPoint =
        currentBrushStroke?.points[currentBrushStroke.points.length - 1] ||
        null;

      handler.setCallbacks({
        onAddPoint: (point) => {
          if (currentBrushStroke) {
            setCurrentBrushStroke({
              ...currentBrushStroke,
              points: [...currentBrushStroke.points, point],
            });
          }
        },
        onFinishDrawing: () => {},
        onCancelDrawing: () => {},
      });

      handler.handleMove(stage, stageSize, pos, {
        lastPoint,
        currentStroke: currentBrushStroke,
      } as BrushMoveState);
    }
  }, [
    annotationType,
    stageRef,
    stageSize,
    isDrawingMode,
    firstPoint,
    setNewBox,
    isMouseDown,
    currentBrushStroke,
    setCurrentBrushStroke,
  ]);

  return {
    handleClick,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
  };
}
