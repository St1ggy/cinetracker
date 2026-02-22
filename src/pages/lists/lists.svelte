<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { createMutation } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { getVisibilityLabel } from '$shared/lib/labels'

  import type { ListVisibility } from '$shared/config/domain'
  import type { PageData } from '../../routes/lists/$types'

  const data: PageData = page.data as PageData

  let title = $state('')
  let description = $state('')
  let visibility = $state<ListVisibility>('PRIVATE')

  const visibilityLabel = (value: ListVisibility) => getVisibilityLabel(L, value)

  const createListMutation = createMutation(() => ({
    mutationFn: async (payload: { title: string; description: string | null; visibility: ListVisibility }) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create list')
      }
    },
    onSuccess: async () => {
      title = ''
      description = ''
      visibility = 'PRIVATE'
      await invalidateAll()
    },
  }))

  const createList = () => {
    if (!title.trim()) return

    createListMutation.mutate({
      title: title.trim(),
      description: description || null,
      visibility,
    })
  }
</script>

<section class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold">{L.lists_my_title()}</h1>
    <p class="text-sm text-muted-foreground">{L.lists_manage_description()}</p>
  </header>

  <div class="rounded-lg border bg-card p-4">
    <h2 class="font-medium">{L.lists_create_title()}</h2>
    <div class="mt-3 grid gap-2 md:grid-cols-[1fr,2fr,auto,auto]">
      <input
        class="rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={L.lists_title_placeholder()}
        bind:value={title}
      />
      <input
        class="rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={L.lists_description_placeholder()}
        bind:value={description}
      />
      <Select.Root type="single" value={visibility} onValueChange={(v) => (visibility = v as ListVisibility)}>
        <Select.Trigger class="h-9 text-sm">
          {visibilityLabel(visibility)}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="PRIVATE" label={L.visibility_private()} />
          <Select.Item value="UNLISTED" label={L.visibility_unlisted()} />
          <Select.Item value="PUBLIC" label={L.visibility_public()} />
        </Select.Content>
      </Select.Root>
      <button
        class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        onclick={createList}>{L.common_create()}</button
      >
    </div>
  </div>

  <div class="grid gap-3 md:grid-cols-2">
    {#each data.ownedLists as item (item.id)}
      <a href={`/lists/${item.id}`} class="rounded-lg border bg-card p-4 hover:bg-accent">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-medium">{item.title}</h3>
          <span class="rounded border px-2 py-0.5 text-xs">{visibilityLabel(item.visibility)}</span>
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
