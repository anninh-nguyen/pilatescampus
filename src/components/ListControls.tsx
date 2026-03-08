import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ListControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange?: (size: number) => void;
  totalItems: number;
  filterElement?: React.ReactNode;
}

const PAGE_SIZES = [10, 20, 50];

export function ListControls({
  search, onSearchChange, searchPlaceholder,
  page, totalPages, onPageChange,
  pageSize, onPageSizeChange, totalItems,
  filterElement,
}: ListControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
            placeholder={searchPlaceholder || t("common.search")}
            className="pl-9"
          />
        </div>
        {filterElement}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("common.showing", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, totalItems), total: totalItems })}</span>
            {onPageSizeChange && (
              <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(+v); onPageChange(1); }}>
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => onPageChange(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Client-side paginate + search helper */
export function useListControls<T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  defaultPageSize = 10,
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = search ? items.filter((item) => searchFn(item, search.toLowerCase())) : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search, setSearch,
    page: safePage, setPage,
    pageSize, setPageSize,
    filtered, paginated,
    totalPages, totalItems: filtered.length,
  };
}

import { useState } from "react";
