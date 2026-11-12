import { useRef, type CSSProperties, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import {
  focalPointFromPointer,
  moveFocalPoint,
  type FocalPoint,
} from "./focal-point";
import "./focal-point-picker.css";

/**
 * Picks a point on whatever fills its parent. Lay it over an image inside a
 * positioned parent, before any other control that sits on the image: a click
 * or tap sets the point, dragging moves it with the pointer, and the marker
 * moves with the arrow keys (by 1, by 10 with Shift). The marker is a `slider` whose value text names both axes.
 */
export function FocalPointPicker({
  value,
  onValueChange,
  label,
  valueText,
  describedBy,
  className,
}: {
  value: FocalPoint;
  onValueChange: (value: FocalPoint) => void;
  /** Names the marker, such as "Banner focus". */
  label: string;
  /** What a screen reader announces for the current point. */
  valueText: string;
  /** Id of the element that explains how to use it. */
  describedBy?: string;
  className?: string;
}) {
  const markerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pointAt = (event: PointerEvent<HTMLDivElement>) =>
    onValueChange(
      focalPointFromPointer(
        event.currentTarget.getBoundingClientRect(),
        event.clientX,
        event.clientY,
      ),
    );
  return (
    <div
      className={cn("fuwari-focal-picker", className)}
      // Dragging moves the point with the pointer, a click sets it.
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointAt(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current) pointAt(event);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onClick={(event) => {
        onValueChange(
          focalPointFromPointer(
            event.currentTarget.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          ),
        );
        markerRef.current?.focus({ preventScroll: true });
      }}
    >
      <div
        ref={markerRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-describedby={describedBy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value.x}
        aria-valuetext={valueText}
        className="fuwari-focal-marker"
        style={
          {
            "--focal-x": `${value.x}%`,
            "--focal-y": `${value.y}%`,
          } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          const next = moveFocalPoint(value, event.key, event.shiftKey);
          if (!next) return;
          event.preventDefault();
          onValueChange(next);
        }}
      />
    </div>
  );
}
