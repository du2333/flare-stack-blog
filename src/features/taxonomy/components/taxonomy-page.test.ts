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
import { createElement, type ReactNode } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { m } from "@/paraglide/messages";
import {
  deleteMessage,
  filterTaxonomy,
  unusedTags,
  type TaxonomyItem,
} from "../taxonomy";
import { TaxonomyPage } from "./taxonomy-page";

// Unmount as soon as something closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    search?: Record<string, number>;
  }) =>
    createElement(
      "a",
      { ...props, href: `${to}?${new URLSearchParams(search as never)}` },
      children,
    ),
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));

type Row = TaxonomyItem;
const data = vi.hoisted(() => ({
  categories: [] as Array<Row>,
  tags: [] as Array<Row>,
}));
const requests = vi.hoisted(() => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  removeCategory: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
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
          update: requests.updateTag,
          remove: requests.removeTag,
        },
      },
    },
  };
});

let wide = true;
beforeEach(() => {
  wide = true;
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
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.stubGlobal("matchMedia", () => ({
    matches: wide,
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

function renderPage() {
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(AdminChromeProvider, null, createElement(TaxonomyPage)),
    ),
  );
}

const column = (title: string) => screen.getByRole("region", { name: title });
const categories = () => column(m.category_manager_title());
const tags = () => column(m.tag_manager_title());

async function openRowMenu(scope: HTMLElement, name: string, command: string) {
  fireEvent.click(
    within(scope).getByRole("button", {
      name: m.admin_taxonomy_row_actions({ name }),
    }),
  );
  fireEvent.click(await findInPopover("menuitem", { name: command }));
}

it("filters by substring ignoring case and finds the tags no post uses", () => {
  const items: Array<TaxonomyItem> = [
    { id: 1, name: "Rust", postCount: 1, publicPostCount: 0 },
    { id: 2, name: "Trusty", postCount: 0, publicPostCount: 0 },
    { id: 3, name: "Go", postCount: 0, publicPostCount: 0 },
  ];
  expect(filterTaxonomy(items, " rUs ").map((item) => item.id)).toEqual([1, 2]);
  expect(filterTaxonomy(items, "")).toBe(items);
  expect(unusedTags(items).map((item) => item.id)).toEqual([2, 3]);
});

it("words the delete confirmation by how many posts, and how many published ones, are affected", () => {
  const item = (postCount: number, publicPostCount: number): TaxonomyItem => ({
    id: 1,
    name: "Rust",
    postCount,
    publicPostCount,
  });
  expect(deleteMessage("category", item(3, 2))).toBe(
    m.admin_taxonomy_delete_category_desc({
      name: "Rust",
      count: 3,
      published: 2,
    }),
  );
  expect(deleteMessage("category", item(3, 0))).toBe(
    m.admin_taxonomy_delete_category_desc_draft_only({
      name: "Rust",
      count: 3,
    }),
  );
  expect(deleteMessage("category", item(0, 0))).toBe(
    m.admin_taxonomy_delete_category_desc_unused({ name: "Rust" }),
  );
  expect(deleteMessage("tag", item(4, 1))).toBe(
    m.admin_taxonomy_delete_tag_desc({ name: "Rust", count: 4, published: 1 }),
  );
  expect(deleteMessage("tag", item(4, 0))).toBe(
    m.admin_taxonomy_delete_tag_desc_draft_only({ name: "Rust", count: 4 }),
  );
  expect(deleteMessage("tag", item(0, 0))).toBe(
    m.admin_taxonomy_delete_tag_desc_unused({ name: "Rust" }),
  );
});

it("lists categories and tags side by side, each with its count and Post counts", async () => {
  renderPage();
  await within(categories()).findByText("Rust");
  await within(tags()).findByText("react");

  expect(
    within(categories()).getByRole("heading", {
      name: m.category_manager_title(),
    }),
  ).toBeDefined();
  expect(within(categories()).getAllByRole("listitem")).toHaveLength(2);
  expect(within(tags()).getAllByRole("listitem")).toHaveLength(3);
  expect(
    within(tags()).getByRole("heading", { name: m.tag_manager_title() })
      .nextElementSibling?.textContent,
  ).toBe("3");
  expect(
    within(categories()).getByRole("button", {
      name: m.category_manager_create(),
    }),
  ).toBeDefined();
  expect(
    within(tags()).getByRole("button", { name: m.category_manager_create() }),
  ).toBeDefined();
});

it("links a Post count to the Posts list filtered by it, and a count of 0 to nothing", async () => {
  renderPage();
  await within(categories()).findByText("Rust");

  const rust = within(categories()).getByRole("link", {
    name: m.admin_taxonomy_posts_link({ name: "Rust", count: 3 }),
  });
  expect(rust.textContent).toBe(m.admin_taxonomy_post_count({ count: 3 }));
  expect(rust.getAttribute("href")).toBe("/admin/posts?category=1");
  expect(
    within(tags())
      .getByRole("link", {
        name: m.admin_taxonomy_posts_link({ name: "react", count: 4 }),
      })
      .getAttribute("href"),
  ).toBe("/admin/posts?tag=7");
  expect(within(categories()).getAllByRole("link")).toHaveLength(1);
  expect(
    within(categories()).getByText(m.admin_taxonomy_post_count({ count: 0 })),
  ).toBeDefined();
});

it("searches each list on its own and says when nothing matches", async () => {
  renderPage();
  await within(categories()).findByText("Rust");

  fireEvent.change(
    within(categories()).getByRole("searchbox", {
      name: m.admin_taxonomy_search_category(),
    }),
    { target: { value: "no" } },
  );
  expect(within(categories()).queryByText("Rust")).toBeNull();
  expect(within(categories()).getByText("Notes")).toBeDefined();
  expect(within(tags()).getAllByRole("listitem")).toHaveLength(3);

  fireEvent.change(
    within(categories()).getByRole("searchbox", {
      name: m.admin_taxonomy_search_category(),
    }),
    { target: { value: "zzz" } },
  );
  expect(
    within(categories()).getByText(m.admin_taxonomy_no_match({ query: "zzz" })),
  ).toBeDefined();
  // The search field's own clear button and the empty state's action.
  fireEvent.click(
    within(categories())
      .getAllByRole("button", { name: m.tag_manager_clear_search() })
      .at(-1)!,
  );
  expect(within(categories()).getAllByRole("listitem")).toHaveLength(2);
});

it("creates a category from 新建 and shows it", async () => {
  requests.createCategory.mockImplementation(async ({ name }) => {
    data.categories = [
      ...data.categories,
      { id: 3, name, postCount: 0, publicPostCount: 0 },
    ];
    return { id: 3, name };
  });
  renderPage();
  await within(categories()).findByText("Rust");

  fireEvent.click(
    within(categories()).getByRole("button", {
      name: m.category_manager_create(),
    }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: m.taxonomy_manager_create_category(),
  });
  fireEvent.change(within(dialog).getByRole("textbox"), {
    target: { value: " Rust notes " },
  });
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_save() }),
    ),
  );

  expect(requests.createCategory.mock.calls[0]?.[0]).toEqual({
    name: "Rust notes",
  });
  await within(categories()).findByText("Rust notes");
  expect(toast.success).toHaveBeenCalledWith(
    m.admin_taxonomy_category_created({ name: "Rust notes" }),
  );
});

