import CryptoJS from 'crypto-js'

const STORAGE_KEY = 'gzh_api_keys'
const SALT_KEY = 'gzh_salt'

function getOrCreateSalt(): string {
  let salt = localStorage.getItem(SALT_KEY)
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(16).toString()
    localStorage.setItem(SALT_KEY, salt)
  }
  return salt
}

function deriveKey(): string {
  const salt = getOrCreateSalt()
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
  ].join('|')
  return CryptoJS.PBKDF2(fingerprint, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  }).toString()
}

interface StoredKeys {
  [providerId: string]: {
    modelId: string
    encryptedKey: string
  }
}

export function saveApiKey(providerId: string, modelId: string, apiKey: string): void {
  const keys = getAllEncrypted()
  keys[providerId] = {
    modelId,
    encryptedKey: CryptoJS.AES.encrypt(apiKey, deriveKey()).toString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function getApiKey(providerId: string): { modelId: string; apiKey: string } | null {
  const keys = getAllEncrypted()
  const entry = keys[providerId]
  if (!entry) return null
  try {
    const decrypted = CryptoJS.AES.decrypt(entry.encryptedKey, deriveKey()).toString(
      CryptoJS.enc.Utf8,
    )
    return { modelId: entry.modelId, apiKey: decrypted }
  } catch {
    return null
  }
}

export function deleteApiKey(providerId: string): void {
  const keys = getAllEncrypted()
  delete keys[providerId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

function getAllEncrypted(): StoredKeys {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getSelectedProvider(): string {
  return localStorage.getItem('gzh_selected_provider') || 'deepseek'
}

export function setSelectedProvider(providerId: string): void {
  localStorage.setItem('gzh_selected_provider', providerId)
}
