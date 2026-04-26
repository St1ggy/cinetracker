<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import { onDestroy } from 'svelte'

  import { L } from '$lib'
  import { formatCountry } from '$shared/lib/labels'
  import { advancedDraftToFilterPatch, clearAdvancedFilterPatch, patchToggleCountryCode } from '$shared/lib/media-filters-surface'

  import type { MediaFiltersState } from '$shared/lib/media-filters'


  const DEBOUNCE_MS = 400

  type Props = {
    filters: MediaFiltersState
    onPatch: (patch: Partial<MediaFiltersState>) => void | Promise<void>
    countryCodes: string[]
    expanded: boolean
    onExpandedChange: (v: boolean) => void
    idPrefix: string
  }

  const { filters, onPatch, countryCodes, expanded, onExpandedChange, idPrefix }: Props = $props()

  let yf = $state('')
  let yt = $state('')
  let df = $state('')
  let dt = $state('')

  let pushTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    yf = filters.yearFrom == null ? '' : String(filters.yearFrom)
    yt = filters.yearTo == null ? '' : String(filters.yearTo)
    df = filters.durationFrom == null ? '' : String(filters.durationFrom)
    dt = filters.durationTo == null ? '' : String(filters.durationTo)
  })

  const hasAdvancedInPanel = $derived(
    filters.yearFrom != null ||
      filters.yearTo != null ||
      filters.durationFrom != null ||
      filters.durationTo != null ||
      filters.countries.length > 0,
  )

  const showAdvancedHint = $derived(!expanded && hasAdvancedInPanel)

  const displayCountryCodes = $derived(
    [...new Set([...countryCodes, ...filters.countries].map((c) => c.toUpperCase()))].toSorted((a, b) =>
      a.localeCompare(b),
    ),
  )

  const selectedUpper = $derived(new Set(filters.countries.map((c) => c.toUpperCase())))

  const flushRangePatch = () => {
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }

    Promise.resolve(
      onPatch(
        advancedDraftToFilterPatch({
          yearFrom: yf,
          yearTo: yt,
          durationFrom: df,
          durationTo: dt,
          countries: [...filters.countries],
        }),
      ),
    ).catch((): null => null)
  }

  const scheduleRangePatch = () => {
    if (pushTimer) clearTimeout(pushTimer)

    pushTimer = setTimeout(() => {
      pushTimer = null
      flushRangePatch()
    }, DEBOUNCE_MS)
  }

  onDestroy(() => {
    if (pushTimer) clearTimeout(pushTimer)
  })

  const clearAdvanced = () => {
    yf = ''
    yt = ''
    df = ''
    dt = ''
    Promise.resolve(onPatch(clearAdvancedFilterPatch())).catch((): null => null)
  }
</script>

<div class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20">
  <button
    type="button"
    class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-accent/50"
    aria-expanded={expanded}
    onclick={() => onExpandedChange(!expanded)}
  >
    <ChevronDownIcon
      class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {expanded ? '' : '-rotate-90'}"
      aria-hidden="true"
    />
    <span>{L.media_filters_advanced_title()}</span>
    {#if showAdvancedHint}
      <span class="ml-auto text-xs font-normal text-muted-foreground">{L.media_filters_advanced_active_hint()}</span>
    {/if}
  </button>
  {#if expanded}
    <div class="space-y-3 border-t border-border px-3 py-3">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-y1`}>{L.home_year_from_placeholder()}</label>
          <input
            id={`${idPrefix}-y1`}
            type="number"
            inputmode="numeric"
            class="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={L.home_year_from_placeholder()}
            value={yf}
            oninput={(event_) => {
              yf = (event_.currentTarget as HTMLInputElement).value
              scheduleRangePatch()
            }}
            onblur={flushRangePatch}
          />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-y2`}>{L.home_year_to_placeholder()}</label>
          <input
            id={`${idPrefix}-y2`}
            type="number"
            inputmode="numeric"
            class="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={L.home_year_to_placeholder()}
            value={yt}
            oninput={(event_) => {
              yt = (event_.currentTarget as HTMLInputElement).value
              scheduleRangePatch()
            }}
            onblur={flushRangePatch}
          />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-d1`}>{L.media_filters_duration_from_label()}</label>
          <input
            id={`${idPrefix}-d1`}
            type="number"
            inputmode="numeric"
            min="0"
            class="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={L.media_filters_duration_from_placeholder()}
            value={df}
            oninput={(event_) => {
              df = (event_.currentTarget as HTMLInputElement).value
              scheduleRangePatch()
            }}
            onblur={flushRangePatch}
          />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted-foreground" for={`${idPrefix}-d2`}>{L.media_filters_duration_to_label()}</label>
          <input
            id={`${idPrefix}-d2`}
            type="number"
            inputmode="numeric"
            min="0"
            class="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            placeholder={L.media_filters_duration_to_placeholder()}
            value={dt}
            oninput={(event_) => {
              dt = (event_.currentTarget as HTMLInputElement).value
              scheduleRangePatch()
            }}
            onblur={flushRangePatch}
          />
        </div>
      </div>
      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground">{L.media_filters_country_label()}</p>
        {#if displayCountryCodes.length === 0}
          <p class="text-xs text-muted-foreground">{L.media_filters_country_empty()}</p>
        {:else}
          <div class="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {#each displayCountryCodes as code (code)}
              <button
                type="button"
                class="rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors {selectedUpper.has(code)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
                aria-pressed={selectedUpper.has(code)}
                onclick={() => Promise.resolve(onPatch(patchToggleCountryCode(filters, code))).catch((): null => null)}
              >
                {formatCountry(code)}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      {#if hasAdvancedInPanel}
        <button
          type="button"
          class="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onclick={clearAdvanced}
        >
          {L.media_filters_clear_advanced()}
        </button>
      {/if}
    </div>
  {/if}
</div>
