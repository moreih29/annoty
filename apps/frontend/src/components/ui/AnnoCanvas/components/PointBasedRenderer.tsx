import Konva from "konva";
import { Line, Circle } from "react-konva";
import { useRef } from "react";
import type { PolygonAnnotation, PolylineAnnotation } from "@/types/annotation";
import { AnnotationType } from "@/types/annotation";
import { getScaledStrokeWidth } from "../utils/konvaUtils";
import { clampPosition, getLocalPosition } from "../utils/annotationUtils";
import { createAnnotationHandler } from "../handlers/handlerFactory";

type PointBasedAnnotation = PolygonAnnotation | PolylineAnnotation;

interface PointBasedRendererProps {
  annotation: PointBasedAnnotation;
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (annotation: PointBasedAnnotation) => void;
  onTransformEnd: (annotation: PointBasedAnnotation) => void;
}

export default function PointBasedRenderer({
  annotation,
  stageRef,
  stageSize,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: PointBasedRendererProps) {
  // 드래그 시작 시점의 원본 points를 저장 (Hook은 항상 최상위에서 호출)
  const dragStartPointsRef = useRef<Array<{ x: number; y: number }> | null>(
    null
  );

  const strokeWidth = getScaledStrokeWidth(stageRef.current, 2);

  const points = annotation.points.flatMap((p) => [p.x, p.y]);
  const isClosed = annotation.type === AnnotationType.Polygon;

  return (
    <>
      <Line
        key={annotation.id}
        id={annotation.id}
        points={points}
        stroke="#ff0000"
        strokeWidth={strokeWidth}
        fill={isClosed ? "rgba(255, 0, 0, 0.1)" : "transparent"}
        closed={isClosed}
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
          // 타입 가드로 정확한 핸들러와 타입 보장
          if (annotation.type === AnnotationType.Polygon) {
            const handler = createAnnotationHandler(AnnotationType.Polygon);
            if (!handler) return pos;
            return handler.getDragBounds(
              stage,
              stageSize,
              annotation as PolygonAnnotation,
              node,
              pos
            );
          } else {
            const handler = createAnnotationHandler(AnnotationType.Polyline);
            if (!handler) return pos;
            return handler.getDragBounds(
              stage,
              stageSize,
              annotation as PolylineAnnotation,
              node,
              pos
            );
          }
        }}
        onDragStart={() => {
          // 드래그 시작 시점의 원본 points 저장
          dragStartPointsRef.current = [...annotation.points];
        }}
        onDragMove={(e) => {
          const node = e.target;
          const stage = stageRef.current;
          if (!stage) return;

          // 드래그 시작 시점의 원본 points가 없으면 무시
          if (!dragStartPointsRef.current) return;

          const dx = node.x();
          const dy = node.y();

          // Circle 노드들을 직접 업데이트하여 실시간으로 보이도록 함 (상태 업데이트 없이)
          // 드래그 중에는 상태를 업데이트하지 않아서 리렌더링이 발생하지 않음
          dragStartPointsRef.current.forEach(
            (originalPoint: { x: number; y: number }, index: number) => {
              const circleId = `${annotation.id}-point-${index}`;
              const circleNode = stage.findOne("#" + circleId);
              if (circleNode) {
                circleNode.x(originalPoint.x + dx);
                circleNode.y(originalPoint.y + dy);
              }
            }
          );
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const stage = stageRef.current;
          if (!stage) return;

          // 드래그 시작 시점의 원본 points가 없으면 무시
          if (!dragStartPointsRef.current) return;

          const dx = node.x();
          const dy = node.y();

          // 원본 points를 기준으로 최종 위치 계산
          const updatedPoints = dragStartPointsRef.current.map(
            (p: { x: number; y: number }) => ({
              x: p.x + dx,
              y: p.y + dy,
            })
          );

          const updated = {
            ...annotation,
            points: updatedPoints,
          } as PointBasedAnnotation;

          // Line 노드 위치 초기화
          node.x(0);
          node.y(0);

          // Circle 노드들의 위치를 업데이트된 좌표로 설정
          updatedPoints.forEach(
            (point: { x: number; y: number }, index: number) => {
              const circleId = `${annotation.id}-point-${index}`;
              const circleNode = stage.findOne("#" + circleId);
              if (circleNode) {
                circleNode.x(point.x);
                circleNode.y(point.y);
              }
            }
          );

          // 드래그 시작 시점의 원본 points 초기화
          dragStartPointsRef.current = null;

          onDragEnd(updated);
        }}
      />
      {isSelected &&
        annotation.points.map(
          (point: { x: number; y: number }, index: number) => {
            const handleRadius = Math.max(4, strokeWidth * 1.5);
            const handleId = `${annotation.id}-point-${index}`;

            return (
              <Circle
                key={handleId}
                id={handleId}
                x={point.x}
                y={point.y}
                radius={handleRadius}
                fill="#ffffff"
                stroke="#ff0000"
                strokeWidth={strokeWidth}
                draggable
                dragBoundFunc={(pos) => {
                  const stage = stageRef.current;
                  if (!stage) return pos;

                  // Stage 좌표를 이미지 좌표로 변환
                  const localPos = getLocalPosition(stage, pos);
                  if (!localPos) return pos;

                  // 이미지 범위 내로 클램핑
                  const clamped = clampPosition(localPos, stageSize);

                  // 다시 Stage 좌표로 변환
                  const transform = stage.getAbsoluteTransform();
                  const stagePos = transform.point(clamped);

                  return stagePos;
                }}
                onDragMove={(e) => {
                  const stage = stageRef.current;
                  if (!stage) return;

                  const node = e.target;
                  if (!node) return;
                  const nodePos = { x: node.x(), y: node.y() };

                  // 이미지 범위 내로 클램핑
                  const clampedPos = clampPosition(nodePos, stageSize);

                  // 해당 점만 업데이트하여 실시간으로 폴리곤 업데이트
                  const updatedPoints = [...annotation.points];
                  updatedPoints[index] = clampedPos;

                  const updated = {
                    ...annotation,
                    points: updatedPoints,
                  } as PointBasedAnnotation;

                  // 노드 위치를 업데이트된 좌표로 설정
                  node.x(clampedPos.x);
                  node.y(clampedPos.y);

                  // 실시간 업데이트를 위해 상태 변경
                  onTransformEnd(updated);
                }}
                onDragEnd={(e) => {
                  const stage = stageRef.current;
                  if (!stage) return;

                  const node = e.target;
                  if (!node) return;
                  const nodePos = { x: node.x(), y: node.y() };

                  // 이미지 범위 내로 클램핑
                  const clampedPos = clampPosition(nodePos, stageSize);

                  // 해당 점만 업데이트
                  const updatedPoints = [...annotation.points];
                  updatedPoints[index] = clampedPos;

                  const updated = {
                    ...annotation,
                    points: updatedPoints,
                  } as PointBasedAnnotation;

                  // 노드 위치를 업데이트된 좌표로 설정
                  node.x(clampedPos.x);
                  node.y(clampedPos.y);

                  // 최종 상태 확정
                  onTransformEnd(updated);
                }}
              />
            );
          }
        )}
    </>
  );
}
