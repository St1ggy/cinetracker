<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import LibraryBigIcon from '@lucide/svelte/icons/library-big'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { MediaFiltersBar } from '$features/media-filters'
  import { L } from '$lib'
  import { type MediaFiltersState, emptyMediaFiltersState, mediaFiltersHasAny } from '$shared/lib/media-filters'
  import {
    buildResetMediaFiltersState,
    mediaFilterDefaultSortForSurface,
    mergeNavigateMediaFilters,
    parseFiltersForSurface,
  } from '$shared/lib/media-filters-surface'
  import { buildListItemsApiUrl, writeMediaFiltersToSearchParams } from '$shared/lib/media-filters-url'
  import { getStorageItem, setStorageItem } from '$shared/lib/storage'


  import AddMediaModal from './ui/add-media-modal.svelte'
  import MediaCard from './ui/media-card.svelte'
  import MediaListRow from './ui/media-list-row.svelte'
  import MediaViewControls from './ui/media-view-controls.svelte'

  import type { PageData } from '../../routes/$types'

  type ViewMode = 'grid' | 'compact' | 'list'

  const data = $derived(page.data as PageData)
  const queryClient = useQueryClient()

  const filtersFromUrl = $derived(
    data.authenticated && data.filters ? data.filters : emptyMediaFiltersState(),
  )

  let showAddModal = $state(false)

  const currentListId = $derived(data.list?.id ?? '')

  let viewMode = $state<ViewMode>('grid')
  let viewModeLoaded = $state(false)

  $effect(() => {
    getStorageItem<ViewMode>('home-view-mode', 'grid').then((v) => {
      viewMode = v
      viewModeLoaded = true
    })
  })

  $effect(() => {
    if (viewModeLoaded) setStorageItem('home-view-mode', viewMode)
  })

  const hasActiveFilters = $derived(mediaFiltersHasAny(filtersFromUrl))

  const navigateWithFilters = async (patch: Partial<MediaFiltersState>) => {
    const url = mergeNavigateMediaFilters(page.url, patch, 'home')

    await goto(url.toString())
  }

  const itemsQuery = createQuery(() => ({
    queryKey: ['list-items', currentListId, filtersFromUrl],
    enabled: !!currentListId && !!data.authenticated,
    queryFn: async () => {
      const url = buildListItemsApiUrl(currentListId, filtersFromUrl, { limit: 60 })

      const response = await fetch(url)

      if (!response.ok) throw new Error('Failed to fetch items')

      return response.json() as Promise<{ items: typeof data.items }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    initialData:
      currentListId === untrack(() => data.list?.id) ? { items: untrack(() => data.items ?? []) } : undefined,
    staleTime: 0,
  }))

  const handleReset = async () => {
    const base = parseFiltersForSurface(page.url.searchParams, 'home')
    const next = buildResetMediaFiltersState(base, 'home')
    const url = new URL(page.url)

    writeMediaFiltersToSearchParams(url.searchParams, next, {
      defaultSort: mediaFilterDefaultSortForSurface('home'),
    })
    await goto(url.toString())
  }

  const items = $derived(itemsQuery.data?.items ?? [])
</script>

{#if !data.authenticated}
  <section class="rounded-xl border bg-card p-10 text-center shadow-sm">
    <div class="mx-auto max-w-sm space-y-3">
      <h1 class="text-3xl font-bold tracking-tight">{L.app_name()}</h1>
      <p class="text-muted-foreground">{L.home_guest_description()}</p>
      <a
        href="/signin"
        class="mt-2 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >{L.common_sign_in()}</a
      >
    </div>
  </section>
{:else}
  <section class="space-y-4">
    <MediaFiltersBar
      mode="home"
      filters={filtersFromUrl}
      onPatch={(p) => navigateWithFilters(p)}
      countryCodes={data.listCountryCodes ?? []}
      canReset={hasActiveFilters}
      onReset={handleReset}
      catalogGenres={data.genres ?? []}
      homeListsForPicker={data.lists ?? []}
      onHomeListSelect={(id) => navigateWithFilters({ listId: id })}
      onAddClick={() => (showAddModal = true)}
    />

    <MediaViewControls {viewMode} onViewChange={(v) => (viewMode = v)} />

    {#if items.length === 0}
      <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 py-16 text-center">
        <div class="rounded-full border bg-muted p-4">
          <LibraryBigIcon class="size-7 text-muted-foreground" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium">
            {hasActiveFilters ? L.media_filters_home_no_items() : L.home_no_description_yet()}
          </p>
          {#if hasActiveFilters}
            <p class="text-xs text-muted-foreground">{L.media_filters_empty_suggestion()}</p>
          {:else}
            <p class="text-xs text-muted-foreground">{L.home_add_product_description()}</p>
          {/if}
        </div>
        {#if !hasActiveFilters}
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onclick={() => (showAddModal = true)}
          >
            <PlusIcon class="size-4" />
            {L.home_add_product()}
          </button>
        {:else}
          <button
            class="rounded-md border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onclick={handleReset}
          >
            {L.common_reset()}
          </button>
        {/if}
      </div>
    {:else if viewMode === 'list'}
      <div class="space-y-1.5">
        {#each items as item (item.id)}
          <MediaListRow {item} />
        {/each}
      </div>
    {:else if viewMode === 'compact'}
      <div class="grid grid-cols-3 gap-2 md:grid-cols-5 xl:grid-cols-7">
        {#each items as item (item.id)}
          <MediaCard {item} compact />
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {#each items as item (item.id)}
          <MediaCard {item} />
        {/each}
      </div>
    {/if}
  </section>
{/if}

{#if showAddModal}
  <AddMediaModal
    listId={currentListId}
    listTitle={data.list?.title ?? '—'}
    onclose={() => (showAddModal = false)}
    onAdded={() => queryClient.invalidateQueries({ queryKey: ['list-items'] })}
  />
{/if}
