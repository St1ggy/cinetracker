<script lang="ts">
  import { L } from '$lib'
  import * as Select from '$lib/components/ui/select/index.js'
  import { type Locale, getLocale, locales, setLocale } from '$lib/paraglide/runtime'

  const handleChange = (newLocale: string) => setLocale(newLocale as Locale)
</script>

<Select.Root type="single" name="favoriteFruit" value={getLocale()} onValueChange={handleChange}>
  <Select.Trigger class="w-[180px]">
    {L[`locale_${getLocale()}`]()}
  </Select.Trigger>
  <Select.Content>
    {#each locales as locale (locale)}
      <Select.Item value={locale} label={L[`locale_${locale}`]()}>
        {L[`locale_${locale}`]()}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
