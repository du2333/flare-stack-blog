import { useCallback, useEffect, useRef } from "react";

interface MarkdownSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A styled monospace textarea for editing raw Markdown.
 * Supports Tab key insertion and maintains scroll position.
 */
export function MarkdownSourceEditor({
  value,
  onChange,
  className = "",
}: MarkdownSourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Tab key inserts 2 spaces instead of changing focus
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (e.shiftKey) {
          // Shift+Tab: remove indent from current line(s)
          const lines = value.split("\n");
          let pos = 0;
          let startLine = 0;
          let endLine = 0;

          for (let i = 0; i < lines.length; i++) {
            if (pos + lines[i].length >= start && startLine === 0) {
              startLine = i;
            }
            if (pos + lines[i].length >= end) {
              endLine = i;
              break;
            }
            pos += lines[i].length + 1;
          }

          let offset = 0;
          for (let i = startLine; i <= endLine; i++) {
            if (lines[i].startsWith("  ")) {
              lines[i] = lines[i].slice(2);
              offset += 2;
            } else if (lines[i].startsWith(" ")) {
              lines[i] = lines[i].slice(1);
              offset += 1;
            }
          }

          const newValue = lines.join("\n");
          onChange(newValue);

          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(0, start - (offset > 0 ? 2 : 0));
            textarea.selectionEnd = Math.max(0, end - offset);
          });
        } else {
          // Tab: insert 2 spaces
          const newValue =
            value.substring(0, start) + "  " + value.substring(end);
          onChange(newValue);

          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          });
        }
      }

      // Enter key: auto-indent and continue list markers
      if (e.key === "Enter") {
        const start = textarea.selectionStart;
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const currentLine = value.substring(lineStart, start);

        // Match leading whitespace + optional list marker
        const indentMatch = currentLine.match(
          /^(\s*)([-*+]|\d+\.)\s/,
        );
        if (indentMatch) {
          e.preventDefault();
          const [, indent, marker] = indentMatch;

          // If the current line is empty (just marker), remove the marker
          const lineContent = currentLine.replace(/^\s*([-*+]|\d+\.)\s*/, "");
          if (!lineContent.trim()) {
            const newValue =
              value.substring(0, lineStart) + "\n" + value.substring(start);
            onChange(newValue);
            requestAnimationFrame(() => {
              textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
            });
            return;
          }

          // Continue with same marker (increment number for ordered lists)
          let nextMarker = marker;
          const numMatch = marker.match(/^(\d+)\.$/);
          if (numMatch) {
            nextMarker = `${Number.parseInt(numMatch[1]) + 1}.`;
          }

          const insertion = `\n${indent}${nextMarker} `;
          const newValue =
            value.substring(0, start) + insertion + value.substring(start);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd =
              start + insertion.length;
          });
          return;
        }

        // Auto-indent: maintain leading whitespace
        const wsMatch = currentLine.match(/^(\s+)/);
        if (wsMatch) {
          e.preventDefault();
          const insertion = `\n${wsMatch[1]}`;
          const newValue =
            value.substring(0, start) + insertion + value.substring(start);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd =
              start + insertion.length;
          });
        }
      }
    },
    [value, onChange],
  );

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, 500)}px`;
    }
  }, [value]);

  return (
    <div className={`markdown-source-editor ${className}`}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[500px] bg-transparent text-sm leading-7 font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none p-0 border-none"
          placeholder="在此输入 Markdown 内容..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}
