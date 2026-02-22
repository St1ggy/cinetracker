<script lang="ts">
  import { L } from '$lib'
  import HandleEditor from '$pages/profile/ui/handle-editor.svelte'

  type Props = {
    onclose: () => void
    onHandleSet?: (handle: string) => void
  }

  const { onclose, onHandleSet }: Props = $props()
</script>

<div
  role="presentation"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  onclick={(event_) => event_.target === event_.currentTarget && onclose()}
>
  <div class="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
    <h2 class="text-lg font-semibold">{L.profile_handle_required_title()}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{L.profile_handle_required_description()}</p>

    <div class="mt-4">
      <HandleEditor
        onSaved={(handle) => {
          onHandleSet?.(handle)
          onclose()
        }}
      />
    </div>

    <button type="button" class="mt-4 w-full rounded-md border py-2 text-sm hover:bg-accent" onclick={onclose}>
      Cancel
    </button>
  </div>
</div>
