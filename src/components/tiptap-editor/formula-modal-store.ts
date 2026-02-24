/**
 * Bridge for opening the formula modal from Mathematics extension onClick.
 * The Editor component registers its opener on mount; config.ts uses this to
 * open the modal when user clicks an existing math node.
 */
export type FormulaModalPayload = {
  latex: string;
  pos: number;
  type: "inline" | "block";
};

type FormulaModalOpener = (payload: FormulaModalPayload) => void;

const openers = new Map<symbol, FormulaModalOpener>();

export function addFormulaModalOpener(key: symbol, fn: FormulaModalOpener) {
  openers.set(key, fn);
}

export function removeFormulaModalOpener(key: symbol) {
  openers.delete(key);
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

  for (const opener of openers.values()) {
    try {
      opener(payload);
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
  }
}
