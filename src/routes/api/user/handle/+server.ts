import { json } from '@sveltejs/kit'
import { z } from 'zod'

import { requireSessionUser } from '$lib/server/lists'
import { prisma } from '$lib/server/prisma'

const HANDLE_REGEX = /^\w{3,30}$/
const COOLDOWN_DAYS = 30

const handleSchema = z.object({
  handle: z.string().regex(HANDLE_REGEX),
})

const getNextChangeAt = (handleChangedAt: Date): Date => {
  const next = new Date(handleChangedAt)

  next.setDate(next.getDate() + COOLDOWN_DAYS)

  return next
}

export const GET = async ({ locals }) => {
  const user = await requireSessionUser(locals)

  const databaseUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { handle: true, handleChangedAt: true },
  })

  const nextChangeAt = databaseUser?.handleChangedAt ? getNextChangeAt(databaseUser.handleChangedAt) : null

  return json({
    handle: databaseUser?.handle ?? null,
    handleChangedAt: databaseUser?.handleChangedAt ?? null,
    nextChangeAt,
  })
}

export const PATCH = async ({ locals, request }) => {
  const user = await requireSessionUser(locals)
  const { handle } = handleSchema.parse(await request.json())

  const databaseUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { handleChangedAt: true },
  })

  if (databaseUser?.handleChangedAt) {
    const nextChangeAt = getNextChangeAt(databaseUser.handleChangedAt)

    if (new Date() < nextChangeAt) {
      return json({ error: 'COOLDOWN_ACTIVE', nextChangeAt }, { status: 400 })
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { handle, handleChangedAt: new Date() },
      select: { handle: true, handleChangedAt: true },
    })

    const nextChangeAt = getNextChangeAt(updated.handleChangedAt!)

    return json({ handle: updated.handle, handleChangedAt: updated.handleChangedAt, nextChangeAt })
  } catch (error: unknown) {
    const isUniqueViolation =
      typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002'

    if (isUniqueViolation) {
      return json({ error: 'HANDLE_TAKEN' }, { status: 400 })
    }

    throw error
  }
}
