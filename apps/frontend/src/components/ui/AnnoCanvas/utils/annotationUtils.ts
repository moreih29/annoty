import Konva from "konva";
import type { Point } from "@/types/annotation";

/**
 * Stage의 포인터 위치를 실제 이미지 좌표로 변환
 */
export function getLocalPosition(
  stage: Konva.Stage,
  pointerPos: { x: number; y: number } | null
): Point | null {
  if (!pointerPos) return null;

  const transform = stage.getAbsoluteTransform().copy().invert();
  const localPos = transform.point(pointerPos);
  return { x: localPos.x, y: localPos.y };
}

/**
 * 좌표를 이미지 영역 내로 제한
 */
export function clampPosition(
  pos: Point,
  stageSize: { width: number; height: number }
): Point {
  return {
    x: Math.max(0, Math.min(stageSize.width, pos.x)),
    y: Math.max(0, Math.min(stageSize.height, pos.y)),
  };
}

/**
 * Stage의 포인터 위치를 이미지 좌표로 변환하고 클램핑
 */
export function getClampedLocalPosition(
  stage: Konva.Stage,
  pointerPos: { x: number; y: number } | null,
  stageSize: { width: number; height: number }
): Point | null {
  const localPos = getLocalPosition(stage, pointerPos);
  if (!localPos) return null;
  return clampPosition(localPos, stageSize);
}

/**
 * 두 점 사이의 거리 계산
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 점이 이미지 영역 내에 있는지 확인
 */
export function isPointInBounds(
  point: Point,
  offset: Point = { x: 0, y: 0 },
  stageSize: { width: number; height: number }
): boolean {
  return (
    point.x >= offset.x &&
    point.x <= stageSize.width + offset.x &&
    point.y >= offset.y &&
    point.y <= stageSize.height + offset.y
  );
}

/**
 * 고유 ID 생성
 */
