<script lang="ts">
  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { getVisibilityLabel } from '$shared/lib/labels'

  import type { ListVisibility } from '$shared/config/domain'

  type Props = {
    onCreate: (payload: { title: string; description: string | null; visibility: ListVisibility }) => void
    isPending?: boolean
  }

  const { onCreate, isPending = false }: Props = $props()

  let title = $state('')
  let description = $state('')
  let visibility = $state<ListVisibility>('PRIVATE')

  const visibilityLabel = (value: ListVisibility) => getVisibilityLabel(L, value)

  const handleCreate = () => {
    if (!title.trim()) return

    onCreate({ title: title.trim(), description: description || null, visibility })
    title = ''
    description = ''
    visibility = 'PRIVATE'
  }
</script>

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
      <Select.Trigger class="h-9 text-sm">{visibilityLabel(visibility)}</Select.Trigger>
      <Select.Content>
        <Select.Item value="PRIVATE" label={L.visibility_private()} />
        <Select.Item value="UNLISTED" label={L.visibility_unlisted()} />
        <Select.Item value="PUBLIC" label={L.visibility_public()} />
      </Select.Content>
    </Select.Root>
    <button
      class="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      onclick={handleCreate}
      disabled={isPending}
    >
      {L.common_create()}
    </button>
  </div>
</div>
