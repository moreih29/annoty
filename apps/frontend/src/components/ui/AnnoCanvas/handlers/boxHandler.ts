import Konva from "konva";
import {
  AnnotationType,
  type BoxAnnotation,
  type Point,
} from "@/types/annotation";
import {
  getClampedLocalPosition,
  generateAnnotationId,
} from "../utils/annotationUtils";
import type { AnnotationHandler, HandlerCallbacks } from "./annotationHandler";
import type { BoxFinishData, BoxMoveState, BoxBounds } from "./types";

export interface BoxDrawingState {
  isDrawing: boolean;
  firstPoint: Point | null;
  previewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Box 어노테이션 핸들러 클래스
 */
export class BoxHandler implements AnnotationHandler<BoxAnnotation> {
  private callbacks: HandlerCallbacks<BoxAnnotation> | null = null;

  setCallbacks(callbacks: HandlerCallbacks<BoxAnnotation>): void {
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

    if (this.callbacks.onStartDrawing) {
      this.callbacks.onStartDrawing(clampedPos);
    }
    if (this.callbacks.onUpdatePreview) {
      this.callbacks.onUpdatePreview({
        x: clampedPos.x,
        y: clampedPos.y,
        width: 0,
        height: 0,
      });
    }

    return true;
  }

  handleFinish(data: BoxFinishData | null): boolean {
    if (!this.callbacks) return false;

    const previewBox = data;

    if (!previewBox || previewBox.width <= 5 || previewBox.height <= 5) {
      this.callbacks.onCancelDrawing();
      return false;
    }

    const box: BoxAnnotation = {
      id: generateAnnotationId(),
      type: AnnotationType.Box,
      x: previewBox.x,
      y: previewBox.y,
      width: previewBox.width,
      height: previewBox.height,
    };

    this.callbacks.onFinishDrawing(box);
    return true;
  }

  handleMove(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null,
    state: BoxMoveState
  ): void {
    if (!this.callbacks) return;

    const { firstPoint } = state;
    if (!firstPoint || !pointerPos) return;

    const clampedPos = getClampedLocalPosition(stage, pointerPos, stageSize);
    if (!clampedPos) return;

    if (this.callbacks.onUpdatePreview) {
      this.callbacks.onUpdatePreview({
        x: Math.min(firstPoint.x, clampedPos.x),
        y: Math.min(firstPoint.y, clampedPos.y),
        width: Math.abs(clampedPos.x - firstPoint.x),
        height: Math.abs(clampedPos.y - firstPoint.y),
      });
    }
  }

  getDragBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    _annotation: BoxAnnotation,
    node: Konva.Node,
    pos: { x: number; y: number }
  ): { x: number; y: number } {
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const width = node.width();
    const height = node.height();

    let x = pos.x;
    let y = pos.y;

    if (x < stage.x()) {
      x = stage.x();
    }
    if (y < stage.y()) {
      y = stage.y();
    }

    if (x + width * scaleX > stage.x() + stageSize.width * scaleX) {
      x = stage.x() + stageSize.width * scaleX - width * scaleX;
    }
    if (y + height * scaleY > stage.y() + stageSize.height * scaleY) {
      y = stage.y() + stageSize.height * scaleY - height * scaleY;
    }

    return { x, y };
  }

  getTransformBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    _annotation: BoxAnnotation,
    _oldBox: BoxBounds,
    newBox: BoxBounds
  ): BoxBounds | null {
    const minSize = 5;
    const transformedBox = newBox;

    // 음수 정규화
    let x = transformedBox.x;
    let y = transformedBox.y;
    let width = transformedBox.width;
    let height = transformedBox.height;

    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }
    if (x < 0 || y < 0) {
      return null;
    }

    // 최소 크기 체크
    if (width < minSize || height < minSize) {
      return null;
    }

    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const maxWidth = stageSize.width * scaleX;
    const maxHeight = stageSize.height * scaleY;

    // 경계 체크
    if (x < stage.x()) {
      width = Math.max(minSize, width - (stage.x() - x));
      x = stage.x();
    }
    if (y < stage.y()) {
      height = Math.max(minSize, height - (stage.y() - y));
      y = stage.y();
    }

    if (x + width > stage.x() + maxWidth) {
      width = Math.max(minSize, stage.x() + maxWidth - x);
    }
    if (y + height > stage.y() + maxHeight) {
      height = Math.max(minSize, stage.y() + maxHeight - y);
    }

    // 최종 안전 체크
    x = Math.max(stage.x(), Math.min(x, stage.x() + maxWidth - minSize));
    y = Math.max(stage.y(), Math.min(y, stage.y() + maxHeight - minSize));
    width = Math.max(minSize, Math.min(width, stage.x() + maxWidth - x));
    height = Math.max(minSize, Math.min(height, stage.y() + maxHeight - y));

    return { x, y, width, height };
  }
}
