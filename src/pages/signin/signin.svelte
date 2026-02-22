<script lang="ts">
  import { L } from '$lib'
</script>

<section class="mx-auto max-w-md rounded-lg border bg-card p-6">
  <h1 class="text-2xl font-semibold">{L.common_sign_in()}</h1>
  <p class="mt-2 text-sm text-muted-foreground">{L.home_guest_description()}</p>

  <form method="POST" class="mt-4">
    <input type="hidden" name="providerId" value="google" />
    <button class="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >{L.common_sign_in()}</button
    >
  </form>
</section>
