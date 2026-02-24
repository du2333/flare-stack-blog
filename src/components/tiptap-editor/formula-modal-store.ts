/**
 * Bridge for opening the formula modal from Mathematics extension onClick.
 * The Editor component registers its opener on mount; config.ts uses this to
 * open the modal when user clicks an existing math node.
 */
export type FormulaModalPayload = {
  latex: string;
  pos: number;
  type: "inline" | "block";
  instanceKey?: symbol;
};

type FormulaModalOpener = (payload: FormulaModalPayload) => void;

const openers = new Map<symbol, FormulaModalOpener>();
let activeOpenerKey: symbol | null = null;

export function addFormulaModalOpener(key: symbol, fn: FormulaModalOpener) {
  openers.set(key, fn);
}

export function removeFormulaModalOpener(key: symbol) {
  openers.delete(key);
  if (activeOpenerKey === key) {
    activeOpenerKey = null;
  }
}

export function setActiveFormulaModalOpenerKey(key: symbol) {
  activeOpenerKey = key;
}

export function getActiveFormulaModalOpenerKey(): symbol | null {
  return activeOpenerKey;
}

export function openFormulaModalForEdit(payload: FormulaModalPayload) {
  if (openers.size === 0) {
    console.warn(
      JSON.stringify({
        module: "formula-modal-store",
        event: "openFormulaModalForEdit.noOpener",
        message: "openFormulaModalForEdit called but no opener is registered.",
      }),
    );
    return;
  }

  const targetKey = payload.instanceKey ?? activeOpenerKey;
  if (targetKey && openers.has(targetKey)) {
    const targetOpener = openers.get(targetKey);
    if (!targetOpener) return;
    try {
      targetOpener(payload);
    } catch (err) {
      console.error(
        JSON.stringify({
          module: "formula-modal-store",
          event: "openFormulaModalForEdit.openerError",
          message: "An opener threw an error.",
          error: String(err),
        }),
      );
    }
    return;
  }

  // Fallback for legacy calls without active target
  const firstOpener = openers.values().next().value;
  if (!firstOpener) return;
  console.warn(
    JSON.stringify({
      module: "formula-modal-store",
      event: "openFormulaModalForEdit.fallback",
      message:
        "No targeted opener found; falling back to first registered opener.",
    }),
  );
  try {
    firstOpener(payload);
  } catch (err) {
    console.error(
      JSON.stringify({
        module: "formula-modal-store",
        event: "openFormulaModalForEdit.openerError",
        message: "Fallback opener threw an error.",
        error: String(err),
      }),
    );
  }
}
