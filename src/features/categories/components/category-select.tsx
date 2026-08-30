import { useQuery } from "@tanstack/react-query";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { m } from "@/paraglide/messages";

interface CategorySelectProps {
  value: number | null;
  onChange: (categoryId: number | null) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const { data, isLoading } = useQuery(categoriesAdminQueryOptions());
  const categories = data?.items ?? [];

  return (
    <select
      value={value ?? ""}
      disabled={isLoading}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === "" ? null : Number(next));
      }}
      className="h-auto w-full max-w-sm border-none bg-transparent p-0 text-xs font-mono text-foreground shadow-none focus:outline-none"
    >
      <option value="">{m.editor_meta_uncategorized()}</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
