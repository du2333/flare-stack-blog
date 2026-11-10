import { expect, it } from "vitest";
import { splitQuotedTerms } from "./quoted-terms";

it("marks each short quoted term to keep on one line", () => {
  expect(splitQuotedTerms("如需清除记录，请使用「删除」。")).toEqual([
    { text: "如需清除记录，请使用", keep: false },
    { text: "「删除」", keep: true },
    { text: "。", keep: false },
  ]);
  expect(splitQuotedTerms("Use “Delete” to erase it.")).toEqual([
    { text: "Use ", keep: false },
    { text: "“Delete”", keep: true },
    { text: " to erase it.", keep: false },
  ]);
});

it("leaves a long quoted name to wrap with the sentence", () => {
  expect(
    splitQuotedTerms("「一个名字很长很长很长的站点」将消失，请用「移出」。"),
  ).toEqual([
    { text: "「一个名字很长很长很长的站点」将消失，请用", keep: false },
    { text: "「移出」", keep: true },
    { text: "。", keep: false },
  ]);
});

it("returns one plain part when nothing is quoted", () => {
  expect(splitQuotedTerms("Delete selected image?")).toEqual([
    { text: "Delete selected image?", keep: false },
  ]);
  expect(splitQuotedTerms("")).toEqual([]);
});
