<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'

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

  const lastList = $derived(data.lists.at(-1))

  const buildCursorUrl = (filters: { q?: string; tags: string[]; sort: string }, cursor: string): string => {
    const parts: string[] = []

    if (filters.q) parts.push(`q=${encodeURIComponent(filters.q)}`)

    for (const tag of filters.tags) parts.push(`tag=${encodeURIComponent(tag)}`)
    parts.push(`sort=${filters.sort}`, `cursor=${cursor}`)

    return parts.join('&')
  }
</script>

<section class="mx-auto max-w-5xl space-y-6 px-4 py-6">
  <header>
    <h1 class="text-2xl font-semibold">{L.explore_title()}</h1>
    <p class="text-sm text-muted-foreground">{L.explore_description()}</p>
  </header>

  <ExploreSearchBar query={data.filters.q} activeTags={data.filters.tags} />

  <ExploreTagCloud tags={data.popularTags} activeTags={data.filters.tags} query={data.filters.q} />

  <div class="flex items-center gap-2">
    {#each sorts as sort (sort.value)}
      <button
        type="button"
        class={`rounded-full border px-3 py-1 text-xs transition-colors ${
          data.filters.sort === sort.value
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
        }`}
        onclick={() => changeSort(sort.value)}
      >
        {sort.label()}
      </button>
    {/each}
  </div>

  {#if data.lists.length === 0}
    <div class="py-16 text-center text-muted-foreground">
      <p class="text-lg">{L.explore_no_results()}</p>
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
          class="rounded-md border px-6 py-2 text-sm hover:bg-accent"
        >
          {L.explore_load_more()}
        </a>
      </div>
    {/if}
  {/if}
</section>
