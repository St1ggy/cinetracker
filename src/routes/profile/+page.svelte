<script lang="ts">
  import ProfilePage from '$pages/profile'

  import type { PageData } from './$types'

  const { data }: { data: PageData } = $props()
</script>

<ProfilePage {data} />
