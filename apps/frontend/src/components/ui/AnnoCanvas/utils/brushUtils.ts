import type { BrushStroke } from "@/types/annotation";

/**
 * 스트로크들의 바운딩 박스 계산
 */
export function calculateStrokesBounds(strokes: BrushStroke[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    for (const point of stroke.points) {
      const halfWidth = stroke.width / 2;
      minX = Math.min(minX, point.x - halfWidth);
      minY = Math.min(minY, point.y - halfWidth);
      maxX = Math.max(maxX, point.x + halfWidth);
      maxY = Math.max(maxY, point.y + halfWidth);
    }
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 스트로크를 캔버스에 그리기
 */
export function drawStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: BrushStroke,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  if (stroke.points.length === 0) return;

  ctx.save();

  // 브러시/지우개 모드에 따라 composite operation 설정
  if (stroke.type === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
  }

  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  const firstPoint = stroke.points[0];
  ctx.moveTo(firstPoint.x - offsetX, firstPoint.y - offsetY);

  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i];
    ctx.lineTo(point.x - offsetX, point.y - offsetY);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * 모든 스트로크를 캔버스에 그리기
 */
export function drawStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: BrushStroke[],
  offsetX: number = 0,
  offsetY: number = 0
): void {
  for (const stroke of strokes) {
    drawStrokeOnCanvas(ctx, stroke, offsetX, offsetY);
  }
}

/**
 * 스트로크 데이터를 HTML Image로 변환 (캐시 생성용)
 * 반환값: { image: HTMLImageElement, x: number, y: number, width: number, height: number }
 */
export function strokesToImage(
  strokes: BrushStroke[],
  padding: number = 10
): {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (strokes.length === 0) return null;

  const bounds = calculateStrokesBounds(strokes);
  if (!bounds) return null;

  // 패딩 추가
  const canvasWidth = Math.ceil(bounds.width + padding * 2);
  const canvasHeight = Math.ceil(bounds.height + padding * 2);

  // 캔버스 생성
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 배경 투명
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 오프셋 계산: 스트로크를 캔버스의 (padding, padding) 위치에 그리기 위해
  // bounds.x, bounds.y를 (padding, padding)으로 이동시키는 오프셋
  const offsetX = bounds.x - padding;
  const offsetY = bounds.y - padding;

  // 스트로크 그리기
  drawStrokesOnCanvas(ctx, strokes, offsetX, offsetY);

  // Image 객체 생성
  const image = new Image();
  image.src = canvas.toDataURL("image/png");

  return {
    image,
    x: bounds.x - padding, // 이미지 배치 위치 (패딩 고려)
    y: bounds.y - padding,
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * 스트로크 데이터를 이미지 데이터(Data URL)로 변환 (저장용)
 */
export function strokesToImageData(
  strokes: BrushStroke[],
  padding: number = 10
): {
  imageData: string;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (strokes.length === 0) return null;

  const bounds = calculateStrokesBounds(strokes);
  if (!bounds) return null;

  // 패딩 추가
  const canvasWidth = Math.ceil(bounds.width + padding * 2);
  const canvasHeight = Math.ceil(bounds.height + padding * 2);

  // 캔버스 생성
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 배경 투명
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 오프셋 계산 (패딩 고려)
  const offsetX = bounds.x - padding;
  const offsetY = bounds.y - padding;

  // 스트로크 그리기
  drawStrokesOnCanvas(ctx, strokes, offsetX, offsetY);

  return {
    imageData: canvas.toDataURL("image/png"),
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * 스트로크 데이터의 해시 생성 (캐시 무효화 판단용)
 */
export function getStrokesHash(strokes: BrushStroke[]): string {
  // 간단한 해시: 스트로크 개수와 각 스트로크의 포인트 개수
  const hashParts = strokes.map(
    (stroke) => `${stroke.type}-${stroke.points.length}`
  );
  return hashParts.join("|");
}
