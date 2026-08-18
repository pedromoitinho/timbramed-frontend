export function formatDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date())
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return new Intl.DateTimeFormat("pt-BR").format(date)
}

function pad(value) {
  return String(value).padStart(2, "0")
}

// Valor para <input type="date"> (yyyy-mm-dd) no fuso local do navegador.
export function toDateInputValue(value) {
  const date = value ? new Date(value) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`
}

// Converte yyyy-mm-dd em ISO ao meio-dia local, para a data nao "virar" por fuso horario.
export function dateInputToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""))

  if (!match) {
    return null
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function reportToPatient(report, user) {
  return {
    id: report.id,
    pacienteNome: report.pacienteNome,
    mensagemFinal: report.mensagemFinal,
    cid: report.cid,
    dataRelatorio: report.dataRelatorio,
    comCarimbo: report.comCarimbo !== false,
    comData: report.comData !== false,
    medicoNome: user?.nome || "Dr. FSA"
  }
}
