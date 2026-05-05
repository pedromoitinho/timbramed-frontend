import { useMemo, useState } from "react"
import { generatePdf, openPdf } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"
import { formatDate, reportToPatient } from "../utils/reports.js"

function matchesSearch(report, search) {
  const value = search.trim().toLowerCase()
  if (!value) return true
  return [
    report.pacienteNome, report.mensagemFinal, report.cid,
    formatDate(report.dataRelatorio), formatDate(report.impressoEm)
  ].some(item => String(item || "").toLowerCase().includes(value))
}

export function ConcluidosTab({ hospital, user }) {
  const [search, setSearch] = useState("")
  const concluidos = usePrintQueueStore(state => state.concluidos)
  const selecionados = usePrintQueueStore(state => state.selecionadosConcluidos)
  const carregando = usePrintQueueStore(state => state.carregando)
  const erro = usePrintQueueStore(state => state.erro)
  const toggleSelecionado = usePrintQueueStore(state => state.toggleConcluido)
  const toggleTodos = usePrintQueueStore(state => state.toggleTodosConcluidos)
  const clearSelection = usePrintQueueStore(state => state.clearConcluidosSelection)
  const setCarregando = usePrintQueueStore(state => state.setCarregando)
  const setErro = usePrintQueueStore(state => state.setErro)

  const filteredConcluidos = useMemo(() => concluidos.filter(report => matchesSearch(report, search)), [concluidos, search])
  const selectedReports = concluidos.filter(report => selecionados.includes(report.id))
  const allSelected = concluidos.length > 0 && selecionados.length === concluidos.length

  async function handleReprintSelected() {
    if (!hospital?.id || selectedReports.length === 0) return
    try {
      setCarregando(true); setErro("")
      const blob = await generatePdf({
        hospitalId: hospital.id,
        pacientes: selectedReports.map(report => reportToPatient(report, user))
      })
      openPdf(blob)
      clearSelection()
    } catch (error) {
      setErro(error.message)
    } finally { setCarregando(false) }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-pen">Concluídos</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{concluidos.length} no histórico</h2>
        </div>
        <button onClick={handleReprintSelected} disabled={carregando || selectedReports.length === 0}
          className="rounded-2xl bg-pen px-5 py-3 font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
          Re-imprimir Selecionados
        </button>
      </div>
      <div className="mt-4">
        <input value={search} onChange={event => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          placeholder="Pesquisar por paciente, CID, mensagem ou data" />
      </div>
      {erro && <div className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{erro}</div>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10">
        <div className="hidden grid-cols-[52px_1fr_1fr_112px] items-center gap-3 bg-ink px-4 py-3 text-xs font-extrabold uppercase tracking-[0.2em] text-paper sm:grid">
          <input type="checkbox" checked={allSelected} onChange={toggleTodos} className="h-5 w-5 accent-pen" />
          <span>Paciente</span><span>CID</span><span>Impresso</span>
        </div>
        <label className="flex items-center gap-3 bg-ink px-4 py-3 text-sm font-bold text-paper sm:hidden">
          <input type="checkbox" checked={allSelected} onChange={toggleTodos} className="h-5 w-5 accent-pen" />
          Selecionar todos
        </label>
        {concluidos.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-ink/60">Nenhum relatório concluído ainda.</div>
        ) : filteredConcluidos.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-ink/60">Nenhum resultado encontrado.</div>
        ) : filteredConcluidos.map(report => (
          <div key={report.id} className="border-t border-ink/10 px-4 py-4 text-sm sm:grid sm:grid-cols-[52px_1fr_1fr_112px] sm:items-center sm:gap-3">
            <div className="mb-3 flex items-center gap-3 sm:mb-0">
              <input type="checkbox" checked={selecionados.includes(report.id)} onChange={() => toggleSelecionado(report.id)} className="h-5 w-5 accent-pen" />
              <span className="font-extrabold text-ink sm:hidden">Selecionar</span>
            </div>
            <div>
              <p className="font-extrabold text-ink">{report.pacienteNome}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/55">{report.mensagemFinal}</p>
            </div>
            <span className="mt-2 block font-semibold text-ink/70 sm:mt-0">{report.cid || "—"}</span>
            <span className="mt-1 block font-semibold text-ink/70 sm:mt-0">{formatDate(report.impressoEm || report.dataRelatorio)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
