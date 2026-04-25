<script lang="ts">
  import EyeIcon from '@lucide/svelte/icons/eye'
  import EyeOffIcon from '@lucide/svelte/icons/eye-off'
  import Maximize2Icon from '@lucide/svelte/icons/maximize-2'
  import Minimize2Icon from '@lucide/svelte/icons/minimize-2'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'

  import { L } from '$lib'

  type WheelEntry = {
    id: string
    mediaId: string
    title: string
    posterUrl: string | null
  }

  type Props = {
    entries: WheelEntry[]
  }

  const { entries }: Props = $props()

  const WHEEL_SIZE = 680
  const CENTER = WHEEL_SIZE / 2
  const RADIUS = CENTER - 10
  const LABEL_RADIUS = RADIUS - 22

  let wheelRotation = $state(0)
  let spinning = $state(false)
  let winnerId = $state<string | null>(null)
  let previousSignature = $state('')
  let isFullscreen = $state(false)
  let showLabels = $state(true)

  const winner = $derived(entries.find((entry) => entry.id === winnerId) ?? null)
  const canSpin = $derived(entries.length > 1 && !spinning)
  const labelFontSize = $derived(entries.length > 10 ? 25 : 29)
  const LABEL_CHAR_WIDTH_FACTOR = 0.58

  const toPolar = (angleDeg: number, radius: number) => {
    const angle = (angleDeg * Math.PI) / 180

    return {
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
    }
  }

  const slicePath = (index: number, total: number) => {
    const angle = 360 / total
    const start = index * angle
    const end = start + angle
    const p1 = toPolar(start, RADIUS)
    const p2 = toPolar(end, RADIUS)
    const largeArc = angle > 180 ? 1 : 0

    return `M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`
  }

  /** `clipPathUnits="objectBoundingBox"` (0…1) — required for `clip-path: url(#id)` on full-square HTML layers. */
  const slicePathOBB = (index: number, total: number) => {
    const c = 0.5
    const r = RADIUS / WHEEL_SIZE
    const angle = 360 / total
    const start = index * angle
    const end = start + angle
    const rad0 = (start * Math.PI) / 180
    const rad1 = (end * Math.PI) / 180
    const p1 = { x: c + Math.cos(rad0) * r, y: c + Math.sin(rad0) * r }
    const p2 = { x: c + Math.cos(rad1) * r, y: c + Math.sin(rad1) * r }
    const largeArc = angle > 180 ? 1 : 0

    return `M ${c} ${c} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`
  }

  const textArcPath = (index: number, total: number) => {
    const angle = 360 / total
    const padding = Math.min(8, Math.max(2, angle * 0.16))
    const start = index * angle + padding
    const end = (index + 1) * angle - padding
    const p1 = toPolar(start, LABEL_RADIUS)
    const p2 = toPolar(end, LABEL_RADIUS)

    return `M ${p1.x} ${p1.y} A ${LABEL_RADIUS} ${LABEL_RADIUS} 0 0 1 ${p2.x} ${p2.y}`
  }

  const radialLabelPath = (index: number, total: number) => {
    const angle = 360 / total
    const middle = index * angle + angle / 2
    const outer = toPolar(middle, RADIUS - 10)
    const inner = toPolar(middle, 72)

    return `M ${outer.x} ${outer.y} L ${inner.x} ${inner.y}`
  }

  const labelsOverflowArc = $derived.by(() => {
    if (entries.length === 0) return false

    const angle = 360 / entries.length
    const sectorArcLength = (2 * Math.PI * LABEL_RADIUS * angle) / 360
    const usableArcLength = Math.max(0, sectorArcLength - 18)

    for (const entry of entries) {
      const estimatedWidth = entry.title.length * labelFontSize * LABEL_CHAR_WIDTH_FACTOR

      if (estimatedWidth > usableArcLength) return true
    }

    return false
  })

  // Same as label arc / sector orientation (tangent: mid + 90°).
  const sectorRotationDeg = (index: number, total: number) => {
    const slice = 360 / total
    const mid = index * slice + slice / 2

    return mid + 90
  }

  const normalize = (value: number) => ((value % 360) + 360) % 360

  const randomInt = (maxExclusive: number) => {
    if (maxExclusive <= 1) return 0

    const bytes = new Uint32Array(1)

    crypto.getRandomValues(bytes)

    return bytes[0] % maxExclusive
  }

  const spin = () => {
    if (!canSpin) return

    const total = entries.length
    const angle = 360 / total
    const winnerIndex = randomInt(total)
    const rounds = 7 + randomInt(3)
    // Pointer is at the top of the wheel (270deg in our coordinate system).
    // Align selected slice center to that angle.
    const target = normalize(270 - (winnerIndex * angle + angle / 2))
    const current = normalize(wheelRotation)
    const delta = normalize(target - current)

    spinning = true
    winnerId = null
    wheelRotation += rounds * 360 + delta

    setTimeout(() => {
      winnerId = entries[winnerIndex]?.id ?? null
      spinning = false
    }, 5200)
  }

  const toggleFullscreen = () => {
    isFullscreen = !isFullscreen
  }

  $effect(() => {
    const signature = entries.map((entry) => entry.id).join('|')

    if (signature !== previousSignature) {
      previousSignature = signature
      winnerId = null
    }
  })
