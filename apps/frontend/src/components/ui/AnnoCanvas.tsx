import { useRef, useState, useEffect } from "react";
import Konva from "konva";
import { Stage, Layer, Image, Rect, Transformer } from "react-konva";
import useImage from "use-image";

interface AnnoCanvasProps {
  imageUrl?: string;
  zoomLimit?: {
    min: number;
    max: number;
  };
}

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AnnoCanvas({
  imageUrl,
  zoomLimit = { min: 0.1, max: 20 },
}: AnnoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [image] = useImage(imageUrl ?? "");
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [stageSize, setStageSize] = useState({
    width: 0,
    height: 0,
  });

  // 바운딩 박스 관련 상태
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [newBox, setNewBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [firstPoint, setFirstPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

  // 선택된 박스와 Transformer 동기화
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;

    if (!transformer || !stage) return;

    if (selectedId) {
      const selectedNode = stage.findOne("#" + selectedId);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  // Delete 키로 선택된 박스 삭제, ESC 키로 그리기 취소
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setBoxes(boxes.filter((box) => box.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === "Escape" && isDrawingMode) {
        // 그리기 모드 취소
        setIsDrawingMode(false);
        setFirstPoint(null);
        setNewBox(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, boxes, isDrawingMode]);

  // Stage 밖 클릭으로 박스 확정 (확대 시)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isDrawingMode || !newBox || !firstPoint) return;

      const stage = stageRef.current;
      if (!stage) return;

      // Stage 영역 확인
      const container = stage.container();
      const rect = container.getBoundingClientRect();
      const clickedInsideStage =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      // Stage 밖을 클릭한 경우 박스 확정
      if (!clickedInsideStage && newBox.width > 5 && newBox.height > 5) {
        const box: Box = {
          id: `box-${Date.now()}`,
          x: newBox.x,
          y: newBox.y,
          width: newBox.width,
          height: newBox.height,
        };
        setBoxes([...boxes, box]);
        setIsDrawingMode(false);
        setFirstPoint(null);
        setNewBox(null);
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isDrawingMode, newBox, firstPoint, boxes]);

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

  // 클릭: 바운딩 박스 그리기 (첫 클릭 / 두번째 클릭)
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 첫 번째 클릭: 이미지를 클릭한 경우만 처리
    // 두 번째 클릭: 그리기 모드 중이면 어디든 가능 (이미지 끝에서 확정)
    if (!isDrawingMode && e.target !== e.target.getStage()?.findOne("Image")) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Stage의 transform을 고려하여 실제 이미지 좌표로 변환
    const transform = stage.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pos);

    // 이미지 영역 내로 좌표 제한
    const clampedPos = {
      x: Math.max(0, Math.min(stageSize.width, localPos.x)),
      y: Math.max(0, Math.min(stageSize.height, localPos.y)),
    };

    if (!isDrawingMode) {
      // 첫 번째 클릭: 그리기 시작
      setIsDrawingMode(true);
      setFirstPoint(clampedPos);
      setNewBox({
        x: clampedPos.x,
        y: clampedPos.y,
        width: 0,
        height: 0,
      });
      setSelectedId(null);
    } else if (firstPoint) {
      // 두 번째 클릭: 박스 확정
      setIsDrawingMode(false);

      if (newBox && newBox.width > 5 && newBox.height > 5) {
        const box: Box = {
          id: `box-${Date.now()}`,
          x: newBox.x,
          y: newBox.y,
          width: newBox.width,
          height: newBox.height,
        };
        setBoxes([...boxes, box]);
      }

      setFirstPoint(null);
      setNewBox(null);
    }
  };

  // 마우스 무브: 바운딩 박스 프리뷰
  const handleMouseMove = () => {
    if (!isDrawingMode || !firstPoint) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Stage의 transform을 고려하여 실제 이미지 좌표로 변환
    const transform = stage.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pos);

    // 이미지 영역 내로 좌표 제한
    const clampedPos = {
      x: Math.max(0, Math.min(stageSize.width, localPos.x)),
      y: Math.max(0, Math.min(stageSize.height, localPos.y)),
    };

    setNewBox({
      x: Math.min(firstPoint.x, clampedPos.x),
      y: Math.min(firstPoint.y, clampedPos.y),
      width: Math.abs(clampedPos.x - firstPoint.x),
      height: Math.abs(clampedPos.y - firstPoint.y),
    });
  };
  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center w-full h-full"
    >
      {stageSize.width > 0 && (
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          ref={stageRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        >
          <Layer>
            <Image
              image={image}
              width={stageSize.width}
              height={stageSize.height}
              onWheel={handleWheel}
            />
          </Layer>
          <Layer>
            {/* 기존 바운딩 박스들 */}
            {boxes.map((box) => (
              <Rect
                key={box.id}
                id={box.id}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                stroke="#ff0000"
                strokeWidth={2 / (stageRef.current?.scaleX() || 1)}
                fill="transparent"
                fillEnabled={false}
                perfectDrawEnabled={false}
                hitStrokeWidth={20}
                draggable
                onClick={() => setSelectedId(box.id)}
                onTap={() => setSelectedId(box.id)}
                dragBoundFunc={(pos) => {
                  // 박스가 이미지 영역을 벗어나지 않도록 제한 (로컬 좌표계)
                  const stage = stageRef.current;
                  if (!stage) return pos;
                  const node = stage.findOne("#" + box.id);
                  if (!node) return pos;

                  const scaleX = stage.scaleX();
                  const scaleY = stage.scaleY();
                  const width = node.width();
                  const height = node.height();

                  let x = pos.x;
                  let y = pos.y;

                  if (x < stage.x()) {
                    x = stage.x();
                  }
                  if (y < stage.y()) {
                    y = stage.y();
                  }

                  if (
                    x + width * scaleX >
                    stage.x() + stageSize.width * scaleX
                  ) {
                    x = stage.x() + stageSize.width * scaleX - width * scaleX;
                  }
                  if (
                    y + height * scaleY >
                    stage.y() + stageSize.height * scaleY
                  ) {
                    y = stage.y() + stageSize.height * scaleY - height * scaleY;
                  }

                  return { x, y };
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  const updatedBoxes = boxes.map((b) =>
                    b.id === box.id
                      ? {
                          ...b,
                          x: node.x(),
                          y: node.y(),
                        }
                      : b
                  );
                  setBoxes(updatedBoxes);
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  // reset scale
                  node.scaleX(1);
                  node.scaleY(1);

                  // 크기 계산 (절댓값 사용)
                  const x = node.x();
                  const y = node.y();
                  const width = node.width() * scaleX;
                  const height = node.height() * scaleY;

                  // 노드와 상태 업데이트
                  node.x(x);
                  node.y(y);
                  node.width(width);
                  node.height(height);

                  const updatedBoxes = boxes.map((b) =>
                    b.id === box.id ? { ...b, x, y, width, height } : b
                  );
                  setBoxes(updatedBoxes);
                }}
              />
            ))}

            {/* 그리는 중인 새 바운딩 박스 */}
            {newBox && (
              <Rect
                x={newBox.x}
                y={newBox.y}
                width={newBox.width}
                height={newBox.height}
                stroke="#00ff00"
                strokeWidth={2 / (stageRef.current?.scaleX() || 1)}
                fill="transparent"
                dash={[4, 4]}
                listening={false}
              />
            )}

            {/* Transformer: 선택된 박스를 편집 */}
            {selectedId && (
              <Transformer
                ref={transformerRef}
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
                  const minSize = 5;

                  // 음수 정규화 먼저
                  let x = newBox.x;
                  let y = newBox.y;
                  let width = newBox.width;
                  let height = newBox.height;

                  if (width < 0) {
                    x += width;
                    width = -width;
                  }
                  if (height < 0) {
                    y += height;
                    height = -height;
                  }
                  if (x < 0 || y < 0) {
                    return oldBox;
                  }

                  // 최소 크기 체크 (정규화 후)
                  if (width < minSize || height < minSize) {
                    return oldBox;
                  }

                  const stage = stageRef.current;
                  if (!stage) return oldBox;
                  const scaleX = stage.scaleX();
                  const scaleY = stage.scaleY();

                  // 이미지 영역 내로 강제 제한
                  // 1. 박스가 이미지보다 크면 제한
                  const maxWidth = stageSize.width * scaleX;
                  const maxHeight = stageSize.height * scaleY;

                  // 2. x, y 경계 체크
                  if (x < stage.x()) {
                    // 왼쪽 경계를 벗어나면, width를 줄이고 x를 0으로
                    width = Math.max(minSize, width - (stage.x() - x));
                    x = stage.x();
                  }
                  if (y < stage.y()) {
                    // 위쪽 경계를 벗어나면, height를 줄이고 y를 0으로
                    height = Math.max(minSize, height - (stage.y() - y));
                    y = stage.y();
                  }

                  // 3. 오른쪽/아래쪽 경계 체크
                  if (x + width > stage.x() + maxWidth) {
                    // 방법 1: width를 줄임
                    width = Math.max(minSize, stage.x() + maxWidth - x);
                  }
                  if (y + height > stage.y() + maxHeight) {
                    // 방법 1: height를 줄임
                    height = Math.max(minSize, stage.y() + maxHeight - y);
                  }

                  // 4. 최종 안전 체크
                  x = Math.max(
                    stage.x(),
                    Math.min(x, stage.x() + maxWidth - minSize)
                  );
                  y = Math.max(
                    stage.y(),
                    Math.min(y, stage.y() + maxHeight - minSize)
                  );
                  width = Math.max(
                    minSize,
                    Math.min(width, stage.x() + maxWidth - x)
                  );
                  height = Math.max(
                    minSize,
                    Math.min(height, stage.y() + maxHeight - y)
                  );

                  return { x, y, width, height, rotation: 0 };
                }}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
