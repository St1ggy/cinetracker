<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import XIcon from '@lucide/svelte/icons/x'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import { getWatchStatusLabels } from '$shared/lib/labels'

  import type { WatchStatus } from '$shared/config/domain'

  type Genre = { id: string; slug: string; name: string }

  type Props = {
    query: string
    genre: string
    status: WatchStatus | ''
    genres: Genre[]
    hasActiveFilters: boolean
    onReset: () => void
    onAddClick: () => void
    onQueryChange: (v: string) => void
    onQueryApply: () => void
    onGenreChange: (v: string) => void
    onStatusChange: (v: WatchStatus | '') => void
  }

  const {
    query,
    genre,
    status,
    genres,
    hasActiveFilters,
    onReset,
    onAddClick,
    onQueryChange,
    onQueryApply,
    onGenreChange,
    onStatusChange,
  }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)
</script>

<div class="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
  <div class="relative min-w-[220px] flex-1">
    <SearchIcon class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
    <input
      class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
      placeholder={L.home_search_title_placeholder()}
      value={query}
      oninput={(event_) => onQueryChange((event_.currentTarget as HTMLInputElement).value)}
      onkeydown={(event_) => event_.key === 'Enter' && onQueryApply()}
    />
  </div>
  <Select.Root type="single" value={genre || '__all__'} onValueChange={(v) => onGenreChange(v === '__all__' ? '' : v)}>
    <Select.Trigger class="h-9 min-w-[130px] text-sm">
      {genre ? (genres.find((g) => g.slug === genre)?.name ?? genre) : L.home_all_genres()}
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="__all__" label={L.home_all_genres()} />
      {#each genres as g (g.id)}
        <Select.Item value={g.slug} label={g.name} />
      {/each}
    </Select.Content>
  </Select.Root>
  <Select.Root
    type="single"
    value={status || '__all__'}
    onValueChange={(v) => onStatusChange(v === '__all__' ? '' : (v as WatchStatus))}
  >
    <Select.Trigger class="h-9 min-w-[140px] text-sm">
      {status ? watchStatusLabels[status] : L.home_all_statuses()}
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="__all__" label={L.home_all_statuses()} />
      {#each WATCH_STATUSES as st (st)}
        <Select.Item value={st} label={watchStatusLabels[st]} />
      {/each}
    </Select.Content>
  </Select.Root>
  {#if hasActiveFilters}
    <button
      class="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      onclick={onReset}
    >
      <XIcon class="size-3.5" />
      {L.common_reset()}
    </button>
  {/if}
  <button
    class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
    onclick={onAddClick}
  >
    <PlusIcon class="size-4" />
    {L.home_add_product()}
  </button>
</div>
