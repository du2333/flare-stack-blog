// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { afterEach, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  type SystemConfig,
} from "@/features/config/config.schema";
import { THEMES, type Theme } from "@/features/theme/themes";
import { m } from "@/paraglide/messages";
import { ThemePicker } from "./theme-picker";

afterEach(cleanup);

const plain: Theme = { ...fixtureTheme, id: "plain", name: () => "Plain" };
delete plain.thumbnail;
delete plain.optionFields;
// A fixed list, so registering another Theme does not change what this test sees.
const themes = [THEMES[0], fixtureTheme, plain];

function renderPicker() {
  const form: { current?: UseFormReturn<SystemConfig> } = {};
  function Harness({ children }: { children: ReactNode }) {
    const methods = useForm<SystemConfig>({
      defaultValues: structuredClone(DEFAULT_CONFIG),
    });
    form.current = methods;
    return createElement(FormProvider<SystemConfig>, { ...methods, children });
  }
  render(createElement(Harness, null, createElement(ThemePicker, { themes })));
  return () => form.current!;
}

const group = () =>
  screen.getByRole("radiogroup", { name: m.settings_theme() });
const card = (name: string) => within(group()).getByRole("radio", { name });

it("lists every Theme as a radio, the saved one chosen and focusable", () => {
  renderPicker();

  const radios = within(group()).getAllByRole("radio");
  expect(radios.map((radio) => radio.textContent)).toEqual([
    m.theme_classic_name(),
    "Fixture",
    "Plain",
  ]);
  expect(card(m.theme_classic_name()).getAttribute("aria-checked")).toBe(
    "true",
  );
  expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  // A drawn thumbnail where the Theme has one, a placeholder otherwise.
  expect(card(m.theme_classic_name()).querySelector("svg rect")).toBeTruthy();
  expect(card("Plain").querySelector("svg rect")).toBeNull();
});

it("chooses with a click or the arrow keys and marks the form unsaved", () => {
  const form = renderPicker();
  expect(form().formState.isDirty).toBe(false);

  act(() => {
    card(m.theme_classic_name()).focus();
  });
  fireEvent.keyDown(card(m.theme_classic_name()), { key: "ArrowRight" });
  expect(form().getValues("site.theme.id")).toBe("fixture");
  expect(card("Fixture").getAttribute("aria-checked")).toBe("true");
  expect(document.activeElement).toBe(card("Fixture"));
  expect(form().formState.dirtyFields.site?.theme?.id).toBe(true);

  fireEvent.keyDown(card("Fixture"), { key: "End" });
  expect(form().getValues("site.theme.id")).toBe("plain");
  fireEvent.click(card(m.theme_classic_name()));
  expect(form().getValues("site.theme.id")).toBe("classic");
});

it("edits the chosen Theme's options and keeps them when switching away and back", () => {
  const form = renderPicker();
  expect(screen.queryByRole("radiogroup", { name: "Marker" })).toBeNull();

  fireEvent.click(card("Fixture"));
  const marker = screen.getByRole("radiogroup", { name: "Marker" });
  expect(
    within(marker)
      .getByRole("radio", { name: "On" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  fireEvent.click(within(marker).getByRole("radio", { name: "Off" }));
  expect(form().getValues("site.theme.options.fixture")).toEqual({
    marker: "off",
  });

  fireEvent.click(card(m.theme_classic_name()));
  expect(screen.queryByRole("radiogroup", { name: "Marker" })).toBeNull();
  fireEvent.click(card("Fixture"));
  expect(
    within(screen.getByRole("radiogroup", { name: "Marker" }))
      .getByRole("radio", { name: "Off" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(form().getValues("site.theme.options.fixture.marker")).toBe("off");
});

it("previews each Theme with the options in the form, without touching it", () => {
  const form = renderPicker();
  fireEvent.click(card("Fixture"));
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: "Marker" })).getByRole(
      "radio",
      { name: "Off" },
    ),
  );
  const values = structuredClone(form().getValues());
  const dirty = form().formState.isDirty;

  const link = screen.getByRole("link", {
    name: m.settings_theme_preview_label({ name: "Fixture" }),
  });
  expect(link.getAttribute("target")).toBe("_blank");
  const url = new URL(link.getAttribute("href")!, "https://blog.example");
  expect(url.pathname).toBe("/");
  expect(url.searchParams.get("themePreview")).toBe("fixture");
  expect(JSON.parse(url.searchParams.get("themePreviewOptions")!)).toEqual({
    marker: "off",
  });
  // The other Themes' links carry their own options, resolved.
  const classic = screen.getByRole("link", {
    name: m.settings_theme_preview_label({ name: m.theme_classic_name() }),
  });
  expect(
    new URL(
      classic.getAttribute("href")!,
      "https://blog.example",
    ).searchParams.get("themePreviewOptions"),
  ).toBe("{}");

  fireEvent.click(link);
  expect(form().getValues()).toEqual(values);
  expect(form().formState.isDirty).toBe(dirty);
});
