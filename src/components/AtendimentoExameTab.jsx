import { useState } from "react"
import { generateExamPdf, openPdf } from "../services/api.js"

export function AtendimentoExameTab({ hospital, user }) {
  const [form, setForm] = useState({
    nome: "", endereco: "", identidade: "", motivo: "",
    exameSolicitado: "", codigo: "", paciente: ""
  })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setBusy(true); setError("")
      const blob = await generateExamPdf({
        hospitalId: hospital.id,
        paciente: form,
        comExame: !!hospital.exameImagem
      })
      openPdf(blob)
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Atendimento - Exame</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Solicitação de exame</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Preencha os campos para gerar a solicitação de exame.</p>
        </div>
        {hospital.exameImagem && <span className="rounded-2xl bg-moss/10 px-4 py-2 text-sm font-bold text-moss">Com fundo</span>}
      </div>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <InputField label="Nome" value={form.nome} onChange={v => updateField("nome", v)} placeholder="Nome do paciente" />
        <InputField label="Endereço" value={form.endereco} onChange={v => updateField("endereco", v)} placeholder="Endereço" />
        <InputField label="Identidade" value={form.identidade} onChange={v => updateField("identidade", v)} placeholder="RG / Identidade" />
        <TextAreaField label="Motivo" value={form.motivo} onChange={v => updateField("motivo", v)} placeholder="Motivo da solicitação" />
        <InputField label="Exame solicitado" value={form.exameSolicitado} onChange={v => updateField("exameSolicitado", v)} placeholder="Exame solicitado" />
        <InputField label="Código" value={form.codigo} onChange={v => updateField("codigo", v)} placeholder="Código do exame" />
        <InputField label="Paciente" value={form.paciente} onChange={v => updateField("paciente", v)} placeholder="Nome do paciente" />
        {error && <div className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay lg:col-span-2">{error}</div>}
        <button disabled={busy}
          className="rounded-2xl bg-ink px-5 py-4 font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2">
          {busy ? "Gerando..." : "Gerar solicitação de exame"}
        </button>
      </form>
    </section>
  )
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
        placeholder={placeholder} />
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <label className="block lg:col-span-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} rows={3}
        className="mt-2 w-full resize-y rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
        placeholder={placeholder} />
    </label>
  )
}
