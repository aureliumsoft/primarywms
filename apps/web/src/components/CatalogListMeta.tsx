import { format } from "date-fns";
import { formatCustomValue, type CustomFieldDef, type StoredCustomValue } from "@/lib/custom-field-values";

export function fieldsForList(fields: CustomFieldDef[], kind: "ITEM" | "FOLDER") {
  return fields.filter((field) => {
    if (!field.listVisible) return false;
    return kind === "ITEM" ? field.appliesTo !== "FOLDER" : field.appliesTo !== "ITEM";
  });
}

export function CatalogListMeta({
  fields,
  stored,
  updatedAt,
}: {
  fields: CustomFieldDef[];
  stored?: StoredCustomValue[];
  updatedAt: string | Date;
}) {
  return (
    <div className="min-w-0 space-y-[3px] text-[13px] leading-5 text-[#3d4f47]">
      {fields.map((field) => {
        const value = formatCustomValue(field, stored?.find((row) => row.fieldId === field.id));
        return (
          <p key={field.id} className="truncate">
            <span className="text-[#8a9a93]">{field.name}: </span>
            {value === "—" ? "" : value}
          </p>
        );
      })}
      <p className="truncate">
        <span className="text-[#8a9a93]">Updated At: </span>
        {format(new Date(updatedAt), "dd/MM/yyyy HH:mm")}
      </p>
    </div>
  );
}
