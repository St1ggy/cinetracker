<script lang="ts">
  import { page } from '$app/state'
  import BookmarkIcon from '@lucide/svelte/icons/bookmark'

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
  const ownerUrl = $derived(list.owner.handle ? `/u/${list.owner.handle}` : null)
</script>

<article
  class="group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
>
  <div class="flex items-start justify-between gap-2">
    <a href="/lists/{list.id}" class="min-w-0 flex-1">
      <h3 class="line-clamp-2 leading-snug font-semibold transition-colors group-hover:text-primary">{list.title}</h3>
    </a>
    {#if isOwn && list.isAnonymous}
      <span class="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{L.lists_anonymous()}</span>
    {/if}
  </div>

  {#if list.description}
    <p class="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
  {/if}

  <div class="mt-auto space-y-2">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-1">
        <BookmarkIcon class="size-3.5" />
        {L.explore_list_items_count({ count: list._count.items })}
      </span>

      {#if ownerDisplay}
        <span>
          {#if ownerUrl}
            <a href={ownerUrl} class="font-medium text-foreground hover:underline">@{ownerDisplay}</a>
          {:else}
            <span class="font-medium text-foreground">@{ownerDisplay}</span>
          {/if}
        </span>
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
            href="/lists?view=all&tag={tag.slug}"
            class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            #{tag.name}
          </a>
        {/each}
      </div>
    {/if}
  </div>
</article>
