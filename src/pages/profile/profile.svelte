<script lang="ts">
  import { page } from '$app/state'
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import { FREE_PROVIDERS, KEY_REQUIRED_PROVIDERS, PROVIDER_META } from '$shared/config/domain'

  import type { MediaProvider } from '$shared/config/domain'
  import type { PageData } from '../../routes/profile/$types'

  type Props = { data: PageData }
  const { data }: Props = $props()

  const queryClient = useQueryClient()

  type CredentialField = { key: string; label: string; type?: 'text' | 'password' }
  const PROVIDER_FIELDS: Record<string, CredentialField[]> = {
    TMDB: [
      { key: 'bearerToken', label: 'Bearer Token (recommended)', type: 'password' },
      { key: 'apiKey', label: 'API Key (v3)', type: 'password' },
    ],
    OMDB: [{ key: 'apiKey', label: 'API Key', type: 'password' }],
    TVDB: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'pin', label: 'PIN (optional)', type: 'password' },
    ],
    TRAKT: [{ key: 'clientId', label: 'Client ID', type: 'text' }],
  }

  const configuredQuery = createQuery(() => ({
    queryKey: ['user-api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/user/api-keys')

      if (!response.ok) throw new Error('Failed to load API keys')

      const payload = (await response.json()) as { configuredProviders: { provider: MediaProvider }[] }

      return new Set(payload.configuredProviders.map((p) => p.provider))
    },
    initialData: new Set<MediaProvider>(data.configuredProviders as MediaProvider[]),
  }))

  const saveMutation = createMutation(() => ({
    mutationFn: async ({ provider, credentials }: { provider: string; credentials: Record<string, string> }) => {
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
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/user/api-keys?provider=${provider}`, { method: 'DELETE' })

      if (!response.ok) throw new Error('Failed to delete API key')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-api-keys'] }),
  }))

  const formValues = $state<Record<string, Record<string, string>>>({})
  let expandedProvider = $state<string | null>(null)
  const saveStatus = $state<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})

  const getFieldValue = (provider: string, fieldKey: string) => formValues[provider]?.[fieldKey] ?? ''
  const setFieldValue = (provider: string, fieldKey: string, value: string) => {
    formValues[provider] = { ...formValues[provider], [fieldKey]: value }
  }

  const saveKey = async (provider: string) => {
    const credentials = formValues[provider] ?? {}
    const nonEmpty = Object.fromEntries(Object.entries(credentials).filter(([, v]) => v.trim()))

    if (Object.keys(nonEmpty).length === 0) return

    saveStatus[provider] = 'saving'
    saveMutation.mutate(
      { provider, credentials: nonEmpty },
      {
        onSuccess: () => {
          saveStatus[provider] = 'saved'
          formValues[provider] = {}
          expandedProvider = null
          setTimeout(() => {
            saveStatus[provider] = 'idle'
          }, 2000)
        },
        onError: () => {
          saveStatus[provider] = 'error'
        },
      },
    )
  }

  const deleteKey = (provider: string) => {
    deleteMutation.mutate(provider)
  }

  const toggleExpand = (provider: string) => {
    expandedProvider = expandedProvider === provider ? null : provider
  }

  const isConfigured = (provider: MediaProvider) => configuredQuery.data?.has(provider) ?? false

  let showDeleteConfirm = $state(false)
  let confirmEmail = $state('')

  const userEmail = $derived(page.data.session?.user?.email ?? '')
  const emailMatches = $derived(confirmEmail.trim().toLowerCase() === userEmail.toLowerCase())

  const openDeleteConfirm = () => {
    confirmEmail = ''
    showDeleteConfirm = true
  }

  const closeDeleteConfirm = () => {
    showDeleteConfirm = false
    confirmEmail = ''
  }

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

<div class="space-y-6">
  <section class="rounded-lg border bg-card p-6">
    <h1 class="text-2xl font-semibold">{L.profile_title()}</h1>
    {#if page.data.session?.user}
      <div class="mt-3 space-y-1 text-sm">
        <p><span class="text-muted-foreground">{L.profile_name()}</span> {page.data.session.user.name ?? '—'}</p>
        <p><span class="text-muted-foreground">{L.profile_email()}</span> {page.data.session.user.email ?? '—'}</p>
        <p><span class="text-muted-foreground">{L.profile_user_id()}</span> {page.data.session.user.id}</p>
      </div>
      <form method="POST" action="/signout" class="mt-4">
        <button class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >{L.common_sign_out()}</button
        >
      </form>
    {:else}
      <p class="mt-2 text-sm text-muted-foreground">{L.profile_not_signed_in()}</p>
      <a href="/signin" class="mt-3 inline-block rounded-md border px-3 py-2 text-sm">{L.common_sign_in()}</a>
    {/if}
  </section>

  {#if page.data.session?.user}
    <section class="rounded-lg border bg-card p-6">
      <h2 class="text-lg font-semibold">{L.profile_api_keys_title()}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{L.profile_api_keys_description()}</p>

      <div class="mt-5 space-y-4">
        <div>
          <h3 class="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {L.profile_free_providers()}
          </h3>
          <div class="space-y-2">
            {#each FREE_PROVIDERS as provider (provider)}
              <div class="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <p class="text-sm font-medium">{PROVIDER_META[provider].label}</p>
                  <p class="text-xs text-muted-foreground">{PROVIDER_META[provider].description}</p>
                </div>
                <span
                  class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
                >
                  {L.profile_api_key_configured()}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <div>
          <h3 class="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {L.profile_key_required_providers()}
          </h3>
          <div class="space-y-2">
            {#each KEY_REQUIRED_PROVIDERS as provider (provider)}
              {@const configured = isConfigured(provider)}
              {@const meta = PROVIDER_META[provider]}
              {@const fields = PROVIDER_FIELDS[provider] ?? []}
              {@const expanded = expandedProvider === provider}
              {@const status = saveStatus[provider] ?? 'idle'}

              <div class="rounded-md border">
                <div class="flex items-center justify-between px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div>
                      <p class="text-sm font-medium">{meta.label}</p>
                      <p class="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    {#if configured}
                      <span
                        class="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
                      >
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
                        onclick={() => deleteKey(provider)}
                        disabled={deleteMutation.isPending}
                      >
                        {L.profile_api_key_delete()}
                      </button>
                    {/if}
                    <button
                      class="rounded-md border px-3 py-1 text-xs hover:bg-accent"
                      onclick={() => toggleExpand(provider)}
                    >
                      {expanded ? L.profile_api_key_collapse() : L.profile_api_key_setup()}
                    </button>
                  </div>
                </div>

                {#if expanded}
                  <div class="border-t px-4 py-3">
                    <div class="space-y-4">
                      {#if meta.steps && meta.steps.length > 0}
                        <div class="rounded-md bg-muted/50 px-4 py-3">
                          <p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {L.profile_api_key_how_to_get()}
                          </p>
                          <ol class="space-y-1">
                            {#each meta.steps as step, index (index)}
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
                              value={getFieldValue(provider, field.key)}
                              oninput={(event_) =>
                                setFieldValue(provider, field.key, (event_.currentTarget as HTMLInputElement).value)}
                            />
                          </div>
                        {/each}

                        <div class="flex items-center gap-2">
                          <button
                            class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            onclick={() => saveKey(provider)}
                            disabled={status === 'saving'}
                          >
                            {#if status === 'saving'}
                              {L.profile_api_key_saving()}
                            {:else if status === 'saved'}
                              {L.profile_api_key_saved()}
                            {:else}
                              {L.profile_api_key_save()}
                            {/if}
                          </button>
                          {#if status === 'error'}
                            <span class="text-xs text-destructive">{L.profile_api_key_error()}</span>
                          {/if}
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>
    <section class="rounded-lg border border-destructive/40 bg-card p-6">
      <h2 class="text-lg font-semibold text-destructive">{L.profile_danger_zone_title()}</h2>
      <div class="mt-4 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium">{L.profile_delete_account()}</p>
          <p class="mt-1 text-sm text-muted-foreground">{L.profile_delete_account_description()}</p>
        </div>
        <button
          class="shrink-0 rounded-md border border-destructive px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          onclick={openDeleteConfirm}
        >
          {L.profile_delete_account()}
        </button>
      </div>
    </section>
  {/if}
</div>

{#if showDeleteConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/60"
      aria-label={L.profile_delete_account_cancel()}
      onclick={closeDeleteConfirm}
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
          onclick={closeDeleteConfirm}
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
{/if}
