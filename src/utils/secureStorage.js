const DEVICE_KEY_STORAGE = 'eassyacc_device_key'
const REMEMBERED_LOGIN_STORAGE = 'eassyacc_remembered_login'

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0))
}

async function getCryptoKey() {
  if (!window.crypto?.subtle) return null

  let storedKey = localStorage.getItem(DEVICE_KEY_STORAGE)
  if (!storedKey) {
    const rawKey = window.crypto.getRandomValues(new Uint8Array(32))
    storedKey = bytesToBase64(rawKey)
    localStorage.setItem(DEVICE_KEY_STORAGE, storedKey)
  }

  return window.crypto.subtle.importKey(
    'raw',
    base64ToBytes(storedKey),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  )
}

export async function saveRememberedLogin({ email, password }) {
  const key = await getCryptoKey()

  if (!key) {
    localStorage.setItem(REMEMBERED_LOGIN_STORAGE, JSON.stringify({ email, password, fallback: true }))
    return
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify({ email, password }))
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  localStorage.setItem(REMEMBERED_LOGIN_STORAGE, JSON.stringify({
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encrypted)),
  }))
}

export async function loadRememberedLogin() {
  const stored = localStorage.getItem(REMEMBERED_LOGIN_STORAGE)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored)
    if (parsed.fallback) {
      return { email: parsed.email || '', password: parsed.password || '' }
    }

    const key = await getCryptoKey()
    if (!key) return null

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parsed.iv) },
      key,
      base64ToBytes(parsed.payload)
    )

    const value = JSON.parse(new TextDecoder().decode(decrypted))
    return { email: value.email || '', password: value.password || '' }
  } catch (error) {
    console.error('Failed to load remembered login', error)
    clearRememberedLogin()
    return null
  }
}

export function clearRememberedLogin() {
  localStorage.removeItem(REMEMBERED_LOGIN_STORAGE)
}
