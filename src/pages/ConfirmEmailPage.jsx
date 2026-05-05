import { useEffect, useMemo, useState } from "react"
import { confirmEmailChange } from "../services/api.js"
import { useAuthStore } from "../store/useAuthStore.js"

export function ConfirmEmailPage({ onNavigate }) {
  const setUser = useAuthStore(state => state.setUser)
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("Confirmando troca de e-mail.")
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), [])

  useEffect(() => {
    async function confirm() {
      if (!token) {
        setStatus("error")
        setMessage("Link de confirmação sem token.")
        return
      }

      try {
        const data = await confirmEmailChange(token)
        setUser(data.user)
        setStatus("success")
        setMessage("E-mail alterado com sucesso.")
      } catch (error) {
        setStatus("error")
        setMessage(error.message)
      }
    }

    confirm()
  }, [setUser, token])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-clay">Confirmação</p>
        <h1 className="mt-3 font-display text-4xl text-ink">{status === "success" ? "E-mail confirmado" : "Troca de e-mail"}</h1>
        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${status === "error" ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => onNavigate("/perfil")} className="rounded-2xl bg-ink px-5 py-3 text-sm font-extrabold text-paper">
            Ir para perfil
          </button>
          <button type="button" onClick={() => onNavigate("/")} className="rounded-2xl border border-ink/15 px-5 py-3 text-sm font-extrabold text-ink">
            Home
          </button>
        </div>
      </section>
    </main>
  )
}
