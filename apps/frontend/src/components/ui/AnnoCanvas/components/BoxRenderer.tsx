import Konva from "konva";
import { Rect, Transformer } from "react-konva";
import type { BoxAnnotation } from "@/types/annotation";
import { getScaledStrokeWidth } from "../utils/konvaUtils";
import { createAnnotationHandler } from "../handlers/handlerFactory";
import { AnnotationType } from "@/types/annotation";
import type { BoxBounds } from "../handlers/types";

interface BoxRendererProps {
  annotation: BoxAnnotation;
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (annotation: BoxAnnotation) => void;
  onTransformEnd: (annotation: BoxAnnotation) => void;
}

export default function BoxRenderer({
  annotation,
  stageRef,
  stageSize,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: BoxRendererProps) {
  const strokeWidth = getScaledStrokeWidth(stageRef.current, 2);
  const handler = createAnnotationHandler(AnnotationType.Box);
  if (!handler) return null;

  return (
    <>
      <Rect
        key={annotation.id}
        id={annotation.id}
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        stroke="#ff0000"
        strokeWidth={strokeWidth}
        fill="transparent"
        fillEnabled={false}
        perfectDrawEnabled={false}
        hitStrokeWidth={20}
        draggable
        onClick={() => onSelect(annotation.id)}
        onTap={() => onSelect(annotation.id)}
        dragBoundFunc={(pos) => {
          const stage = stageRef.current;
          if (!stage) return pos;
          const node = stage.findOne("#" + annotation.id);
          if (!node) return pos;
          return handler.getDragBounds(stage, stageSize, annotation, node, pos);
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const updated: BoxAnnotation = {
            ...annotation,
            x: node.x(),
            y: node.y(),
          };
          onDragEnd(updated);
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          const x = node.x();
          const y = node.y();
          const width = node.width() * scaleX;
          const height = node.height() * scaleY;

          node.x(x);
          node.y(y);
          node.width(width);
          node.height(height);

          const updated: BoxAnnotation = {
            ...annotation,
            x,
            y,
            width,
            height,
          };
          onTransformEnd(updated);
        }}
      />
      {isSelected && (
        <Transformer
          ref={(node) => {
            if (node && stageRef.current) {
              const selectedNode = stageRef.current.findOne(
                "#" + annotation.id
              );
              if (selectedNode) {
                node.nodes([selectedNode]);
                node.getLayer()?.batchDraw();
              }
            }
          }}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            const bounds = handler.getTransformBounds(
              stageRef.current!,
              stageSize,
              annotation,
              oldBox,
              newBox
            ) as BoxBounds | null;
            if (bounds) {
              return { ...bounds, rotation: 0 };
            }
            return { ...oldBox, rotation: 0 };
          }}
        />
      )}
    </>
  );
}
