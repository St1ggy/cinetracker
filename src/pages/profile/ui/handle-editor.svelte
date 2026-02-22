<script lang="ts">
  import { L } from '$lib'

  const HANDLE_REGEX = /^\w{3,30}$/

  type Props = {
    currentHandle?: string | null
    nextChangeAt?: string | Date | null
    onSaved?: (handle: string) => void
  }

  const { currentHandle = null, nextChangeAt = null, onSaved }: Props = $props()

  let editing = $state(false)
  let input = $derived.by(() => currentHandle ?? '')
  let error = $state<string | null>(null)
  let saving = $state(false)

  const cooldownDate = $derived(nextChangeAt ? new Date(nextChangeAt) : null)
  const cooldownActive = $derived(cooldownDate !== null && cooldownDate > new Date())

  const validate = (value: string): string | null => {
    if (!HANDLE_REGEX.test(value)) return L.profile_handle_invalid_format()

    return null
  }

  const save = async () => {
    const validationError = validate(input)

    if (validationError) {
      error = validationError

      return
    }

    saving = true
    error = null

    try {
      const response = await fetch('/api/user/handle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: input }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'HANDLE_TAKEN') {
          error = L.profile_handle_taken()
        } else if (data.error === 'COOLDOWN_ACTIVE') {
          error = L.profile_handle_change_cooldown({ date: new Date(data.nextChangeAt).toLocaleDateString() })
        } else {
          error = data.error ?? 'Unknown error'
        }

        return
      }

      editing = false
      onSaved?.(data.handle)
    } finally {
      saving = false
    }
  }
</script>

<div class="space-y-2">
  <p class="text-sm font-medium">{L.profile_handle_label()}</p>

  {#if !editing}
    <div class="flex items-center gap-3">
      <span class="text-sm {currentHandle ? 'font-mono' : 'text-muted-foreground'}">
        {currentHandle ? `@${currentHandle}` : '—'}
      </span>
      {#if !cooldownActive}
        <button
          type="button"
          class="rounded border px-2 py-0.5 text-xs hover:bg-accent"
          onclick={() => {
            input = currentHandle ?? ''
            editing = true
          }}
        >
          Edit
        </button>
      {/if}
    </div>

    {#if cooldownActive && cooldownDate}
      <p class="text-xs text-muted-foreground">
        {L.profile_handle_change_cooldown({ date: cooldownDate.toLocaleDateString() })}
      </p>
    {/if}
  {:else}
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">@</span>
      <input
        type="text"
        class="w-40 rounded border bg-background px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
        placeholder={L.profile_handle_placeholder()}
        bind:value={input}
        maxlength={30}
        oninput={() => (error = null)}
      />
      <button
        type="button"
        class="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        disabled={saving}
        onclick={save}
      >
        {saving ? '...' : 'Save'}
      </button>
      <button type="button" class="rounded border px-3 py-1 text-xs hover:bg-accent" onclick={() => (editing = false)}>
        Cancel
      </button>
    </div>

    {#if error}
      <p class="text-xs text-destructive">{error}</p>
    {/if}
  {/if}
</div>
