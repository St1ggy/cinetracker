<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { createMutation } from '@tanstack/svelte-query'

  import MediaCard from '../home/ui/media-card.svelte'

  import ListDetailHeader from './ui/list-detail-header.svelte'

  import type { PageData } from '../../routes/lists/[listId]/$types'

  const data = $derived(page.data as PageData)

  const toggleSavedMutation = createMutation(() => ({
    mutationFn: async (variables: { method: 'DELETE' | 'POST'; tokenParameter: string }) => {
      const response = await fetch(`/api/lists/${data.list.id}/save${variables.tokenParameter}`, {
        method: variables.method,
      })

      if (!response.ok) throw new Error('Failed to toggle saved list')
    },
    onSuccess: async () => {
      await invalidateAll()
    },
  }))

  const toggleSaved = () => {
    const method = data.isSaved ? 'DELETE' : 'POST'
    const tokenParameter = data.token ? `?token=${encodeURIComponent(data.token)}` : ''

    toggleSavedMutation.mutate({ method, tokenParameter })
  }
</script>

<section class="space-y-4">
  <ListDetailHeader
    list={data.list}
    isOwner={data.isOwner}
    isSaved={data.isSaved}
    isSaving={toggleSavedMutation.isPending}
    onToggleSave={toggleSaved}
  />

  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
    {#each data.items as item (item.id)}
      <MediaCard {item} showStatusLabel />
    {/each}
  </div>
</section>
