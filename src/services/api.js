const configuredApiUrl = import.meta.env.VITE_API_URL || "https://timbramed-backend-509f27803168.herokuapp.com"
const tokenStorageKey = "timbramed:token"

function isBrowserLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function resolveApiUrl() {
  if (typeof window === "undefined") {
    return configuredApiUrl
  }

  try {
    const apiUrl = new URL(configuredApiUrl)
    const pageHostname = window.location.hostname

    if (isBrowserLocalhost(apiUrl.hostname) && !isBrowserLocalhost(pageHostname)) {
      apiUrl.hostname = pageHostname
    }

    return apiUrl.origin
  } catch {
    return configuredApiUrl
  }
}

const API_URL = resolveApiUrl()

export function getStoredToken() {
  return window.localStorage.getItem(tokenStorageKey)
}

export function setStoredToken(token) {
  window.localStorage.setItem(tokenStorageKey, token)
}

export function clearStoredToken() {
  window.localStorage.removeItem(tokenStorageKey)
}

async function readError(response) {
  try {
    const data = await response.json()
    return data.message || "Erro de comunicação com a API"
  } catch {
    return "Erro de comunicação com a API"
  }
}

function authHeaders() {
  const token = getStoredToken()

  if (!token) {
    return {}
  }

  return { Authorization: `Bearer ${token}` }
}

export async function apiRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {})
      }
    })
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está rodando e se o endereço está correto.")
  }

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function loginRequest(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function registerRequest(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function getCurrentUser() {
  return apiRequest("/auth/me")
}

export function getProfile() {
  return apiRequest("/profile")
}

export function updateProfile(payload) {
  return apiRequest("/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function confirmEmailChange(token) {
  return apiRequest("/profile/email/confirm", {
    method: "POST",
    body: JSON.stringify({ token })
  })
}

export function getBillingStatus() {
  return apiRequest("/billing/status")
}

export function startSubscription() {
  return apiRequest("/billing/subscribe", { method: "POST" })
}

export function subscribeWithCard(payload) {
  return apiRequest("/billing/subscribe-card", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function cancelSubscription() {
  return apiRequest("/billing/cancel", { method: "POST" })
}

export function listHospitals() {
  return apiRequest("/hospitals")
}

export function getHospital(hospitalId) {
  return apiRequest(`/hospitals/${hospitalId}`)
}

export function updateCoordinates(hospitalId, payload) {
  return apiRequest(`/hospitals/${hospitalId}/coordinates`, {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function updateStamp(hospitalId, payload) {
  return apiRequest(`/hospitals/${hospitalId}/stamp`, {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function updateReportImage(hospitalId, payload) {
  return apiRequest(`/hospitals/${hospitalId}/report`, {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function updateSignature(hospitalId, payload) {
  return apiRequest(`/hospitals/${hospitalId}/signature`, {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function listCatalog(hospitalId) {
  return apiRequest(`/hospitals/${hospitalId}/catalog`)
}

export function createCid(hospitalId, payload) {
  return apiRequest(`/hospitals/${hospitalId}/cids`, {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function updateCid(id, payload) {
  return apiRequest(`/cids/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  })
}

export function deleteCid(id) {
  return apiRequest(`/cids/${id}`, { method: "DELETE" })
}

export function listReports(hospitalId) {
  return apiRequest(`/reports?hospitalId=${hospitalId}`)
}

export function createReport(payload) {
  return apiRequest("/reports", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export async function generatePdf(payload) {
  let response

  try {
    response = await fetch(`${API_URL}/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está rodando e se o endereço está correto.")
  }

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.blob()
}

export function openPdf(blob) {
  const url = window.URL.createObjectURL(blob)
  const tab = window.open(url, "_blank", "noopener,noreferrer")

  if (!tab) {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `timbramed-${Date.now()}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}
