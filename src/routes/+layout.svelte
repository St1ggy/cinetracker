<script lang="ts">
  import Layout from '$pages/layout'

  const { children } = $props()
</script>

<Layout>
  {@render children()}
</Layout>
