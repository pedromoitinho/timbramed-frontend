import { useMemo, useState } from "react"
import { generatePdf, openPdf, updateReport } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"
import { formatDate, reportToPatient } from "../utils/reports.js"
import { ReportRowOptions } from "./ReportOptions.jsx"

function matchesSearch(report, search) {
  const value = search.trim().toLowerCase()
  if (!value) return true
  return [
    report.pacienteNome, report.mensagemFinal, report.cid,
    formatDate(report.dataRelatorio)
  ].some(item => String(item || "").toLowerCase().includes(value))
}

const rowGrid = "sm:grid-cols-[52px_minmax(0,1.3fr)_minmax(0,0.6fr)_minmax(19rem,auto)]"

export function FilaTab({ hospital, user }) {
  const [search, setSearch] = useState("")
  const [comRelatorio, setComRelatorio] = useState(false)
  const fila = usePrintQueueStore(state => state.fila)
  const selecionados = usePrintQueueStore(state => state.selecionadosFila)
  const carregando = usePrintQueueStore(state => state.carregando)
  const erro = usePrintQueueStore(state => state.erro)
  const toggleSelecionado = usePrintQueueStore(state => state.toggleFila)
  const toggleTodos = usePrintQueueStore(state => state.toggleTodosFila)
  const markCompleted = usePrintQueueStore(state => state.markCompleted)
  const patchReport = usePrintQueueStore(state => state.patchReport)
  const setCarregando = usePrintQueueStore(state => state.setCarregando)
  const setErro = usePrintQueueStore(state => state.setErro)

  const filteredFila = useMemo(() => fila.filter(report => matchesSearch(report, search)), [fila, search])
  const selectedReports = fila.filter(report => selecionados.includes(report.id))
  const allSelected = fila.length > 0 && selecionados.length === fila.length
  const hasDatePosition = hospital?.coordenadas?.dataXcm !== null && hospital?.coordenadas?.dataXcm !== undefined

  async function handlePrintSelected() {
    // Le do store no momento do clique para pegar edicoes recem-salvas (data/carimbo) sem closure velha.
    const state = usePrintQueueStore.getState()
    const reports = state.fila.filter(report => state.selecionadosFila.includes(report.id))
    if (!hospital?.id || reports.length === 0) return
    try {
      setCarregando(true); setErro("")
      const blob = await generatePdf({
        hospitalId: hospital.id,
        pacientes: reports.map(report => reportToPatient(report, user)),
        comRelatorio
      })
      openPdf(blob, `timbramed-${Date.now()}.pdf`)
      markCompleted(reports.map(report => report.id))
    } catch (error) {
      setErro(error.message)
    } finally { setCarregando(false) }
  }

  async function applyToSelected(patch) {
    if (selectedReports.length === 0) return
    try {
      setCarregando(true); setErro("")
      const saved = await Promise.all(selectedReports.map(report => updateReport(report.id, patch)))
      saved.forEach(report => patchReport(report.id, report))
    } catch (error) {
      setErro(error.message)
    } finally { setCarregando(false) }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-moss">Fila de impressão</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{fila.length} aguardando</h2>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-2xl bg-paper p-1">
            <button type="button" onClick={() => setComRelatorio(false)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${!comRelatorio ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}>
              Sem relatório
            </button>
            <button type="button" onClick={() => setComRelatorio(true)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${comRelatorio ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}>
              Com relatório
            </button>
          </div>
          <button onClick={handlePrintSelected} disabled={carregando || selectedReports.length === 0}
            className="rounded-2xl bg-clay px-5 py-3 font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
            Imprimir
          </button>
        </div>
      </div>
      <div className="mt-4">
        <input value={search} onChange={event => setSearch(event.target.value)}
          className="w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          placeholder="Pesquisar por paciente, CID, mensagem ou data" />
      </div>
      {selectedReports.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-paper/60 px-4 py-2 text-xs font-bold text-ink/70">
          <span className="mr-1">Aplicar aos {selectedReports.length} selecionados:</span>
          <BulkButton disabled={carregando} onClick={() => applyToSelected({ comCarimbo: true })}>Com carimbo</BulkButton>
          <BulkButton disabled={carregando} onClick={() => applyToSelected({ comCarimbo: false })}>Sem carimbo</BulkButton>
          <BulkButton disabled={carregando} onClick={() => applyToSelected({ comData: true })}>Com data</BulkButton>
          <BulkButton disabled={carregando} onClick={() => applyToSelected({ comData: false })}>Sem data</BulkButton>
        </div>
      )}
      {!hasDatePosition && fila.some(report => report.comData !== false) && (
        <div className="mt-3 rounded-2xl bg-clay/10 px-4 py-3 text-xs font-bold text-clay">
          A posição da data ainda não foi calibrada — a data não sairá impressa até você posicionar a caixa "Data" em Calibração.
        </div>
      )}
      {erro && <div className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{erro}</div>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10">
        <div className={`hidden items-center gap-3 bg-ink px-4 py-3 text-xs font-extrabold uppercase tracking-[0.2em] text-paper sm:grid ${rowGrid}`}>
          <input type="checkbox" checked={allSelected} onChange={toggleTodos} className="h-5 w-5 accent-clay" />
          <span>Paciente</span><span>CID</span><span>Data · Carimbo · Data no PDF</span>
        </div>
        <label className="flex items-center gap-3 bg-ink px-4 py-3 text-sm font-bold text-paper sm:hidden">
          <input type="checkbox" checked={allSelected} onChange={toggleTodos} className="h-5 w-5 accent-clay" />
          Selecionar todos
        </label>
        {fila.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-ink/60">Nenhum paciente aguardando impressão.</div>
        ) : filteredFila.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-ink/60">Nenhum resultado encontrado.</div>
        ) : filteredFila.map(report => (
          <div key={report.id} className={`border-t border-ink/10 px-4 py-4 text-sm sm:grid sm:items-center sm:gap-3 ${rowGrid}`}>
            <div className="mb-3 flex items-center gap-3 sm:mb-0">
              <input type="checkbox" checked={selecionados.includes(report.id)} onChange={() => toggleSelecionado(report.id)} className="h-5 w-5 accent-clay" />
              <span className="font-extrabold text-ink sm:hidden">Selecionar</span>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-ink">{report.pacienteNome}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/55">{report.mensagemFinal}</p>
            </div>
            <span className="mt-2 block font-semibold text-ink/70 sm:mt-0">{report.cid || "—"}</span>
            <div className="mt-3 sm:mt-0">
              <ReportRowOptions report={report} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BulkButton({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-xs font-extrabold text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  )
}
