<script lang="ts">
  import { page } from '$app/state'

  import { L } from '$lib'

  import type { PageData } from '../../routes/signin/$types'

  const providers = $derived((page.data as PageData).providers)
</script>

<section class="mx-auto max-w-md rounded-lg border bg-card p-6">
  <h1 class="text-2xl font-semibold">{L.common_sign_in()}</h1>
  <p class="mt-2 text-sm text-muted-foreground">{L.home_guest_description()}</p>

  <div class="mt-6 flex flex-col gap-3">
    {#if providers.google}
      <form method="POST">
        <input type="hidden" name="providerId" value="google" />
        <button
          class="flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-5 shrink-0">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{L.common_sign_in_google()}</span>
        </button>
      </form>
    {/if}

    {#if providers.apple}
      <form method="POST">
        <input type="hidden" name="providerId" value="apple" />
        <button
          class="flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-5 shrink-0 fill-current">
            <path
              d="M16.462 0c.174 1.636-.484 3.24-1.43 4.408-.972 1.196-2.562 2.132-4.116 2.006-.204-1.588.522-3.258 1.434-4.36C13.34.826 15.008-.066 16.462 0zM21.998 17.038c-.392.934-.87 1.792-1.432 2.582-.754 1.1-1.537 2.196-2.77 2.212-1.216.016-1.606-.778-2.994-.772-1.388.006-1.81.794-3.08.808-1.192.014-2.028-1.02-2.794-2.112C7.408 17.536 6.336 13.99 7.08 10.558c.358-1.674 1.256-3.214 2.576-4.162 1.278-.918 3.04-1.25 4.58-.822 1.03.288 1.894.902 2.718.902.82 0 2.358-.776 3.672-.6 1.184.16 2.268.78 2.95 1.76-1.152.72-2.018 1.884-2.002 3.316.016 1.66 1.036 3.008 2.424 3.526a8.7 8.7 0 0 1-1 2.56z"
            />
          </svg>
          <span>{L.common_sign_in_apple()}</span>
        </button>
      </form>
    {/if}

    {#if providers.github}
      <form method="POST">
        <input type="hidden" name="providerId" value="github" />
        <button
          class="flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-5 shrink-0 fill-current">
            <path
              d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.82-.26.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.808 1.304 3.493.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.468-2.38 1.236-3.22-.124-.303-.535-1.524.118-3.176 0 0 1.007-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.403 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.623-5.48 5.921.43.372.823 1.102.823 2.222v3.293c0 .32.216.694.825.576C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"
            />
          </svg>
          <span>{L.common_sign_in_github()}</span>
        </button>
      </form>
    {/if}
  </div>
</section>
