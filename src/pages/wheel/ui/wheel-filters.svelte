<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import XIcon from '@lucide/svelte/icons/x'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { MEDIA_TYPES, WATCH_STATUSES, WATCH_STATUS_META } from '$shared/config/domain'
  import { getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'

  import type { MediaType, WatchStatus } from '$shared/config/domain'
  import type { WheelGenre } from '../wheel.types'

  type GenreMatchMode = 'or' | 'and'
  type ListOption = { id: string; title: string; _count?: { items: number } }

  type Props = {
    lists: ListOption[]
    currentListId: string
    currentListTitle: string
    onListChange: (listId: string) => void
    genreMatchMode: GenreMatchMode
    onGenreMatchModeChange: (value: GenreMatchMode) => void
    selectedTypes: MediaType[]
    selectedStatuses: WatchStatus[]
    selectedGenreSlugs: string[]
    genres: WheelGenre[]
    canResetFilters: boolean
    onToggleType: (type: MediaType) => void
    onToggleStatus: (status: WatchStatus) => void
    onToggleGenre: (slug: string) => void
    onReset: () => void
  }

  const {
    lists,
    currentListId,
    currentListTitle,
    onListChange,
    genreMatchMode,
    onGenreMatchModeChange,
    selectedTypes,
    selectedStatuses,
    selectedGenreSlugs,
    genres,
    canResetFilters,
    onToggleType,
    onToggleStatus,
    onToggleGenre,
    onReset,
  }: Props = $props()

  let filtersExpanded = $state(false)

  const watchStatusLabels = getWatchStatusLabels(L)

  const typeDotClass: Record<MediaType, string> = {
    MOVIE: 'bg-blue-500',
    TV: 'bg-green-500',
    ANIME: 'bg-purple-500',
    CARTOON: 'bg-orange-500',
    OTHER: 'bg-muted-foreground',
  }
</script>

<section class="overflow-hidden rounded-lg border bg-card">
  <div class="flex flex-wrap items-center gap-2 px-3 py-2 {filtersExpanded ? 'border-b border-border' : ''}">
    <button
      type="button"
      class="inline-flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left text-sm font-semibold hover:bg-accent/60"
      aria-expanded={filtersExpanded}
      aria-label={filtersExpanded ? L.wheel_filters_collapse() : L.wheel_filters_expand()}
      onclick={() => (filtersExpanded = !filtersExpanded)}
    >
      <ChevronDownIcon
        class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {filtersExpanded
          ? ''
          : '-rotate-90'}"
        aria-hidden="true"
      />
      <span class="shrink-0">{L.wheel_filters_title()}</span>
      <span class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 pl-1" aria-hidden="true">
        {#each selectedTypes as type (type)}
          <span
            class="size-2.5 shrink-0 rounded-full ring-2 ring-background {typeDotClass[type]}"
            title={getMediaTypeMeta(type).label}
          ></span>
        {/each}
        {#each selectedStatuses as status (status)}
          <span
            class="size-2.5 shrink-0 rounded-full ring-2 ring-background"
            style="background-color: {WATCH_STATUS_META[status].bgColor}"
            title={watchStatusLabels[status]}
          ></span>
        {/each}
        {#each selectedGenreSlugs as slug (slug)}
          {@const genre = genres.find((g) => g.slug === slug)}
          <span
            class="max-w-18 shrink-0 truncate rounded-md bg-primary/12 px-1 py-px text-[10px] font-medium text-primary"
            title={genre?.name ?? slug}
          >
            {genre?.name ?? slug}
          </span>
        {/each}
      </span>
    </button>
    {#if filtersExpanded && canResetFilters}
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onclick={onReset}
      >
        <XIcon class="size-3.5" />
        {L.common_reset()}
      </button>
    {/if}
  </div>

  {#if filtersExpanded}
    <div class="space-y-3 p-3">
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.wheel_source_list_label()}</p>
          <Select.Root type="single" value={currentListId} onValueChange={(v) => v && onListChange(v)}>
            <Select.Trigger class="h-9 w-full text-sm">
              {currentListTitle}
            </Select.Trigger>
            <Select.Content>
              {#each lists as list (list.id)}
                <Select.Item
                  value={list.id}
                  label={list._count?.items == null ? list.title : `${list.title} (${list._count.items})`}
                />
              {/each}
            </Select.Content>
          </Select.Root>
          <p class="text-[11px] text-muted-foreground">{L.wheel_source_list_hint()}</p>
        </div>

        <div class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.wheel_genre_match_mode_label()}</p>
          <Select.Root
            type="single"
            value={genreMatchMode}
            onValueChange={(v) => onGenreMatchModeChange(v as GenreMatchMode)}
          >
            <Select.Trigger class="h-9 w-full text-sm">
              {genreMatchMode === 'and' ? L.wheel_genre_mode_and() : L.wheel_genre_mode_or()}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="or" label={L.wheel_genre_mode_or()} />
              <Select.Item value="and" label={L.wheel_genre_mode_and()} />
            </Select.Content>
          </Select.Root>
          <p class="text-[11px] text-muted-foreground">
            {genreMatchMode === 'and' ? L.wheel_genre_mode_and_description() : L.wheel_genre_mode_or_description()}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground">{L.board_filter_types()}</p>
        <div class="flex flex-wrap gap-2">
          {#each MEDIA_TYPES as type (type)}
            {@const meta = getMediaTypeMeta(type)}
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedTypes.includes(type)
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'} {meta.color}"
              aria-pressed={selectedTypes.includes(type)}
              onclick={() => onToggleType(type)}
            >
              {meta.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground">{L.home_all_statuses()}</p>
        <div class="flex flex-wrap gap-2">
          {#each WATCH_STATUSES as status (status)}
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedStatuses.includes(
                status,
              )
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
              aria-pressed={selectedStatuses.includes(status)}
              onclick={() => onToggleStatus(status)}
            >
              {watchStatusLabels[status]}
            </button>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground">{L.board_filter_genres()}</p>
        {#if genres.length === 0}
          <p class="text-xs text-muted-foreground">{L.wheel_no_genres()}</p>
        {:else}
          <div class="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
            {#each genres as genre (genre.id)}
              <button
                type="button"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedGenreSlugs.includes(
                  genre.slug,
                )
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
                aria-pressed={selectedGenreSlugs.includes(genre.slug)}
                onclick={() => onToggleGenre(genre.slug)}
              >
                {genre.name}
              </button>
            {/each}
          </div>
          <p class="text-[11px] text-muted-foreground">
            {genreMatchMode === 'and' ? L.wheel_genre_mode_and_description() : L.wheel_genre_mode_or_description()}
          </p>
        {/if}
      </div>
    </div>
  {/if}
</section>
