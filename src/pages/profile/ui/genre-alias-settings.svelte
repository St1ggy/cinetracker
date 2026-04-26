<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'

  type Props = { initialJson: string }
  const { initialJson }: Props = $props()

  let busy = $state(false)

  /* Editable field synced from server after save: must stay mutable, not $derived(initialJson). */
  /* eslint-disable svelte/prefer-writable-derived */
  let jsonText = $state('')

  $effect.pre(() => {
    jsonText = initialJson
  })
  /* eslint-enable svelte/prefer-writable-derived */
</script>

<div class="rounded-xl border bg-card p-4 shadow-sm">
  <h2 class="text-lg font-semibold tracking-tight">{L.profile_genre_aliases_title()}</h2>
  <p class="mt-1 text-sm text-muted-foreground">{L.profile_genre_aliases_description()}</p>
  <label class="mt-3 block">
    <span class="sr-only">JSON</span>
    <textarea
      class="mt-2 w-full min-h-48 rounded-md border bg-background p-3 font-mono text-xs"
      name="genreAliasSettings"
      spellcheck="false"
      bind:value={jsonText}
      disabled={busy}
    ></textarea>
  </label>
  <button
    type="button"
    class="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    disabled={busy}
    onclick={async () => {
      if (busy) return

      busy = true
      try {
        const r = await fetch('/api/app/genre-aliases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonText }),
        })

        if (!r.ok) {
          toast.error(L.profile_genre_aliases_invalid_json())

          return
        }

        toast.success(L.common_saved())
        await invalidateAll()
      } catch {
        toast.error(L.common_error_generic())
      } finally {
        busy = false
      }
    }}
  >
    {L.profile_genre_aliases_save()}
  </button>
</div>
