import { useRef, useState, useEffect } from "react";
import Konva from "konva";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";

interface AnnoCanvasProps {
  imageUrl?: string;
  zoomLimit?: {
    min: number;
    max: number;
  };
}

export default function AnnoCanvas({
  imageUrl,
  zoomLimit = { min: 0.1, max: 20 },
}: AnnoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [image] = useImage(imageUrl ?? "");
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [stageSize, setStageSize] = useState({
    width: 0,
    height: 0,
  });

  // 이미지 로드되면 Stage 크기 계산
  useEffect(() => {
    if (!image) return;

    const imageWidth = image.width;
    const imageHeight = image.height;
    const imageRatio = imageWidth / imageHeight;

    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    const containerRatio = containerWidth / containerHeight;

    let stageWidth, stageHeight;

    // 이미지 비율에 맞춰 container를 최대한 채우기
    if (imageRatio > containerRatio) {
      stageWidth = containerWidth;
      stageHeight = containerWidth / imageRatio;
    } else {
      stageHeight = containerHeight;
      stageWidth = containerHeight * imageRatio;
    }

    // Stage 크기가 변경되면 scale과 position을 비율에 맞게 조정
    const stage = stageRef.current;
    if (stage && stageSize.width > 0 && stageSize.height > 0) {
      const oldStageWidth = stageSize.width;
      const oldStageHeight = stageSize.height;

      // 크기 변화 비율 계산
      const scaleRatioX = stageWidth / oldStageWidth;
      const scaleRatioY = stageHeight / oldStageHeight;

      // 현재 position 가져오기
      const currentPos = stage.position();

      // 비율에 맞게 조정
      // scale은 그대로 유지하고, position만 비율에 맞게 조정
      stage.position({
        x: currentPos.x * scaleRatioX,
        y: currentPos.y * scaleRatioY,
      });
    }

    setStageSize({
      width: stageWidth,
      height: stageHeight,
    });
  }, [image, containerSize, stageSize.width, stageSize.height]);

  // Container 크기 변경 감지 (debounced)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: number;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // Debounce: 100ms 후에 실행
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }, 100);
      }
    });

    resizeObserver.observe(container);
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const scaleBy = 1.05;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      if (newScale > zoomLimit.max || newScale < zoomLimit.min) {
        return;
      }

      stage.scale({ x: newScale, y: newScale });

      let newPos;

      if (newScale < 1) {
        // scale이 1보다 작으면 이미지를 중앙에 고정
        const stageCenter = {
          x: stageSize.width / 2,
          y: stageSize.height / 2,
        };
        const viewportCenter = {
          x: stageSize.width / 2,
          y: stageSize.height / 2,
        };
        newPos = {
          x: viewportCenter.x - stageCenter.x * newScale,
          y: viewportCenter.y - stageCenter.y * newScale,
        };
      } else {
        // scale이 1 이상이면 마우스 위치를 중심으로
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
      }

      stage.position(newPos);
    }
  };
  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center w-full h-full"
    >
      {stageSize.width > 0 && (
        <Stage width={stageSize.width} height={stageSize.height} ref={stageRef}>
          <Layer>
            <Image
              image={image}
              width={stageSize.width}
              height={stageSize.height}
              onWheel={handleWheel}
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
}