it("creates a tag from the tags list, and toasts the server's refusal of a name it was not told of", async () => {
  requests.createTag.mockRejectedValue(
    new ORPCError("TAG_NAME_ALREADY_EXISTS", { defined: true }),
  );
  renderPage();
  await within(tags()).findByText("react");

  fireEvent.click(
    within(tags()).getByRole("button", { name: m.category_manager_create() }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: m.admin_taxonomy_create_tag(),
  });
  fireEvent.change(within(dialog).getByRole("textbox"), {
    target: { value: "fresh" },
  });
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_save() }),
    ),
  );

  expect(requests.createTag).toHaveBeenCalledWith({ name: "fresh" });
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(m.tag_manager_name_exists()),
  );
  expect(
    screen.getByRole("dialog", { name: m.admin_taxonomy_create_tag() }),
  ).toBeDefined();
});

it("refuses an existing name at the field before sending it, ignoring case, and clears the error on typing", async () => {
  renderPage();
  await within(tags()).findByText("react");

  fireEvent.click(
    within(tags()).getByRole("button", { name: m.category_manager_create() }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: m.admin_taxonomy_create_tag(),
  });
  const field = within(dialog).getByRole("textbox");
  fireEvent.change(field, { target: { value: " REACT " } });
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_save() }),
    ),
  );

  expect(requests.createTag).not.toHaveBeenCalled();
  expect(within(dialog).getByRole("alert").textContent).toBe(
    m.tag_manager_name_exists(),
  );
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(toast.error).not.toHaveBeenCalled();

  fireEvent.change(field, { target: { value: "reactive" } });
  expect(within(dialog).queryByRole("alert")).toBeNull();
});

