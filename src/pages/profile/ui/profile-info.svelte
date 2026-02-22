<script lang="ts">
  import { L } from '$lib'

  type User = {
    name?: string | null
    email?: string | null
    id?: string
  }

  type Props = { user: User | null | undefined }
  const { user }: Props = $props()
</script>

<section class="rounded-lg border bg-card p-6">
  <h1 class="text-2xl font-semibold">{L.profile_title()}</h1>
  {#if user}
    <div class="mt-3 space-y-1 text-sm">
      <p><span class="text-muted-foreground">{L.profile_name()}</span> {user.name ?? '—'}</p>
      <p><span class="text-muted-foreground">{L.profile_email()}</span> {user.email ?? '—'}</p>
      <p><span class="text-muted-foreground">{L.profile_user_id()}</span> {user.id}</p>
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
