<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import { createQuery } from '@tanstack/svelte-query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select'
  import { FREE_PROVIDERS, KEY_REQUIRED_PROVIDERS, PROVIDER_META } from '$shared/config/domain'

  import DeleteAccountModal from './ui/delete-account-modal.svelte'
  import GenreAliasSettings from './ui/genre-alias-settings.svelte'
  import HandleEditor from './ui/handle-editor.svelte'
  import ProfileInfo from './ui/profile-info.svelte'
  import ProviderApiKeyRow from './ui/provider-api-key-row.svelte'

  import type { MediaProvider } from '$shared/config/domain'
  import type { PageData } from '../../routes/profile/$types'

  type CredentialField = { key: string; label: string; type?: 'text' | 'password' }
  type CacheResetState = 'idle' | 'resetting' | 'done'

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
    SIMKL: [{ key: 'clientId', label: 'Client ID', type: 'text' }],
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

  const TAB_IDS = ['account', 'keys', 'catalog', 'danger'] as const
  type ProfileTab = (typeof TAB_IDS)[number]

  const isProfileTab = (s: string | null | undefined): s is ProfileTab =>
    s != null && (TAB_IDS as readonly string[]).includes(s)

  const tabFromSearchParams = (p: URLSearchParams): ProfileTab => {
    const raw = p.get('tab')

    return isProfileTab(raw) ? raw : 'account'
  }

  // Tab UI follows `?tab=` on `page` so URL is the single source of truth (no race between local state and `replaceState`).
  const activeTab = $derived(tabFromSearchParams(page.url.searchParams))

  const profileTabUrl = (v: ProfileTab, base: URL = new URL(page.url)) => {
    const next = new URL(base)

    if (v === 'account') {
      next.searchParams.delete('tab')
    } else {
      next.searchParams.set('tab', v)
    }

    return next
  }

  const setProfileTab = async (v: ProfileTab) => {
    const next = profileTabUrl(v)

    if (next.pathname === page.url.pathname && next.search === page.url.search) {
      return
    }

    await goto(next, { replaceState: true, noScroll: true, invalidateAll: false })
  }

  const configuredQuery = createQuery(() => ({
    queryKey: ['user-api-keys'] as const,
    queryFn: async () => {
      const response = await fetch('/api/user/api-keys')

      if (!response.ok) throw new Error('Failed to load API keys')

      const payload = (await response.json()) as { configuredProviders: { provider: MediaProvider }[] }

      return new Set(payload.configuredProviders.map((p) => p.provider))
    },
  }))

  const isConfigured = (provider: MediaProvider) => {
    const fromQuery = configuredQuery.data

    if (fromQuery) {
      return fromQuery.has(provider)
    }

    // SSR / first paint: use load data; avoid `initialData` in createQuery (new `Set` each run → reactive churn).
    return (data.configuredProviders as MediaProvider[]).includes(provider)
  }

  let showDeleteConfirm = $state(false)
  let cacheResetState = $state<CacheResetState>('idle')
  let cacheResetCount = $state(0)
  const userEmail = $derived(data.session?.user?.email ?? '')
  const authProviders = $derived(data.authProviders ?? [])

  const handleCacheReset = async () => {
    if (cacheResetState === 'resetting') return

    cacheResetState = 'resetting'

    try {
      const response = await fetch('/api/user/media-cache', { method: 'DELETE' })

      if (!response.ok) throw new Error('Failed to reset cache')

      const result = (await response.json()) as { count: number }

      cacheResetCount = result.count
      cacheResetState = 'done'
    } catch {
      toast.error(L.common_error_generic())
      cacheResetState = 'idle'
    }
  }
  let currentHandle = $state<string | null>(null)
  let nextChangeAt = $state<string | null>(null)

  /** Re-fetch when the logged-in user id changes, not on every new `data` object from the parent. */
  const sessionUserId = $derived(data.session?.user?.id ?? null)

  $effect(() => {
    const userId = sessionUserId

    if (userId == null) {
      untrack(() => {
        currentHandle = null
        nextChangeAt = null
      })

      return
    }

    const ac = new AbortController()
    let cancelled = false

    void fetch('/api/user/handle', { signal: ac.signal })
      .then((r) => {
        if (!r.ok) {
          return null
        }

        return r.json() as Promise<{ handle: string | null; nextChangeAt: string | null }>
      })
      .then((d) => {
        if (cancelled || d == null) {
          return
        }

        // Writes must not re-subscribe this $effect, or the async then() retriggers a depth limit error.
        untrack(() => {
          currentHandle = d.handle
          nextChangeAt = d.nextChangeAt
        })
      })
      .catch(() => {
        // ignore network errors and AbortError
      })

    return () => {
      cancelled = true
      ac.abort()
    }
  })

  // Show only list titles: when no default is set, the "main" option shows the first list's name
  const firstListTitle = $derived((data.lists ?? [])[0]?.title)
  const defaultListLabel = $derived(
    (() => {
      const id = data.defaultListId

      if (!id) return firstListTitle ?? L.profile_default_list_main()

      return (
        data.lists?.find((l) => l.id === id)?.title ?? firstListTitle ?? L.profile_default_list_main()
      )
    })(),
  )

  // When defaultListId is null, the first list is shown as __none__; exclude it to avoid duplicate
  const listsForDefaultSelect = $derived(
    (data.lists ?? []).filter(
      (l) =>
        !(data.defaultListId == null && data.mainListIdWhenNoDefault != null && l.id === data.mainListIdWhenNoDefault),
    ),
  )

  async function handleDefaultListChange(value: string) {
    const defaultListId = value === '__none__' ? null : value

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultListId }),
      })

      if (!response.ok) throw new Error('Failed to update')

      await invalidateAll()
      toast.success(L.profile_handle_saved())
    } catch {
      toast.error(L.common_error_generic())
    }
  }

  const tabTriggerClass = (v: ProfileTab) => {
    const base =
      'shrink-0 rounded-t-md border-b-2 border-transparent px-2 py-1.5 text-sm font-medium transition-colors'

    if (activeTab !== v) {
      return `${base} text-muted-foreground hover:text-foreground`
    }

    if (v === 'danger') {
      return `${base} border-destructive text-destructive`
    }

    return `${base} border-primary text-foreground`
  }
