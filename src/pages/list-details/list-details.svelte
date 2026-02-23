<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import LibraryBigIcon from '@lucide/svelte/icons/library-big'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { createMutation } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'

  import AddMediaModal from '../home/ui/add-media-modal.svelte'
  import MediaCard from '../home/ui/media-card.svelte'

  import ListDetailHeader from './ui/list-detail-header.svelte'

  import type { PageData } from '../../routes/lists/[listId]/$types'

  const data = $derived(page.data as PageData)

  let showAddModal = $state(false)

  const toggleSavedMutation = createMutation(() => ({
    mutationFn: async (variables: { method: 'DELETE' | 'POST'; tokenParameter: string }) => {
      const response = await fetch(`/api/lists/${data.list.id}/save${variables.tokenParameter}`, {
        method: variables.method,
      })

      if (!response.ok) throw new Error('Failed to toggle saved list')
    },
    onSuccess: async (_, variables) => {
      await invalidateAll()
      toast.success(variables.method === 'POST' ? L.list_saved_success() : L.list_unsaved_success())
    },
    onError: () => {
      toast.error(L.common_error_generic())
    },
  }))

  const toggleSaved = () => {
    const method = data.isSaved ? 'DELETE' : 'POST'
    const tokenParameter = data.token ? `?token=${encodeURIComponent(data.token)}` : ''

    toggleSavedMutation.mutate({ method, tokenParameter })
  }
</script>

<section class="space-y-5">
  <ListDetailHeader
    list={data.list}
    isOwner={data.isOwner}
    isSaved={data.isSaved}
    isSaving={toggleSavedMutation.isPending}
    onToggleSave={toggleSaved}
  />

  {#if data.items.length === 0}
    <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 py-16 text-center">
      <div class="rounded-full border bg-muted p-4">
        <LibraryBigIcon class="size-7 text-muted-foreground" />
      </div>
      <div class="space-y-1">
        <p class="text-sm font-medium">{L.list_empty_items()}</p>
        {#if data.canAdd}
          <p class="text-xs text-muted-foreground">{L.list_empty_items_cta()}</p>
        {/if}
      </div>
      {#if data.canAdd}
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onclick={() => (showAddModal = true)}
        >
          <PlusIcon class="size-4" />
          {L.home_add_product()}
        </button>
      {/if}
    </div>
  {:else}
    {#if data.canAdd}
      <div class="flex justify-end">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          onclick={() => (showAddModal = true)}
        >
          <PlusIcon class="size-4" />
          {L.home_add_product()}
        </button>
      </div>
    {/if}
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {#each data.items as item (item.id)}
        <MediaCard {item} showStatusLabel />
      {/each}
    </div>
  {/if}

  {#if showAddModal}
    <AddMediaModal
      listId={data.list.id}
      listTitle={data.list.title}
      token={data.token}
      onclose={() => (showAddModal = false)}
      onAdded={() => {
        invalidateAll()
      }}
    />
  {/if}
</section>
