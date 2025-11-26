import Konva from "konva";
import {
  AnnotationType,
  type PolygonAnnotation,
  type Point,
} from "@/types/annotation";
import {
  getClampedLocalPosition,
  generateAnnotationId,
  getDistance,
  getPointsDragBounds,
  getPointsTransformBounds,
} from "../utils/annotationUtils";
import type { AnnotationHandler, HandlerCallbacks } from "./annotationHandler";
import type {
  PointBasedFinishData,
  PolygonMoveState,
  PointBasedBounds,
} from "./types";

/**
 * Polygon 어노테이션 핸들러 클래스
 */
export class PolygonHandler implements AnnotationHandler<PolygonAnnotation> {
  private callbacks: HandlerCallbacks<PolygonAnnotation> | null = null;

  setCallbacks(callbacks: HandlerCallbacks<PolygonAnnotation>): void {
    this.callbacks = callbacks;
  }

  handleStart(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null
  ): boolean {
    if (!pointerPos || !this.callbacks) return false;

    const clampedPos = getClampedLocalPosition(stage, pointerPos, stageSize);
    if (!clampedPos) return false;

    if (this.callbacks.onAddPoint) {
      this.callbacks.onAddPoint(clampedPos);
    }
    return true;
  }

  handleFinish(data: PointBasedFinishData): boolean {
    if (!this.callbacks) return false;

    const points = data;
    if (points.length < 3) {
      this.callbacks.onCancelDrawing();
      return false;
    }

    const polygon: PolygonAnnotation = {
      id: generateAnnotationId(),
      type: AnnotationType.Polygon,
      points: [...points],
    };

    this.callbacks.onFinishDrawing(polygon);
    return true;
  }

  handleMove(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null,
    state: PolygonMoveState
  ): boolean {
    if (!this.callbacks) return false;

    const { currentPoints } = state;
    if (!pointerPos || currentPoints.length === 0) return false;

    const clampedPos = getClampedLocalPosition(stage, pointerPos, stageSize);
    if (!clampedPos) return false;

    // 첫 번째 점과 너무 가까우면 완료 처리
    const firstPoint = currentPoints[0];
    const distanceToFirst = getDistance(clampedPos, firstPoint);
    const minDistance = 10; // 최소 거리 (픽셀)

    if (currentPoints.length >= 3 && distanceToFirst < minDistance) {
      // Polygon 완료
      const polygon: PolygonAnnotation = {
        id: generateAnnotationId(),
        type: AnnotationType.Polygon,
        points: currentPoints,
      };
      this.callbacks.onFinishDrawing(polygon);
      return true;
    }

    // 새 점 추가
    if (this.callbacks.onAddPoint) {
      this.callbacks.onAddPoint(clampedPos);
    }
    return true;
  }

  getDragBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    annotation: PolygonAnnotation,
    node: Konva.Node,
    pos: { x: number; y: number }
  ): { x: number; y: number } {
    const bounds = getPointsDragBounds(
      stage,
      stageSize,
      annotation.points,
      node,
      pos
    );
    return bounds || { x: 0, y: 0 };
  }

  getTransformBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    annotation: PolygonAnnotation,
    oldBox: { x: number; y: number; width: number; height: number },
    newBox: { x: number; y: number; width: number; height: number }
  ): PointBasedBounds | null {
    // Transformer의 바운딩 박스 변화를 점 배열 변화로 변환
    const oldBBox = oldBox;
    const newBBox = newBox;

    if (oldBBox.width === 0 || oldBBox.height === 0) {
      return null;
    }

    const scaleX = newBBox.width / oldBBox.width;
    const scaleY = newBBox.height / oldBBox.height;
    const offsetX = newBBox.x - oldBBox.x;
    const offsetY = newBBox.y - oldBBox.y;

    if (
      isNaN(scaleX) ||
      isNaN(scaleY) ||
      isNaN(offsetX) ||
      isNaN(offsetY) ||
      !isFinite(scaleX) ||
      !isFinite(scaleY) ||
      !isFinite(offsetX) ||
      !isFinite(offsetY)
    ) {
      return null;
    }

    // 기존 점들의 중심 계산
    if (annotation.points.length === 0) {
      return null;
    }

    const centerX =
      annotation.points.reduce((sum, p) => sum + p.x, 0) /
      annotation.points.length;
    const centerY =
      annotation.points.reduce((sum, p) => sum + p.y, 0) /
      annotation.points.length;

    if (
      isNaN(centerX) ||
      isNaN(centerY) ||
      !isFinite(centerX) ||
      !isFinite(centerY)
    ) {
      return null;
    }

    // 새 점들 계산
    const newPoints = annotation.points
      .map((point) => {
        const x = (point.x - centerX) * scaleX + centerX + offsetX;
        const y = (point.y - centerY) * scaleY + centerY + offsetY;
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
          return null;
        }
        return { x, y };
      })
      .filter((p): p is Point => p !== null);

    if (newPoints.length !== annotation.points.length) {
      return null;
    }

    // 변환 바운드 적용
    return getPointsTransformBounds(
      stage,
      stageSize,
      annotation.points,
      newPoints
    );
  }
}
