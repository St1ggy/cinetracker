<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import LibraryBigIcon from '@lucide/svelte/icons/library-big'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { getStorageItem, setStorageItem } from '$shared/lib/storage'

  import AddMediaModal from './ui/add-media-modal.svelte'
  import MediaCard from './ui/media-card.svelte'
  import MediaFilterBar from './ui/media-filter-bar.svelte'
  import MediaListRow from './ui/media-list-row.svelte'
  import MediaViewControls from './ui/media-view-controls.svelte'

  import type { WatchStatus } from '$shared/config/domain'
  import type { PageData } from '../../routes/$types'

  type ViewMode = 'grid' | 'compact' | 'list'

  const data = $derived(page.data as PageData)
  const queryClient = useQueryClient()

  // Session-only: which list is shown on home (can switch until reload).
  let currentListId = $state(untrack(() => data.list?.id ?? ''))

  $effect(() => {
    if (data.list?.id && !currentListId) currentListId = data.list.id
  })

  const lists = $derived((data.lists ?? []) as { id: string; title: string; _count?: { items: number } }[])
  const currentList = $derived(lists.find((l) => l.id === currentListId) ?? data.list ?? null)

  // Filter state initialized once from URL params.
  let query = $state(untrack(() => data.filters?.q ?? ''))
  let genre = $state(untrack(() => data.filters?.genre ?? ''))
  let status = $state<WatchStatus | ''>(untrack(() => data.filters?.status ?? ''))
  let showAddModal = $state(false)

  // View mode persisted in storage — personal preference, not part of URL.
  let viewMode = $state<ViewMode>('grid')
  let viewModeLoaded = $state(false)

  // Read once on mount; SSR gets the default 'grid'.
  $effect(() => {
    getStorageItem<ViewMode>('home-view-mode', 'grid').then((v) => {
      viewMode = v
      viewModeLoaded = true
    })
  })

  // Write only after the initial read to avoid overwriting with the default.
  $effect(() => {
    if (viewModeLoaded) setStorageItem('home-view-mode', viewMode)
  })

  const hasActiveFilters = $derived(!!(query || genre || status))

  const buildItemsUrl = () => {
    if (!currentListId) return null

    const parts: string[] = [`limit=60`]

    if (data.filters?.q) parts.push(`q=${encodeURIComponent(data.filters.q)}`)

    if (data.filters?.genre) parts.push(`genres=${encodeURIComponent(data.filters.genre)}`)

    if (data.filters?.status) parts.push(`status=${data.filters.status}`)

    if (data.filters?.sort) parts.push(`sort=${data.filters.sort}`)

    return `/api/lists/${currentListId}/items?${parts.join('&')}`
  }

  const itemsQuery = createQuery(() => ({
    queryKey: ['list-items', currentListId, data.filters],
    enabled: !!currentListId,
    queryFn: async () => {
      const url = buildItemsUrl()

      if (!url) return { items: [] }

      const response = await fetch(url)

      if (!response.ok) throw new Error('Failed to fetch items')

      return response.json() as Promise<{ items: typeof data.items }>
    },
    throwOnError: false,
    meta: { onError: () => toast.error(L.common_error_generic()) },
    initialData: currentListId === data.list?.id ? { items: untrack(() => data.items ?? []) } : undefined,
    staleTime: 0,
  }))

  const applyFilters = async (overrides?: { query?: string; genre?: string; status?: WatchStatus | '' }) => {
    const q = overrides?.query ?? query
    const g = overrides?.genre ?? genre
    const s = overrides?.status ?? status
    const current = new URL(page.url)

    current.searchParams.delete('q')
    current.searchParams.delete('genre')
    current.searchParams.delete('status')

    if (q.trim()) current.searchParams.set('q', q.trim())

    if (g) current.searchParams.set('genre', g)

    if (s) current.searchParams.set('status', s)

    await goto(current.toString())
  }

  const handleGenreChange = (v: string) => {
    genre = v
    applyFilters({ genre: v })
  }

  const handleStatusChange = (v: WatchStatus | '') => {
    status = v
    applyFilters({ status: v })
  }

  const handleReset = () => {
    query = ''
    genre = ''
    status = ''
    const current = new URL(page.url)
    const sort = current.searchParams.get('sort')

    const next = sort ? `/?sort=${sort}` : '/'

    goto(next)
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
    {#if lists.length > 1}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">{L.home_list_label()}</span>
        <Select.Root type="single" value={currentListId} onValueChange={(v) => v && (currentListId = v)}>
          <Select.Trigger class="h-9 min-w-[140px] text-sm">
            {currentList?.title ?? '—'}
          </Select.Trigger>
          <Select.Content>
            {#each lists as list (list.id)}
              <Select.Item value={list.id} label={list.title} />
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    {/if}
    <MediaFilterBar
      {query}
      {genre}
      {status}
      {hasActiveFilters}
      genres={data.genres ?? []}
      onReset={handleReset}
      onAddClick={() => (showAddModal = true)}
      onQueryChange={(v) => (query = v)}
      onQueryApply={() => applyFilters()}
      onGenreChange={handleGenreChange}
      onStatusChange={handleStatusChange}
    />

    <MediaViewControls {viewMode} onViewChange={(v) => (viewMode = v)} />

    {#if items.length === 0}
      <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 py-16 text-center">
        <div class="rounded-full border bg-muted p-4">
          <LibraryBigIcon class="size-7 text-muted-foreground" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium">
            {hasActiveFilters ? L.explore_no_results() : L.home_no_description_yet()}
          </p>
          {#if !hasActiveFilters}
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
    listTitle={currentList?.title ?? '—'}
    onclose={() => (showAddModal = false)}
    onAdded={() => queryClient.invalidateQueries({ queryKey: ['list-items'] })}
  />
{/if}
