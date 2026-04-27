<script lang="ts">
  import { L } from '$lib'

  type User = {
    name?: string | null
    email?: string | null
    id?: string
  }

  type Props = {
    user: User | null | undefined
    authProviders?: string[]
    /** Use `2` when this block sits under page-level tabs to keep a single logical h1 on the page. */
    titleLevel?: 1 | 2
  }

  const { user, authProviders = [], titleLevel = 1 }: Props = $props()

  const formatProvider = (provider: string) => provider.charAt(0).toUpperCase() + provider.slice(1)
</script>

<section class="rounded-lg border bg-card p-6">
  {#if titleLevel === 1}
    <h1 class="text-2xl font-semibold">{L.profile_title()}</h1>
  {:else}
    <h2 class="text-2xl font-semibold">{L.profile_title()}</h2>
  {/if}
  {#if user}
    <div class="mt-3 space-y-1 text-sm">
      <p><span class="text-muted-foreground">{L.profile_name()}</span> {user.name ?? '—'}</p>
      <p><span class="text-muted-foreground">{L.profile_email()}</span> {user.email ?? '—'}</p>
      <p><span class="text-muted-foreground">{L.profile_user_id()}</span> {user.id}</p>
      {#if authProviders.length > 0}
        <p>
          <span class="text-muted-foreground">{L.profile_auth_provider()}</span>
          {authProviders.map((p) => formatProvider(p)).join(', ')}
        </p>
      {/if}
    </div>
    <form method="POST" action="/signout" class="mt-4">
      <button class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
        {L.common_sign_out()}
      </button>
    </form>
  {:else}
    <p class="mt-2 text-sm text-muted-foreground">{L.profile_not_signed_in()}</p>
    <a href="/signin" class="mt-3 inline-block rounded-md border px-3 py-2 text-sm">{L.common_sign_in()}</a>
  {/if}
</section>
