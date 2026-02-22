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
  let yearFrom = $state(untrack(() => data.filters?.yearFrom?.toString() ?? ''))
  let yearTo = $state(untrack(() => data.filters?.yearTo?.toString() ?? ''))
  let genre = $state(untrack(() => data.filters?.genre ?? ''))
  let status = $state<WatchStatus | ''>(untrack(() => data.filters?.status ?? ''))
  let showAddModal = $state(false)

  // Items fetched via TanStack Query so the list updates immediately after adding media.
  const buildItemsUrl = () => {
    if (!data.list?.id) return null

    const parts: string[] = [`limit=60`]

    if (data.filters?.q) parts.push(`q=${encodeURIComponent(data.filters.q)}`)

    if (data.filters?.yearFrom) parts.push(`yearFrom=${data.filters.yearFrom}`)

    if (data.filters?.yearTo) parts.push(`yearTo=${data.filters.yearTo}`)

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

  const applyFilters = async () => {
    const queryPart = query.trim() ? `q=${encodeURIComponent(query.trim())}` : ''
    const genrePart = genre ? `genre=${encodeURIComponent(genre)}` : ''
    const statusPart = status ? `status=${encodeURIComponent(status)}` : ''
    const yearPart =
      yearFrom && yearTo ? `yearFrom=${encodeURIComponent(yearFrom)}&yearTo=${encodeURIComponent(yearTo)}` : ''
    const next = [queryPart, genrePart, statusPart, yearPart].filter(Boolean).join('&')

    await goto(next ? `/?${next}` : '/')
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
      {yearFrom}
      {yearTo}
      {genre}
      {status}
      genres={data.genres ?? []}
      onApply={applyFilters}
      onAddClick={() => (showAddModal = true)}
      onQueryChange={(v) => (query = v)}
      onYearFromChange={(v) => (yearFrom = v)}
      onYearToChange={(v) => (yearTo = v)}
      onGenreChange={(v) => (genre = v)}
      onStatusChange={(v) => (status = v)}
    />

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {#each itemsQuery.data?.items ?? [] as item (item.id)}
        <MediaCard {item} />
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
