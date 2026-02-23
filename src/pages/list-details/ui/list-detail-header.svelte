<script lang="ts">
  import { browser } from '$app/environment'
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import BookmarkIcon from '@lucide/svelte/icons/bookmark'
  import BookmarkPlusIcon from '@lucide/svelte/icons/bookmark-plus'
  import LinkIcon from '@lucide/svelte/icons/link'
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import UnlinkIcon from '@lucide/svelte/icons/unlink'
  import { createMutation } from '@tanstack/svelte-query'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import * as Sheet from '$lib/components/ui/sheet'
  import VisibilityIcon from '$lib/components/ui/visibility-icon.svelte'
  import { getVisibilityLabel } from '$shared/lib/labels'

  import type { ListVisibility, SharePermission } from '$shared/config/domain'

  type List = {
    id: string
    title: string
    description: string | null
    visibility: ListVisibility
    isAnonymous?: boolean
    shareToken?: string | null
    sharePermission?: SharePermission | null
    tags?: { tag: { id: string; name: string; slug: string } }[]
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

  let sharePermission = $state<SharePermission>('VIEW_ONLY')
  let editTitle = $state('')
  let editDescription = $state('')
  let editTagsInput = $state('')

  $effect(() => {
    sharePermission = list.sharePermission ?? 'VIEW_ONLY'
    editTitle = list.title
    editDescription = list.description ?? ''
    editTagsInput = (list.tags ?? []).map((lt) => lt.tag.name).join(', ')
  })

  const isAuthenticated = $derived(Boolean(page.data.session?.user?.id))
  const ownerUrl = $derived(list.owner.handle ? `/u/${list.owner.handle}` : null)
  const ownerName = $derived(
    list.isAnonymous && !isOwner ? null : (list.owner.handle ?? list.owner.name ?? list.owner.email ?? '—'),
  )

  const enableShareMutation = createMutation(() => ({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareLinkEnabled: true, sharePermission }),
      })

      if (!response.ok) throw new Error('Failed to enable share link')

      return response.json()
    },
    onSuccess: () => {
      invalidateAll()
    },
    onError: () => toast.error(L.common_error_generic()),
  }))

  const updateShareMutation = createMutation(() => ({
    mutationFn: async (payload: { shareLinkEnabled?: boolean; sharePermission?: SharePermission }) => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to update share settings')

      return response.json()
    },
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(L.common_error_generic()),
  }))

  const rotateMutation = createMutation(() => ({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${list.id}/share-token/rotate`, { method: 'POST' })

      if (!response.ok) throw new Error('Failed to regenerate link')

      return response.json()
    },
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(L.common_error_generic()),
  }))

  const shareLinkUrl = $derived(browser && list.shareToken ? `${globalThis.location.origin}/s/${list.shareToken}` : '')

  const copyLink = () => {
    if (!shareLinkUrl) return

    void navigator.clipboard.writeText(shareLinkUrl)
    toast.success(L.list_share_copied())
  }

  const handlePermissionChange = (v: string) => {
    const perm = v as SharePermission

    sharePermission = perm
    updateShareMutation.mutate({ sharePermission: perm })
  }

  const isSharePending = enableShareMutation.isPending || updateShareMutation.isPending || rotateMutation.isPending

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)

  const saveListMutation = createMutation(() => ({
    mutationFn: async (payload: { title: string; description: string | null; tags: string[] }) => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to update list')

      return response.json()
    },
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(L.common_error_generic()),
  }))

  const handleSaveList = () => {
    const title = editTitle.trim()

    if (!title) return

    saveListMutation.mutate({
      title,
      description: editDescription.trim() || null,
      tags: parseTags(editTagsInput),
    })
  }

  let shareSheetOpen = $state(false)
  let settingsSheetOpen = $state(false)

  const visibilityLabel = (v: ListVisibility) => getVisibilityLabel(L, v)

  const updateVisibilityMutation = createMutation(() => ({
    mutationFn: async (visibility: ListVisibility) => {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })

      if (!response.ok) throw new Error('Failed to update visibility')

      return response.json()
    },
    onSuccess: () => invalidateAll(),
    onError: () => toast.error(L.common_error_generic()),
  }))

  const handleVisibilityChange = (v: string) => {
    updateVisibilityMutation.mutate(v as ListVisibility)
  }
</script>

<header class="rounded-lg border bg-card p-5">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="min-w-0 flex-1 space-y-1.5">
      <h1 class="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl leading-tight font-bold tracking-tight">
        <span>{list.title}</span>
        {#if ownerName}
          <span class="text-base font-normal text-muted-foreground">·</span>
          <span class="text-base font-normal text-muted-foreground">
            {#if ownerUrl && !isOwner}
              <a href={ownerUrl} class="font-medium text-foreground hover:underline">@{ownerName}</a>
            {:else}
              {ownerName}
            {/if}
          </span>
        {:else if list.isAnonymous && isOwner}
          <span class="text-base font-normal text-muted-foreground">·</span>
          <span class="text-base font-normal text-muted-foreground">—</span>
          <span class="rounded border border-border/80 px-1.5 py-0.5 text-[10px]">{L.lists_anonymous()}</span>
        {/if}
      </h1>
      {#if list.description}
        <p class="text-sm text-muted-foreground">{list.description}</p>
      {/if}
    </div>

    <div class="flex shrink-0 items-center justify-center gap-2">
      {#if isOwner}
        <Select.Root
          type="single"
          value={list.visibility}
          onValueChange={handleVisibilityChange}
          disabled={updateVisibilityMutation.isPending}
        >
          <Select.Trigger
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 hover:bg-muted/70 disabled:opacity-50"
            title={visibilityLabel(list.visibility)}
          >
            <VisibilityIcon visibility={list.visibility} class="size-4" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="PRIVATE" label={L.visibility_private()} />
            <Select.Item value="UNLISTED" label={L.visibility_unlisted()} />
            <Select.Item value="PUBLIC" label={L.visibility_public()} />
          </Select.Content>
        </Select.Root>
        {#if list.visibility === 'PRIVATE' || list.visibility === 'UNLISTED'}
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onclick={() => (shareSheetOpen = true)}
          >
            <LinkIcon class="size-4" />
            {L.list_share_button()}
          </button>
        {/if}
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          onclick={() => (settingsSheetOpen = true)}
        >
          <SettingsIcon class="size-4" />
          {L.list_settings_button()}
        </button>
      {:else if isAuthenticated}
        <span
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50"
          title={visibilityLabel(list.visibility)}
        >
          <VisibilityIcon visibility={list.visibility} class="size-4" />
        </span>
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
  </div>

  <!-- Settings sheet (Edit list) -->
  <Sheet.Root bind:open={settingsSheetOpen}>
    <Sheet.Content side="right" class="w-full max-w-md sm:max-w-lg">
      <Sheet.Header>
        <Sheet.Title>{L.list_edit_heading()}</Sheet.Title>
      </Sheet.Header>
      <div class="flex flex-col gap-4 py-4">
        <div class="grid gap-3 sm:grid-cols-1">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground" for="sheet-edit-title">
              {L.lists_title_placeholder()}
            </label>
            <input
              id="sheet-edit-title"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder={L.lists_title_placeholder()}
              bind:value={editTitle}
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground" for="sheet-edit-desc">
              {L.lists_description_placeholder()}
            </label>
            <input
              id="sheet-edit-desc"
              class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder={L.lists_description_placeholder()}
              bind:value={editDescription}
            />
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-medium text-muted-foreground" for="sheet-edit-tags">
            {L.lists_tags_label()}
          </label>
          <input
            id="sheet-edit-tags"
            class="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
            placeholder={L.lists_tags_placeholder()}
            bind:value={editTagsInput}
          />
        </div>
        <Sheet.Footer class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={saveListMutation.isPending || !editTitle.trim()}
            onclick={() => {
              handleSaveList()
              settingsSheetOpen = false
            }}
          >
            {L.list_edit_save()}
          </button>
        </Sheet.Footer>
      </div>
    </Sheet.Content>
  </Sheet.Root>

  <!-- Share sheet -->
  {#if isOwner && (list.visibility === 'PRIVATE' || list.visibility === 'UNLISTED')}
    <Sheet.Root bind:open={shareSheetOpen}>
      <Sheet.Content side="right" class="w-full max-w-md sm:max-w-lg">
        <Sheet.Header>
          <Sheet.Title>{L.list_share_link()}</Sheet.Title>
        </Sheet.Header>
        <div class="flex flex-col gap-4 py-4">
          {#if list.shareToken}
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">{L.list_share_permission_label()}:</span>
                <Select.Root type="single" value={sharePermission} onValueChange={handlePermissionChange}>
                  <Select.Trigger
                    class="h-9 min-w-[160px] rounded-md border px-3 py-2 text-sm"
                    disabled={isSharePending}
                  >
                    {#if sharePermission === 'VIEW_AND_ADD'}
                      {L.list_share_view_and_add()}
                    {:else}
                      {L.list_share_view_only()}
                    {/if}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="VIEW_ONLY" label={L.list_share_view_only()} />
                    <Select.Item value="VIEW_AND_ADD" label={L.list_share_view_and_add()} />
                  </Select.Content>
                </Select.Root>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onclick={copyLink}
                >
                  <LinkIcon class="size-3.5 shrink-0" />
                  {L.list_share_copy_link()}
                </button>
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  disabled={isSharePending}
                  onclick={() => rotateMutation.mutate()}
                >
                  <RefreshCwIcon class="size-3.5 shrink-0" />
                  {L.list_share_regenerate()}
                </button>
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  disabled={isSharePending}
                  onclick={() => updateShareMutation.mutate({ shareLinkEnabled: false })}
                >
                  <UnlinkIcon class="size-3.5 shrink-0" />
                  {L.list_share_disable()}
                </button>
              </div>
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">{L.list_share_guest_can_add()}</p>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              disabled={enableShareMutation.isPending}
              onclick={() => enableShareMutation.mutate()}
            >
              <LinkIcon class="size-3.5 shrink-0" />
              {L.list_share_enable()}
            </button>
          {/if}
        </div>
      </Sheet.Content>
    </Sheet.Root>
  {/if}
</header>
