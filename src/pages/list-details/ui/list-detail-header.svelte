<script lang="ts">
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
  const ownerName = $derived(
    list.isAnonymous && !isOwner ? null : (list.owner.handle ?? list.owner.name ?? list.owner.email ?? '—'),
  )
</script>

<header class="rounded-lg border bg-card p-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold">{list.title}</h1>
      <p class="text-sm text-muted-foreground">{list.description ?? L.common_no_description()}</p>
      {#if ownerName}
        <p class="mt-1 text-xs text-muted-foreground">{L.common_owner({ name: ownerName })}</p>
      {:else if list.isAnonymous && isOwner}
        <p class="mt-1 text-xs text-muted-foreground">
          {L.common_owner({ name: ownerName ?? '—' })}
          <span class="ml-1 rounded border px-1 py-0.5 text-[10px]">{L.lists_anonymous()}</span>
        </p>
      {/if}
    </div>
    <div class="flex gap-2">
      <span class="rounded border px-2 py-1 text-xs">{visibilityLabel(list.visibility)}</span>
      {#if !isOwner}
        <button
          class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          onclick={onToggleSave}
          disabled={isSaving}
        >
          {isSaved ? L.list_unsave() : L.list_save()}
        </button>
      {/if}
    </div>
  </div>
</header>
