<script lang="ts">
  import { page } from '$app/state'
  import BookmarkIcon from '@lucide/svelte/icons/bookmark'
  import BookmarkPlusIcon from '@lucide/svelte/icons/bookmark-plus'

  import { L } from '$lib'
  import { getVisibilityLabel } from '$shared/lib/labels'

  import type { ListVisibility } from '$shared/config/domain'

  type List = {
    title: string
    description: string | null
    visibility: ListVisibility
    isAnonymous?: boolean
    owner: {
      handle: string | null
      name: string | null
      email: string | null
    }
  }

  type Props = {
    list: List
    isOwner: boolean
    isSaved: boolean
    isSaving?: boolean
    onToggleSave: () => void
  }

  const { list, isOwner, isSaved, isSaving = false, onToggleSave }: Props = $props()

  const visibilityLabel = (value: ListVisibility) => getVisibilityLabel(L, value)
  const isAuthenticated = $derived(Boolean(page.data.session?.user?.id))
  const ownerUrl = $derived(list.owner.handle ? `/u/${list.owner.handle}` : null)
  const ownerName = $derived(
    list.isAnonymous && !isOwner ? null : (list.owner.handle ?? list.owner.name ?? list.owner.email ?? '—'),
  )
</script>

<header class="rounded-lg border bg-card p-5">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0 flex-1 space-y-1.5">
      <h1 class="text-2xl leading-tight font-bold">{list.title}</h1>
      {#if list.description}
        <p class="text-sm text-muted-foreground">{list.description}</p>
      {/if}
    </div>

    {#if isAuthenticated && !isOwner}
      <button
        class={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-50 ${
          isSaved
            ? 'border border-primary bg-primary/10 text-primary hover:bg-primary/20'
            : 'border bg-card hover:bg-accent hover:text-accent-foreground'
        }`}
        onclick={onToggleSave}
        disabled={isSaving}
      >
        {#if isSaved}
          <BookmarkIcon class="size-4 fill-primary" />
          {L.list_unsave()}
        {:else}
          <BookmarkPlusIcon class="size-4" />
          {L.list_save()}
        {/if}
      </button>
    {/if}
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    {#if ownerName}
      <span>
        {#if ownerUrl && !isOwner}
          {L.common_owner({ name: '' })}<a href={ownerUrl} class="font-medium text-foreground hover:underline"
            >@{ownerName}</a
          >
        {:else}
          {L.common_owner({ name: ownerName })}
        {/if}
      </span>
      <span class="text-border">·</span>
    {:else if list.isAnonymous && isOwner}
      <span>{L.common_owner({ name: '—' })}</span>
      <span class="rounded border px-1.5 py-0.5 text-[10px]">{L.lists_anonymous()}</span>
      <span class="text-border">·</span>
    {/if}
    <span class="rounded-full border px-2.5 py-0.5">{visibilityLabel(list.visibility)}</span>
  </div>
</header>
