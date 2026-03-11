import type React from "react";
import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  delay?: number;
}

export function useLongPress(
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void,
  onClick: (e: React.MouseEvent | React.TouchEvent) => void,
  { delay = 500 }: UseLongPressOptions = {},
) {
  const timeout = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const startCoord = useRef<{ x: number; y: number } | null>(null);
  const isScrolling = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isLongPress.current = false;
      isScrolling.current = false;

      // Capture start coordinates for touch events
      if ("touches" in e) {
        startCoord.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
      timeout.current = window.setTimeout(() => {
        // If we moved significantly, don't trigger long press
        if (!isScrolling.current) {
          isLongPress.current = true;
          onLongPress(e);
        }
      }, delay);
    },
    [onLongPress, delay],
  );

  const handleMove = useCallback((e: React.TouchEvent) => {
    if (startCoord.current) {
      const moveX = Math.abs(e.touches[0].clientX - startCoord.current.x);
      const moveY = Math.abs(e.touches[0].clientY - startCoord.current.y);

      // If moved more than 10px, consider it a scroll/drag
      if (moveX > 10 || moveY > 10) {
        isScrolling.current = true;
        if (timeout.current) {
          clearTimeout(timeout.current);
          timeout.current = null;
        }
      }
    }
  }, []);

  const clear = useCallback(
    (e: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }

      // Only trigger click if:
      // 1. It wasn't a long press
      // 2. We are supposed to trigger click (not mouseleave etc)
      // 3. We didn't scroll (for touch)
      if (shouldTriggerClick && !isLongPress.current && !isScrolling.current) {
        onClick(e);
      }

      // Reset start coordinates
      startCoord.current = null;
    },
    [onClick],
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchMove: handleMove,
  };
}