</script>

<section
  class="space-y-4 rounded-xl border bg-card p-4 {isFullscreen
    ? 'fixed inset-3 z-50 overflow-auto rounded-2xl border bg-background/95 p-5 shadow-2xl backdrop-blur-sm md:inset-6 md:p-8'
    : ''}"
>
  <div class="flex items-center justify-between gap-3">
    <h2 class="text-sm font-semibold">{L.wheel_title()}</h2>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        onclick={() => (showLabels = !showLabels)}
      >
        {#if showLabels}
          <EyeOffIcon class="size-4" />
          {L.wheel_labels_hide()}
        {:else}
          <EyeIcon class="size-4" />
          {L.wheel_labels_show()}
        {/if}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        onclick={toggleFullscreen}
      >
        {#if isFullscreen}
          <Minimize2Icon class="size-4" />
          {L.wheel_fullscreen_exit()}
        {:else}
          <Maximize2Icon class="size-4" />
          {L.wheel_fullscreen_enter()}
        {/if}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={spin}
        disabled={!canSpin}
      >
        <SparklesIcon class="size-4" />
        {spinning ? L.wheel_spinning() : L.wheel_spin_button()}
      </button>
    </div>
  </div>

  {#if entries.length === 0}
    <div class="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      {L.wheel_empty_filtered()}
    </div>
  {:else}
    <div class="mx-auto w-full max-w-[560px] {isFullscreen ? 'max-w-[min(88vw,calc(100vh-17rem))]' : ''}">
      <div class="relative">
        <div class="absolute -top-3 left-1/2 z-30 -translate-x-1/2" aria-hidden="true">
          <div class="mx-auto flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm">
            <div class="h-2 w-2 rounded-full bg-primary"></div>
          </div>
          <div
            class="mx-auto h-0 w-0 border-x-8 border-t-12 border-x-transparent border-t-primary drop-shadow-sm"
          ></div>
        </div>
        <div
          class="relative z-10 overflow-hidden rounded-full border-8 border-background shadow-md"
          style="aspect-ratio: 1 / 1; transform: rotate({wheelRotation}deg); transition: transform 5200ms cubic-bezier(0.16, 1, 0.3, 1)"
        >
          <!--
            Posters: plain HTML <img> in an overlay (same as home media cards). SVG
            <foreignObject> / <image> is unreliable in WebKit with transforms + clip.
            Stack: base SVG (slices) → HTML posters → top SVG (labels + hub).
          -->
          <svg
            viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
            class="pointer-events-none block h-full w-full select-none"
            aria-hidden="true"
          >
            <defs>
              {#each entries as entry, index (`wheel-sector-clipdef-${entry.id}-${index}`)}
                <clipPath id={`wheel-sector-clip-${entry.id}-${index}`} clipPathUnits="objectBoundingBox">
                  <path d={slicePathOBB(index, entries.length)} />
                </clipPath>
              {/each}
            </defs>
            {#each entries as entry, index (`slice-base-${entry.id}-${index}`)}
              <path d={slicePath(index, entries.length)} class="fill-secondary" />
              <path
                d={slicePath(index, entries.length)}
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="1.4"
              />
            {/each}
          </svg>

          <div class="pointer-events-none absolute inset-0 z-1 select-none" aria-hidden="true">
            {#each entries as entry, index (`poster-${entry.id}-${index}`)}
              {#if entry.posterUrl}
                {@const sectorClip = `url(#wheel-sector-clip-${entry.id}-${index})`}
                {@const rot = sectorRotationDeg(index, entries.length)}
                {@const radialH = (RADIUS / WHEEL_SIZE) * 100}
                {@const radialTop = (0.5 - RADIUS / WHEEL_SIZE) * 100}
                <div class="absolute inset-0" style:clip-path={sectorClip}>
                  <div
                    class="absolute h-full w-full"
                    style:transform-origin="50% 50%"
                    style:transform="rotate({rot}deg)"
                  >
                    <div class="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={entry.posterUrl}
                        alt=""
                        class="h-full w-full min-w-full scale-110 object-cover object-center blur-md brightness-50"
                        decoding="async"
                        draggable="false"
                        loading="eager"
                        aria-hidden="true"
                      />
                      <div class="pointer-events-none absolute inset-0 z-10 bg-black/35" aria-hidden="true"></div>
                    </div>
                    <div
                      class="absolute z-20 flex w-[7.5%] max-w-[2.8rem] min-w-8 -translate-x-1/2 items-stretch justify-center"
                      style:left="50%"
                      style:top="{radialTop}%"
                      style:height="{radialH}%"
                    >
                      <img
                        src={entry.posterUrl}
                        alt={entry.title}
                        class="h-full min-h-0 w-auto max-w-none object-contain object-bottom"
                        decoding="async"
                        draggable="false"
                        loading="eager"
                      />
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>

          <svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} class="absolute inset-0 z-2 h-full w-full">
            <defs>
              {#if labelsOverflowArc}
                {#each entries as entry, index (`def-label-radial-${entry.id}-${index}`)}
                  <path
                    id={`label-radial-${entry.id}-${index}`}
                    d={radialLabelPath(index, entries.length)}
                    fill="none"
                  />
                {/each}
              {:else}
                {#each entries as entry, index (`def-label-arc-${entry.id}-${index}`)}
                  <path id={`label-arc-${entry.id}-${index}`} d={textArcPath(index, entries.length)} fill="none" />
                {/each}
              {/if}
            </defs>
            {#if showLabels}
              {#each entries as entry, index (`label-${entry.id}-${index}`)}
                <text
                  fill="white"
                  font-size={labelFontSize}
                  font-weight="800"
                  style="paint-order: stroke; stroke: rgba(0,0,0,0.78); stroke-width: 4.5px; stroke-linejoin: round"
                >
                  {#if labelsOverflowArc}
                    <textPath href={`#label-radial-${entry.id}-${index}`} startOffset="0%" text-anchor="start">
                      {entry.title}
                    </textPath>
                  {:else}
                    <textPath href={`#label-arc-${entry.id}-${index}`} startOffset="50%" text-anchor="middle">
                      {entry.title}
                    </textPath>
                  {/if}
                </text>
              {/each}
            {/if}
            <circle
              cx={CENTER}
              cy={CENTER}
              r="37"
              fill="rgba(9, 9, 11, 0.55)"
              stroke="rgba(255,255,255,0.3)"
              stroke-width="2"
            />
            <circle cx={CENTER} cy={CENTER} r="20" fill="hsl(var(--background))" />
            <circle cx={CENTER} cy={CENTER} r="8" fill="hsl(var(--primary))" />
          </svg>
        </div>
      </div>
    </div>
  {/if}

  {#if winner}
    <div class="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <div class="flex min-w-0 items-center gap-3">
        {#if winner.posterUrl}
          <img
            src={winner.posterUrl}
            alt={winner.title}
            class="h-14 w-10 shrink-0 rounded-md object-cover"
            loading="lazy"
          />
        {:else}
          <div class="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            ?
          </div>
        {/if}
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">{L.wheel_winner_label()}</p>
          <p class="truncate text-sm font-semibold">{winner.title}</p>
        </div>
      </div>
      <a
        href={`/media/${winner.mediaId}`}
        class="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        {L.wheel_open_media()}
      </a>
    </div>
  {/if}
</section>
