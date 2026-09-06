import { mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";

export const TableBlockExtension = [
  Table.extend({
    renderHTML({ HTMLAttributes }) {
      const { style: _style, ...attrs } = HTMLAttributes;
      return [
        "table",
        mergeAttributes(this.options.HTMLAttributes, attrs),
        ["tbody", 0],
      ];
    },
  }).configure({
    resizable: false,
  }),
  TableRow,
  TableHeader,
  TableCell,
];
