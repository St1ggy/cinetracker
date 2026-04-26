<script lang="ts">
  import { L } from '$lib'
  import SeasonStructureBlock from '$lib/components/media/season-structure-block.svelte'
  import * as Select from '$lib/components/ui/select'
  import { WATCH_STATUSES } from '$shared/config/domain'
  import {
    type SeasonBreakdownEntry,
    type SeasonGridSource,
    displaySeasonGrid,
    effectiveSeasonRows,
    episodesInSeason,
    isStructureKnown,
    parseQuickProgressInput,
    seasonBreakdownsEqual,
    sortSeasonBreakdown,
    validateEpisodicProgress,
  } from '$shared/lib/episodic-progress'
  import { getWatchStatusLabels } from '$shared/lib/labels'

  import type { WatchStatus } from '$shared/config/domain'

  type FormMode = 'title' | 'kanban-watched'

  type SubmitPayload = {
    status: WatchStatus
    currentSeason: number | null
    currentEpisode: number | null
    /** `null` = use catalog; omit in kanban-watched. */
    userSeasonBreakdown?: SeasonBreakdownEntry[] | null
    /** Omitted in kanban-watched. */
    seasonStructureSource?: SeasonGridSource
  }

  type Props = {
    mode: FormMode
    /** Catalog (media) season grid. */
    seasons: SeasonBreakdownEntry[]
    initialUserSeasonBreakdown?: SeasonBreakdownEntry[] | null
    initialSeasonStructureSource?: 'CATALOG' | 'USER' | null
    initialStatus: WatchStatus
    initialSeason: number | null
    initialEpisode: number | null
    /** For kanban: label for the Watched column CTA and column name in CTA. */
    watchedColumnLabel: string
    inProgressColumnLabel: string
    onSubmit: (data: SubmitPayload) => void
    isSubmitting: boolean
    idPrefix: string
    /** `structureOnly` — only season grid; used from “Set structure” on media. */
    pageVariant?: 'full' | 'structureOnly'
  }

  const {
    mode,
    seasons: seasonsProperty,
    initialUserSeasonBreakdown: initialUserSeasonBreakdownProperty = null,
    initialSeasonStructureSource: initialSeasonStructureSourceProperty = null,
    initialStatus,
    initialSeason,
    initialEpisode,
    watchedColumnLabel,
    inProgressColumnLabel,
    onSubmit,
    isSubmitting,
    idPrefix,
    pageVariant: pageVariantProperty = 'full',
  }: Props = $props()

  const watchStatusLabels = getWatchStatusLabels(L)

  let userStructureDraft = $state<SeasonBreakdownEntry[]>([])

  $effect(() => {
    if (idPrefix.length >= 0) {
      // Re-run when `idPrefix` (form instance) changes; condition always true
    }

    const catalog = seasonsProperty
    const initU = initialUserSeasonBreakdownProperty

    userStructureDraft = effectiveSeasonRows(catalog, initU).map((r) => ({ ...r }))
  })

  let structSource = $state<SeasonGridSource>('AUTO')

  $effect(() => {
    if (idPrefix.length >= 0) {
      // Re-run when `idPrefix` changes; condition always true
    }

    const r = initialSeasonStructureSourceProperty

    structSource = r == null ? 'AUTO' : r
  })

  const activePickerGrid = $derived(displaySeasonGrid(seasonsProperty, userStructureDraft, structSource))
  const structureKnown = $derived(isStructureKnown(activePickerGrid))

  const isTitleContext = $derived(pageVariantProperty === 'structureOnly' || mode === 'title')

  const canChooseStructureSource = $derived(
    isTitleContext &&
      seasonsProperty.length > 0 &&
      ((initialUserSeasonBreakdownProperty?.length ?? 0) > 0 ||
        !seasonBreakdownsEqual(
          sortSeasonBreakdown([...seasonsProperty]),
          sortSeasonBreakdown([...userStructureDraft]),
        )),
  )
  const orderedStatuses = WATCH_STATUSES.toReversed()

  let status = $state<WatchStatus>('PLAN_TO_WATCH')
  let season = $state<number | ''>('')
  let episode = $state<number | ''>('')
  let quick = $state('')

  $effect.pre(() => {
    status = initialStatus
    season = initialSeason ?? ''
    episode = initialEpisode ?? ''
  })
  let fieldError = $state<'season' | 'episode' | null>(null)
  let messageKey = $state<string | null>(null)
  let messageMax = $state<number | undefined>()

  const previewText = $derived(
    season === '' || episode === '' ? null : L.media_progress_preview_times({ s: String(season), e: String(episode) }),
  )

  const setQuickError = () => {
    messageKey = null
    fieldError = null
  }

  /** Pushes p into S/E, then shows catalog errors if any. */
  const applyParsedToFields = (p: { season: number; episode: number }) => {
    season = p.season
    episode = p.episode

    if (!structureKnown) {
      setQuickError()

      return
    }

    const m = validateEpisodicProgress({
      structureKnown: true,
      seasons: activePickerGrid,
      season: p.season,
      episode: p.episode,
    })

    if (m.ok) {
      setQuickError()

      return
    }

    if (m.code === 'exceeds_season') {
      const maxE = episodesInSeason(activePickerGrid, p.season)

      if (maxE == null) {
        messageKey = 'invalid'
        fieldError = m.field
      } else {
        messageKey = 'exceeds'
        messageMax = maxE
        fieldError = m.field
      }
    } else {
      messageKey = 'invalid'
      fieldError = m.field
    }
  }

  const syncFromQuickString = (value: string) => {
    const p = parseQuickProgressInput(value)

    if (!p) {
      setQuickError()

      return
    }

    applyParsedToFields(p)
  }

  const onQuickFieldInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value

    quick = value
    syncFromQuickString(value)
  }

  const applyQuick = () => {
    setQuickError()
    const p = parseQuickProgressInput(quick)

    if (!p) {
      messageKey = 'format'

      return
    }

    applyParsedToFields(p)
  }

  const hasDuplicateSeasons = () => {
    const g = new Set(userStructureDraft.map((r) => r.seasonNumber))

    return g.size !== userStructureDraft.length
  }

  const runValidation = (): boolean => {
    setQuickError()

    if (status !== 'IN_PROGRESS') return true

    if (hasDuplicateSeasons()) {
      messageKey = 'dup_season'

      return false
    }

    if (season === '' || episode === '') {
      messageKey = 'invalid'
      fieldError = 'episode'

      return false
    }

    const s = Number(season)
    const epNumber = Number(episode)

    const m = validateEpisodicProgress({
      structureKnown,
      seasons: structureKnown ? activePickerGrid : null,
      season: s,
      episode: epNumber,
    })

    if (m.ok) return true

    if (m.code === 'exceeds_season') {
      const maxE = episodesInSeason(activePickerGrid, s)

      if (maxE == null) {
        messageKey = 'invalid'
        fieldError = m.field
      } else {
        messageKey = 'exceeds'
        messageMax = maxE
        fieldError = m.field
      }
    } else {
      messageKey = 'invalid'
      fieldError = m.field
    }

    return false
  }

  const handlePrimary = () => {
    if (mode === 'kanban-watched' && status === 'WATCHED') {
      onSubmit({ status: 'WATCHED', currentSeason: null, currentEpisode: null })

      return
    }

    if (status === 'WATCHED') {
      onSubmit({ status: 'WATCHED', currentSeason: null, currentEpisode: null })

      return
    }

    if (status === 'PLAN_TO_WATCH') {
      onSubmit({ status: 'PLAN_TO_WATCH', currentSeason: null, currentEpisode: null })

      return
    }

    if (!runValidation()) return

    const sameAsCatalog = seasonBreakdownsEqual(
      sortSeasonBreakdown([...seasonsProperty]),
      sortSeasonBreakdown([...userStructureDraft]),
    )
    const userOverridePayload = sameAsCatalog ? null : userStructureDraft

    onSubmit({
      status: 'IN_PROGRESS',
      currentSeason: season === '' ? null : Number(season),
      currentEpisode: episode === '' ? null : Number(episode),
      ...(mode === 'title' ? { userSeasonBreakdown: userOverridePayload, seasonStructureSource: structSource } : {}),
    })
  }

  const ctaLabel = $derived.by(() => {
    if (mode !== 'kanban-watched') return L.media_progress_save()

    if (status === 'WATCHED') {
      return L.media_progress_save_and_move({ column: watchedColumnLabel })
    }

    return L.media_progress_save_and_move({ column: inProgressColumnLabel })
  })

  const markFullyWatched = () => {
    onSubmit({ status: 'WATCHED', currentSeason: null, currentEpisode: null })
  }

  const handleStructureOnlySave = () => {
    if (hasDuplicateSeasons()) {
      messageKey = 'dup_season'

      return
    }

    setQuickError()
    const sameAsCatalog = seasonBreakdownsEqual(
      sortSeasonBreakdown([...seasonsProperty]),
      sortSeasonBreakdown([...userStructureDraft]),
    )

    onSubmit({
      status: initialStatus,
      currentSeason: initialSeason,
      currentEpisode: initialEpisode,
      userSeasonBreakdown: sameAsCatalog ? null : userStructureDraft,
      seasonStructureSource: structSource,
    })
  }
