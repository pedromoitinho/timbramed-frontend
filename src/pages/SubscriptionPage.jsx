import { useCallback, useEffect, useState } from "react"
import { MercadoPagoCardBrick } from "../components/MercadoPagoCardBrick.jsx"
import { getBillingStatus, subscribeWithCard } from "../services/api.js"
import { useAuthStore } from "../store/useAuthStore.js"
import { hasProductAccess, subscriptionLabel } from "../utils/subscription.js"

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

export function SubscriptionPage({ onNavigate }) {
  const user = useAuthStore(state => state.user)
  const setUser = useAuthStore(state => state.setUser)
  const logout = useAuthStore(state => state.logout)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function loadStatus() {
    try {
      setLoading(true)
      setError("")
      const data = await getBillingStatus()
      setStatus(data)
      setUser(data.user)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleCardSubmit = useCallback(async cardData => {
    try {
      setActionLoading(true)
      setError("")
      setNotice("")
      const data = await subscribeWithCard(cardData)
      setUser(data.user)
      setStatus(current => ({
        ...(current || {}),
        user: data.user,
        hasAccess: data.hasAccess,
        trialDaysLeft: data.trialDaysLeft
      }))
      setNotice("Assinatura ativada. Acesso liberado.")
    } catch (apiError) {
      setError(apiError.message)
      throw apiError
    } finally {
      setActionLoading(false)
    }
  }, [setUser])

  function handleLogout() {
    logout()
    onNavigate?.("/")
  }

  const billing = status?.billing || { monthlyAmount: 79.9, trialDays: 7, mercadoPagoPublicKey: "" }
  const currentUser = status?.user || user
  const accessActive = status?.hasAccess || hasProductAccess(currentUser)

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-6xl gap-5 rounded-[2rem] bg-white p-5 shadow-sm lg:grid-cols-[0.78fr_1fr] lg:p-8">
        <div className="rounded-[1.5rem] bg-ink p-6 text-paper">
          <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-clay">Assinatura</p>
          <h1 className="mt-5 font-display text-5xl leading-none sm:text-6xl">Acesso ao TimbraMed</h1>
          <p className="mt-5 text-base font-semibold leading-7 text-paper/70">O teste grátis exige cartão validado e fica vinculado ao CPF e CRM do médico.</p>
          <div className="mt-6 grid gap-3 text-sm font-extrabold">
            <div className="rounded-2xl border border-paper/15 px-4 py-3">{formatCurrency(billing.monthlyAmount)} por mês</div>
            <div className="rounded-2xl border border-paper/15 px-4 py-3">{billing.trialDays} dias grátis</div>
            <div className="rounded-2xl border border-paper/15 px-4 py-3">Cartão tokenizado pelo Mercado Pago</div>
          </div>
        </div>

        <div className="p-1 sm:p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-moss">Status</p>
              <h2 className="mt-2 font-display text-4xl text-ink">{subscriptionLabel(currentUser?.subscriptionStatus)}</h2>
            </div>
            <button type="button" onClick={handleLogout} className="rounded-2xl border border-clay/30 px-4 py-2 text-sm font-extrabold text-clay">
              Sair
            </button>
          </div>

          <div className="mt-7 space-y-4">
            <div className="rounded-[1.5rem] border border-ink/10 bg-paper/50 p-5">
              <p className="text-sm font-bold text-ink/60">Médico</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{currentUser?.nome || "Conta médica"}</p>
              <p className="mt-1 text-sm font-bold text-ink/55">CRM {currentUser?.crm || "pendente"} | CPF {currentUser?.cpf || "pendente"}</p>
            </div>

            {loading && <div className="rounded-2xl bg-paper px-4 py-3 text-sm font-extrabold uppercase tracking-[0.2em] text-ink">Carregando</div>}
            {error && <div className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
            {notice && <div className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-bold text-moss">{notice}</div>}

            {accessActive ? (
              <button type="button" onClick={() => onNavigate?.("/app")} className="rounded-2xl bg-ink px-6 py-4 text-sm font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5">
                Acessar produto
              </button>
            ) : (
              <div className="space-y-4">
                {actionLoading && <div className="rounded-2xl bg-paper px-4 py-3 text-sm font-extrabold uppercase tracking-[0.18em] text-ink">Processando</div>}
                <MercadoPagoCardBrick publicKey={billing.mercadoPagoPublicKey} amount={billing.monthlyAmount} email={currentUser?.email} onSubmit={handleCardSubmit} />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
