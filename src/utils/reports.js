export function formatDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date())
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value))
}

export function reportToPatient(report, user) {
  return {
    id: report.id,
    pacienteNome: report.pacienteNome,
    mensagemFinal: report.mensagemFinal,
    cid: report.cid,
    dataRelatorio: report.dataRelatorio,
    medicoNome: user?.nome || "Dr. FSA"
  }
}