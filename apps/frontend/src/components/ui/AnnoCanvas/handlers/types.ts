import type { Point } from "@/types/annotation";

/**
 * Box 핸들러의 finish 데이터 타입
 */
export interface BoxFinishData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 점 기반 어노테이션의 finish 데이터 타입
 */
export type PointBasedFinishData = Point[];

/**
 * Box 핸들러의 move 상태 타입
 */
export interface BoxMoveState {
  firstPoint: Point | null;
}

/**
 * Polygon 핸들러의 move 상태 타입
 */
export interface PolygonMoveState {
  currentPoints: Point[];
}

/**
 * Polyline 핸들러의 move 상태 타입
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PolylineMoveState {
  // Polyline은 빈 객체로 처리
}

/**
 * Brush 핸들러의 move 상태 타입
 */
export interface BrushMoveState {
  lastPoint: Point | null;
  currentStroke: {
    type: "brush" | "eraser";
    points: Point[];
    color: string;
    width: number;
    opacity: number;
  } | null;
}

/**
 * Brush 핸들러의 finish 데이터 타입
 */
export interface BrushFinishData {
  strokes: Array<{
    type: "brush" | "eraser";
    points: Point[];
    color: string;
    width: number;
    opacity: number;
  }>;
}

/**
 * Box 바운드 타입
 */
export interface BoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 점 기반 어노테이션의 바운드 타입
 */
export type PointBasedBounds = Point[];
