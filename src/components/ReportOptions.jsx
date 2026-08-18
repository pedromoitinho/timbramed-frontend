import { useState } from "react"
import { updateReport } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"
import { dateInputToIso, toDateInputValue } from "../utils/reports.js"

export function ToggleChip({ label, checked, onChange, disabled, title }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} title={title}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper/40 text-ink/60 hover:bg-ink/5"}`}>
      <span aria-hidden="true" className={`inline-block h-3.5 w-3.5 rounded-full border ${checked ? "border-paper bg-moss" : "border-ink/30 bg-white"}`} />
      {label}
      <span className="sr-only">{checked ? "sim" : "não"}</span>
    </button>
  )
}

export function OptionSwitch({ label, description, value, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3">
      <div>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description && <span className="block text-xs font-semibold text-ink/50">{description}</span>}
      </div>
      <div className="flex shrink-0 rounded-xl bg-white p-1">
        <button type="button" disabled={disabled} onClick={() => onChange(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${value ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"}`}>
          Sim
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${!value ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"}`}>
          Não
        </button>
      </div>
    </div>
  )
}

export function DateField({ value, onChange, disabled, label = "Data do relatório", hint }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      {hint && <span className="mt-1 block text-xs font-semibold text-ink/50">{hint}</span>}
      <input type="date" value={value} disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4 disabled:opacity-50" />
    </label>
  )
}

// Controles por relatorio na fila/concluidos: data (editavel), carimbo sim/nao, data sim/nao.
// Cada mudanca e persistida no backend e refletida no store.
export function ReportRowOptions({ report }) {
  const patchReport = usePrintQueueStore(state => state.patchReport)
  const setErro = usePrintQueueStore(state => state.setErro)
  const [saving, setSaving] = useState(false)
  const [dateDraft, setDateDraft] = useState(null)

  async function persist(patch) {
    const previous = {
      dataRelatorio: report.dataRelatorio,
      comCarimbo: report.comCarimbo !== false,
      comData: report.comData !== false
    }
    patchReport(report.id, patch)
    try {
      setSaving(true); setErro("")
      const saved = await updateReport(report.id, patch)
      patchReport(report.id, saved)
    } catch (error) {
      patchReport(report.id, previous)
      setErro(error.message)
    } finally {
      setSaving(false)
    }
  }

  function commitDate(value) {
    setDateDraft(null)
    const iso = dateInputToIso(value)
    if (!iso) return
    if (toDateInputValue(iso) === toDateInputValue(report.dataRelatorio)) return
    persist({ dataRelatorio: iso })
  }

  const dateValue = dateDraft ?? toDateInputValue(report.dataRelatorio)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={dateValue} disabled={saving} aria-label="Data do relatório"
        onChange={event => setDateDraft(event.target.value)}
        onBlur={event => commitDate(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur() }}
        className="w-[9.5rem] rounded-xl border border-ink/10 bg-paper/40 px-3 py-1.5 text-xs font-bold text-ink outline-none ring-pen/20 transition focus:ring-4 disabled:opacity-50" />
      <ToggleChip label="Carimbo" checked={report.comCarimbo !== false} disabled={saving} title="Imprimir carimbo e assinatura"
        onChange={next => persist({ comCarimbo: next })} />
      <ToggleChip label="Data" checked={report.comData !== false} disabled={saving} title="Imprimir a data no relatório"
        onChange={next => persist({ comData: next })} />
    </div>
  )
}
