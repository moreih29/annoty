import type { Annotation } from "@/types/annotation";
import { AnnotationType } from "@/types/annotation";
import type { AnnotationHandler } from "./annotationHandler";
import { BoxHandler } from "./boxHandler";
import { PolygonHandler } from "./polygonHandler";
import { PolylineHandler } from "./polylineHandler";
import { BrushHandler } from "./brushHandler";

// 싱글톤 인스턴스들
const boxHandler = new BoxHandler();
const polygonHandler = new PolygonHandler();
const polylineHandler = new PolylineHandler();
const brushHandler = new BrushHandler();

/**
 * AnnotationType에 따라 적절한 핸들러 인스턴스를 반환합니다.
 */
export function createAnnotationHandler(
  annotationType: typeof AnnotationType.Box
): AnnotationHandler<import("@/types/annotation").BoxAnnotation>;
export function createAnnotationHandler(
  annotationType: typeof AnnotationType.Polygon
): AnnotationHandler<import("@/types/annotation").PolygonAnnotation>;
export function createAnnotationHandler(
  annotationType: typeof AnnotationType.Polyline
): AnnotationHandler<import("@/types/annotation").PolylineAnnotation>;
export function createAnnotationHandler(
  annotationType: typeof AnnotationType.Brush
): AnnotationHandler<import("@/types/annotation").BrushAnnotation>;
export function createAnnotationHandler(
  annotationType: string
): AnnotationHandler<Annotation> | null {
  switch (annotationType) {
    case AnnotationType.Box:
      return boxHandler;
    case AnnotationType.Polygon:
      return polygonHandler;
    case AnnotationType.Polyline:
      return polylineHandler;
    case AnnotationType.Brush:
      return brushHandler;
    default:
      return null;
  }
}

