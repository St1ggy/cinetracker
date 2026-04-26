<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy } from 'svelte'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { MEDIA_TYPES, WATCH_STATUSES, WATCH_STATUS_META } from '$shared/config/domain'
  import { getMediaTypeMeta, getWatchStatusLabels } from '$shared/lib/labels'
  import { resolveGenreSlugs, resolveStatuses } from '$shared/lib/media-filters'
  import {
    patchToggleGenreSlug,
    patchToggleMediaType,
    patchToggleWatchStatus,
  } from '$shared/lib/media-filters-surface'

  import MediaFiltersAdvancedInstant from './media-filters-advanced-instant.svelte'

  import type { MediaType } from '$shared/config/domain'
  import type { GenreMatchMode, MediaFiltersState } from '$shared/lib/media-filters'

  const SEARCH_DEBOUNCE_MS = 400

  type Mode = 'home' | 'board' | 'wheel'

  type CatalogGenre = { id: string; slug: string; name: string }
  type BoardGenre = { slug: string; name: string }
  type ListRow = { id: string; title: string; _count?: { items: number } }

  type Props = {
    mode: Mode
    filters: MediaFiltersState
    onPatch: (patch: Partial<MediaFiltersState>) => void | Promise<void>
    countryCodes: string[]
    onReset?: () => void | Promise<void>
    canReset?: boolean
    /** home: full genre catalog; wheel: subset with names */
    catalogGenres?: CatalogGenre[]
    onAddClick?: () => void
    /** home: single list selector (path list id) */
    homeListsForPicker?: ListRow[]
    onHomeListSelect?: (listId: string) => void
    homeListSelectTitle?: string
    /** board */
    boardLists?: ListRow[]
    boardGenres?: BoardGenre[]
    onBoardListToggle?: (listId: string) => void
    /** wheel: effective list (URL default applied in parent) */
    wheelSelectedListId?: string
    wheelListTitleText?: string
  }

  const {
    mode,
    filters,
    onPatch,
    countryCodes,
    onReset,
    canReset = false,
    catalogGenres = [],
    onAddClick,
    homeListsForPicker = [],
    onHomeListSelect,
    homeListSelectTitle,
    boardLists = [],
    boardGenres = [],
    onBoardListToggle,
    wheelSelectedListId,
    wheelListTitleText,
  }: Props = $props()

  const idPrefix = $derived(`mf-${mode}`)
  const watchStatusLabels = getWatchStatusLabels(L)

  let advancedExpanded = $state(false)
  let wheelPanelExpanded = $state(false)

  /* eslint-disable svelte/prefer-writable-derived */
  let searchDraft = $state('')

  $effect(() => {
    searchDraft = filters.q?.trim() ?? ''
  })
  /* eslint-enable svelte/prefer-writable-derived */

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const pushSearch = (q: string) => {
    if (searchTimer) clearTimeout(searchTimer)

    searchTimer = setTimeout(() => {
      searchTimer = null
      Promise.resolve(onPatch({ q: q.trim() || null })).catch((): null => null)
    }, SEARCH_DEBOUNCE_MS)
  }

  const flushSearch = () => {
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }

    Promise.resolve(onPatch({ q: searchDraft.trim() || null })).catch((): null => null)
  }

  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  const wheelListTriggerTitle = $derived(
    wheelListTitleText ?? boardLists.find((l) => l.id === (filters.listId ?? ''))?.title ?? '—',
  )
  const genreMode = $derived(filters.genreMatchMode)
  const selectedTypes = $derived(filters.types)
  const selectedStatuses = $derived(resolveStatuses(filters) ?? [])
  const selectedGenreSlugs = $derived(resolveGenreSlugs(filters))

  const typeDotClass: Record<MediaType, string> = {
    MOVIE: 'bg-blue-500',
    TV: 'bg-green-500',
    ANIME: 'bg-purple-500',
    CARTOON: 'bg-orange-500',
    OTHER: 'bg-muted-foreground',
  }

  const homeListPickerValue = $derived(
    filters.listId && homeListsForPicker.some((l) => l.id === filters.listId) ? filters.listId : undefined,
  )
  const homeListPickerLabel = $derived(
    homeListSelectTitle ?? homeListsForPicker.find((l) => l.id === (homeListPickerValue ?? ''))?.title ?? '—',
  )
</script>

