import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

const getEncryptionKey = (): Buffer => {
  const hex = process.env.API_KEYS_ENCRYPTION_KEY

  if (!hex || hex.length !== 64) {
    throw new Error('API_KEYS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }

  return Buffer.from(hex, 'hex')
}

export type EncryptedPayload = {
  encrypted: string
  iv: string
  authTag: string
}

export const encrypt = (plaintext: string): EncryptedPayload => {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

export const decrypt = (encrypted: string, iv: string, authTag: string): string => {
  const key = getEncryptionKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))

  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()])

  return decrypted.toString('utf8')
}
