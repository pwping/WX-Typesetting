import CryptoJS from 'crypto-js'
import type { ApiKeyConfig, ApiProtocol } from '../../types'
import { LEGACY_PROVIDER_BASE_URLS } from '../llm/providers'

const LEGACY_STORAGE_KEY = 'gzh_api_keys'
const UNIVERSAL_STORAGE_KEY = 'gzh_universal_api_config'
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

interface StoredUniversalConfig {
  protocol: ApiProtocol
  baseUrl: string
  modelId: string
  encryptedKey: string
}

interface LegacyStoredKeys {
  [providerId: string]: {
    modelId: string
    encryptedKey: string
  }
}

export function saveUniversalApiConfig(config: ApiKeyConfig): void {
  const payload: StoredUniversalConfig = {
    protocol: config.protocol,
    baseUrl: config.baseUrl.trim(),
    modelId: config.modelId.trim(),
    encryptedKey: CryptoJS.AES.encrypt(config.apiKey.trim(), deriveKey()).toString(),
  }
  localStorage.setItem(UNIVERSAL_STORAGE_KEY, JSON.stringify(payload))
}

export function getUniversalApiConfig(): ApiKeyConfig | null {
  const raw = localStorage.getItem(UNIVERSAL_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredUniversalConfig>
      if (!parsed.encryptedKey) return null
      const decrypted = CryptoJS.AES.decrypt(parsed.encryptedKey, deriveKey()).toString(
        CryptoJS.enc.Utf8,
      )
      if (!decrypted) return null
      const protocol: ApiProtocol = parsed.protocol === 'anthropic' ? 'anthropic' : 'openai'
      return {
        protocol,
        baseUrl: parsed.baseUrl || '',
        modelId: parsed.modelId || '',
        apiKey: decrypted,
      }
    } catch {
      return null
    }
  }

  // 兼容迁移旧版按供应商存储的 Key
  return migrateLegacyApiConfig()
}

export function deleteUniversalApiConfig(): void {
  localStorage.removeItem(UNIVERSAL_STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  localStorage.removeItem('gzh_selected_provider')
}

function migrateLegacyApiConfig(): ApiKeyConfig | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const legacy = JSON.parse(raw) as LegacyStoredKeys
    const selected = localStorage.getItem('gzh_selected_provider') || 'deepseek'
    const candidateId = legacy[selected] ? selected : Object.keys(legacy)[0]
    if (!candidateId || !legacy[candidateId]) return null

    const entry = legacy[candidateId]
    const decrypted = CryptoJS.AES.decrypt(entry.encryptedKey, deriveKey()).toString(
      CryptoJS.enc.Utf8,
    )
    if (!decrypted) return null

    const migrated: ApiKeyConfig = {
      protocol: 'openai',
      baseUrl: LEGACY_PROVIDER_BASE_URLS[candidateId] || 'https://api.deepseek.com/v1',
      modelId: entry.modelId || 'deepseek-chat',
      apiKey: decrypted,
    }
    saveUniversalApiConfig(migrated)
    return migrated
  } catch {
    return null
  }
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
