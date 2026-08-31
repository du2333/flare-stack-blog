import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/select";
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
    <Select
      value={value == null ? "" : String(value)}
      disabled={isLoading}
      onChange={(next) => onChange(next === "" ? null : Number(next))}
      options={[
        { value: "", label: m.editor_meta_uncategorized() },
        ...categories.map((category) => ({
          value: String(category.id),
          label: category.name,
        })),
      ]}
    />
  );
}
