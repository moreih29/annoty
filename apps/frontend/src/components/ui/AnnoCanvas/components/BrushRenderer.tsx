import Konva from "konva";
import { Image, Rect } from "react-konva";
import { useEffect, useRef, useState } from "react";
import type { BrushAnnotation } from "@/types/annotation";
import {
  strokesToImage,
  getStrokesHash,
  calculateStrokesBounds,
} from "../utils/brushUtils";

interface BrushRendererProps {
  annotation: BrushAnnotation;
  stageRef: React.RefObject<Konva.Stage | null>;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (annotation: BrushAnnotation) => void;
  onTransformEnd: (annotation: BrushAnnotation) => void;
}

export default function BrushRenderer({
  annotation,
  stageRef: _stageRef, // eslint-disable-line @typescript-eslint/no-unused-vars
  stageSize: _stageSize, // eslint-disable-line @typescript-eslint/no-unused-vars
  isSelected,
  onSelect,
  onDragEnd: _onDragEnd, // eslint-disable-line @typescript-eslint/no-unused-vars
  onTransformEnd: _onTransformEnd, // eslint-disable-line @typescript-eslint/no-unused-vars
}: BrushRendererProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [bounds, setBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);
  const strokesHashRef = useRef<string>("");

  // 캐시된 이미지가 있으면 사용, 없으면 생성
  useEffect(() => {
    if (annotation.strokes.length === 0) {
      setImage(null);
      setBounds(null);
      return;
    }

    const currentHash = getStrokesHash(annotation.strokes);

    // 캐시된 이미지가 있고 해시가 같으면 재사용
    if (annotation._cachedImage && strokesHashRef.current === currentHash) {
      const cachedImg = new window.Image();
      cachedImg.src = annotation._cachedImage;
      const handleLoad = () => {
        setImage(cachedImg);
        // 캐시된 이미지의 경우 bounds도 저장되어 있어야 하지만, 없으면 계산
        const calculatedBounds = calculateStrokesBounds(annotation.strokes);
        if (calculatedBounds) {
          const padding = 10;
          setBounds({
            x: calculatedBounds.x - padding,
            y: calculatedBounds.y - padding,
            width: calculatedBounds.width + padding * 2,
            height: calculatedBounds.height + padding * 2,
          });
        }
      };
      if (cachedImg.complete) {
        handleLoad();
      } else {
        cachedImg.onload = handleLoad;
      }
      return;
    }

    // 캐시가 없거나 변경되었으면 새로 생성
    const result = strokesToImage(annotation.strokes);
    if (result) {
      const handleLoad = () => {
        setImage(result.image);
        setBounds({
          x: result.x,
          y: result.y,
          width: result.width,
          height: result.height,
        });

        // 캐시 업데이트 (실제로는 부모 컴포넌트에서 관리해야 하지만, 여기서는 참고용)
        strokesHashRef.current = currentHash;
      };
      if (result.image.complete) {
        handleLoad();
      } else {
        result.image.onload = handleLoad;
      }
    } else {
      setImage(null);
      setBounds(null);
    }
  }, [annotation.strokes, annotation._cachedImage]);

  if (!image || !bounds) return null;

  return (
    <>
      <Image
        key={annotation.id}
        id={annotation.id}
        ref={imageRef}
        image={image}
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        perfectDrawEnabled={false}
        hitStrokeWidth={20}
        onClick={() => onSelect(annotation.id)}
        onTap={() => onSelect(annotation.id)}
        draggable={false} // 브러시는 드래그 비활성화
      />
      {isSelected && (
        // 선택 상태일 때 바운딩 박스 표시
        <Rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          stroke="#00ff00"
          strokeWidth={2}
          fill="transparent"
          dash={[4, 4]}
          listening={false}
        />
      )}
    </>
  );
}
