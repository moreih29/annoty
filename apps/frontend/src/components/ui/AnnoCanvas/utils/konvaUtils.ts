import Konva from "konva";
import type {
  Annotation,
  BoxAnnotation,
  PolygonAnnotation,
  PolylineAnnotation,
} from "@/types/annotation";

/**
 * Stage에서 노드 찾기
 */
export function findNodeById(
  stage: Konva.Stage,
  id: string
): Konva.Node | null {
  return stage.findOne("#" + id) ?? null;
}

/**
 * Box 어노테이션의 Konva 노드 업데이트
 */
export function updateBoxNode(
  stage: Konva.Stage,
  annotation: BoxAnnotation
): void {
  const node = findNodeById(stage, annotation.id);
  if (node && node instanceof Konva.Rect) {
    node.x(annotation.x);
    node.y(annotation.y);
    node.width(annotation.width);
    node.height(annotation.height);
  }
}

/**
 * 모든 레이어 다시 그리기
 */
export function redrawAllLayers(stage: Konva.Stage): void {
  stage.getLayers().forEach((layer) => layer.batchDraw());
}

/**
 * 어노테이션의 Konva 노드 업데이트 (타입별)
 */
export function updateAnnotationNode(
  stage: Konva.Stage,
  annotation: Annotation
): void {
  const node = findNodeById(stage, annotation.id);
  if (!node) return;

  switch (annotation.type) {
    case "box":
      if (node instanceof Konva.Rect) {
        node.x(annotation.x);
        node.y(annotation.y);
        node.width(annotation.width);
        node.height(annotation.height);
      }
      break;
    case "polygon":
    case "polyline":
      if (node instanceof Konva.Line) {
        const pointBasedAnnotation = annotation as
          | PolygonAnnotation
          | PolylineAnnotation;
        const points = pointBasedAnnotation.points.flatMap(
          (p: { x: number; y: number }) => [p.x, p.y]
        );
        node.points(points);
      }
      break;
    case "brush":
      // Brush는 별도로 처리 (strokes 기반)
      break;
  }
}

/**
 * 현재 스케일에 맞는 stroke width 계산
 */
export function getScaledStrokeWidth(
  stage: Konva.Stage | null,
  baseWidth: number = 2
): number {
  if (!stage) return baseWidth;
  return baseWidth / stage.scaleX();
}