{#if mode === 'wheel'}
  <section class="overflow-hidden rounded-lg border bg-card">
    <div class="flex flex-wrap items-center gap-2 px-3 py-2 {wheelPanelExpanded ? 'border-b border-border' : ''}">
      <button
        type="button"
        class="inline-flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left text-sm font-semibold hover:bg-accent/60"
        aria-expanded={wheelPanelExpanded}
        aria-label={wheelPanelExpanded ? L.wheel_filters_collapse() : L.wheel_filters_expand()}
        onclick={() => (wheelPanelExpanded = !wheelPanelExpanded)}
      >
        <ChevronDownIcon
          class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {wheelPanelExpanded
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
            {@const genre = catalogGenres.find((g) => g.slug === slug)}
            <span
              class="max-w-18 shrink-0 truncate rounded-md bg-primary/12 px-1 py-px text-[10px] font-medium text-primary"
              title={genre?.name ?? slug}
            >
              {genre?.name ?? slug}
            </span>
          {/each}
        </span>
      </button>
      {#if wheelPanelExpanded && canReset && onReset}
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={() => onReset()}
        >
          <XIcon class="size-3.5" />
          {L.common_reset()}
        </button>
      {/if}
    </div>
    {#if wheelPanelExpanded}
      <div class="space-y-3 p-3">
        <div class="relative min-w-0">
          <SearchIcon class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <input
            class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
            id={`${idPrefix}-q`}
            placeholder={L.home_search_title_placeholder()}
            value={searchDraft}
            oninput={(event_) => {
              searchDraft = (event_.currentTarget as HTMLInputElement).value
              pushSearch(searchDraft)
            }}
            onblur={flushSearch}
            onkeydown={(event_) => {
              if (event_.key === 'Enter') {
                event_.preventDefault()
                flushSearch()
              }
            }}
          />
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">{L.wheel_source_list_label()}</p>
            <Select.Root
              type="single"
              value={wheelSelectedListId && boardLists.some((l) => l.id === wheelSelectedListId)
                ? wheelSelectedListId
                : undefined}
              onValueChange={(v) => v && onPatch({ listId: v })}
            >
              <Select.Trigger class="h-9 w-full text-sm">
                {wheelListTriggerTitle}
              </Select.Trigger>
              <Select.Content>
                {#each boardLists as list (list.id)}
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
              value={genreMode}
              onValueChange={(v) => onPatch({ genreMatchMode: v as GenreMatchMode })}
            >
              <Select.Trigger class="h-9 w-full text-sm">
                {genreMode === 'and' ? L.wheel_genre_mode_and() : L.wheel_genre_mode_or()}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="or" label={L.wheel_genre_mode_or()} />
                <Select.Item value="and" label={L.wheel_genre_mode_and()} />
              </Select.Content>
            </Select.Root>
            <p class="text-[11px] text-muted-foreground">
              {genreMode === 'and' ? L.wheel_genre_mode_and_description() : L.wheel_genre_mode_or_description()}
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
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedTypes.includes(
                  type,
                )
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-foreground'} {meta.color}"
                aria-pressed={selectedTypes.includes(type)}
                onclick={() => onPatch(patchToggleMediaType(filters, type))}
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
                  : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                aria-pressed={selectedStatuses.includes(status)}
                onclick={() => onPatch(patchToggleWatchStatus(filters, status))}
              >
                {watchStatusLabels[status]}
              </button>
            {/each}
          </div>
        </div>
        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">{L.board_filter_genres()}</p>
          {#if catalogGenres.length === 0}
            <p class="text-xs text-muted-foreground">{L.wheel_no_genres()}</p>
          {:else}
            <div class="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
              {#each catalogGenres as genre (genre.id)}
                <button
                  type="button"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedGenreSlugs.includes(
                    genre.slug,
                  )
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                  aria-pressed={selectedGenreSlugs.includes(genre.slug)}
                  onclick={() => onPatch(patchToggleGenreSlug(filters, genre.slug))}
                >
                  {genre.name}
                </button>
              {/each}
            </div>
            <p class="text-[11px] text-muted-foreground">
              {genreMode === 'and' ? L.wheel_genre_mode_and_description() : L.wheel_genre_mode_or_description()}
            </p>
          {/if}
        </div>
        <MediaFiltersAdvancedInstant
          {filters}
          {onPatch}
          {countryCodes}
          expanded={advancedExpanded}
          onExpandedChange={(v) => (advancedExpanded = v)}
          idPrefix={`${idPrefix}-adv`}
        />
      </div>
    {/if}
  </section>
{:else}
  <div
    class="space-y-3 rounded-lg border border-border bg-card {mode === 'board' ? 'p-2' : 'p-3'}"
  >
    <div class="space-y-3">
      {#if mode === 'home' || mode === 'board'}
        <div
          class="flex flex-col gap-2 min-[500px]:flex-row min-[500px]:flex-wrap min-[500px]:items-center"
        >
          <div class="relative min-w-0 min-[500px]:min-w-[220px] min-[500px]:max-w-sm min-[500px]:flex-1">
            <SearchIcon class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
              id={`${idPrefix}-q`}
              placeholder={L.home_search_title_placeholder()}
              value={searchDraft}
              oninput={(event_) => {
                searchDraft = (event_.currentTarget as HTMLInputElement).value
                pushSearch(searchDraft)
              }}
              onblur={flushSearch}
              onkeydown={(event_) => {
                if (event_.key === 'Enter') {
                  event_.preventDefault()
                  flushSearch()
                }
              }}
            />
          </div>
          {#if mode === 'home'}
            <div class="flex flex-wrap items-center gap-2">
              {#if canReset && onReset}
                <button
                  class="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  type="button"
                  onclick={() => onReset()}
                >
                  <XIcon class="size-3.5" />
                  {L.common_reset()}
                </button>
              {/if}
              {#if onAddClick}
                <button
                  class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                  type="button"
                  onclick={() => onAddClick()}
                >
                  <PlusIcon class="size-4" />
                  {L.home_add_product()}
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <div class="min-w-0 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.board_filter_lists()}</p>
          {#if mode === 'home'}
            {#if homeListsForPicker.length > 1 && onHomeListSelect}
              <Select.Root
                type="single"
                value={homeListPickerValue}
                onValueChange={(v) => v && onHomeListSelect(v)}
              >
                <Select.Trigger class="h-9 w-full max-w-md text-sm sm:w-auto sm:min-w-[220px]">
                  {homeListPickerLabel}
                </Select.Trigger>
                <Select.Content>
                  {#each homeListsForPicker as list (list.id)}
                    <Select.Item
                      value={list.id}
                      label={list._count?.items == null ? list.title : `${list.title} (${list._count.items})`}
                    />
                  {/each}
                </Select.Content>
              </Select.Root>
            {:else if homeListsForPicker.length === 1}
              <p class="text-sm text-foreground">{homeListsForPicker[0]!.title}</p>
            {:else}
              <p class="text-xs text-muted-foreground">—</p>
            {/if}
          {:else if mode === 'board'}
            <div class="flex flex-wrap items-center gap-2">
              {#if boardLists.length > 0}
                {#each boardLists as list (list.id)}
                  <button
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {filters
                      .listIds.length > 0 && filters.listIds.includes(list.id)
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                    onclick={() => onBoardListToggle?.(list.id)}
                  >
                    {list.title}
                    {#if list._count?.items != null}
                      <span class="opacity-70">({list._count.items})</span>
                    {/if}
                  </button>
                {/each}
              {:else}
                <p class="text-xs text-muted-foreground">—</p>
              {/if}
            </div>
          {/if}
        </div>

        <div class="min-w-0 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.board_filter_types()}</p>
          <div class="flex flex-wrap gap-2">
            {#each MEDIA_TYPES as mtype (mtype)}
              {@const meta = getMediaTypeMeta(mtype)}
              <button
                type="button"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedTypes.includes(
                  mtype,
                )
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-foreground'} {meta.color}"
                aria-pressed={selectedTypes.includes(mtype)}
                onclick={() => onPatch(patchToggleMediaType(filters, mtype))}
              >
                {meta.label}
              </button>
            {/each}
          </div>
        </div>

        <div class="min-w-0 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.board_filter_genres()}</p>
          {#if (mode === 'home' && catalogGenres.length > 0) || (mode === 'board' && boardGenres.length > 0)}
            <div class="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1 sm:max-h-44">
              {#if mode === 'home'}
                {#each catalogGenres as g (g.id)}
                  <button
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedGenreSlugs.includes(
                      g.slug,
                    )
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                    aria-pressed={selectedGenreSlugs.includes(g.slug)}
                    onclick={() => onPatch(patchToggleGenreSlug(filters, g.slug))}
                  >
                    {g.name}
                  </button>
                {/each}
              {:else}
                {#each boardGenres as g (g.slug)}
                  <button
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedGenreSlugs.includes(
                      g.slug,
                    )
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                    aria-pressed={selectedGenreSlugs.includes(g.slug)}
                    onclick={() => onPatch(patchToggleGenreSlug(filters, g.slug))}
                  >
                    {g.name}
                  </button>
                {/each}
              {/if}
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">{L.wheel_no_genres()}</p>
          {/if}
        </div>

        <div class="min-w-0 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">{L.home_all_statuses()}</p>
          <div class="flex flex-wrap gap-2">
            {#each WATCH_STATUSES as st (st)}
              <button
                type="button"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {selectedStatuses.includes(
                  st,
                )
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-foreground'}"
                aria-pressed={selectedStatuses.includes(st)}
                onclick={() => onPatch(patchToggleWatchStatus(filters, st))}
              >
                {watchStatusLabels[st]}
              </button>
            {/each}
          </div>
        </div>

        {#if mode === 'board' && canReset && onReset}
          <div class="flex">
            <button
              type="button"
              class="rounded-full border border-dashed border-muted-foreground/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onclick={() => onReset()}
            >
              {L.board_filter_clear()}
            </button>
          </div>
        {/if}
      {/if}
    </div>
    <MediaFiltersAdvancedInstant
      {filters}
      {onPatch}
      {countryCodes}
      expanded={advancedExpanded}
      onExpandedChange={(v) => (advancedExpanded = v)}
      idPrefix={`${idPrefix}-adv`}
    />
  </div>
{/if}
