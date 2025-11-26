export const AnnotationType = {
  Box: "box",
  Polygon: "polygon",
  Polyline: "polyline",
  Brush: "brush",
} as const;

export type AnnotationTypeValue =
  (typeof AnnotationType)[keyof typeof AnnotationType];

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationTypeValue;
}

export interface BoxAnnotation extends BaseAnnotation {
  type: typeof AnnotationType.Box;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonAnnotation extends BaseAnnotation {
  type: typeof AnnotationType.Polygon;
  points: Point[];
}

export interface PolylineAnnotation extends BaseAnnotation {
  type: typeof AnnotationType.Polyline;
  points: Point[];
}

export interface BrushStroke {
  type: "brush" | "eraser";
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}

export interface BrushAnnotation extends BaseAnnotation {
  type: typeof AnnotationType.Brush;
  strokes: BrushStroke[];
  // 렌더링 최적화: 내부 캐시용 (직렬화 안 함)
  _cachedImage?: string;
  // 저장/전송용: RLE 변환 가능
  imageData?: string;
  width?: number;
  height?: number;
}

export type Annotation =
  | BoxAnnotation
  | PolygonAnnotation
  | PolylineAnnotation
  | BrushAnnotation;

// Type guards
export function isBoxAnnotation(
  annotation: Annotation
): annotation is BoxAnnotation {
  return annotation.type === AnnotationType.Box;
}

export function isPolygonAnnotation(
  annotation: Annotation
): annotation is PolygonAnnotation {
  return annotation.type === AnnotationType.Polygon;
}

export function isPolylineAnnotation(
  annotation: Annotation
): annotation is PolylineAnnotation {
  return annotation.type === AnnotationType.Polyline;
}

export function isBrushAnnotation(
  annotation: Annotation
): annotation is BrushAnnotation {
  return annotation.type === AnnotationType.Brush;
}
