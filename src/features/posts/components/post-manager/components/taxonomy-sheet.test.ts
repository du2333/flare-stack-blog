// @vitest-environment jsdom
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { m } from "@/paraglide/messages";
import {
  filterTaxonomy,
  nameToCreate,
  TaxonomySheet,
  type TaxonomyItem,
} from "./taxonomy-sheet";

// Unmount as soon as something closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Row = {
  id: number;
  name: string;
  postCount: number;
  publicPostCount: number;
};
const data = vi.hoisted(() => ({
  categories: [] as Array<Row>,
  tags: [] as Array<Row>,
}));
const requests = vi.hoisted(() => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  removeCategory: vi.fn(),
  createTag: vi.fn(),
  removeTag: vi.fn(),
}));
vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  return {
    orpc: createTanstackQueryUtils({
      categories: {
        list: async () => [],
        admin: {
          options: async () => [],
          list: async () => ({
            items: data.categories,
            uncategorizedPostCount: 0,
            uncategorizedPublicPostCount: 0,
          }),
        },
      },
      tags: {
        list: async () => [],
        admin: {
          list: async () => [],
          listWithCount: async () => data.tags,
        },
      },
      posts: { list: async () => [], admin: { list: async () => [] } },
    }),
    orpcClient: {
      categories: {
        admin: {
          create: requests.createCategory,
          update: requests.updateCategory,
          remove: requests.removeCategory,
        },
      },
      tags: {
        admin: {
          create: requests.createTag,
          update: vi.fn(),
          remove: requests.removeTag,
        },
      },
    },
  };
});

beforeEach(() => {
  data.categories = [
    { id: 1, name: "Rust", postCount: 3, publicPostCount: 2 },
    { id: 2, name: "Notes", postCount: 0, publicPostCount: 0 },
  ];
  data.tags = [
    { id: 7, name: "react", postCount: 4, publicPostCount: 1 },
    { id: 8, name: "old", postCount: 0, publicPostCount: 0 },
    { id: 9, name: "stale", postCount: 0, publicPostCount: 0 },
  ];
  for (const request of Object.values(requests)) request.mockReset();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderSheet() {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(TaxonomySheet, { open: true, onClose, onPick }),
    ),
  );
  return { onPick, onClose };
}

const searchBox = (kind: "category" | "tag" = "category") =>
  screen.getByRole("searchbox", {
    name:
      kind === "category"
        ? m.taxonomy_sheet_search_category()
        : m.taxonomy_sheet_search_tag(),
  });
const rowButton = (name: string, count: number) =>
  screen.findByRole("button", { name: m.taxonomy_sheet_pick({ name, count }) });

async function openRowMenu(name: string, command: string) {
  fireEvent.click(
    screen.getByRole("button", {
      name: m.taxonomy_sheet_row_actions({ name }),
    }),
  );
  fireEvent.click(await findInPopover("menuitem", { name: command }));
}

it("filters by substring ignoring case, and creates only a new name", () => {
  const items: Array<TaxonomyItem> = [
    { id: 1, name: "Rust", postCount: 1, publicPostCount: 0 },
    { id: 2, name: "Trusty", postCount: 0, publicPostCount: 0 },
    { id: 3, name: "Go", postCount: 0, publicPostCount: 0 },
  ];
  expect(filterTaxonomy(items, " rUs ").map((item) => item.id)).toEqual([1, 2]);
  expect(filterTaxonomy(items, "")).toBe(items);
  expect(nameToCreate(items, " rust ")).toBeNull();
  expect(nameToCreate(items, "   ")).toBeNull();
  expect(nameToCreate(items, " Rust notes ")).toBe("Rust notes");
});

it("focuses the field, filters live and picks a row as the list filter", async () => {
  const { onPick } = renderSheet();
  expect(document.activeElement).toBe(searchBox());
  await rowButton("Rust", 3);

  fireEvent.change(searchBox(), { target: { value: "no" } });
  expect(screen.queryByRole("button", { name: /Rust/ })).toBeNull();
  fireEvent.click(await rowButton("Notes", 0));
  expect(onPick).toHaveBeenCalledWith("category", 2);

  fireEvent.change(searchBox(), { target: { value: "zzz" } });
  expect(
    screen.getByText(m.taxonomy_sheet_no_match({ query: "zzz" })),
  ).toBeDefined();
});

it("creates the typed name on Enter, then clears the field", async () => {
  requests.createCategory.mockImplementation(async ({ name }) => {
    data.categories = [
      ...data.categories,
      { id: 3, name, postCount: 0, publicPostCount: 0 },
    ];
    return { id: 3, name };
  });
  renderSheet();
  await rowButton("Rust", 3);

  fireEvent.change(searchBox(), { target: { value: "rust" } });
  expect(
    screen.queryByText(m.taxonomy_sheet_create_hint({ name: "rust" })),
  ).toBeNull();
  fireEvent.keyDown(searchBox(), { key: "Enter" });
  expect(requests.createCategory).not.toHaveBeenCalled();

  fireEvent.change(searchBox(), { target: { value: " Rust notes " } });
  expect(
    screen.getByText(m.taxonomy_sheet_create_hint({ name: "Rust notes" })),
  ).toBeDefined();
  await act(async () => fireEvent.keyDown(searchBox(), { key: "Enter" }));

  expect(requests.createCategory.mock.calls[0]?.[0]).toEqual({
    name: "Rust notes",
  });
  await rowButton("Rust notes", 0);
  expect((searchBox() as HTMLInputElement).value).toBe("");
});

