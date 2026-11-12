import { Link } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TaxonomyNameDialog } from "@/components/admin/taxonomy-name-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxonomyMutations } from "../hooks/use-taxonomy";
import {
  deleteMessage,
  filterTaxonomy,
  NAME_MAX_LENGTH,
  unusedTags,
  type TaxonomyItem,
  type TaxonomyKind,
} from "../taxonomy";
import { m } from "@/paraglide/messages";
import "./taxonomy-column.css";

interface TaxonomyColumnProps {
  kind: TaxonomyKind;
  items: Array<TaxonomyItem> | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /** The create dialog is open; the page opens it from its own primary action too. */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  /** Below 1024px a tab names the column, so its header has no name and no 新建. */
  compact?: boolean;
}

const copy = {
  category: {
    title: () => m.category_manager_title(),
    search: () => m.admin_taxonomy_search_category(),
    empty: () => m.admin_taxonomy_category_empty(),
    createTitle: () => m.taxonomy_manager_create_category(),
    renameTitle: () => m.admin_taxonomy_rename_category(),
    deleteTitle: () => m.category_manager_delete_title(),
  },
  tag: {
    title: () => m.tag_manager_title(),
    search: () => m.admin_taxonomy_search_tag(),
    empty: () => m.admin_taxonomy_tag_empty(),
    createTitle: () => m.admin_taxonomy_create_tag(),
    renameTitle: () => m.admin_taxonomy_rename_tag(),
    deleteTitle: () => m.tag_manager_delete_title(),
  },
} satisfies Record<TaxonomyKind, Record<string, () => string>>;

/**
 * One of the two lists of the taxonomy page: a header with the name, the
 * count and 新建, a search field, and a row per Category or Tag with the
 * number of Posts (a link to the Posts list filtered by it) and a menu to
 * rename or delete it. For Tags the header also holds the way to delete every
 * unused one.
 */
