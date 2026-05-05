import { useCallback, useEffect, useState } from "react"
import { MercadoPagoCardBrick } from "./MercadoPagoCardBrick.jsx"
import { cancelSubscription, getBillingStatus, getProfile, subscribeWithCard, updateProfile } from "../services/api.js"
import { useAuthStore } from "../store/useAuthStore.js"
import { hasProductAccess, subscriptionLabel } from "../utils/subscription.js"

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function formatDateTime(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString("pt-BR")
}

export function ProfileTab() {
  const storeUser = useAuthStore(state => state.user)
  const setUser = useAuthStore(state => state.setUser)
  const [form, setForm] = useState({
    nome: storeUser?.nome || "",
    endereco: storeUser?.endereco || "",
    email: storeUser?.email || ""
  })
  const [cpf, setCpf] = useState(storeUser?.cpf || "")
  const [crm, setCrm] = useState(storeUser?.crm || "")
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function loadProfile() {
    try {
      setLoading(true)
      setError("")
      const [profile, billingData] = await Promise.all([getProfile(), getBillingStatus()])
      setForm({
        nome: profile.nome || "",
        endereco: profile.endereco || "",
        email: profile.pendingEmail || profile.email || ""
      })
      setCpf(profile.cpf || "")
      setCrm(profile.crm || "")
      setBilling(billingData)
      setUser(profile)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  async function handleSave(event) {
    event.preventDefault()
    try {
      setSaving(true)
      setError("")
      setNotice("")
      const data = await updateProfile(form)
      setUser(data.user)

      if (data.emailChangePending) {
        setNotice("Enviamos um link de confirmação para o e-mail atual. A troca só acontece depois da confirmação.")
      } else {
        setNotice("Perfil atualizado.")
      }

      await loadProfile()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCardSubmit = useCallback(async cardData => {
    try {
      setBillingLoading(true)
      setError("")
      setNotice("")
      const data = await subscribeWithCard(cardData)
      setUser(data.user)
      setBilling(current => ({
        ...(current || {}),
        user: data.user,
        hasAccess: data.hasAccess,
        trialDaysLeft: data.trialDaysLeft
      }))
      setNotice("Assinatura ativada com sucesso.")
    } catch (apiError) {
      setError(apiError.message)
      throw apiError
    } finally {
      setBillingLoading(false)
    }
  }, [setUser])

  async function handleCancelSubscription() {
    if (!window.confirm("Cancelar a assinatura deste médico? O acesso ao produto será interrompido quando o cancelamento for aplicado.")) {
      return
    }

    try {
      setBillingLoading(true)
      setError("")
      setNotice("")
      const data = await cancelSubscription()
      setUser(data.user)
      setBilling(current => ({
        ...(current || {}),
        user: data.user,
        hasAccess: data.hasAccess
      }))
      setNotice("Assinatura cancelada.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBillingLoading(false)
    }
  }

  const currentUser = billing?.user || storeUser
  const billingConfig = billing?.billing || { monthlyAmount: 79.9, trialDays: 7, mercadoPagoPublicKey: "" }
  const accessActive = hasProductAccess(currentUser)
  const subscriptionStartedAt = formatDateTime(currentUser?.subscriptionStartedAt)
  const subscriptionCanceledAt = formatDateTime(currentUser?.subscriptionCanceledAt)

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={handleSave} className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-clay">Perfil</p>
            <h2 className="mt-2 font-display text-4xl text-ink">Dados da conta</h2>
          </div>
          {loading && <span className="rounded-full bg-paper px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-ink">Carregando</span>}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">Nome</span>
            <input value={form.nome} onChange={event => updateField("nome", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" required />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">CPF</span>
            <input value={cpf} disabled className="mt-2 w-full rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3 font-bold text-ink/55 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">CRM</span>
            <input value={crm} disabled className="mt-2 w-full rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3 font-bold uppercase text-ink/55 outline-none" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">Endereço</span>
            <input value={form.endereco} onChange={event => updateField("endereco", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" required />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink">E-mail</span>
            <input type="email" value={form.email} onChange={event => updateField("email", event.target.value)} className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4" required />
            {currentUser?.pendingEmail && <span className="mt-2 block text-xs font-bold text-moss">Aguardando confirmação para {currentUser.pendingEmail}</span>}
          </label>
        </div>

        {error && <div className="mt-5 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl bg-moss/10 px-4 py-3 text-sm font-bold text-moss">{notice}</div>}
        <button disabled={saving} className="mt-6 rounded-2xl bg-ink px-6 py-4 text-sm font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Salvando" : "Salvar perfil"}
        </button>
      </form>

      <aside className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-moss">Pagamento</p>
        <h2 className="mt-2 font-display text-4xl text-ink">{subscriptionLabel(currentUser?.subscriptionStatus)}</h2>
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-paper/60 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink/50">Plano mensal</p>
            <p className="mt-1 text-lg font-extrabold text-ink">{formatCurrency(billingConfig.monthlyAmount)} por mês</p>
          </div>
          <div className="rounded-2xl bg-paper/60 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink/50">Teste grátis</p>
            <p className="mt-1 text-lg font-extrabold text-ink">{billingConfig.trialDays} dias com cartão validado</p>
          </div>
          {billing?.trialDaysLeft !== null && billing?.trialDaysLeft !== undefined && (
            <div className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-extrabold text-moss">
              {billing.trialDaysLeft} dias restantes de teste
            </div>
          )}
          {currentUser?.mercadoPagoCardLastFour && (
            <div className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-extrabold text-moss">
              Cartão final {currentUser.mercadoPagoCardLastFour}
            </div>
          )}
          {currentUser?.mercadoPagoPaymentMethodId && (
            <div className="rounded-2xl bg-paper/60 px-4 py-3 text-sm font-bold text-ink/70">
              Método salvo: {currentUser.mercadoPagoPaymentMethodId}
            </div>
          )}
          {subscriptionStartedAt && (
            <div className="rounded-2xl bg-paper/60 px-4 py-3 text-sm font-bold text-ink/70">
              Início da assinatura: {subscriptionStartedAt}
            </div>
          )}
          {subscriptionCanceledAt && (
            <div className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">
              Cancelada em: {subscriptionCanceledAt}
            </div>
          )}
        </div>

        <div className="mt-6">
          {accessActive ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-bold text-moss">Assinatura ativa para acessar o produto.</div>
              <button type="button" disabled={billingLoading} onClick={handleCancelSubscription} className="rounded-2xl border border-clay/30 px-5 py-3 text-sm font-extrabold text-clay transition hover:bg-clay/10 disabled:cursor-not-allowed disabled:opacity-50">
                Cancelar assinatura
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-bold leading-6 text-ink/60">Assine ou renove pelo cartão. Os dados sensíveis ficam no componente seguro do Mercado Pago; o TimbraMed recebe apenas o token do cartão.</p>
              {billingLoading && <div className="rounded-2xl bg-paper px-4 py-3 text-sm font-extrabold uppercase tracking-[0.18em] text-ink">Processando</div>}
              <MercadoPagoCardBrick publicKey={billingConfig.mercadoPagoPublicKey} amount={billingConfig.monthlyAmount} email={currentUser?.email} onSubmit={handleCardSubmit} />
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}
