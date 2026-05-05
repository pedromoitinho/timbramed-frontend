import { useState } from "react"
import { useAuthStore } from "../store/useAuthStore.js"

export function LoginPage({ onSuccess, onNavigate }) {
  const [form, setForm] = useState({ email: "", senha: "" })
  const login = useAuthStore(state => state.login)
  const loading = useAuthStore(state => state.loading)
  const error = useAuthStore(state => state.error)

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await login(form)

    if (result) {
      onSuccess?.(result)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-sm lg:grid-cols-[1fr_0.9fr]">
        <div className="bg-ink p-7 text-paper sm:p-10">
          <p className="text-sm font-extrabold uppercase tracking-[0.4em] text-clay">TimbraMed</p>
          <h1 className="mt-6 font-display text-5xl leading-none sm:text-6xl">Relatórios no timbrado certo.</h1>
          <p className="mt-6 max-w-md text-base font-semibold leading-7 text-paper/70">Entre para atender, revisar a fila, imprimir em lote e ajustar o timbrado A5.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-7 sm:p-10">
          <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-moss">Acesso</p>
          <h2 className="mt-3 font-display text-4xl text-ink">Login</h2>
          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-ink">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={event => updateField("email", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
                placeholder="medico@clinica.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Senha</span>
              <input
                type="password"
                value={form.senha}
                onChange={event => updateField("senha", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
            <button disabled={loading} className="w-full rounded-2xl bg-ink px-5 py-4 font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Entrando" : "Entrar"}
            </button>
            <button type="button" onClick={() => onNavigate?.("/registro")} className="w-full rounded-2xl border border-ink/15 px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-paper">
              Criar conta médica
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
