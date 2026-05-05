import { useState } from "react"
import { ImageCropModal } from "./ImageCropModal.jsx"
import { createCid, createMessage, createSymptom, deleteCid, deleteMessage, deleteSymptom, updateCid, updateMessage, updateStamp, updateSymptom } from "../services/api.js"

const subtabs = [
  { id: "cids", label: "CIDs" },
  { id: "sintomas", label: "Sintomas" },
  { id: "mensagens", label: "Mensagens" },
  { id: "carimbo", label: "Carimbo" }
]

const imageAccept = "image" + "/" + "*"

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
      placeholder={placeholder}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 5 }) {
  return (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      rows={rows}
      className="w-full resize-y rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
      placeholder={placeholder}
    />
  )
}

function RowActions({ onSave, onDelete, disabled }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <button type="button" onClick={onSave} disabled={disabled} className="rounded-xl bg-ink px-3 py-2 text-sm font-extrabold text-paper disabled:opacity-50">Salvar alteracoes</button>
      <button type="button" onClick={onDelete} disabled={disabled} className="rounded-xl border border-clay/30 px-3 py-2 text-sm font-extrabold text-clay disabled:opacity-50">Excluir</button>
    </div>
  )
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">{eyebrow}</p>
      <h3 className="mt-2 font-display text-2xl text-ink sm:text-3xl">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">{description}</p>
    </div>
  )
}

function EmptyState({ children }) {
  return <div className="rounded-2xl border border-dashed border-ink/15 bg-paper/30 p-5 text-sm font-bold text-ink/45">{children}</div>
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function stampCanvasFromCrop(sourceCanvas) {
  const maxWidth = 900
  const scale = Math.min(1, maxWidth / sourceCanvas.width)
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale))
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale))
  const context = canvas.getContext("2d")

  if (!context) {
    return sourceCanvas
  }

  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const contrast = 1.22
  const shadowLift = 12

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const brightness = (red + green + blue) / 3
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue)
    const paperStrength = clamp((brightness - 172) / 58, 0, 1) * clamp((72 - spread) / 72, 0, 1)

    if (paperStrength > 0.08) {
      data[index + 3] = Math.round(data[index + 3] * (1 - paperStrength))
      continue
    }

    const contrastRed = clamp((red - 128) * contrast + 128 - shadowLift, 0, 255)
    const contrastGreen = clamp((green - 128) * contrast + 128 - shadowLift, 0, 255)
    const contrastBlue = clamp((blue - 128) * contrast + 128 - shadowLift, 0, 255)

    data[index] = contrastRed
    data[index + 1] = contrastGreen
    data[index + 2] = contrastBlue
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