it("refuses a rename to another item's name at the field, but lets an item change its own case", async () => {
  requests.updateCategory.mockResolvedValue({});
  renderPage();
  await within(categories()).findByText("Rust");

  await openRowMenu(categories(), "Rust", m.admin_taxonomy_rename());
  const dialog = await screen.findByRole("dialog", {
    name: m.admin_taxonomy_rename_category(),
  });
  const field = within(dialog).getByRole("textbox");
  const save = () =>
    act(async () =>
      fireEvent.click(
        within(dialog).getByRole("button", { name: m.category_manager_save() }),
      ),
    );
  fireEvent.change(field, { target: { value: "notes" } });
  await save();
  expect(requests.updateCategory).not.toHaveBeenCalled();
  expect(within(dialog).getByRole("alert").textContent).toBe(
    m.category_manager_name_exists(),
  );

  fireEvent.change(field, { target: { value: "RUST" } });
  await save();
  expect(requests.updateCategory).toHaveBeenCalledWith({
    id: 1,
    data: { name: "RUST" },
  });
});

it("renames a row through its menu, with the trimmed name", async () => {
  requests.updateCategory.mockImplementation(async ({ id, data: next }) => {
    data.categories = data.categories.map((item) =>
      item.id === id ? { ...item, name: next.name } : item,
    );
    return {};
  });
  renderPage();
  await within(categories()).findByText("Rust");

  await openRowMenu(categories(), "Rust", m.admin_taxonomy_rename());
  const dialog = await screen.findByRole("dialog", {
    name: m.admin_taxonomy_rename_category(),
  });
  const field = within(dialog).getByRole("textbox") as HTMLInputElement;
  expect(field.value).toBe("Rust");
  fireEvent.change(field, { target: { value: " Rustacean " } });
  await act(async () =>
    fireEvent.click(
      within(dialog).getByRole("button", { name: m.category_manager_save() }),
    ),
  );

  expect(requests.updateCategory).toHaveBeenLastCalledWith({
    id: 1,
    data: { name: "Rustacean" },
  });
  await within(categories()).findByText("Rustacean");
});

it("confirms a delete with how many posts, and how many published ones, lose the category", async () => {
  requests.removeCategory.mockImplementation(async ({ id }) => {
    data.categories = data.categories.filter((item) => item.id !== id);
    return {};
  });
  renderPage();
  await within(categories()).findByText("Rust");

  await openRowMenu(categories(), "Rust", m.category_manager_delete());
  const dialog = await screen.findByRole("dialog", {
    name: m.category_manager_delete_title(),
  });
  // The body wraps quoted names in a no-wrap span, so match the whole text.
  expect(dialog.textContent).toContain(
    m.admin_taxonomy_delete_category_desc({
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
    expect(within(categories()).queryByText("Rust")).toBeNull(),
  );
});

it("confirms a tag delete with how many published posts lose it at once", async () => {
  renderPage();
  await within(tags()).findByText("react");

  await openRowMenu(tags(), "react", m.category_manager_delete());
  const dialog = await screen.findByRole("dialog", {
    name: m.tag_manager_delete_title(),
  });
  expect(dialog.textContent).toContain(
    m.admin_taxonomy_delete_tag_desc({ name: "react", count: 4, published: 1 }),
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
  renderPage();
  await within(tags()).findByText("react");
  // Categories have no such action.
  expect(
    within(categories()).queryByRole("button", {
      name: m.admin_taxonomy_more(),
    }),
  ).toBeNull();

  fireEvent.click(
    within(tags()).getByRole("button", { name: m.admin_taxonomy_more() }),
  );
  fireEvent.click(
    await findInPopover("menuitem", {
      name: m.admin_taxonomy_purge({ count: 2 }),
    }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: m.admin_taxonomy_purge_title(),
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
      m.admin_taxonomy_purged({ count: 2 }),
    ),
  );
});

it("below 1024px shows one list at a time under two tabs", async () => {
  wide = false;
  renderPage();

  const [categoryTab, tagTab] = screen.getAllByRole("tab");
  expect(categoryTab!.getAttribute("aria-selected")).toBe("true");
  await screen.findByText("Rust");
  expect(screen.queryByText("react")).toBeNull();
  // The tab names the list, so the list has no header of its own.
  expect(
    screen.queryByRole("heading", { name: m.category_manager_title() }),
  ).toBeNull();

  fireEvent.click(tagTab!);
  await screen.findByText("react");
  expect(screen.queryByText("Rust")).toBeNull();
  expect(tagTab!.getAttribute("aria-selected")).toBe("true");
});
