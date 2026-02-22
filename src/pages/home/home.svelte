<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'

  import { L } from '$lib'

  import AddMediaModal from './ui/add-media-modal.svelte'
  import MediaCard from './ui/media-card.svelte'
  import MediaFilterBar from './ui/media-filter-bar.svelte'

  import type { WatchStatus } from '$shared/config/domain'
  import type { PageData } from '../../routes/$types'

  const data = $derived(page.data as PageData)
  const queryClient = useQueryClient()

  // Filter state is intentionally initialized once from URL params — use untrack to suppress Svelte warning.
  let query = $state(untrack(() => data.filters?.q ?? ''))
  let genre = $state(untrack(() => data.filters?.genre ?? ''))
  let status = $state<WatchStatus | ''>(untrack(() => data.filters?.status ?? ''))
  let showAddModal = $state(false)

  const hasActiveFilters = $derived(!!(query || genre || status))

  const buildItemsUrl = () => {
    if (!data.list?.id) return null

    const parts: string[] = [`limit=60`]

    if (data.filters?.q) parts.push(`q=${encodeURIComponent(data.filters.q)}`)

    if (data.filters?.genre) parts.push(`genres=${encodeURIComponent(data.filters.genre)}`)

    if (data.filters?.status) parts.push(`status=${data.filters.status}`)

    return `/api/lists/${data.list.id}/items?${parts.join('&')}`
  }

  const itemsQuery = createQuery(() => ({
    queryKey: ['list-items', data.list?.id, data.filters],
    enabled: !!data.list?.id,
    queryFn: async () => {
      const url = buildItemsUrl()

      if (!url) return { items: [] }

      const response = await fetch(url)

      if (!response.ok) throw new Error('Failed to fetch items')

      return response.json() as Promise<{ items: typeof data.items }>
    },
    initialData: { items: untrack(() => data.items ?? []) },
    staleTime: 0,
  }))

  const applyFilters = async (overrides?: { query?: string; genre?: string; status?: WatchStatus | '' }) => {
    const q = overrides?.query ?? query
    const g = overrides?.genre ?? genre
    const s = overrides?.status ?? status

    const parts: string[] = []

    if (q.trim()) parts.push(`q=${encodeURIComponent(q.trim())}`)

    if (g) parts.push(`genre=${encodeURIComponent(g)}`)

    if (s) parts.push(`status=${encodeURIComponent(s)}`)

    await goto(parts.length > 0 ? `/?${parts.join('&')}` : '/')
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
    goto('/')
  }

  const handleDelete = () => {
    queryClient.invalidateQueries({ queryKey: ['list-items'] })
  }
</script>

{#if !data.authenticated}
  <section class="rounded-lg border bg-card p-8 text-center">
    <h1 class="text-2xl font-semibold">{L.app_name()}</h1>
    <p class="mt-2 text-muted-foreground">{L.home_guest_description()}</p>
    <a href="/signin" class="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium">{L.common_sign_in()}</a>
  </section>
{:else}
  <section class="space-y-4">
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

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {#each itemsQuery.data?.items ?? [] as item (item.id)}
        <MediaCard {item} listId={data.list?.id} onDelete={handleDelete} />
      {/each}
    </div>
  </section>
{/if}

{#if showAddModal}
  <AddMediaModal
    listId={data.list?.id ?? ''}
    listTitle={data.list?.title ?? '—'}
    onclose={() => (showAddModal = false)}
    onAdded={() => queryClient.invalidateQueries({ queryKey: ['list-items'] })}
  />
{/if}