</script>

<div class="space-y-6">
  {#if !data.session?.user}
    <ProfileInfo user={data.session?.user} {authProviders} />
  {:else}
    <div class="w-full">
      <div class="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden">
        <div
          class="inline-flex! h-auto! w-max! min-w-0 gap-1 sm:w-full! sm:min-w-full"
          role="tablist"
          aria-label={L.profile_tabs_nav_aria()}
        >
          <button
            type="button"
            id="profile-tab-account"
            class={tabTriggerClass('account')}
            role="tab"
            aria-selected={activeTab === 'account'}
            aria-controls="profile-panel-account"
            tabindex="0"
            onclick={() => void setProfileTab('account')}>{L.profile_tab_account()}</button
          >
          <button
            type="button"
            id="profile-tab-keys"
            class={tabTriggerClass('keys')}
            role="tab"
            aria-selected={activeTab === 'keys'}
            aria-controls="profile-panel-keys"
            tabindex="0"
            onclick={() => void setProfileTab('keys')}>{L.profile_tab_keys()}</button
          >
          <button
            type="button"
            id="profile-tab-catalog"
            class={tabTriggerClass('catalog')}
            role="tab"
            aria-selected={activeTab === 'catalog'}
            aria-controls="profile-panel-catalog"
            tabindex="0"
            onclick={() => void setProfileTab('catalog')}>{L.profile_tab_catalog()}</button
          >
          <button
            type="button"
            id="profile-tab-danger"
            class={tabTriggerClass('danger')}
            role="tab"
            aria-selected={activeTab === 'danger'}
            aria-controls="profile-panel-danger"
            tabindex="0"
            onclick={() => void setProfileTab('danger')}>{L.profile_tab_danger()}</button
          >
        </div>
        <div class="mt-1 h-px w-full bg-border/80" aria-hidden="true"></div>
      </div>

      <div
        class="mt-4 space-y-6 outline-none"
        id="profile-panel-account"
        role="tabpanel"
        aria-hidden={activeTab !== 'account'}
        hidden={activeTab !== 'account'}
        tabindex="0"
      >
        <ProfileInfo titleLevel={2} user={data.session?.user} {authProviders} />
        <section class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold">{L.profile_handle_label()}</h2>
          <div class="mt-4">
            <HandleEditor
              {currentHandle}
              {nextChangeAt}
              onSaved={(h) => {
                currentHandle = h
              }}
            />
          </div>
        </section>
        <section class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold">{L.profile_default_list_title()}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{L.profile_default_list_description()}</p>
          <div class="mt-4">
            <Select.Root type="single" value={data.defaultListId ?? '__none__'} onValueChange={handleDefaultListChange}>
              <Select.Trigger class="h-9 min-w-[200px] text-sm">
                {defaultListLabel}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="__none__" label={firstListTitle ?? L.profile_default_list_main()} />
                {#each listsForDefaultSelect as list (list.id)}
                  <Select.Item value={list.id} label={list.title} />
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </section>
      </div>

      <div
        class="mt-4 outline-none"
        id="profile-panel-keys"
        role="tabpanel"
        aria-hidden={activeTab !== 'keys'}
        hidden={activeTab !== 'keys'}
        tabindex="0"
      >
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
      </div>

      <div
        class="mt-4 space-y-6 outline-none"
        id="profile-panel-catalog"
        role="tabpanel"
        aria-hidden={activeTab !== 'catalog'}
        hidden={activeTab !== 'catalog'}
        tabindex="0"
      >
        {#if data.genreAliasSettings}
          <GenreAliasSettings initialConfig={data.genreAliasSettings} />
        {/if}
        <section class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold">{L.profile_cache_title()}</h2>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p class="text-sm text-muted-foreground">{L.profile_cache_description()}</p>
            <button
              class="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              onclick={handleCacheReset}
              disabled={cacheResetState === 'resetting'}
            >
              {cacheResetState === 'resetting' ? L.profile_cache_resetting() : L.profile_cache_reset_button()}
            </button>
          </div>
          {#if cacheResetState === 'done'}
            <p class="mt-2 text-sm text-green-600 dark:text-green-400">
              {L.profile_cache_reset_success({ count: cacheResetCount })}
            </p>
          {/if}
        </section>
      </div>

      <div
        class="mt-4 outline-none"
        id="profile-panel-danger"
        role="tabpanel"
        aria-hidden={activeTab !== 'danger'}
        hidden={activeTab !== 'danger'}
        tabindex="0"
      >
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
      </div>
    </div>
  {/if}
</div>

{#if showDeleteConfirm}
  <DeleteAccountModal {userEmail} onclose={() => (showDeleteConfirm = false)} />
{/if}