export function generateAnnotationId(): string {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 점 배열의 바운딩 박스 계산
 */
export function getBoundingBox(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (points.length === 0) return null;

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * 점 배열의 모든 점을 이미지 범위 내로 클램핑
 */
export function clampPoints(
  points: Point[],
  stageSize: { width: number; height: number }
): Point[] {
  return points
    .map((point) => {
      // null이나 undefined 체크
      if (
        point == null ||
        typeof point.x !== "number" ||
        typeof point.y !== "number"
      ) {
        return null;
      }
      return clampPosition(point, stageSize);
    })
    .filter((point): point is Point => point !== null);
}

/**
 * 점 기반 어노테이션의 드래그 바운드 계산
 * 모든 점이 이미지 범위 내에 있도록 제한
 */
export function getPointsDragBounds(
  stage: Konva.Stage,
  stageSize: { width: number; height: number },
  points: Point[],
  _node: Konva.Node,
  pos: { x: number; y: number }
): { x: number; y: number } | null {
  if (points.length === 0) return null;

  const scaleX = stage.scaleX();
  const scaleY = stage.scaleY();
  const delta = {
    x: (pos.x - stage.x()) / scaleX,
    y: (pos.y - stage.y()) / scaleY,
  };
  // 드래그 후의 점들 계산
  const movedPoints = points.map((point) => ({
    x: point.x + delta.x,
    y: point.y + delta.y,
  }));

  let leftmostPoint: Point | null = null;
  let rightmostPoint: Point | null = null;
  let topmostPoint: Point | null = null;
  let bottommostPoint: Point | null = null;

  for (const point of movedPoints) {
    if (leftmostPoint === null || point.x < leftmostPoint.x) {
      leftmostPoint = point;
    }
    if (rightmostPoint === null || point.x > rightmostPoint.x) {
      rightmostPoint = point;
    }
    if (topmostPoint === null || point.y < topmostPoint.y) {
      topmostPoint = point;
    }
    if (bottommostPoint === null || point.y > bottommostPoint.y) {
      bottommostPoint = point;
    }
  }

  // 각 방향에 대해 필요한 조정량 계산
  let adjustX = 0;
  let adjustY = 0;

  // X 방향 조정: 왼쪽과 오른쪽 경계를 모두 체크
  const leftAdjust =
    leftmostPoint && leftmostPoint.x < 0 ? (0 - leftmostPoint.x) * scaleX : 0;
  const rightAdjust =
    rightmostPoint && rightmostPoint.x > stageSize.width
      ? -(rightmostPoint.x - stageSize.width) * scaleX
      : 0;

  // 왼쪽과 오른쪽 둘 다 조정이 필요한 경우는 드물지만, 더 큰 절대값 사용
  if (leftAdjust !== 0 && rightAdjust !== 0) {
    adjustX =
      Math.abs(leftAdjust) > Math.abs(rightAdjust) ? leftAdjust : rightAdjust;
  } else {
    adjustX = leftAdjust !== 0 ? leftAdjust : rightAdjust;
  }

  // Y 방향 조정: 위쪽과 아래쪽 경계를 모두 체크
  const topAdjust =
    topmostPoint && topmostPoint.y < 0 ? (0 - topmostPoint.y) * scaleY : 0;
  const bottomAdjust =
    bottommostPoint && bottommostPoint.y > stageSize.height
      ? -(bottommostPoint.y - stageSize.height) * scaleY
      : 0;

  // 위쪽과 아래쪽 둘 다 조정이 필요한 경우는 드물지만, 더 큰 절대값 사용
  if (topAdjust !== 0 && bottomAdjust !== 0) {
    adjustY =
      Math.abs(topAdjust) > Math.abs(bottomAdjust) ? topAdjust : bottomAdjust;
  } else {
    adjustY = topAdjust !== 0 ? topAdjust : bottomAdjust;
  }

  // 조정이 필요한 경우에만 조정된 위치 반환
  // adjustX와 adjustY는 각각 독립적으로 계산되므로 여러 방향이 동시에 경계를 넘을 때도 처리됨
  if (adjustX !== 0 || adjustY !== 0) {
    return { x: pos.x + adjustX, y: pos.y + adjustY };
  }

  return pos;

  // // 바운딩 박스 계산
  // const bbox = getBoundingBox(points);
  // if (!bbox) return null;

  // // 최대 이동 거리 계산
  // let maxDeltaX = delta.x;
  // let maxDeltaY = delta.y;

  // // X 방향 제한
  // if (bbox.minX + delta.x < 0) {
  //   maxDeltaX = -bbox.minX;
  // } else if (bbox.maxX + delta.x > scaledStageSize.width) {
  //   maxDeltaX = scaledStageSize.width - bbox.maxX;
  // }

  // // Y 방향 제한
  // if (bbox.minY + delta.y < 0) {
  //   maxDeltaY = -bbox.minY;
  // } else if (bbox.maxY + delta.y > scaledStageSize.height) {
  //   maxDeltaY = scaledStageSize.height - bbox.maxY;
  // }

  // return { x: maxDeltaX, y: maxDeltaY };
}

/**
 * 점 기반 어노테이션의 변환 바운드 계산
 * 변환 후 모든 점이 이미지 범위 내에 있도록 제한
 */
export function getPointsTransformBounds(
  _stage: Konva.Stage,
  stageSize: { width: number; height: number },
  oldPoints: Point[],
  newPoints: Point[]
): Point[] | null {
  if (oldPoints.length === 0 || newPoints.length === 0) return null;
  if (oldPoints.length !== newPoints.length) return null;

  // 새 점들이 유효한지 확인 (null, undefined, NaN 체크)
  const validPoints = newPoints.filter(
    (point) =>
      point != null &&
      typeof point.x === "number" &&
      typeof point.y === "number" &&
      !isNaN(point.x) &&
      !isNaN(point.y)
  );

  if (validPoints.length !== newPoints.length) {
    // 유효하지 않은 점이 있으면 null 반환
    return null;
  }

  // 모든 새 점이 이미지 범위 내에 있는지 확인
  const allInBounds = newPoints.every((point) =>
    isPointInBounds(point, { x: 0, y: 0 }, stageSize)
  );

  if (allInBounds) {
    return newPoints;
  }

  // 범위를 벗어난 점들을 클램핑
  const clampedPoints = clampPoints(newPoints, stageSize);

  // 클램핑 후에도 모든 점이 유효하고 개수가 일치하는지 확인
  if (
    clampedPoints.length !== oldPoints.length ||
    clampedPoints.some(
      (point) =>
        point == null ||
        typeof point.x !== "number" ||
        typeof point.y !== "number" ||
        isNaN(point.x) ||
        isNaN(point.y)
    )
  ) {
    return null;
  }

  // 모든 점이 이미지 범위 내에 있는지 최종 확인
  const allValid = clampedPoints.every((point) =>
    isPointInBounds(point, { x: 0, y: 0 }, stageSize)
  );

  return allValid ? clampedPoints : null;
}
