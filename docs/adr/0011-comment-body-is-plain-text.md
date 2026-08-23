# Comment bodies are plain text

A Comment body is a plain-text string, not a document tree and not Markdown. Authors write in a textarea. Line breaks are kept. There is no inline formatting and no images. Display autolinks http(s) URLs; the stored body stays the typed text. Existing JSON comments are rewritten in place to this string, with former image nodes becoming a URL line; there is no dual-read path.
