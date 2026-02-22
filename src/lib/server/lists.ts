import { error } from '@sveltejs/kit'

import { listsRepository } from './repositories'

import type { ListVisibility } from '@prisma/client'

type ListAccessEntity = {
  visibility: ListVisibility
  ownerUserId: string
  shareToken: string | null
}

export const requireSessionUser = async (locals: App.Locals) => {
  const session = await locals.auth()

  if (!session?.user?.id) {
    throw error(401, 'Authentication required')
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  }
}

export const canReadList = (list: ListAccessEntity, userId?: string, shareToken?: string | null) => {
  if (list.visibility === 'PUBLIC') {
    return true
  }

  if (list.visibility === 'PRIVATE') {
    return list.ownerUserId === userId
  }

  return list.ownerUserId === userId || (shareToken != null && shareToken === list.shareToken)
}

export const requireReadableList = async (
  listId: string,
  options?: {
    userId?: string
    shareToken?: string | null
  },
) => {
  const list = await listsRepository.findById(listId)

  if (!list) {
    throw error(404, 'List not found')
  }

  if (!canReadList(list, options?.userId, options?.shareToken)) {
    throw error(403, 'Not enough permissions to read this list')
  }

  return list
}

export const requireOwnerList = async (listId: string, ownerUserId: string) => {
  const list = await listsRepository.findById(listId)

  if (!list) {
    throw error(404, 'List not found')
  }

  if (list.ownerUserId !== ownerUserId) {
    throw error(403, 'Only owner can modify this list')
  }

  return list
}

export const withMainList = async (ownerUserId: string) => listsRepository.findOrCreateMain(ownerUserId)

export const parseVisibility = (value: unknown): ListVisibility | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  if (value !== 'PUBLIC' && value !== 'UNLISTED' && value !== 'PRIVATE') {
    return undefined
  }

  return value
}

export const generateShareToken = () => crypto.randomUUID().replaceAll('-', '')
