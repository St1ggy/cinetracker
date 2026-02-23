<script lang="ts">
  import { goto } from '$app/navigation'
  import CompassIcon from '@lucide/svelte/icons/compass'
  import XIcon from '@lucide/svelte/icons/x'

  import { L } from '$lib'
  import ExploreListCard from '$pages/explore/ui/explore-list-card.svelte'
  import ExploreSearchBar from '$pages/explore/ui/explore-search-bar.svelte'
  import ExploreTagCloud from '$pages/explore/ui/explore-tag-cloud.svelte'

  type ListCard = {
    id: string
    title: string
    description: string | null
    isAnonymous: boolean
    owner: { id: string; name: string | null; handle: string | null; email: string | null }
    ratingAverage: number
    ratingCount: number
    _count: { items: number }
    tags: { tag: { id: string; slug: string; name: string } }[]
  }

  type Props = {
    lists: ListCard[]
    popularTags: { id: string; slug: string; name: string }[]
    filters: { q?: string; tags: string[]; sort: string }
    basePath?: string
  }

  const { lists, popularTags, filters, basePath = '/lists' }: Props = $props()

  const sorts = [
    { value: 'newest', label: () => L.explore_sort_newest() },
    { value: 'popular', label: () => L.explore_sort_popular() },
    { value: 'top_rated', label: () => L.explore_sort_top_rated() },
  ] as const

  const changeSort = (sort: string) => {
    const parts = ['view=all', `sort=${sort}`]

    if (filters.q) parts.push(`q=${encodeURIComponent(filters.q)}`)

    for (const tag of filters.tags) parts.push(`tag=${encodeURIComponent(tag)}`)

    goto(`${basePath}?${parts.join('&')}`)
  }

  const clearFilters = () => goto(`${basePath}?view=all`)

  const hasActiveFilters = $derived(!!(filters.q || filters.tags.length > 0))
  const lastList = $derived(lists.at(-1))

  const buildCursorUrl = (cursor: string): string => {
    const parts = ['view=all', `sort=${filters.sort}`]

    if (filters.q) parts.push(`q=${encodeURIComponent(filters.q)}`)

    for (const tag of filters.tags) parts.push(`tag=${encodeURIComponent(tag)}`)
    parts.push(`cursor=${cursor}`)

    return `${basePath}?${parts.join('&')}`
  }
</script>

<div class="space-y-6">
  <div class="rounded-xl border bg-card p-6 shadow-sm">
    <header class="mb-5">
      <h2 class="text-xl font-bold tracking-tight">{L.explore_title()}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{L.explore_description()}</p>
    </header>

    <div class="space-y-4">
      <ExploreSearchBar query={filters.q} activeTags={filters.tags} {basePath} />
      <ExploreTagCloud tags={popularTags} activeTags={filters.tags} query={filters.q} {basePath} />
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-1.5 rounded-lg border bg-card p-1">
      {#each sorts as sort (sort.value)}
        <button
          type="button"
          class={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
            filters.sort === sort.value
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

  {#if lists.length === 0}
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
      {#each lists as list (list.id)}
        <ExploreListCard {list} />
      {/each}
    </div>

    {#if lists.length >= 24 && lastList}
      <div class="flex justify-center">
        <a
          href={buildCursorUrl(lastList.id)}
          class="rounded-lg border bg-card px-8 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          {L.explore_load_more()}
        </a>
      </div>
    {/if}
  {/if}
</div>
