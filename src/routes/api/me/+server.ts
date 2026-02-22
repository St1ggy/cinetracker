import { json } from '@sveltejs/kit'

export const GET = async ({ locals }) => {
  const session = await locals.auth()

  return json({
    user: session?.user ?? null,
  })
}