export function CadastrosTab({ hospital, catalog, reloadCatalog, onHospitalSaved }) {
  const [activeSubtab, setActiveSubtab] = useState(subtabs[0].id)
  const [symptomForm, setSymptomForm] = useState({ nome: "", cidId: "" })
  const [cidForm, setCidForm] = useState({ codigo: "" })
  const [messageForm, setMessageForm] = useState({ texto: "", sintomaId: "" })
  const [editing, setEditing] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [stampSourceUrl, setStampSourceUrl] = useState("")
  const [stampCropOpen, setStampCropOpen] = useState(false)

  function setEdit(id, field, value) {
    setEditing(current => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [field]: value
      }
    }))
  }

  function getEdit(item) {
    return { ...item, ...(editing[item.id] || {}) }
  }

  async function run(action, message) {
    try {
      setBusy(true)
      setError("")
      setSuccess("")
      await action()
      await reloadCatalog()
      setSuccess(message)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBusy(false)
    }
  }

  async function addSymptom(event) {
    event.preventDefault()
    await run(async () => {
      await createSymptom(hospital.id, symptomForm)
      setSymptomForm({ nome: "", cidId: "" })
    }, "Sintoma criado")
  }

  async function addCid(event) {
    event.preventDefault()
    await run(async () => {
      await createCid(hospital.id, cidForm)
      setCidForm({ codigo: "" })
    }, "CID criado")
  }

  async function addMessage(event) {
    event.preventDefault()
    await run(async () => {
      await createMessage(hospital.id, messageForm)
      setMessageForm({ texto: "", sintomaId: "" })
    }, "Mensagem criada")
  }

  function handleStampFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (stampSourceUrl) {
      window.URL.revokeObjectURL(stampSourceUrl)
    }

    setStampSourceUrl(window.URL.createObjectURL(file))
    setStampCropOpen(true)
    setError("")
    setSuccess("Recorte o carimbo. Depois do recorte, o fundo claro será removido automaticamente.")
  }

  function cancelStampCrop() {
    if (stampSourceUrl) {
      window.URL.revokeObjectURL(stampSourceUrl)
    }

    setStampSourceUrl("")
    setStampCropOpen(false)
  }

  async function confirmStampCrop(canvas) {
    const transparentCanvas = stampCanvasFromCrop(canvas)
    const carimboImagem = transparentCanvas.toDataURL("image/png")
    const saved = await updateStamp(hospital.id, { carimboImagem })

    if (stampSourceUrl) {
      window.URL.revokeObjectURL(stampSourceUrl)
    }

    setStampSourceUrl("")
    setStampCropOpen(false)
    onHospitalSaved?.(saved)
    setSuccess("Carimbo cadastrado com fundo transparente e contraste reforçado")
  }

  async function removeStamp() {
    await run(async () => {
      const saved = await updateStamp(hospital.id, { carimboImagem: null })
      onHospitalSaved?.(saved)
    }, "Carimbo removido")
  }

  return (
    <section className="space-y-5 rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Cadastros médicos</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Cadastros separados</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Escolha uma sub-aba. Criação e edição ficam em áreas diferentes.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-paper p-1 sm:grid-cols-4">
          {subtabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubtab(tab.id)}
              className={`rounded-xl px-3 py-3 text-xs font-extrabold transition ${activeSubtab === tab.id ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(error || success) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || success}</div>}

      {activeSubtab === "sintomas" && (
        <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <form onSubmit={addSymptom} className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <SectionHeader eyebrow="Criar novo" title="Novo sintoma" description="Esse nome aparece no atendimento. O CID padrão será usado no preenchimento automático." />
            <div className="mt-4 space-y-3">
              <TextInput value={symptomForm.nome} onChange={value => setSymptomForm(current => ({ ...current, nome: value }))} placeholder="Ex: Dor lombar" />
              <select
                value={symptomForm.cidId}
                onChange={event => setSymptomForm(current => ({ ...current, cidId: event.target.value }))}
                className="w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
              >
                <option value="">CID padrao</option>
                {catalog.cids.map(cid => <option key={cid.id} value={cid.id}>{cid.codigo}</option>)}
              </select>
              <button disabled={busy} className="w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-paper disabled:opacity-50">Criar sintoma</button>
            </div>
          </form>
          <div className="rounded-2xl border border-ink/10 p-4">
            <SectionHeader eyebrow="Já existem" title={`${catalog.sintomas.length} sintomas editáveis`} description="Altere o texto do campo e clique em salvar alterações." />
            <div className="mt-4 space-y-3">
              {catalog.sintomas.length === 0 ? <EmptyState>Nenhum sintoma cadastrado ainda.</EmptyState> : catalog.sintomas.map(item => {
                const current = getEdit(item)
                return (
                  <div key={item.id} className="space-y-3 rounded-2xl bg-paper/45 p-3">
                    <TextInput value={current.nome} onChange={value => setEdit(item.id, "nome", value)} placeholder="Sintoma" />
                    <select
                      value={current.cidId || ""}
                      onChange={event => setEdit(item.id, "cidId", event.target.value)}
                      className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
                    >
                      <option value="">Sem CID padrao</option>
                      {catalog.cids.map(cid => <option key={cid.id} value={cid.id}>{cid.codigo}</option>)}
                    </select>
                    <RowActions
                      disabled={busy}
                      onSave={() => run(() => updateSymptom(item.id, { nome: current.nome, cidId: current.cidId || null }), "Sintoma atualizado")}
                      onDelete={() => run(() => deleteSymptom(item.id), "Sintoma excluido")}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubtab === "cids" && (
        <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <form onSubmit={addCid} className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <SectionHeader eyebrow="Criar novo" title="Novo CID" description="Cadastre apenas o codigo. A ligacao com sintomas e feita na sub-aba Sintomas." />
            <div className="mt-4 space-y-3">
              <TextInput value={cidForm.codigo} onChange={value => setCidForm(current => ({ ...current, codigo: value }))} placeholder="Ex: M54.5" />
              <button disabled={busy} className="w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-paper disabled:opacity-50">Criar CID</button>
            </div>
          </form>
          <div className="rounded-2xl border border-ink/10 p-4">
            <SectionHeader eyebrow="Já existem" title={`${catalog.cids.length} CIDs editáveis`} description="Edite somente o código CID." />
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {catalog.cids.length === 0 ? <EmptyState>Nenhum CID cadastrado ainda.</EmptyState> : catalog.cids.map(item => {
                const current = getEdit(item)
                return (
                  <div key={item.id} className="space-y-3 rounded-2xl bg-paper/45 p-3">
                    <TextInput value={current.codigo} onChange={value => setEdit(item.id, "codigo", value)} placeholder="Codigo" />
                    <RowActions
                      disabled={busy}
                      onSave={() => run(() => updateCid(item.id, { codigo: current.codigo }), "CID atualizado")}
                      onDelete={() => run(() => deleteCid(item.id), "CID excluido")}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubtab === "mensagens" && (
        <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <form onSubmit={addMessage} className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <SectionHeader eyebrow="Criar novo" title="Nova mensagem" description="Selecione o sintoma e escreva o texto que será usado automaticamente no atendimento." />
            <div className="mt-4 space-y-3">
              <select
                value={messageForm.sintomaId}
                onChange={event => setMessageForm(current => ({ ...current, sintomaId: event.target.value }))}
                className="w-full rounded-2xl border border-ink/10 bg-paper/40 px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
              >
                <option value="">Sintoma relacionado</option>
                {catalog.sintomas.map(sintoma => <option key={sintoma.id} value={sintoma.id}>{sintoma.nome}</option>)}
              </select>
              <TextArea value={messageForm.texto} onChange={value => setMessageForm(current => ({ ...current, texto: value }))} placeholder="Texto pre-determinado" rows={7} />
              <button disabled={busy} className="w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-paper disabled:opacity-50">Criar mensagem</button>
            </div>
          </form>
          <div className="rounded-2xl border border-ink/10 p-4">
            <SectionHeader eyebrow="Já existem" title={`${catalog.mensagens.length} mensagens editáveis`} description="Edite o sintoma relacionado e o texto. Não há título para preencher." />
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {catalog.mensagens.length === 0 ? <EmptyState>Nenhuma mensagem cadastrada ainda.</EmptyState> : catalog.mensagens.map(item => {
                const current = getEdit(item)
                return (
                  <div key={item.id} className="space-y-3 rounded-2xl bg-paper/45 p-3">
                    <select
                      value={current.sintomaId || ""}
                      onChange={event => setEdit(item.id, "sintomaId", event.target.value)}
                      className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none ring-pen/20 transition focus:ring-4"
                    >
                      <option value="">Sem sintoma relacionado</option>
                      {catalog.sintomas.map(sintoma => <option key={sintoma.id} value={sintoma.id}>{sintoma.nome}</option>)}
                    </select>
                    <TextArea value={current.texto} onChange={value => setEdit(item.id, "texto", value)} placeholder="Texto" rows={6} />
                    <RowActions
                      disabled={busy}
                      onSave={() => run(() => updateMessage(item.id, { texto: current.texto, sintomaId: current.sintomaId || null }), "Mensagem atualizada")}
                      onDelete={() => run(() => deleteMessage(item.id), "Mensagem excluida")}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubtab === "carimbo" && (
        <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <SectionHeader eyebrow="Cadastrar" title="Carimbo médico" description="Envie a imagem do carimbo, recorte somente a área útil e o sistema removerá o fundo claro automaticamente." />
            <div className="mt-4 space-y-3">
              <label className="block cursor-pointer rounded-2xl bg-ink px-4 py-3 text-center text-sm font-extrabold text-paper">
                Enviar imagem do carimbo
                <input type="file" accept={imageAccept} onChange={handleStampFile} className="hidden" />
              </label>
              {hospital.carimboImagem && <button type="button" onClick={removeStamp} disabled={busy} className="w-full rounded-2xl border border-clay/30 px-4 py-3 text-sm font-extrabold text-clay disabled:opacity-50">Remover carimbo atual</button>}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 p-4">
            <SectionHeader eyebrow="Atual" title="Carimbo cadastrado" description="Essa imagem será exibida na calibração e usada no ponto de carimbo do PDF." />
            <div className="mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/40 p-5">
              {hospital.carimboImagem ? <img src={hospital.carimboImagem} alt="Carimbo cadastrado" className="max-h-48 w-full object-contain contrast-150 brightness-90 saturate-115" /> : <span className="text-center text-sm font-bold text-ink/45">Nenhum carimbo cadastrado ainda.</span>}
            </div>
          </div>
        </div>
      )}

      <ImageCropModal
        open={stampCropOpen}
        sourceImageUrl={stampSourceUrl}
        title="Recorte o carimbo"
        description="Arraste a caixa para deixar somente o carimbo. Evite bordas, mesa, papel sobrando e sombras para a transparência ficar limpa."
        areaLabel="Área do carimbo"
        confirmLabel="Salvar carimbo"
        onCancel={cancelStampCrop}
        onConfirm={confirmStampCrop}
      />
    </section>
  )
}
