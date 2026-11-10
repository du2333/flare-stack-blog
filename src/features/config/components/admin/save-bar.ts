/**
 * The save bar is there to be acted on: it shows while a section has unsaved
 * changes, while a save is running (the form can turn clean before the
 * request ends), and while a save conflict is unresolved.
 */
export function isSaveBarVisible(state: {
  dirty?: boolean;
  busy: boolean;
  conflict?: boolean;
}) {
  return Boolean(state.dirty || state.busy || state.conflict);
}
