import {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import Konva from "konva";
import { Stage, Layer, Image } from "react-konva";
import useImage from "use-image";
import { useHistory } from "@/hooks/useHistory";
import {
  AnnotationType,
  type Annotation,
  type AnnotationTypeValue,
  type BoxAnnotation,
  type Point,
  type BrushStroke,
} from "@/types/annotation";
import { createAnnotationHandler } from "./handlers/handlerFactory";
import { updateAnnotationNode, redrawAllLayers } from "./utils/konvaUtils";
import { generateAnnotationId } from "./utils/annotationUtils";
import AnnotationRenderer from "./AnnotationRenderer";
import { useAnnotationHandlers } from "./hooks/useAnnotationHandlers";
import PreviewRenderer from "./components/PreviewRenderer";
import type { BoxFinishData } from "./handlers/types";
import type { BrushAnnotation } from "@/types/annotation";

interface AnnoCanvasProps {
  imageUrl?: string;
  annotationType: AnnotationTypeValue;
  eraserMode?: boolean;
  zoomLimit?: {
    min: number;
    max: number;
  };
}

export interface AnnoCanvasRef {
  confirmBrushAnnotation: () => void;
}

const AnnoCanvas = forwardRef<AnnoCanvasRef, AnnoCanvasProps>(
  function AnnoCanvas(
    {
      imageUrl,
      annotationType,
      eraserMode = false,
      zoomLimit = { min: 0.1, max: 20 },
    },
    ref
  ) {
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

    // 어노테이션 관련 상태
    const history = useHistory<Annotation[]>({
      initialValue: [],
      maxHistorySize: 50,
    });
    const annotations = history.current;
    const setAnnotations = history.push;
    const [newBox, setNewBox] = useState<BoxFinishData | null>(null);
    const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
    const [polylinePoints, setPolylinePoints] = useState<Point[]>([]);
    const [currentBrushStroke, setCurrentBrushStroke] =
      useState<BrushStroke | null>(null);
    const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [firstPoint, setFirstPoint] = useState<Point | null>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);

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

    // 선택된 어노테이션과 Transformer 동기화는 AnnotationRenderer에서 처리

    // annotations 변경 시 Konva 노드 동기화 (undo/redo 대응)
    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;

      annotations.forEach((annotation) => {
        updateAnnotationNode(stage, annotation);
      });

      redrawAllLayers(stage);
    }, [annotations]);

    // Delete 키로 선택된 박스 삭제, ESC 키로 그리기 취소, Cmd+Z/Cmd+Shift+Z (Mac) 또는 Ctrl+Z/Ctrl+Shift+Z (Windows/Linux)로 undo/redo
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // 플랫폼별 단축키: Mac은 Meta 키, Windows/Linux는 Ctrl 키 사용
        const isModifierPressed = e.metaKey || e.ctrlKey;

        // Undo: Cmd+Z (Mac) 또는 Ctrl+Z (Windows/Linux)
        if (isModifierPressed && e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          if (history.canUndo) {
            history.undo();
            setSelectedId(null);
          }
          return;
        }

        // Redo: Cmd+Shift+Z (Mac) 또는 Ctrl+Shift+Z (Windows/Linux)
        if (isModifierPressed && e.shiftKey && e.key === "z") {
          e.preventDefault();
          if (history.canRedo) {
            history.redo();
            setSelectedId(null);
          }
          return;
        }

        // Delete/Backspace: 선택된 어노테이션 삭제
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setAnnotations(
            annotations.filter((annotation) => annotation.id !== selectedId)
          );
          setSelectedId(null);
        } else if (e.key === "Escape" && isDrawingMode) {
          // 그리기 모드 취소 또는 완료
          if (annotationType === AnnotationType.Polygon) {
            const handler = createAnnotationHandler(AnnotationType.Polygon);
            if (handler) {
              // Polygon 완료 시도
              handler.setCallbacks({
                onFinishDrawing: (polygon) => {
                  if (polygon) {
                    setAnnotations([...annotations, polygon]);
                  }
                  setIsDrawingMode(false);
                  setPolygonPoints([]);
                },
                onCancelDrawing: () => {
                  setIsDrawingMode(false);
                  setPolygonPoints([]);
                },
                onAddPoint: () => {},
              });
              handler.handleFinish(polygonPoints);
            }
          } else if (annotationType === AnnotationType.Polyline) {
            const handler = createAnnotationHandler(AnnotationType.Polyline);
            if (handler) {
              // Polyline 완료 시도
              handler.setCallbacks({
                onFinishDrawing: (polyline) => {
                  if (polyline) {
                    setAnnotations([...annotations, polyline]);
                  }
                  setIsDrawingMode(false);
                  setPolylinePoints([]);
                },
                onCancelDrawing: () => {
                  setIsDrawingMode(false);
                  setPolylinePoints([]);
                },
                onAddPoint: () => {},
              });
              handler.handleFinish(polylinePoints);
            }
          } else {
            // Box, Brush는 취소만
            setIsDrawingMode(false);
            setFirstPoint(null);
            setNewBox(null);
            setCurrentBrushStroke(null);
            setBrushStrokes([]);
            setIsMouseDown(false);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      selectedId,
      annotations,
      isDrawingMode,
      history,
      setAnnotations,
      annotationType,
      polygonPoints,
      polylinePoints,
    ]);

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

        // Stage 밖을 클릭한 경우 어노테이션 확정 (Box만 지원)
        if (
          !clickedInsideStage &&
          annotationType === AnnotationType.Box &&
          newBox &&
          newBox.width > 5 &&
          newBox.height > 5
        ) {
          const box: BoxAnnotation = {
            id: `box-${Date.now()}`,
            type: AnnotationType.Box,
            x: newBox.x,
            y: newBox.y,
            width: newBox.width,
            height: newBox.height,
          };
          setAnnotations([...annotations, box]);
          setIsDrawingMode(false);
          setFirstPoint(null);
          setNewBox(null);
        }
      };

      document.addEventListener("click", handleGlobalClick);
      return () => document.removeEventListener("click", handleGlobalClick);
    }, [
      isDrawingMode,
      newBox,
      firstPoint,
      annotations,
      setAnnotations,
      annotationType,
    ]);

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
        const newScale =
          direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

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

    // 브러시 어노테이션 확정 함수
    const confirmBrushAnnotation = () => {
      if (brushStrokes.length === 0 && !currentBrushStroke) return;

      const allStrokes = currentBrushStroke
        ? [...brushStrokes, currentBrushStroke]
        : brushStrokes;

      // 최소 2개 이상의 점을 가진 스트로크만 유효
      const validStrokes = allStrokes.filter(
        (stroke) => stroke.points.length >= 2
      );

      if (validStrokes.length === 0) return;

      const brush: BrushAnnotation = {
        id: generateAnnotationId(),
        type: AnnotationType.Brush,
        strokes: validStrokes,
      };

      setAnnotations([...annotations, brush]);
      setBrushStrokes([]);
      setCurrentBrushStroke(null);
      setIsDrawingMode(false);
    };

    // 확정 함수를 외부에서 호출할 수 있도록 ref에 노출
    useImperativeHandle(ref, () => ({
      confirmBrushAnnotation,
    }));

    // 어노테이션 핸들러 훅 사용
    const { handleClick, handleMouseDown, handleMouseUp, handleMouseMove } =
      useAnnotationHandlers({
        annotationType,
        eraserMode,
        stageRef,
        stageSize,
        isDrawingMode,
        setIsDrawingMode,
        setSelectedId,
        setAnnotations,
        annotations,
        firstPoint,
        setFirstPoint,
        newBox,
        setNewBox,
        polygonPoints,
        setPolygonPoints,
        polylinePoints,
        setPolylinePoints,
        currentBrushStroke,
        setCurrentBrushStroke,
        setBrushStrokes,
        isMouseDown,
        setIsMouseDown,
      });
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
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
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
              {/* 기존 어노테이션들 */}
              {annotations.map((annotation) => (
                <AnnotationRenderer
                  key={annotation.id}
                  annotation={annotation}
                  stageRef={stageRef}
                  stageSize={stageSize}
                  isSelected={selectedId === annotation.id}
                  onSelect={setSelectedId}
                  onDragEnd={(updated) => {
                    const updatedAnnotations = annotations.map((a) =>
                      a.id === updated.id ? updated : a
                    );
                    setAnnotations(updatedAnnotations);
                  }}
                  onTransformEnd={(updated) => {
                    const updatedAnnotations = annotations.map((a) =>
                      a.id === updated.id ? updated : a
                    );
                    setAnnotations(updatedAnnotations);
                  }}
                />
              ))}

              {/* 그리는 중인 프리뷰 */}
              <PreviewRenderer
                annotationType={annotationType}
                stageRef={stageRef}
                newBox={newBox}
                polygonPoints={polygonPoints}
                polylinePoints={polylinePoints}
                brushStrokes={brushStrokes}
                currentBrushStroke={currentBrushStroke}
              />
            </Layer>
          </Stage>
        )}
      </div>
    );
  }
);

export default AnnoCanvas;
