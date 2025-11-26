import Konva from "konva";
import type { Annotation } from "@/types/annotation";
import {
  isBoxAnnotation,
  isPolygonAnnotation,
  isPolylineAnnotation,
  isBrushAnnotation,
} from "@/types/annotation";
import BoxRenderer from "./components/BoxRenderer";
import PointBasedRenderer from "./components/PointBasedRenderer";
import BrushRenderer from "./components/BrushRenderer";

interface AnnotationRendererProps {
  annotation: Annotation;
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (annotation: Annotation) => void;
  onTransformEnd: (annotation: Annotation) => void;
}

export default function AnnotationRenderer({
  annotation,
  stageRef,
  stageSize,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: AnnotationRendererProps) {
  if (isBoxAnnotation(annotation)) {
    return (
      <BoxRenderer
        annotation={annotation}
        stageRef={stageRef}
        stageSize={stageSize}
        isSelected={isSelected}
        onSelect={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    );
  }

  if (isBrushAnnotation(annotation)) {
    return (
      <BrushRenderer
        annotation={annotation}
        stageRef={stageRef}
        stageSize={stageSize}
        isSelected={isSelected}
        onSelect={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    );
  }

  if (isPolygonAnnotation(annotation) || isPolylineAnnotation(annotation)) {
    return (
      <PointBasedRenderer
        annotation={annotation}
        stageRef={stageRef}
        stageSize={stageSize}
        isSelected={isSelected}
        onSelect={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    );
  }

  return null;
}
