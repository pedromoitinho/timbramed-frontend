import { useEffect, useRef, useState } from "react"
import { ImageCropModal } from "./ImageCropModal.jsx"
import { createCid, deleteCid, updateCid, updateSignature, updateStamp } from "../services/api.js"

const subtabs = [
  { id: "cids", label: "CIDs" },
  { id: "carimbo", label: "Carimbo" },
  { id: "assinatura", label: "Assinatura" }
]

const imageAccept = "image" + "/" + "*"
const PEN_BLUE = "#1A5BFE"
const CANVAS_W = 800
const CANVAS_H = 320

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
  if (!context) { return sourceCanvas }
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

function SignaturePad({ hospital, onHospitalSaved }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = PEN_BLUE
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (hospital.assinaturaImagem) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
      img.src = hospital.assinaturaImagem
    }
  }, [hospital.assinaturaImagem])

  function getPos(event) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  function startDraw(event) {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getPos(event)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function draw(event) {
    event.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getPos(event)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw(event) {
    event.preventDefault()
    setDrawing(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function saveSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    try {
      setBusy(true); setError(""); setSuccess("")
      const saved = await updateSignature(hospital.id, { assinaturaImagem: dataUrl })
      onHospitalSaved?.(saved)
      setSuccess("Assinatura salva")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  async function removeSignature() {
    clearCanvas()
    try {
      setBusy(true); setError(""); setSuccess("")
      const saved = await updateSignature(hospital.id, { assinaturaImagem: null })
      onHospitalSaved?.(saved)
      setSuccess("Assinatura removida")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <div className="rounded-2xl border border-ink/10 p-4">
        <SectionHeader eyebrow="Preview" title="Assinatura cadastrada" description="Essa imagem sera sobreposta ao carimbo no PDF." />
        <div className="mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/40 p-5">
          {hospital.assinaturaImagem ? <img src={hospital.assinaturaImagem} alt="Assinatura cadastrada" className="max-h-32 w-full object-contain" style={{ filter: "brightness(1) saturate(1)" }} />
          : <span className="text-center text-sm font-bold text-ink/45">Nenhuma assinatura cadastrada ainda.</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
        <SectionHeader eyebrow="Desenhar" title="Assinatura" description="Desenhe sua assinatura com o mouse ou touch. A cor azul caneta BIC sera usada no documento." />
        <div className="mt-4 space-y-3">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            className="w-full cursor-crosshair rounded-2xl border-2 border-ink/15 bg-white"
            style={{ touchAction: "none" }} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={clearCanvas} disabled={busy} className="rounded-2xl border border-ink/15 px-4 py-3 text-sm font-extrabold text-ink disabled:opacity-50">Limpar</button>
            <button type="button" onClick={saveSignature} disabled={busy} className="rounded-2xl bg-ink px-4 py-3 text-sm font-extrabold text-paper disabled:opacity-50">Salvar</button>
          </div>
          {hospital.assinaturaImagem && <button type="button" onClick={removeSignature} disabled={busy} className="w-full rounded-2xl border border-clay/30 px-4 py-3 text-sm font-extrabold text-clay disabled:opacity-50">Remover assinatura atual</button>}
        </div>
      </div>
    </div>
  )
}

export function CadastrosTab({ hospital, catalog, reloadCatalog, onHospitalSaved }) {
  const [activeSubtab, setActiveSubtab] = useState(subtabs[0].id)
  const [cidForm, setCidForm] = useState({ codigo: "" })
  const [editing, setEditing] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [stampSourceUrl, setStampSourceUrl] = useState("")
  const [stampCropOpen, setStampCropOpen] = useState(false)

  function setEdit(id, field, value) {
    setEditing(current => ({
      ...current,
      [id]: { ...(current[id] || {}), [field]: value }
    }))
  }
  function getEdit(item) {
    return { ...item, ...(editing[item.id] || {}) }
  }

  async function run(action, message) {
    try {
      setBusy(true); setError(""); setSuccess("")
      await action()
      await reloadCatalog()
      setSuccess(message)
    } catch (apiError) {
      setError(apiError.message)
    } finally { setBusy(false) }
  }

  async function addCid(event) {
    event.preventDefault()
    await run(async () => {
      await createCid(hospital.id, cidForm)
      setCidForm({ codigo: "" })
    }, "CID criado")
  }

  function handleStampFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (stampSourceUrl) window.URL.revokeObjectURL(stampSourceUrl)
    setStampSourceUrl(window.URL.createObjectURL(file))
    setStampCropOpen(true)
    setError("")
    setSuccess("Recorte o carimbo. Depois do recorte, o fundo claro será removido automaticamente.")
  }

  function cancelStampCrop() {
    if (stampSourceUrl) window.URL.revokeObjectURL(stampSourceUrl)
    setStampSourceUrl(""); setStampCropOpen(false)
  }

  async function confirmStampCrop(canvas) {
    const transparentCanvas = stampCanvasFromCrop(canvas)
    const carimboImagem = transparentCanvas.toDataURL("image/png")
    const saved = await updateStamp(hospital.id, { carimboImagem })
    if (stampSourceUrl) window.URL.revokeObjectURL(stampSourceUrl)
    setStampSourceUrl(""); setStampCropOpen(false)
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
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Cadastros</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Gerencie CIDs, carimbo e assinatura.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-paper p-1">
          {subtabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveSubtab(tab.id)}
              className={`rounded-xl px-3 py-3 text-xs font-extrabold transition ${activeSubtab === tab.id ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(error || success) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || success}</div>}

      {activeSubtab === "cids" && (
        <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <form onSubmit={addCid} className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <SectionHeader eyebrow="Criar novo" title="Novo CID" description="Cadastre o código CID para usar no atendimento." />
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

      {activeSubtab === "assinatura" && <SignaturePad hospital={hospital} onHospitalSaved={onHospitalSaved} />}

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
