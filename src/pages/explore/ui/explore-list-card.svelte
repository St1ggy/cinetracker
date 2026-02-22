<script lang="ts">
  import { page } from '$app/state'

  import { L } from '$lib'
  import StarRating from '$shared/ui/star-rating.svelte'

  type Tag = { tag: { id: string; slug: string; name: string } }

  type Owner = {
    id: string
    name: string | null
    handle: string | null
    email: string | null
  }

  type ListCard = {
    id: string
    title: string
    description: string | null
    isAnonymous: boolean
    owner: Owner
    ratingAverage: number
    ratingCount: number
    _count: { items: number }
    tags: Tag[]
  }

  type Props = { list: ListCard }

  const { list }: Props = $props()

  const session = $derived(page.data.session)
  const isOwn = $derived(session?.user?.id === list.owner.id)

  const ownerDisplay = $derived(list.isAnonymous ? null : (list.owner.handle ?? list.owner.name ?? list.owner.email))
</script>

<article class="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
  <div class="flex items-start justify-between gap-2">
    <a href="/lists/{list.id}" class="flex-1">
      <h3 class="leading-snug font-semibold hover:underline">{list.title}</h3>
    </a>
    {#if isOwn && list.isAnonymous}
      <span class="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{L.lists_anonymous()}</span>
    {/if}
  </div>

  {#if list.description}
    <p class="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
  {/if}

  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>{L.explore_list_items_count({ count: list._count.items })}</span>

    {#if ownerDisplay}
      <span>by <span class="font-medium text-foreground">@{ownerDisplay}</span></span>
    {/if}

    {#if list.ratingCount > 0}
      <div class="flex items-center gap-1">
        <StarRating value={Math.round(list.ratingAverage)} readonly size="sm" />
        <span>{list.ratingAverage.toFixed(1)} ({list.ratingCount})</span>
      </div>
    {/if}
  </div>

  {#if list.tags.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each list.tags as { tag } (tag.id)}
        <a
          href="/explore?tag={tag.slug}"
          class="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground hover:bg-secondary/80"
        >
          #{tag.name}
        </a>
      {/each}
    </div>
  {/if}
</article>
