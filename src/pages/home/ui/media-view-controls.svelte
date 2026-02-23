<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Grid2x2Icon from '@lucide/svelte/icons/grid-2x2'
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid'
  import LayoutListIcon from '@lucide/svelte/icons/layout-list'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'

  import type { PageData } from '../../../routes/$types'

  type ViewMode = 'grid' | 'compact' | 'list'

  type ListOption = { id: string; title: string }

  type Props = {
    viewMode: ViewMode
    onViewChange: (v: ViewMode) => void
    lists?: ListOption[]
    currentListId?: string
    currentListTitle?: string
    onListChange?: (id: string) => void
  }

  const {
    viewMode,
    onViewChange,
    lists = [],
    currentListId = '',
    currentListTitle = '—',
    onListChange,
  }: Props = $props()

  const showListSelect = $derived(lists.length > 1 && !!onListChange)

  const SORT_OPTIONS = [
    { value: 'added_desc', label: () => L.home_sort_added_desc() },
    { value: 'added_asc', label: () => L.home_sort_added_asc() },
    { value: 'title_asc', label: () => L.home_sort_title_asc() },
    { value: 'title_desc', label: () => L.home_sort_title_desc() },
    { value: 'year_desc', label: () => L.home_sort_year_desc() },
    { value: 'year_asc', label: () => L.home_sort_year_asc() },
    { value: 'rating_desc', label: () => L.home_sort_rating_desc() },
  ] as const

  const currentSort = $derived((page.data as PageData).filters?.sort ?? 'added_desc')
  const currentSortLabel = $derived(
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label() ?? L.home_sort_added_desc(),
  )

  const handleSortChange = async (value: string) => {
    const current = new URL(page.url)

    if (value === 'added_desc') {
      current.searchParams.delete('sort')
    } else {
      current.searchParams.set('sort', value)
    }

    await goto(current.toString())
  }

  const VIEW_MODES: { value: ViewMode; icon: typeof LayoutGridIcon; label: () => string }[] = [
    { value: 'grid', icon: LayoutGridIcon, label: () => L.home_view_grid() },
    { value: 'compact', icon: Grid2x2Icon, label: () => L.home_view_compact() },
    { value: 'list', icon: LayoutListIcon, label: () => L.home_view_list() },
  ]
</script>

<div class="flex items-center justify-between gap-2">
  <div class="flex flex-wrap items-center gap-2">
    {#if showListSelect}
      <span class="text-xs text-muted-foreground">{L.home_list_label()}:</span>
      <Select.Root type="single" value={currentListId} onValueChange={(v) => v && onListChange?.(v)}>
        <Select.Trigger class="h-8 min-w-[140px] text-xs">
          {currentListTitle}
        </Select.Trigger>
        <Select.Content>
          {#each lists as list (list.id)}
            <Select.Item value={list.id} label={list.title} />
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}
    <span class="text-xs text-muted-foreground">{L.home_sort_label()}:</span>
    <Select.Root type="single" value={currentSort} onValueChange={handleSortChange}>
      <Select.Trigger class="h-8 min-w-[150px] text-xs">
        {currentSortLabel}
      </Select.Trigger>
      <Select.Content>
        {#each SORT_OPTIONS as opt (opt.value)}
          <Select.Item value={opt.value} label={opt.label()} />
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <div class="flex items-center rounded-md border">
    {#each VIEW_MODES as mode (mode.value)}
      <button
        type="button"
        title={mode.label()}
        class="px-2.5 py-1.5 first:rounded-l-md last:rounded-r-md {viewMode === mode.value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
        onclick={() => onViewChange(mode.value)}
      >
        <mode.icon class="size-4" />
      </button>
    {/each}
  </div>
</div>