</script>

<div
  class="space-y-4"
  role="form"
  onsubmit={(event) => {
    event.preventDefault()
  }}
>
  {#if pageVariantProperty === 'structureOnly'}
    <p class="text-sm text-muted-foreground">{L.media_progress_structure_custom_lead()}</p>
    {#if canChooseStructureSource}
      <div
        class="space-y-1.5 rounded-lg border border-dotted bg-muted/20 p-3"
        role="group"
        aria-label={L.media_season_grid_source()}
      >
        <p class="text-xs text-muted-foreground">{L.media_season_grid_source_hint()}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'AUTO'
              ? 'border-primary bg-primary/10'
              : 'bg-background'}"
            onclick={() => {
              structSource = 'AUTO'
            }}
          >
            {L.media_season_source_auto()}
          </button>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'CATALOG'
              ? 'border-primary bg-primary/10'
              : 'bg-background'}"
            onclick={() => {
              structSource = 'CATALOG'
            }}
          >
            {L.media_season_source_catalog()}
          </button>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'USER'
              ? 'border-primary bg-primary/10'
              : 'bg-background'}"
            onclick={() => {
              structSource = 'USER'
            }}
          >
            {L.media_season_source_user()}
          </button>
        </div>
      </div>
    {/if}
    <div class="rounded-lg border bg-background/50 p-3 text-left">
      <h4 class="text-sm font-medium text-foreground">{L.media_progress_structure_custom_title()}</h4>
      <div class="mt-2">
        <SeasonStructureBlock
          bind:draft={userStructureDraft}
          catalogForReset={seasonsProperty}
          {idPrefix}
          onAfterQuickApply={() => {
            structSource = 'USER'
          }}
        />
      </div>
    </div>
    {#if messageKey === 'dup_season'}
      <p class="text-sm text-destructive" role="alert">
        {L.media_progress_error_duplicate_seasons()}
      </p>
    {/if}
    <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="min-h-11 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:ms-auto sm:w-auto sm:min-w-36 sm:px-5"
        onclick={handleStructureOnlySave}
        disabled={isSubmitting}
      >
        {isSubmitting ? L.media_progress_saving() : L.media_progress_save()}
      </button>
    </div>
  {:else}
    {#if mode === 'title'}
      <div class="grid grid-cols-1 gap-1 rounded-lg border bg-muted/30 p-1 sm:grid-cols-3">
        {#each orderedStatuses as st (st)}
          <button
            type="button"
            class="min-h-11 rounded-md py-2 text-center text-sm font-medium transition-all {status === st
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => {
              status = st

              if (st !== 'IN_PROGRESS') {
                season = ''
                episode = ''
              }

              setQuickError()
            }}
          >
            {watchStatusLabels[st]}
          </button>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">{L.board_watched_dialog_description()}</p>
      <div class="grid grid-cols-1 gap-1 rounded-lg border bg-muted/30 p-1 sm:grid-cols-2">
        <button
          type="button"
          class="min-h-11 rounded-md py-2 text-sm font-medium transition-all {status === 'WATCHED'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            status = 'WATCHED'
            season = ''
            episode = ''
            setQuickError()
          }}
        >
          {L.board_watched_mark_complete()}
        </button>
        <button
          type="button"
          class="min-h-11 rounded-md py-2 text-sm font-medium transition-all {status === 'IN_PROGRESS'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => {
            status = 'IN_PROGRESS'
            setQuickError()
          }}
        >
          {L.board_watched_update_episode()}
        </button>
      </div>
    {/if}

    {#if status === 'IN_PROGRESS'}
      <div class="space-y-2">
        <h4 class="text-sm font-medium">{L.media_progress_where_stopped()}</h4>

        {#if canChooseStructureSource}
          <div
            class="space-y-1.5 rounded-lg border border-dotted bg-muted/20 p-3"
            role="group"
            aria-label={L.media_season_grid_source()}
          >
            <p class="text-xs text-muted-foreground">{L.media_season_grid_source_hint()}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'AUTO'
                  ? 'border-primary bg-primary/10'
                  : 'bg-background'}"
                onclick={() => {
                  structSource = 'AUTO'
                  setQuickError()
                }}
              >
                {L.media_season_source_auto()}
              </button>
              <button
                type="button"
                class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'CATALOG'
                  ? 'border-primary bg-primary/10'
                  : 'bg-background'}"
                onclick={() => {
                  structSource = 'CATALOG'
                  setQuickError()
                }}
              >
                {L.media_season_source_catalog()}
              </button>
              <button
                type="button"
                class="rounded-md border px-2.5 py-1.5 text-xs font-medium {structSource === 'USER'
                  ? 'border-primary bg-primary/10'
                  : 'bg-background'}"
                onclick={() => {
                  structSource = 'USER'
                  setQuickError()
                }}
              >
                {L.media_season_source_user()}
              </button>
            </div>
          </div>
        {/if}

        {#if !structureKnown}
          <p class="text-xs text-muted-foreground" role="status">
            {L.media_progress_structure_unknown_info()}
          </p>
        {/if}

        {#if isTitleContext && status === 'IN_PROGRESS'}
          <details class="rounded-lg border bg-background/50 p-3 text-left">
            <summary class="cursor-pointer text-sm font-medium text-foreground">
              {L.media_progress_structure_custom_title()}
            </summary>
            <p class="mt-2 text-xs text-muted-foreground">{L.media_progress_structure_custom_lead()}</p>
            <div class="mt-3">
              <SeasonStructureBlock
                bind:draft={userStructureDraft}
                catalogForReset={seasonsProperty}
                {idPrefix}
                onAfterQuickApply={() => {
                  structSource = 'USER'
                }}
              />
            </div>
          </details>
        {/if}

        <div
          class="min-h-6 text-sm font-medium text-foreground/90"
          data-slot="episodic-preview"
          role="status"
          aria-live="polite"
        >
          {#if previewText}
            {previewText}
          {/if}
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          {#if structureKnown}
            <div class="min-w-0 flex-1">
              <p class="mb-1.5 text-xs font-medium text-muted-foreground" id="season-l-{idPrefix}">
                {L.media_progress_season()}
              </p>
              <Select.Root
                type="single"
                value={season === '' ? '__none__' : String(season)}
                onValueChange={(v) => {
                  season = v === '__none__' ? '' : Number(v)
                  episode = ''
                  setQuickError()
                }}
              >
                <Select.Trigger class="h-12 w-full text-base" aria-labelledby="season-l-{idPrefix}">
                  {season === '' ? '—' : String(season)}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="__none__" label="—" />
                  {#each activePickerGrid as se, sidx (sidx)}
                    <Select.Item value={String(se.seasonNumber)} label={String(se.seasonNumber)} />
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          {:else}
            <div class="min-w-0 flex-1">
              <label class="mb-1.5 block text-xs font-medium text-muted-foreground" for="season-unk-{idPrefix}">
                {L.media_progress_season()}
              </label>
              <input
                id="season-unk-{idPrefix}"
                type="number"
                min="1"
                class="h-12 w-full min-w-0 rounded-md border bg-background px-3 text-base {fieldError === 'season'
                  ? 'border-destructive'
                  : ''}"
                value={season === '' ? '' : String(season)}
                oninput={(event) => {
                  const v = (event.currentTarget as HTMLInputElement).value

                  if (v === '') {
                    season = ''
                  } else {
                    const n = Math.floor(Number(v))

                    season = Number.isFinite(n) && n >= 1 ? n : ''
                  }

                  setQuickError()
                }}
              />
            </div>
          {/if}

          <div class="min-w-0 flex-1">
            <label class="mb-1.5 block text-xs font-medium text-muted-foreground" for="episode-{idPrefix}">
              {L.media_progress_episode()}
              {#if structureKnown && season !== ''}
                <span class="text-muted-foreground/70">
                  / {episodesInSeason(activePickerGrid, Number(season)) ?? '—'}
                </span>
              {/if}
            </label>
            <input
              id="episode-{idPrefix}"
              type="number"
              min="1"
              max={structureKnown && season !== ''
                ? (episodesInSeason(activePickerGrid, Number(season)) ?? undefined)
                : undefined}
              class="h-12 w-full min-w-0 rounded-md border bg-background px-3 text-base {fieldError === 'episode'
                ? 'border-destructive'
                : ''}"
              value={episode === '' ? '' : String(episode)}
              oninput={(event) => {
                const v = (event.currentTarget as HTMLInputElement).value

                if (v === '') {
                  episode = ''
                } else {
                  const n = Math.floor(Number(v))

                  episode = Number.isFinite(n) && n >= 1 ? n : ''
                }

                setQuickError()
              }}
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-muted-foreground" for="quick-{idPrefix}">
            {L.media_progress_quick_entry_label()}
          </label>
          <div class="flex items-stretch gap-2">
            <input
              id="quick-{idPrefix}"
              type="text"
              class="h-12 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base"
              placeholder={L.media_progress_quick_entry_placeholder()}
              value={quick}
              oninput={onQuickFieldInput}
            />
            <button
              type="button"
              class="inline-flex h-12 min-w-24 shrink-0 items-center justify-center rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"
              onclick={applyQuick}
            >
              {L.media_progress_apply_quick()}
            </button>
          </div>
        </div>

        <div class="min-h-4 text-sm" role="region" aria-live="polite">
          {#if messageKey === 'exceeds' && messageMax != null}
            <p class="text-destructive" role="alert">
              {L.media_progress_error_episode_exceeds({ max: String(messageMax) })}
            </p>
          {:else if messageKey === 'dup_season'}
            <p class="text-destructive" role="alert">
              {L.media_progress_error_duplicate_seasons()}
            </p>
          {:else if messageKey != null}
            <p class="text-destructive" role="alert">
              {L.media_progress_error_season_or_episode()}
            </p>
          {/if}
        </div>

        {#if mode === 'title'}
          <button
            type="button"
            class="w-full rounded-md border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onclick={markFullyWatched}
            disabled={isSubmitting}
          >
            {L.media_progress_mark_fully_watched()}
          </button>
        {/if}
      </div>
    {/if}

    <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="min-h-11 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:ms-auto sm:w-auto sm:min-w-36 sm:px-5"
        onclick={handlePrimary}
        disabled={isSubmitting}
      >
        {isSubmitting ? L.media_progress_saving() : ctaLabel}
      </button>
    </div>
  {/if}
</div>
