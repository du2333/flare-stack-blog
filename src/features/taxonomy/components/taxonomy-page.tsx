import { Plus } from "lucide-react";
import { useState } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { Tabs } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { useTaxonomyItems } from "../hooks/use-taxonomy";
import type { TaxonomyKind } from "../taxonomy";
import { TaxonomyColumn } from "./taxonomy-column";
import "./taxonomy-column.css";

/** From here the two lists sit side by side; below it they are two tabs. */
const WIDE_QUERY = "(min-width: 1024px)";

/**
 * 分类与标签: Categories on the left and Tags on the right from 1024px, two
 * tabs in the frame's second row below it. On a phone 新建 is the top bar's
 * primary action, for the tab that is open.
 */
export function TaxonomyPage() {
  const wide = useMediaQuery(WIDE_QUERY);
  const [tab, setTab] = useState<TaxonomyKind>("category");
  const [creating, setCreating] = useState<TaxonomyKind | null>(null);
  const categories = useTaxonomyItems("category");
  const tags = useTaxonomyItems("tag");

  const column = (kind: TaxonomyKind, state: typeof categories) => (
    <TaxonomyColumn
      kind={kind}
      items={state.items}
      isPending={state.isPending}
      isError={state.isError}
      onRetry={() => void state.refetch()}
      createOpen={creating === kind}
      onCreateOpenChange={(open) => setCreating(open ? kind : null)}
      compact={!wide}
    />
  );

  return (
    <AdminPage
      className="taxonomy-page"
      title={m.admin_taxonomy_title()}
      primaryAction={
        wide
          ? null
          : {
              label:
                tab === "category"
                  ? m.taxonomy_manager_create_category()
                  : m.admin_taxonomy_create_tag(),
              icon: <Plus size={17} />,
              onClick: () => setCreating(tab),
            }
      }
      tabs={
        wide ? undefined : (
          <Tabs
            aria-label={m.admin_taxonomy_title()}
            value={tab}
            onValueChange={setTab}
            items={[
              {
                value: "category",
                label: m.category_manager_title(),
                count: categories.items?.length ?? "—",
              },
              {
                value: "tag",
                label: m.tag_manager_title(),
                count: tags.items?.length ?? "—",
              },
            ]}
          />
        )
      }
      body="split"
    >
      <div className="taxonomy-columns">
        {wide || tab === "category" ? column("category", categories) : null}
        {wide || tab === "tag" ? column("tag", tags) : null}
      </div>
    </AdminPage>
  );
}
