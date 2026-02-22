<script lang="ts">
  import { page } from '$app/state'
  import { createQuery } from '@tanstack/svelte-query'

  import { L } from '$lib'
  import { FREE_PROVIDERS, KEY_REQUIRED_PROVIDERS, PROVIDER_META } from '$shared/config/domain'

  import DeleteAccountModal from './ui/delete-account-modal.svelte'
  import ProfileInfo from './ui/profile-info.svelte'
  import ProviderApiKeyRow from './ui/provider-api-key-row.svelte'

  import type { MediaProvider } from '$shared/config/domain'
  import type { PageData } from '../../routes/profile/$types'

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

  // Returns localised step strings for a given provider using i18n message keys.
  const getProviderSteps = (provider: MediaProvider): string[] => {
    const meta = PROVIDER_META[provider]

    if (!meta.stepsCount) return []

    return Array.from({ length: meta.stepsCount }, (_, index) => {
      const key = `profile_${provider.toLowerCase()}_step_${index + 1}` as keyof typeof L

      return typeof L[key] === 'function' ? (L[key] as () => string)() : ''
    }).filter(Boolean)
  }

  type Props = { data: PageData }
  const { data }: Props = $props()

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

  const isConfigured = (provider: MediaProvider) => configuredQuery.data?.has(provider) ?? false

  let showDeleteConfirm = $state(false)
  const userEmail = $derived(page.data.session?.user?.email ?? '')
</script>

<div class="space-y-6">
  <ProfileInfo user={page.data.session?.user} />

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
              <ProviderApiKeyRow
                {provider}
                configured={isConfigured(provider)}
                fields={PROVIDER_FIELDS[provider] ?? []}
                getSteps={getProviderSteps}
              />
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
          onclick={() => (showDeleteConfirm = true)}
        >
          {L.profile_delete_account()}
        </button>
      </div>
    </section>
  {/if}
</div>

{#if showDeleteConfirm}
  <DeleteAccountModal {userEmail} onclose={() => (showDeleteConfirm = false)} />
{/if}
