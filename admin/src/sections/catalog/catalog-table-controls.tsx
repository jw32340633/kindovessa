"use client";

import { useRef } from "react";
import { Search, X, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

export function CatalogTableSearch({ label, placeholder, value, disabled, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative w-full sm:ml-auto sm:max-w-sm">
      <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
      <Input ref={input} type="search" aria-label={label} placeholder={placeholder} value={value} disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-none pr-12 pl-10 [&::-webkit-search-cancel-button]:hidden" />
      {value && !disabled && (
        <button type="button" aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          onClick={() => { onChange(""); input.current?.focus(); }}>
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function CatalogTableEmptyRow({ columns, rows, icon: Icon, title, description }: {
  columns: number;
  rows: number;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="p-0" style={{ height: `calc(var(--spacing) * ${rows * 20})` }}>
        <div role="status" className="sticky left-0 w-[100cqw] px-4 text-center whitespace-normal">
          <Icon className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}
