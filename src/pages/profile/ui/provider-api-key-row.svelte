<script lang="ts">
  import { createMutation, useQueryClient } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import { PROVIDER_META } from '$shared/config/domain'

  import type { MediaProvider } from '$shared/config/domain'

  type CredentialField = { key: string; label: string; type?: 'text' | 'password' }

  type Props = {
    provider: MediaProvider
    configured: boolean
    fields: CredentialField[]
    getSteps: (provider: MediaProvider) => string[]
  }

  const { provider, configured, fields, getSteps }: Props = $props()

  const queryClient = useQueryClient()
  const meta = $derived(PROVIDER_META[provider])

  const saveMutation = createMutation(() => ({
    mutationFn: async ({ credentials }: { credentials: Record<string, string> }) => {
      const response = await fetch('/api/user/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials }),
      })

      if (!response.ok) {
        const error = (await response.json()) as { message?: string }

        throw new Error(error.message ?? 'Failed to save API key')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-api-keys'] }),
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async () => {
      const response = await fetch(`/api/user/api-keys?provider=${provider}`, { method: 'DELETE' })

      if (!response.ok) throw new Error('Failed to delete API key')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-api-keys'] }),
  }))

  const formValues = $state<Record<string, string>>({})
  let expanded = $state(false)
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const getFieldValue = (fieldKey: string) => formValues[fieldKey] ?? ''
  const setFieldValue = (fieldKey: string, value: string) => {
    formValues[fieldKey] = value
  }

  const saveKey = async () => {
    const nonEmpty = Object.fromEntries(Object.entries(formValues).filter(([, v]) => v.trim()))

    if (Object.keys(nonEmpty).length === 0) return

    saveStatus = 'saving'
    saveMutation.mutate(
      { credentials: nonEmpty },
      {
        onSuccess: () => {
          saveStatus = 'saved'
          for (const k of Object.keys(formValues)) delete formValues[k]
          expanded = false
          setTimeout(() => {
            saveStatus = 'idle'
          }, 2000)
        },
        onError: () => {
          saveStatus = 'error'
        },
      },
    )
  }

  const steps = $derived(getSteps(provider))
</script>

<div class="rounded-md border">
  <div class="flex items-center justify-between px-4 py-3">
    <div class="flex items-center gap-3">
      <div>
        <p class="text-sm font-medium">{meta.label}</p>
        <p class="text-xs text-muted-foreground">{meta.description}</p>
      </div>
      {#if configured}
        <span class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
          {L.profile_api_key_configured()}
        </span>
      {:else}
        <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {L.profile_api_key_not_configured()}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if configured}
        <button
          class="rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          onclick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          {L.profile_api_key_delete()}
        </button>
      {/if}
      <button class="rounded-md border px-3 py-1 text-xs hover:bg-accent" onclick={() => (expanded = !expanded)}>
        {expanded ? L.profile_api_key_collapse() : L.profile_api_key_setup()}
      </button>
    </div>
  </div>

  {#if expanded}
    <div class="border-t px-4 py-3">
      <div class="space-y-4">
        {#if steps.length > 0}
          <div class="rounded-md bg-muted/50 px-4 py-3">
            <p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {L.profile_api_key_how_to_get()}
            </p>
            <ol class="space-y-1">
              {#each steps as step, index (index)}
                <li class="flex gap-2 text-xs text-muted-foreground">
                  <span class="shrink-0 font-semibold text-foreground">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              {/each}
            </ol>
            {#if meta.keyUrl}
              <a
                href={meta.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="mt-2 inline-flex items-center gap-1 text-xs text-primary underline hover:text-primary/80"
              >
                {L.profile_api_key_open_provider_page()} →
              </a>
            {/if}
          </div>
        {/if}

        <div class="space-y-3">
          {#each fields as field (field.key)}
            {@const inputId = `${provider}-${field.key}`}
            <div>
              <label for={inputId} class="mb-1 block text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              <input
                id={inputId}
                type={field.type ?? 'text'}
                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                placeholder={field.type === 'password' ? '••••••••••••••••' : ''}
                value={getFieldValue(field.key)}
                oninput={(event_) => setFieldValue(field.key, (event_.currentTarget as HTMLInputElement).value)}
              />
            </div>
          {/each}

          <div class="flex items-center gap-2">
            <button
              class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              onclick={saveKey}
              disabled={saveStatus === 'saving'}
            >
              {#if saveStatus === 'saving'}
                {L.profile_api_key_saving()}
              {:else if saveStatus === 'saved'}
                {L.profile_api_key_saved()}
              {:else}
                {L.profile_api_key_save()}
              {/if}
            </button>
            {#if saveStatus === 'error'}
              <span class="text-xs text-destructive">{L.profile_api_key_error()}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
