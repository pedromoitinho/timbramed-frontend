import { useState } from "react"
import { useAuthStore } from "../store/useAuthStore.js"

const initialForm = {
  cpf: "",
  nome: "",
  endereco: "",
  email: "",
  senha: "",
  crm: ""
}

export function RegisterPage({ onSuccess, onNavigate }) {
  const [form, setForm] = useState(initialForm)
  const register = useAuthStore(state => state.register)
  const loading = useAuthStore(state => state.loading)
  const error = useAuthStore(state => state.error)

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const result = await register(form)

    if (result) {
      onSuccess?.(result)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-sm lg:grid-cols-[0.8fr_1fr]">
        <div className="bg-ink p-7 text-paper sm:p-10">
          <p className="text-sm font-extrabold uppercase tracking-[0.4em] text-clay">Registro médico</p>
          <h1 className="mt-6 font-display text-5xl leading-none sm:text-6xl">Comece com 7 dias grátis.</h1>
          <p className="mt-6 max-w-md text-base font-semibold leading-7 text-paper/70">CPF, CRM e e-mail ficam vinculados a uma única conta para proteger o teste gratuito e a assinatura.</p>
          <div className="mt-8 space-y-3 text-sm font-extrabold text-paper/80">
            <div className="rounded-2xl border border-paper/15 px-4 py-3">Pagamento validado no Mercado Pago</div>
            <div className="rounded-2xl border border-paper/15 px-4 py-3">Ambiente criado com timbrado A5</div>
            <div className="rounded-2xl border border-paper/15 px-4 py-3">Cadastro bloqueado por CPF e CRM</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-7 sm:p-10">
          <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-moss">Nova conta</p>
          <h2 className="mt-3 font-display text-4xl text-ink">Dados do médico</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-ink">CPF</span>
              <input value={form.cpf} onChange={event => updateField("cpf", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" placeholder="000.000.000-00" autoComplete="off" required />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">CRM</span>
              <input value={form.crm} onChange={event => updateField("crm", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 uppercase outline-none ring-pen/20 transition focus:ring-4" placeholder="123456/UF" autoComplete="off" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-ink">Nome</span>
              <input value={form.nome} onChange={event => updateField("nome", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" placeholder="Nome completo" autoComplete="name" required />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-ink">Endereço</span>
              <input value={form.endereco} onChange={event => updateField("endereco", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" placeholder="Rua, número, bairro, cidade" autoComplete="street-address" required />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">E-mail</span>
              <input type="email" value={form.email} onChange={event => updateField("email", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" placeholder="medico@clinica.com" autoComplete="email" required />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink">Senha</span>
              <input type="password" value={form.senha} onChange={event => updateField("senha", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
            </label>
          </div>
          {error && <div className="mt-5 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button disabled={loading} className="rounded-2xl bg-ink px-6 py-4 text-sm font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Criando conta" : "Criar conta"}
            </button>
            <button type="button" onClick={() => onNavigate?.("/login")} className="rounded-2xl border border-ink/15 px-6 py-4 text-sm font-extrabold text-ink transition hover:bg-paper">
              Já tenho login
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
