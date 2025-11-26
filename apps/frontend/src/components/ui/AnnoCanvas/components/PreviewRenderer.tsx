import Konva from "konva";
import { Rect, Line, Image } from "react-konva";
import { useEffect, useState } from "react";
import { AnnotationType } from "@/types/annotation";
import type { Point, BrushStroke } from "@/types/annotation";
import type { BoxFinishData } from "../handlers/types";
import { strokesToImage } from "../utils/brushUtils";

interface PreviewRendererProps {
  annotationType: string;
  stageRef: React.RefObject<Konva.Stage | null>;
  // Box preview
  newBox: BoxFinishData | null;
  // Polygon preview
  polygonPoints: Point[];
  // Polyline preview
  polylinePoints: Point[];
  // Brush preview (작업 중인 모든 스트로크)
  brushStrokes: BrushStroke[];
  // Brush preview (현재 그리는 중인 스트로크)
  currentBrushStroke: BrushStroke | null;
}

export default function PreviewRenderer({
  annotationType,
  stageRef,
  newBox,
  polygonPoints,
  polylinePoints,
  brushStrokes,
  currentBrushStroke,
}: PreviewRendererProps) {
  const strokeWidth = 2 / (stageRef.current?.scaleX() || 1);
  const [brushImage, setBrushImage] = useState<HTMLImageElement | null>(null);
  const [brushBounds, setBrushBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Brush 프리뷰: 모든 스트로크(brushStrokes + currentBrushStroke)를 이미지로 렌더링
  useEffect(() => {
    if (annotationType === AnnotationType.Brush) {
      // brushStrokes와 currentBrushStroke를 합쳐서 렌더링
      const allStrokes = currentBrushStroke
        ? [...brushStrokes, currentBrushStroke]
        : brushStrokes;

      // 최소 2개 이상의 점을 가진 스트로크만 필터링
      const validStrokes = allStrokes.filter(
        (stroke) => stroke.points.length >= 2
      );

      if (validStrokes.length === 0) {
        setBrushImage(null);
        setBrushBounds(null);
        return;
      }

      const result = strokesToImage(validStrokes);
      if (result) {
        const handleLoad = () => {
          setBrushImage(result.image);
          setBrushBounds({
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
          });
        };
        if (result.image.complete) {
          handleLoad();
        } else {
          result.image.onload = handleLoad;
        }
      } else {
        setBrushImage(null);
        setBrushBounds(null);
      }
    } else {
      setBrushImage(null);
      setBrushBounds(null);
    }
  }, [annotationType, brushStrokes, currentBrushStroke]);

  return (
    <>
      {/* Box 프리뷰 */}
      {annotationType === AnnotationType.Box && newBox && (
        <Rect
          x={newBox.x}
          y={newBox.y}
          width={newBox.width}
          height={newBox.height}
          stroke="#00ff00"
          strokeWidth={strokeWidth}
          fill="transparent"
          dash={[4, 4]}
          listening={false}
        />
      )}

      {/* Polygon 프리뷰 */}
      {annotationType === AnnotationType.Polygon &&
        polygonPoints.length > 0 && (
          <Line
            points={polygonPoints.flatMap((p) => [p.x, p.y])}
            stroke="#00ff00"
            strokeWidth={strokeWidth}
            fill="rgba(0, 255, 0, 0.1)"
            closed={false}
            dash={[4, 4]}
            listening={false}
          />
        )}

      {/* Polyline 프리뷰 */}
      {annotationType === AnnotationType.Polyline &&
        polylinePoints.length > 0 && (
          <Line
            points={polylinePoints.flatMap((p) => [p.x, p.y])}
            stroke="#00ff00"
            strokeWidth={strokeWidth}
            fill="transparent"
            closed={false}
            dash={[4, 4]}
            listening={false}
          />
        )}

      {/* Brush 프리뷰 */}
      {annotationType === AnnotationType.Brush && brushImage && brushBounds && (
        <Image
          image={brushImage}
          x={brushBounds.x}
          y={brushBounds.y}
          width={brushBounds.width}
          height={brushBounds.height}
          listening={false}
          opacity={0.7}
        />
      )}
    </>
  );
}