it("shows a duplicate name inline and keeps the typed name", async () => {
  requests.createCategory.mockRejectedValue(
    new ORPCError("CATEGORY_NAME_ALREADY_EXISTS", { defined: true }),
  );
  renderSheet();
  await rowButton("Rust", 3);

  fireEvent.change(searchBox(), { target: { value: "Rust 2" } });
  await act(async () => fireEvent.keyDown(searchBox(), { key: "Enter" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    m.category_manager_name_exists(),
  );
  expect((searchBox() as HTMLInputElement).value).toBe("Rust 2");
});

it("renames a row inline: Escape cancels, Enter saves, errors stay inline", async () => {
  const { onClose } = renderSheet();
  await rowButton("Rust", 3);
  const renameField = () =>
    screen.getByRole("textbox", {
      name: m.taxonomy_sheet_rename_label({ name: "Rust" }),
    });

  await openRowMenu("Rust", m.taxonomy_sheet_rename());
  expect(document.activeElement).toBe(renameField());
  fireEvent.keyDown(renameField(), { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(await rowButton("Rust", 3));

  requests.updateCategory.mockRejectedValueOnce(
    new ORPCError("CATEGORY_NAME_ALREADY_EXISTS", { defined: true }),
  );
  await openRowMenu("Rust", m.taxonomy_sheet_rename());
  fireEvent.change(renameField(), { target: { value: "Notes" } });
  await act(async () => fireEvent.keyDown(renameField(), { key: "Enter" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    m.category_manager_name_exists(),
  );

  requests.updateCategory.mockImplementationOnce(async ({ id, data: next }) => {
    data.categories = data.categories.map((item) =>
      item.id === id ? { ...item, name: next.name } : item,
    );
    return {};
  });
  fireEvent.change(renameField(), { target: { value: " Rustacean " } });
  await act(async () => fireEvent.keyDown(renameField(), { key: "Enter" }));
  expect(requests.updateCategory).toHaveBeenLastCalledWith({
    id: 1,
    data: { name: "Rustacean" },
  });
  await rowButton("Rustacean", 3);
});

it("confirms a delete with how many posts, and how many published ones, lose the category", async () => {
  requests.removeCategory.mockImplementation(async ({ id }) => {
    data.categories = data.categories.filter((item) => item.id !== id);
    return {};
  });
  renderSheet();
  await rowButton("Rust", 3);

  await openRowMenu("Rust", m.category_manager_delete());
  const dialog = await screen.findByRole("dialog", {
    name: m.category_manager_delete_title(),
  });
  // The body wraps quoted names in a no-wrap span, so match the whole text.
  expect(dialog.textContent).toContain(
    m.taxonomy_sheet_delete_category_desc({
      name: "Rust",
      count: 3,
      published: 2,
    }),
  );
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_delete() }),
    ),
  );

  expect(requests.removeCategory).toHaveBeenCalledWith({ id: 1 });
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Rust/ })).toBeNull(),
  );
});

it("says published posts are untouched when none of them carry the tag", async () => {
  data.tags = [{ id: 7, name: "react", postCount: 4, publicPostCount: 0 }];
  renderSheet();
  fireEvent.click(screen.getByRole("radio", { name: m.tag_manager_title() }));
  await rowButton("react", 4);

  await openRowMenu("react", m.category_manager_delete());
  const dialog = await screen.findByRole("dialog", {
    name: m.tag_manager_delete_title(),
  });
  // The body wraps quoted names in a no-wrap span, so match the whole text.
  expect(dialog.textContent).toContain(
    m.taxonomy_sheet_delete_tag_desc_draft_only({ name: "react", count: 4 }),
  );
});

it("confirms a tag delete with how many published posts lose it at once", async () => {
  renderSheet();
  fireEvent.click(screen.getByRole("radio", { name: m.tag_manager_title() }));
  await rowButton("react", 4);

  await openRowMenu("react", m.category_manager_delete());
  const dialog = await screen.findByRole("dialog", {
    name: m.tag_manager_delete_title(),
  });
  // The body wraps quoted names in a no-wrap span, so match the whole text.
  expect(dialog.textContent).toContain(
    m.taxonomy_sheet_delete_tag_desc({
      name: "react",
      count: 4,
      published: 1,
    }),
  );
});

it("deletes every unused tag one by one", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  requests.removeTag.mockImplementation(async ({ id }) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    data.tags = data.tags.filter((item) => item.id !== id);
    inFlight -= 1;
    return {};
  });
  renderSheet();
  fireEvent.click(screen.getByRole("radio", { name: m.tag_manager_title() }));
  await rowButton("react", 4);
  expect(searchBox("tag")).toBeDefined();

  fireEvent.click(
    screen.getByRole("button", { name: m.taxonomy_sheet_purge({ count: 2 }) }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: m.taxonomy_sheet_purge_title(),
  });
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_delete() }),
    ),
  );

  await waitFor(() => expect(requests.removeTag).toHaveBeenCalledTimes(2));
  expect(requests.removeTag.mock.calls.map(([input]) => input)).toEqual([
    { id: 8 },
    { id: 9 },
  ]);
  expect(maxInFlight).toBe(1);
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith(
      m.taxonomy_sheet_purged({ count: 2 }),
    ),
  );
  expect(screen.queryByText(m.taxonomy_sheet_purge({ count: 2 }))).toBeNull();
});