export function TaxonomyColumn({
  kind,
  items,
  isPending,
  isError,
  onRetry,
  createOpen,
  onCreateOpenChange,
  compact,
}: TaxonomyColumnProps) {
  const text = copy[kind];
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<TaxonomyItem | null>(null);
  const [toDelete, setToDelete] = useState<TaxonomyItem | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renameName, setRenameName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const deleteTrigger = useRef<HTMLElement | null>(null);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const { create, rename, remove, purge, purgeDone } = useTaxonomyMutations(
    kind,
    {
      onCreated: () => onCreateOpenChange(false),
      onRenamed: () => setRenaming(null),
      onDeleted: () => setToDelete(null),
      onPurged: () => setPurgeOpen(false),
    },
  );

  // A dialog opens with the name it works on.
  useEffect(() => {
    if (createOpen) setCreateName("");
  }, [createOpen]);
  useEffect(() => {
    if (renaming) setRenameName(renaming.name);
  }, [renaming]);

  const all = items ?? [];
  const visible = filterTaxonomy(all, query);
  const unused = kind === "tag" ? unusedTags(all) : [];
  const searching = Boolean(query.trim());

  const header = compact ? null : (
    <div className="taxonomy-column-head">
      <h2>{text.title()}</h2>
      <span className="taxonomy-column-count">{items ? all.length : "—"}</span>
      <div className="taxonomy-column-head-actions">
        {unused.length > 0 ? (
          <ActionMenu
            label={m.admin_taxonomy_more()}
            placement="bottom-end"
            items={[
              {
                label: m.admin_taxonomy_purge({ count: unused.length }),
                icon: Trash2,
                danger: true,
                onSelect: () => setPurgeOpen(true),
              },
            ]}
          />
        ) : null}
        <Button
          ref={createTrigger}
          icon={<Plus size={16} />}
          onClick={() => onCreateOpenChange(true)}
        >
          {m.category_manager_create()}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="taxonomy-column" aria-label={text.title()}>
      {header}
      <div className="taxonomy-column-search">
        <SearchField
          ref={searchRef}
          aria-label={text.search()}
          placeholder={text.search()}
          value={query}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          onValueChange={setQuery}
          clearLabel={m.tag_manager_clear_search()}
        />
        {compact && unused.length > 0 ? (
          <ActionMenu
            label={m.admin_taxonomy_more()}
            placement="bottom-end"
            items={[
              {
                label: m.admin_taxonomy_purge({ count: unused.length }),
                icon: Trash2,
                danger: true,
                onSelect: () => setPurgeOpen(true),
              },
            ]}
          />
        ) : null}
      </div>
      <div className="taxonomy-column-list custom-scrollbar">
        {isPending ? (
          <div role="list" aria-busy="true" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="admin-list-row taxonomy-row">
                <Skeleton className="h-4 w-1/3 rounded" />
                <Skeleton className="ml-auto h-3 w-10 rounded" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            size="compact"
            role="alert"
            description={m.admin_taxonomy_load_error()}
            action={
              <Button variant="text" onClick={onRetry}>
                {m.error_retry()}
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            size="compact"
            icon={Search}
            description={
              all.length && searching
                ? m.admin_taxonomy_no_match({ query: query.trim() })
                : text.empty()
            }
            action={
              all.length && searching ? (
                <Button variant="text" onClick={() => setQuery("")}>
                  {m.tag_manager_clear_search()}
                </Button>
              ) : (
                <Button variant="text" onClick={() => onCreateOpenChange(true)}>
                  {text.createTitle()}
                </Button>
              )
            }
          />
        ) : (
          <ul>
            {visible.map((item) => (
              <li key={item.id} className="admin-list-row taxonomy-row">
                <span className="taxonomy-row-name" title={item.name}>
                  {item.name}
                </span>
                {item.postCount > 0 ? (
                  <Link
                    to="/admin/posts"
                    search={
                      kind === "category"
                        ? { category: item.id }
                        : { tag: item.id }
                    }
                    className="taxonomy-row-count"
                    aria-label={m.admin_taxonomy_posts_link({
                      name: item.name,
                      count: item.postCount,
                    })}
                  >
                    {m.admin_taxonomy_post_count({ count: item.postCount })}
                  </Link>
                ) : (
                  <span className="taxonomy-row-count" data-empty="">
                    {m.admin_taxonomy_post_count({ count: 0 })}
                  </span>
                )}
                <ActionMenu
                  label={m.admin_taxonomy_row_actions({ name: item.name })}
                  placement="bottom-end"
                  items={[
                    {
                      label: m.admin_taxonomy_rename(),
                      icon: Pencil,
                      onSelect: () => setRenaming(item),
                    },
                    {
                      label: m.category_manager_delete(),
                      icon: Trash2,
                      danger: true,
                      onSelect: (trigger) => {
                        deleteTrigger.current = trigger;
                        setToDelete(item);
                      },
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <TaxonomyNameDialog
        open={createOpen}
        title={text.createTitle()}
        name={createName}
        maxLength={NAME_MAX_LENGTH}
        onNameChange={setCreateName}
        busy={create.isPending}
        onClose={() => {
          if (!create.isPending) onCreateOpenChange(false);
        }}
        onSave={() => {
          if (!create.isPending && createName.trim())
            create.mutate(createName.trim());
        }}
        fallbackFocus={() => createTrigger.current ?? searchRef.current}
      />
      <TaxonomyNameDialog
        open={renaming !== null}
        title={text.renameTitle()}
        name={renameName}
        maxLength={NAME_MAX_LENGTH}
        onNameChange={setRenameName}
        busy={rename.isPending}
        onClose={() => {
          if (!rename.isPending) setRenaming(null);
        }}
        onSave={() => {
          const next = renameName.trim();
          if (!renaming || rename.isPending || !next) return;
          if (next === renaming.name) setRenaming(null);
          else rename.mutate({ id: renaming.id, name: next });
        }}
        fallbackFocus={() => searchRef.current}
      />
      <ConfirmationModal
        isOpen={toDelete !== null}
        title={text.deleteTitle()}
        message={deleteMessage(kind, toDelete)}
        confirmLabel={m.category_manager_delete()}
        isDanger
        isLoading={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete && !remove.isPending) remove.mutate(toDelete.id);
        }}
        returnFocus={() =>
          deleteTrigger.current?.isConnected
            ? deleteTrigger.current
            : searchRef.current
        }
      />
      <ConfirmationModal
        isOpen={purgeOpen}
        title={m.admin_taxonomy_purge_title()}
        message={m.admin_taxonomy_purge_desc({ count: unused.length })}
        confirmLabel={m.category_manager_delete()}
        isDanger
        isLoading={purge.isPending}
        loadingLabel={m.admin_taxonomy_purge_progress({
          done: purgeDone ?? 0,
          total: purge.variables?.length ?? unused.length,
        })}
        onClose={() => setPurgeOpen(false)}
        onConfirm={() => {
          if (!purge.isPending) purge.mutate(unused.map((item) => item.id));
        }}
        returnFocus={() => searchRef.current}
      />
    </section>
  );
}
