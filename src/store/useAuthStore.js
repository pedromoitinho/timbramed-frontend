import { create } from "zustand"
import { clearStoredToken, getCurrentUser, getStoredToken, loginRequest, registerRequest, setStoredToken } from "../services/api.js"

const initialToken = getStoredToken()

export const useAuthStore = create(set => ({
  token: initialToken,
  user: null,
  loading: Boolean(initialToken),
  error: "",
  boot: async () => {
    const token = getStoredToken()

    if (!token) {
      set({ token: null, user: null, loading: false })
      return
    }

    try {
      set({ loading: true, error: "" })
      const user = await getCurrentUser()
      set({ token, user, loading: false })
    } catch {
      clearStoredToken()
      set({ token: null, user: null, loading: false })
    }
  },
  login: async payload => {
    try {
      set({ loading: true, error: "" })
      const data = await loginRequest(payload)
      setStoredToken(data.token)
      set({ token: data.token, user: data.user, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      return null
    }
  },
  register: async payload => {
    try {
      set({ loading: true, error: "" })
      const data = await registerRequest(payload)
      setStoredToken(data.token)
      set({ token: data.token, user: data.user, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      return null
    }
  },
  setUser: user => set({ user }),
  logout: () => {
    clearStoredToken()
    set({ token: null, user: null, error: "" })
  }
}))
