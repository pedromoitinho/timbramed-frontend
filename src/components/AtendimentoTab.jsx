import { useState } from "react"
import { createReport } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"
import { dateInputToIso, toDateInputValue } from "../utils/reports.js"
import { DateField, OptionSwitch } from "./ReportOptions.jsx"

function emptyForm(previous) {
  return {
    pacienteNome: "",
    cids: previous?.cids || [],
    mensagemFinal: "",
    dataRelatorio: toDateInputValue(),
    comCarimbo: previous?.comCarimbo ?? true,
    comData: previous?.comData ?? true
  }
}

export function AtendimentoTab({ hospital, catalog }) {
  const [form, setForm] = useState(() => emptyForm())
  const [localError, setLocalError] = useState("")
  const [success, setSuccess] = useState("")
  const addReport = usePrintQueueStore(state => state.addReport)
  const carregando = usePrintQueueStore(state => state.carregando)
  const setCarregando = usePrintQueueStore(state => state.setCarregando)
  const hasDatePosition = hospital?.coordenadas?.dataXcm !== null && hospital?.coordenadas?.dataXcm !== undefined

  function toggleCid(codigo) {
    setForm(current => ({
      ...current,
      cids: current.cids.includes(codigo)
        ? current.cids.filter(c => c !== codigo)
        : [...current.cids, codigo]
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!hospital?.id || !form.pacienteNome.trim() || !form.mensagemFinal.trim()) {
      setLocalError("Preencha paciente e mensagem antes de adicionar a fila")
      return
    }
    const dataRelatorio = dateInputToIso(form.dataRelatorio)
    if (!dataRelatorio) {
      setLocalError("Informe uma data válida para o relatório")
      return
    }
    try {
      setCarregando(true)
      setLocalError(""); setSuccess("")
      const report = await createReport({
        hospitalId: hospital.id,
        pacienteNome: form.pacienteNome.trim(),
        mensagemFinal: form.mensagemFinal.trim(),
        cid: form.cids.length > 0 ? form.cids.join(", ") : null,
        dataRelatorio,
        comCarimbo: form.comCarimbo,
        comData: form.comData
      })
      addReport(report)
      setForm(current => ({ ...emptyForm(current), dataRelatorio: current.dataRelatorio }))
      setSuccess("Paciente adicionado a fila")
    } catch (error) {
      setLocalError(error.message)
    } finally { setCarregando(false) }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Atendimento</p></div>
        <span className="rounded-2xl bg-pen/10 px-4 py-2 text-sm font-bold text-pen">Hoje: {toDateInputValue().split("-").reverse().join("/")}</span>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="text-sm font-bold text-ink">Nome do paciente</span>
          <input value={form.pacienteNome} onChange={event => setForm(current => ({ ...current, pacienteNome: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
            placeholder="Ex: Maria Silva" />
        </label>
        <fieldset className="lg:col-span-2">
          <legend className="text-sm font-bold text-ink">CIDs</legend>
          <span className="mt-1 block text-xs font-semibold text-ink/50">Selecione um ou mais CIDs.</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalog.cids.map(item => (
              <label key={item.id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${form.cids.includes(item.codigo) ? "border-ink bg-ink text-paper" : "border-ink/10 bg-paper/40 text-ink hover:bg-ink/5"}`}>
                <input type="checkbox" checked={form.cids.includes(item.codigo)} onChange={() => toggleCid(item.codigo)} className="hidden" />
                {item.codigo}
              </label>
            ))}
            {catalog.cids.length === 0 && <span className="text-sm font-semibold text-ink/45">Nenhum CID cadastrado. Vá em Cadastros para criar.</span>}
          </div>
        </fieldset>
        <label className="block lg:col-span-2">
          <span className="text-sm font-bold text-ink">Texto do relatório</span>
          <textarea value={form.mensagemFinal} onChange={event => setForm(current => ({ ...current, mensagemFinal: event.target.value }))}
            rows={7}
            className="mt-2 w-full resize-y rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
            placeholder="Escreva o relatório manualmente..." />
        </label>
        <div className="grid gap-3 rounded-2xl border border-ink/10 bg-paper/25 p-4 lg:col-span-2 lg:grid-cols-3">
          <DateField value={form.dataRelatorio} onChange={value => setForm(current => ({ ...current, dataRelatorio: value }))}
            hint="Data que sai impressa no relatório." />
          <div className="grid gap-3 lg:col-span-2 lg:grid-cols-2 lg:self-end">
            <OptionSwitch label="Carimbo" description="Imprimir carimbo e assinatura"
              value={form.comCarimbo} onChange={value => setForm(current => ({ ...current, comCarimbo: value }))} />
            <OptionSwitch label="Data no relatório" description={hasDatePosition ? "Imprimir a data no papel" : "Posicione a data em Calibração"}
              value={form.comData} onChange={value => setForm(current => ({ ...current, comData: value }))} />
          </div>
        </div>
        {(localError || success) && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold lg:col-span-2 ${localError ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>
            {localError || success}
          </div>
        )}
        <button disabled={carregando}
          className="rounded-2xl bg-ink px-5 py-4 font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2">
          Adicionar à fila
        </button>
      </form>
    </section>
  )
}
