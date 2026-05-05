import { useEffect, useState } from "react"

let sdkPromise = null

function loadMercadoPagoSdk() {
  if (window.MercadoPago) {
    return Promise.resolve()
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://sdk.mercadopago.com/js/v2"
      script.async = true
      script.crossOrigin = "anonymous"
      script.referrerPolicy = "no-referrer"
      script.onload = resolve
      script.onerror = () => reject(new Error("Não foi possível carregar o Mercado Pago"))
      document.head.appendChild(script)
    })
  }

  return sdkPromise
}

export function MercadoPagoCardBrick({ publicKey, amount, email, onSubmit }) {
  const [containerId] = useState(() => `mp-card-${Math.random().toString(36).slice(2)}`)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let controller = null
    let cancelled = false

    async function renderBrick() {
      if (!publicKey) {
        setError("MERCADOPAGO_PUBLIC_KEY não configurado")
        return
      }

      try {
        setError("")
        setReady(false)
        await loadMercadoPagoSdk()

        if (cancelled) {
          return
        }

        const mercadoPago = new window.MercadoPago(publicKey, { locale: "pt-BR" })
        const bricksBuilder = mercadoPago.bricks()
        controller = await bricksBuilder.create("cardPayment", containerId, {
          initialization: {
            amount: Number(amount || 0),
            payer: {
              email: email || ""
            }
          },
          customization: {
            visual: {
              style: {
                theme: "default"
              }
            },
            paymentMethods: {
              maxInstallments: 1
            }
          },
          callbacks: {
            onReady: () => setReady(true),
            onSubmit: async (cardFormData, additionalData) => {
              const cardTokenId = cardFormData.token || cardFormData.card_token_id

              if (!cardTokenId) {
                setError("Não foi possível tokenizar o cartão")
                throw new Error("Token de cartão ausente")
              }

              await onSubmit({
                cardTokenId,
                paymentMethodId: cardFormData.payment_method_id,
                lastFourDigits: additionalData?.lastFourDigits || cardFormData.last_four_digits
              })
            },
            onError: brickError => {
              setError(brickError?.message || "Erro no formulário do Mercado Pago")
            }
          }
        })
      } catch (brickError) {
        if (!cancelled) {
          setError(brickError.message)
        }
      }
    }

    renderBrick()

    return () => {
      cancelled = true
      controller?.unmount?.()
    }
  }, [amount, containerId, email, onSubmit, publicKey])

  return (
    <div className="space-y-3">
      {!ready && !error && <div className="rounded-2xl bg-paper px-4 py-3 text-sm font-extrabold uppercase tracking-[0.18em] text-ink">Carregando pagamento</div>}
      {error && <div className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
      <div id={containerId} className="min-h-[24rem] overflow-hidden rounded-2xl border border-ink/10 bg-white p-2" />
    </div>
  )
}
