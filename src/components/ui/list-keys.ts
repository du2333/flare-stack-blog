import type { KeyboardEvent } from "react";

/**
 * Where a key moves focus in a list whose items take focus one at a time (a
 * menu, a listbox): arrows step and wrap, Home and End go to the ends, and a
 * typed character goes to the next item starting with it, after `current`.
 * `items` are the ones that can take focus; -1 when the key moves nothing.
 */
export function nextListIndex(
  event: KeyboardEvent<HTMLElement>,
  items: Array<HTMLElement>,
  current: number,
) {
  switch (event.key) {
    case "ArrowDown":
      return (current + 1) % items.length;
    case "ArrowUp":
      return (current - 1 + items.length) % items.length;
    case "Home":
      return 0;
    case "End":
      return items.length - 1;
  }
  if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey)
    return -1;
  const key = event.key.toLowerCase();
  const order = [...items.slice(current + 1), ...items.slice(0, current + 1)];
  const match = order.find((item) =>
    item.textContent?.trim().toLowerCase().startsWith(key),
  );
  return match ? items.indexOf(match) : -1;
}
