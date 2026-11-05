import { useId } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { SORT_LABELS, type CatalogSearch } from '../search'

type Sort = CatalogSearch['sort']

export function SortSelect({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const labelId = useId()

  return (
    <div className="flex items-center gap-1 text-sm">
      <span id={labelId}>Ordenar por:</span>
      <Select value={value} onValueChange={(next) => onChange(next as Sort)}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-8 border-0 px-1 shadow-none focus-visible:ring-2 dark:bg-transparent dark:hover:bg-transparent [&_svg:not([class*='text-'])]:text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {(Object.keys(SORT_LABELS) as Sort[]).map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
