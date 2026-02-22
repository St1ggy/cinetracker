<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { createMutation } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import { getVisibilityLabel } from '$shared/lib/labels'
  import HandleRequiredModal from '$shared/ui/handle-required-modal.svelte'

  import CreateListForm from './ui/create-list-form.svelte'

  import type { ListVisibility } from '$shared/config/domain'
  import type { PageData } from '../../routes/lists/$types'

  const data = $derived(page.data as PageData)

  type CreateListPayload = {
    title: string
    description: string | null
    visibility: ListVisibility
    tags: string[]
    isAnonymous: boolean
  }

  let showHandleRequired = $state(false)

  const createListMutation = createMutation(() => ({
    mutationFn: async (payload: CreateListPayload) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (responseData?.error === 'HANDLE_REQUIRED') {
          showHandleRequired = true

          return
        }

        throw new Error('Failed to create list')
      }
    },
    onSuccess: async () => {
      await invalidateAll()
    },
  }))
</script>

<section class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold">{L.lists_my_title()}</h1>
    <p class="text-sm text-muted-foreground">{L.lists_manage_description()}</p>
  </header>

  <CreateListForm isPending={createListMutation.isPending} onCreate={(payload) => createListMutation.mutate(payload)} />

  <div class="grid gap-3 md:grid-cols-2">
    {#each data.ownedLists as item (item.id)}
      <a href={`/lists/${item.id}`} class="rounded-lg border bg-card p-4 hover:bg-accent">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-medium">{item.title}</h3>
          <span class="rounded border px-2 py-0.5 text-xs">{getVisibilityLabel(L, item.visibility)}</span>
        </div>
        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description ?? L.common_no_description()}</p>
        <div class="mt-2 text-xs text-muted-foreground">{L.common_items_count({ count: item._count.items })}</div>
      </a>
    {/each}
  </div>

  <div>
    <h2 class="mb-2 text-lg font-semibold">{L.lists_saved_title()}</h2>
    <div class="grid gap-3 md:grid-cols-2">
      {#each data.savedLists as item (item.id)}
        <a href={`/lists/${item.listId}`} class="rounded-lg border bg-card p-4 hover:bg-accent">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-medium">{item.list.title}</h3>
            <span class="rounded border px-2 py-0.5 text-xs">{L.common_saved()}</span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            {L.common_by({ name: item.list.owner.handle ?? item.list.owner.name ?? item.list.owner.email ?? '—' })}
          </p>
          <div class="mt-2 text-xs text-muted-foreground">
            {L.common_items_count({ count: item.list._count.items })}
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

{#if showHandleRequired}
  <HandleRequiredModal onclose={() => (showHandleRequired = false)} onHandleSet={() => (showHandleRequired = false)} />
{/if}
