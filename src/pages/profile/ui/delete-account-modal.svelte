<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query'

  import { L } from '$lib'

  type Props = {
    userEmail: string
    onclose: () => void
  }

  const { userEmail, onclose }: Props = $props()

  let confirmEmail = $state('')

  const emailMatches = $derived(confirmEmail.trim().toLowerCase() === userEmail.toLowerCase())

  const deleteAccountMutation = createMutation(() => ({
    mutationFn: async () => {
      const response = await fetch('/api/user/account', { method: 'DELETE' })

      if (!response.ok) throw new Error('Failed to delete account')
    },
    onSuccess: async () => {
      await fetch('/api/auth/signout', { method: 'POST' })
      globalThis.location.href = '/'
    },
  }))
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button
    type="button"
    class="absolute inset-0 bg-black/60"
    aria-label={L.profile_delete_account_cancel()}
    onclick={onclose}
  ></button>
  <div
    class="relative w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-account-title"
  >
    <h3 id="delete-account-title" class="text-lg font-semibold text-destructive">
      {L.profile_delete_account_confirm_title()}
    </h3>
    <p class="mt-2 text-sm text-muted-foreground">{L.profile_delete_account_confirm_description()}</p>

    <div class="mt-4">
      <label for="confirm-email" class="mb-1 block text-sm font-medium">
        {L.profile_delete_account_email_label()}
      </label>
      <input
        id="confirm-email"
        type="email"
        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-destructive focus:outline-none"
        placeholder={L.profile_delete_account_email_placeholder()}
        bind:value={confirmEmail}
        autocomplete="off"
      />
      {#if confirmEmail.length > 0 && !emailMatches}
        <p class="mt-1 text-xs text-destructive">{L.profile_delete_account_email_mismatch()}</p>
      {/if}
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <button
        class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        onclick={onclose}
        disabled={deleteAccountMutation.isPending}
      >
        {L.profile_delete_account_cancel()}
      </button>
      <button
        class="text-destructive-foreground rounded-md bg-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
        onclick={() => deleteAccountMutation.mutate()}
        disabled={!emailMatches || deleteAccountMutation.isPending}
      >
        {deleteAccountMutation.isPending
          ? L.profile_delete_account_deleting()
          : L.profile_delete_account_confirm_button()}
      </button>
    </div>
  </div>
</div>
