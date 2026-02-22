<script lang="ts">
  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { getVisibilityLabel } from '$shared/lib/labels'
  import HandleRequiredModal from '$shared/ui/handle-required-modal.svelte'

  import type { ListVisibility } from '$shared/config/domain'

  type Props = {
    onCreate: (payload: {
      title: string
      description: string | null
      visibility: ListVisibility
      tags: string[]
      isAnonymous: boolean
    }) => void
    isPending?: boolean
  }

  const { onCreate, isPending = false }: Props = $props()

  let title = $state('')
  let description = $state('')
  let visibility = $state<ListVisibility>('PRIVATE')
  let tagsInput = $state('')
  let isAnonymous = $state(false)
  let showHandleRequired = $state(false)
  let pendingPayload = $state<Parameters<typeof onCreate>[0] | null>(null)

  const visibilityLabel = (value: ListVisibility) => getVisibilityLabel(L, value)

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)

  const handleCreate = () => {
    if (!title.trim()) return

    const payload = {
      title: title.trim(),
      description: description || null,
      visibility,
      tags: parseTags(tagsInput),
      isAnonymous: visibility === 'PUBLIC' ? isAnonymous : false,
    }

    onCreate(payload)
    title = ''
    description = ''
    visibility = 'PRIVATE'
    tagsInput = ''
    isAnonymous = false
  }

  const onHandleSet = () => {
    if (pendingPayload) {
      onCreate(pendingPayload)
      pendingPayload = null
    }
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

  <div class="mt-2 flex flex-wrap items-center gap-3">
    <div class="flex flex-1 items-center gap-2">
      <label class="text-xs text-muted-foreground" for="create-list-tags">{L.lists_tags_label()}</label>
      <input
        id="create-list-tags"
        class="flex-1 rounded border bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
        placeholder={L.lists_tags_placeholder()}
        bind:value={tagsInput}
      />
    </div>

    {#if visibility === 'PUBLIC'}
      <label class="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" class="rounded" bind:checked={isAnonymous} />
        {L.lists_publish_anonymously()}
      </label>
    {/if}
  </div>
</div>

{#if showHandleRequired}
  <HandleRequiredModal onclose={() => (showHandleRequired = false)} {onHandleSet} />
{/if}
