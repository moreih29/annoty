import { useState, useRef } from "react";
import AnnoCanvas, { type AnnoCanvasRef } from "@/components/ui/AnnoCanvas";
import { AnnotationType, type AnnotationTypeValue } from "@/types/annotation";
import { Button } from "@/components/ui/button";
import {
  Square,
  Hexagon,
  Minus,
  Paintbrush,
  Eraser,
  Check,
} from "lucide-react";

function Home() {
  const [annotationType, setAnnotationType] = useState<AnnotationTypeValue>(
    AnnotationType.Brush
  );
  const [eraserMode, setEraserMode] = useState(false);
  const annoCanvasRef = useRef<AnnoCanvasRef>(null);

  const handleAnnotationTypeChange = (type: AnnotationTypeValue) => {
    setAnnotationType(type);
    // 타입 변경 시 항상 지우개 모드 해제 (브러시 모드로 전환)
    setEraserMode(false);
  };

  const handleEraserToggle = () => {
    if (annotationType === AnnotationType.Brush) {
      setEraserMode(!eraserMode);
    }
  };

  const handleConfirmBrush = () => {
    annoCanvasRef.current?.confirmBrushAnnotation();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 상단 툴바 */}
      <div className="flex gap-2 p-4 bg-gray-800 border-b border-gray-700 justify-center items-center">
        <Button
          variant={
            annotationType === AnnotationType.Box ? "default" : "outline"
          }
          size="icon"
          onClick={() => handleAnnotationTypeChange(AnnotationType.Box)}
          title="Box"
        >
          <Square className="h-5 w-5" />
        </Button>
        <Button
          variant={
            annotationType === AnnotationType.Polygon ? "default" : "outline"
          }
          size="icon"
          onClick={() => handleAnnotationTypeChange(AnnotationType.Polygon)}
          title="Polygon"
        >
          <Hexagon className="h-5 w-5" />
        </Button>
        <Button
          variant={
            annotationType === AnnotationType.Polyline ? "default" : "outline"
          }
          size="icon"
          onClick={() => handleAnnotationTypeChange(AnnotationType.Polyline)}
          title="Polyline"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Button
          variant={
            annotationType === AnnotationType.Brush && !eraserMode
              ? "default"
              : "outline"
          }
          size="icon"
          onClick={() => handleAnnotationTypeChange(AnnotationType.Brush)}
          title="Brush"
        >
          <Paintbrush className="h-5 w-5" />
        </Button>
        <Button
          variant={
            annotationType === AnnotationType.Brush && eraserMode
              ? "default"
              : "outline"
          }
          size="icon"
          onClick={handleEraserToggle}
          disabled={annotationType !== AnnotationType.Brush}
          title="Eraser"
        >
          <Eraser className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleConfirmBrush}
          disabled={annotationType !== AnnotationType.Brush}
          title="확정"
        >
          <Check className="h-5 w-5" />
        </Button>
      </div>

      {/* 캔버스 영역 */}
      <div className="flex-1 flex justify-center items-center">
        <AnnoCanvas
          ref={annoCanvasRef}
          imageUrl="https://images.unsplash.com/photo-1755522034317-6693bc3b768d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1587"
          annotationType={annotationType}
          eraserMode={eraserMode}
        />
      </div>
    </div>
  );
}

export default Home;
