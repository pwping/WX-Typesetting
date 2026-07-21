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

// 通用密钥加密存储（用于图床、第三方服务等任意 Key）
const SECRET_KEY = 'gzh_secrets'

interface StoredSecrets {
  [name: string]: {
    encryptedValue: string
  }
}

export function saveSecret(name: string, value: string): void {
  const all = getAllSecrets()
  all[name] = {
    encryptedValue: CryptoJS.AES.encrypt(value, deriveKey()).toString(),
  }
  localStorage.setItem(SECRET_KEY, JSON.stringify(all))
}

export function getSecret(name: string): string | null {
  const all = getAllSecrets()
  const entry = all[name]
  if (!entry) return null
  try {
    return CryptoJS.AES.decrypt(entry.encryptedValue, deriveKey()).toString(
      CryptoJS.enc.Utf8,
    )
  } catch {
    return null
  }
}

export function deleteSecret(name: string): void {
  const all = getAllSecrets()
  delete all[name]
  localStorage.setItem(SECRET_KEY, JSON.stringify(all))
}

function getAllSecrets(): StoredSecrets {
  try {
    return JSON.parse(localStorage.getItem(SECRET_KEY) || '{}')
  } catch {
    return {}
  }
}
