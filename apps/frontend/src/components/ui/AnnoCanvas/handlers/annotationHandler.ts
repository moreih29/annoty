import Konva from "konva";
import type { Annotation, Point } from "@/types/annotation";

/**
 * 핸들러 콜백 인터페이스 (통합)
 */
export interface HandlerCallbacks<T extends Annotation> {
  onFinishDrawing: (annotation: T | null) => void;
  onCancelDrawing: () => void;
  onAddPoint?: (point: Point) => void; // 점 기반 어노테이션용
  onStartDrawing?: (point: Point) => void; // Box용
  onUpdatePreview?: (preview: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void; // Box용
}

/**
 * 어노테이션 핸들러의 공통 인터페이스
 */
export interface AnnotationHandler<T extends Annotation> {
  /**
   * 콜백 설정
   */
  setCallbacks(callbacks: HandlerCallbacks<T>): void;

  /**
   * 그리기 시작
   */
  handleStart(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null
  ): boolean;

  /**
   * 그리기 완료
   */
  handleFinish(
    data: unknown // 타입별로 다름 (Box는 previewBox, 점 기반은 points)
  ): boolean;

  /**
   * 그리기 중 이동/업데이트
   */
  handleMove(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    pointerPos: { x: number; y: number } | null,
    state: unknown // 타입별 상태
  ): boolean | void;

  /**
   * 드래그 바운드 계산
   */
  getDragBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    annotation: T,
    node: Konva.Node,
    pos: { x: number; y: number }
  ): { x: number; y: number };

  /**
   * 변환 바운드 계산
   */
  getTransformBounds(
    stage: Konva.Stage,
    stageSize: { width: number; height: number },
    annotation: T,
    oldBox: unknown,
    newBox: unknown
  ): unknown | null;
}
