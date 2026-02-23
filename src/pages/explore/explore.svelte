<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import CompassIcon from '@lucide/svelte/icons/compass'
  import XIcon from '@lucide/svelte/icons/x'

  import { L } from '$lib'

  import ExploreListCard from './ui/explore-list-card.svelte'
  import ExploreSearchBar from './ui/explore-search-bar.svelte'
  import ExploreTagCloud from './ui/explore-tag-cloud.svelte'

  import type { PageData } from '../../routes/explore/$types'

  const data = $derived(page.data as PageData)

  const sorts = [
    { value: 'newest', label: () => L.explore_sort_newest() },
    { value: 'popular', label: () => L.explore_sort_popular() },
    { value: 'top_rated', label: () => L.explore_sort_top_rated() },
  ] as const

  const changeSort = (sort: string) => {
    const f = data.filters
    const parts = [
      ...(f.q ? [`q=${encodeURIComponent(f.q)}`] : []),
      ...f.tags.map((t) => `tag=${encodeURIComponent(t)}`),
      `sort=${sort}`,
    ]

    goto(`/explore?${parts.join('&')}`)
  }

  const clearFilters = () => goto('/explore')

  const lastList = $derived(data.lists.at(-1))
  const hasActiveFilters = $derived(!!(data.filters.q || data.filters.tags.length > 0))

  const buildCursorUrl = (filters: { q?: string; tags: string[]; sort: string }, cursor: string): string => {
    const parts: string[] = []

    if (filters.q) parts.push(`q=${encodeURIComponent(filters.q)}`)

    for (const tag of filters.tags) parts.push(`tag=${encodeURIComponent(tag)}`)
    parts.push(`sort=${filters.sort}`, `cursor=${cursor}`)

    return parts.join('&')
  }
</script>

<section class="space-y-6">
  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <header class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">{L.explore_title()}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{L.explore_description()}</p>
    </header>

    <div class="space-y-4">
      <ExploreSearchBar query={data.filters.q} activeTags={data.filters.tags} />
      <ExploreTagCloud tags={data.popularTags} activeTags={data.filters.tags} query={data.filters.q} />
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-1.5 rounded-lg border bg-card p-1">
      {#each sorts as sort (sort.value)}
        <button
          type="button"
          class={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
            data.filters.sort === sort.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onclick={() => changeSort(sort.value)}
        >
          {sort.label()}
        </button>
      {/each}
    </div>

    {#if hasActiveFilters}
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        onclick={clearFilters}
      >
        <XIcon class="size-3.5" />
        {L.explore_empty_clear()}
      </button>
    {/if}
  </div>

  {#if data.lists.length === 0}
    <div class="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 py-20 text-center">
      <div class="rounded-full border bg-muted p-4">
        <CompassIcon class="size-8 text-muted-foreground" />
      </div>
      <div class="space-y-1">
        <p class="text-base font-medium">{L.explore_no_results()}</p>
        <p class="text-sm text-muted-foreground">{L.explore_empty_suggestion()}</p>
      </div>
      {#if hasActiveFilters}
        <button
          type="button"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onclick={clearFilters}
        >
          {L.explore_empty_clear()}
        </button>
      {/if}
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each data.lists as list (list.id)}
        <ExploreListCard {list} />
      {/each}
    </div>

    {#if data.lists.length >= 24 && lastList}
      <div class="flex justify-center">
        <a
          href={`/explore?${buildCursorUrl(data.filters, lastList.id)}`}
          class="rounded-lg border bg-card px-8 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          {L.explore_load_more()}
        </a>
      </div>
    {/if}
  {/if}
</section>
