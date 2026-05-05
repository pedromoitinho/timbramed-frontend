import { useEffect, useMemo, useState } from "react"
import { createReport } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"
import { formatDate } from "../utils/reports.js"

function messageLabel(item, index) {
  const prefix = item.sintoma?.nome || "Mensagem"
  const preview = item.texto.length > 56 ? `${item.texto.slice(0, 56)}...` : item.texto
  return `${prefix} ${index + 1} - ${preview}`
}

export function AtendimentoTab({ hospital, catalog }) {
  const [form, setForm] = useState({ pacienteNome: "", sintomaId: "", cid: "", mensagemId: "", mensagemFinal: "" })
  const [localError, setLocalError] = useState("")
  const [success, setSuccess] = useState("")
  const addReport = usePrintQueueStore(state => state.addReport)
  const carregando = usePrintQueueStore(state => state.carregando)
  const setCarregando = usePrintQueueStore(state => state.setCarregando)

  const selectedSymptom = useMemo(() => {
    return catalog.sintomas.find(item => item.id === form.sintomaId)
  }, [catalog.sintomas, form.sintomaId])

  const filteredMessages = useMemo(() => {
    if (!form.sintomaId) {
      return []
    }

    return catalog.mensagens.filter(item => item.sintomaId === form.sintomaId)
  }, [catalog.mensagens, form.sintomaId])

  useEffect(() => {
    if (!selectedSymptom) {
      if (!form.sintomaId) {
        setForm(current => ({
          ...current,
          cid: "",
          mensagemId: "",
          mensagemFinal: ""
        }))
      }

      return
    }

    const firstMessage = catalog.mensagens.find(item => item.sintomaId === selectedSymptom.id)
    const nextCid = selectedSymptom.cidPadrao?.codigo || ""
    const nextMessageId = firstMessage?.id || ""
    const nextMessageText = firstMessage?.texto || ""

    setForm(current => {
      if (current.cid === nextCid && current.mensagemId === nextMessageId && current.mensagemFinal === nextMessageText) {
        return current
      }

      return {
        ...current,
        cid: nextCid,
        mensagemId: nextMessageId,
        mensagemFinal: nextMessageText
      }
    })
  }, [catalog.mensagens, form.sintomaId, selectedSymptom])

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function handleMessageChange(value) {
    const message = catalog.mensagens.find(item => item.id === value)
    setForm(current => ({
      ...current,
      mensagemId: value,
      mensagemFinal: message?.texto || ""
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!hospital?.id || !form.pacienteNome.trim() || !form.mensagemFinal.trim()) {
      setLocalError("Preencha paciente e mensagem antes de adicionar a fila")
      return
    }

    try {
      setCarregando(true)
      setLocalError("")
      setSuccess("")
      const report = await createReport({
        hospitalId: hospital.id,
        sintomaId: form.sintomaId || null,
        pacienteNome: form.pacienteNome.trim(),
        mensagemFinal: form.mensagemFinal.trim(),
        cid: form.cid || null
      })
      addReport(report)
      setForm(current => ({
        pacienteNome: "",
        sintomaId: current.sintomaId,
        cid: current.cid,
        mensagemId: current.mensagemId,
        mensagemFinal: current.mensagemFinal
      }))
      setSuccess("Paciente adicionado a fila")
    } catch (error) {
      setLocalError(error.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Atendimento</p>
        </div>
        <span className="rounded-2xl bg-pen/10 px-4 py-2 text-sm font-bold text-pen">Data: {formatDate()}</span>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="text-sm font-bold text-ink">Nome do paciente</span>
          <input
            value={form.pacienteNome}
            onChange={event => updateField("pacienteNome", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
            placeholder="Ex: Maria Silva"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">Sintoma</span>
          <select
            value={form.sintomaId}
            onChange={event => updateField("sintomaId", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          >
            <option value="">Selecionar sintoma</option>
            {catalog.sintomas.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          {selectedSymptom && <span className="mt-2 block text-xs font-semibold text-ink/50">Selecionado: {selectedSymptom.nome}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">CID</span>
          <select
            value={form.cid}
            onChange={event => updateField("cid", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          >
            <option value="">CID automático</option>
            {catalog.cids.map(item => <option key={item.id} value={item.codigo}>{item.codigo}</option>)}
          </select>
          <span className="mt-2 block text-xs font-semibold text-ink/50">Preenchido automaticamente pelo sintoma, mas pode ser ajustado.</span>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-sm font-bold text-ink">Mensagem pré-determinada</span>
          <select
            value={form.mensagemId}
            onChange={event => handleMessageChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          >
            <option value="">{form.sintomaId ? "Selecionar mensagem relacionada" : "Escolha um sintoma primeiro"}</option>
            {filteredMessages.map((item, index) => <option key={item.id} value={item.id}>{messageLabel(item, index)}</option>)}
          </select>
          <span className="mt-2 block text-xs font-semibold text-ink/50">A lista mostra apenas mensagens vinculadas ao sintoma escolhido.</span>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-sm font-bold text-ink">Texto do relatório</span>
          <textarea
            value={form.mensagemFinal}
            onChange={event => updateField("mensagemFinal", event.target.value)}
            rows={7}
            className="mt-2 w-full resize-y rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
          />
        </label>
        {(localError || success) && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold lg:col-span-2 ${localError ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>
            {localError || success}
          </div>
        )}
        <button
          disabled={carregando}
          className="rounded-2xl bg-ink px-5 py-4 font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2"
        >
          Adicionar à fila
        </button>
      </form>
    </section>
  )
}
