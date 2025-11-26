import Konva from "konva";
import { AnnotationType, type BrushAnnotation } from "@/types/annotation";
import {
  getClampedLocalPosition,
  generateAnnotationId,
  getDistance,
} from "../utils/annotationUtils";
import type { AnnotationHandler, HandlerCallbacks } from "./annotationHandler";
import type { BrushFinishData, BrushMoveState } from "./types";

/**
 * Brush 어노테이션 핸들러 클래스
 */
export class BrushHandler implements AnnotationHandler<BrushAnnotation> {
  private callbacks: HandlerCallbacks<BrushAnnotation> | null = null;

  setCallbacks(callbacks: HandlerCallbacks<BrushAnnotation>): void {
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
      // 콜백을 통해 현재 스트로크를 전달 (실제로는 별도 콜백이 필요할 수 있음)
      this.callbacks.onAddPoint(clampedPos);
    }
    return true;
  }

  handleFinish(data: BrushFinishData): boolean {
    if (!this.callbacks) return false;

    const { strokes } = data;
    if (strokes.length === 0) {
      this.callbacks.onCancelDrawing();
      return false;
    }

    // 최소 2개 이상의 점을 가진 스트로크만 유효
    const validStrokes = strokes.filter((stroke) => stroke.points.length >= 2);
    if (validStrokes.length === 0) {
      this.callbacks.onCancelDrawing();
      return false;
    }

    const brush: BrushAnnotation = {
      id: generateAnnotationId(),
      type: AnnotationType.Brush,
      strokes: validStrokes,
    };

    this.callbacks.onFinishDrawing(brush);
    return true;
  }

  handleMove(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null,
    state: BrushMoveState
  ): boolean {
    if (!this.callbacks) return false;

    const { lastPoint, currentStroke } = state;
    if (!pointerPos || !lastPoint || !currentStroke) return false;

    const clampedPos = getClampedLocalPosition(stage, pointerPos, stageSize);
    if (!clampedPos) return false;

    // 마지막 점과의 거리가 최소 거리 이상일 때만 추가 (성능 최적화)
    const minDistance = 2; // 픽셀
    const distance = getDistance(clampedPos, lastPoint);

    if (distance >= minDistance) {
      if (this.callbacks.onAddPoint) {
        this.callbacks.onAddPoint(clampedPos);
      }
      return true;
    }

    return false;
  }

  getDragBounds(
    _stage: Konva.Stage,
    _stageSize: { width: number; height: number },
    _annotation: BrushAnnotation,
    _node: Konva.Node,
    pos: { x: number; y: number }
  ): { x: number; y: number } {
    // 브러시는 드래그 비활성화
    return pos;
  }

  getTransformBounds(): unknown | null {
    // 브러시는 변환 비활성화
    return null;
  }
}
