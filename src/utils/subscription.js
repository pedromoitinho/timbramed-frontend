export function hasProductAccess(user) {
  if (!user) {
    return false
  }

  if (user.role === "ADMIN") {
    return true
  }

  if (user.subscriptionStatus === "ACTIVE") {
    return true
  }

  if (user.subscriptionStatus !== "TRIALING" || !user.trialEndsAt) {
    return false
  }

  return new Date(user.trialEndsAt).getTime() > Date.now()
}

export function subscriptionLabel(status) {
  const labels = {
    PENDING_PAYMENT: "Aguardando pagamento",
    TRIALING: "Teste grátis",
    ACTIVE: "Assinatura ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Assinatura cancelada"
  }

  return labels[status] || "Não configurada"
}
