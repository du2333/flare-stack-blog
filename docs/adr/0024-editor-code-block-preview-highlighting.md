# Editor code blocks preview published highlighting at rest

The Admin editor does not highlight code while the caret is in the block. At rest it shows the same Shiki HTML stored in the Public Content Snapshot, or the same client Shiki used on publish for blocks that have no snapshot HTML yet. Clicking the preview places the caret and edits plain text. Highlight HTML is not saved on autosave; publishing still highlights on the Durable Object. Blocks over about 500 lines or 50k characters stay plain in the editor; publish still highlights them. Visitors still read snapshot HTML only.
