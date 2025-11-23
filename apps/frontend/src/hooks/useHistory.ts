import { useState, useCallback } from "react";

interface UseHistoryOptions<T> {
  initialValue: T;
  maxHistorySize?: number;
}

interface UseHistoryReturn<T> {
  current: T;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  push: (value: T) => void;
}

export function useHistory<T>({
  initialValue,
  maxHistorySize = 50,
}: UseHistoryOptions<T>): UseHistoryReturn<T> {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [future, setFuture] = useState<T[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = history[currentIndex];

  const canUndo = currentIndex > 0;
  const canRedo = future.length > 0;

  const push = useCallback(
    (value: T) => {
      // 깊은 복사로 상태 저장
      const newValue = JSON.parse(JSON.stringify(value));

      // 새 액션 수행 시 future 스택 초기화
      setFuture([]);

      // 히스토리에 추가
      setHistory((prev) => {
        const newHistory = [...prev.slice(0, currentIndex + 1), newValue];

        // 히스토리 크기 제한
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize);
        }

        return newHistory;
      });

      setCurrentIndex((prev) => {
        const newIndex = prev + 1;
        // 히스토리 크기 제한을 고려한 인덱스 조정
        return Math.min(newIndex, maxHistorySize - 1);
      });
    },
    [currentIndex, maxHistorySize]
  );

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previousValue = history[currentIndex - 1];
    setFuture((prev) => [current, ...prev]);
    setCurrentIndex((prev) => prev - 1);

    return previousValue;
  }, [canUndo, currentIndex, history, current]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const nextValue = future[0];
    setHistory((prev) => [...prev.slice(0, currentIndex + 1), nextValue]);
    setFuture((prev) => prev.slice(1));
    setCurrentIndex((prev) => prev + 1);

    return nextValue;
  }, [canRedo, currentIndex, future]);

  return {
    current,
    undo,
    redo,
    canUndo,
    canRedo,
    push,
  };
}
