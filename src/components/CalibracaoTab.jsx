import { useEffect, useMemo, useRef, useState } from "react"
import { ImageCropModal } from "./ImageCropModal.jsx"
import { updateCoordinates, updateReportImage } from "../services/api.js"

const paper = { width: 14.8, height: 21 }
const boxLabels = {
  titulo: "Titulo",
  corpo: "Corpo do texto",
  cid: "CID",
  encerramento: "Encerramento",
  carimbo: "Carimbo médico"
}
const boxColors = {
  titulo: "border-clay bg-clay/15",
  corpo: "border-pen bg-pen/10",
  cid: "border-moss bg-moss/15",
  encerramento: "border-ink bg-ink/10",
  carimbo: "border-clay bg-clay/15"
}
const imageAccept = "image" + "/" + "*"

const subtabs = [
  { id: "calibracao", label: "Calibração" },
  { id: "relatorio", label: "Relatório" }
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function cmToXPercent(value) {
  return Number(value) / paper.width * 100
}

function cmToYPercent(value) {
  return Math.abs(Number(value)) / paper.height * 100
}

function percentToXCm(value) {
  return Number((value / 100 * paper.width).toFixed(2))
}

function percentToYCm(value) {
  return Number((-value / 100 * paper.height).toFixed(2))
}

function boxesFromCoordinates(coordinates) {
  const bodyX = cmToXPercent(coordinates.corpoXcm)
  const bodyY = cmToYPercent(coordinates.corpoYcm)
  const bodyW = cmToXPercent(Number(coordinates.corpoMaxXcm) - Number(coordinates.corpoXcm))
  const bodyH = cmToYPercent(Number(coordinates.corpoLimiteInferiorYcm) - Number(coordinates.corpoYcm))

  return {
    titulo: { x: cmToXPercent(coordinates.tituloXcm), y: cmToYPercent(coordinates.tituloYcm), w: 24, h: 5 },
    corpo: { x: bodyX, y: bodyY, w: bodyW, h: bodyH },
    cid: { x: cmToXPercent(coordinates.cidXcm), y: cmToYPercent(coordinates.cidYcm), w: 28, h: 5 },
    encerramento: { x: cmToXPercent(coordinates.encerramentoXcm), y: cmToYPercent(coordinates.encerramentoYcm), w: 30, h: 9 },
    carimbo: { x: cmToXPercent(coordinates.carimboXcm), y: cmToYPercent(coordinates.carimboYcm), w: 26, h: 7 }
  }
}

function coordinatesFromBoxes(boxes) {
  return {
    tituloXcm: percentToXCm(boxes.titulo.x),
    tituloYcm: percentToYCm(boxes.titulo.y),
    corpoXcm: percentToXCm(boxes.corpo.x),
    corpoYcm: percentToYCm(boxes.corpo.y),
    corpoMaxXcm: percentToXCm(boxes.corpo.x + boxes.corpo.w),
    corpoLimiteInferiorYcm: percentToYCm(boxes.corpo.y + boxes.corpo.h),
    cidXcm: percentToXCm(boxes.cid.x),
    cidYcm: percentToYCm(boxes.cid.y),
    encerramentoXcm: percentToXCm(boxes.encerramento.x),
    encerramentoYcm: percentToYCm(boxes.encerramento.y),
    carimboXcm: percentToXCm(boxes.carimbo.x),
    carimboYcm: percentToYCm(boxes.carimbo.y)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function CalibracaoView({ hospital, onCoordinatesSaved }) {
  const [imageUrl, setImageUrl] = useState("")
  const [sourceImageUrl, setSourceImageUrl] = useState("")
  const [cropOpen, setCropOpen] = useState(false)
  const [boxes, setBoxes] = useState(() => boxesFromCoordinates(hospital.coordenadas))
  const [active, setActive] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const editorRef = useRef(null)

  const currentCoordinates = useMemo(() => coordinatesFromBoxes(boxes), [boxes])

  useEffect(() => {
    setBoxes(boxesFromCoordinates(hospital.coordenadas))
  }, [hospital.coordenadas])

  useEffect(() => {
    return () => {
      if (imageUrl) { window.URL.revokeObjectURL(imageUrl) }
      if (sourceImageUrl) { window.URL.revokeObjectURL(sourceImageUrl) }
    }
  }, [imageUrl, sourceImageUrl])

  function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (sourceImageUrl) window.URL.revokeObjectURL(sourceImageUrl)
    const nextUrl = window.URL.createObjectURL(file)
    setSourceImageUrl(nextUrl)
    setCropOpen(true)
    setMessage("Recorte a foto para deixar somente o relatório.")
    setError("")
  }

  async function confirmCrop(canvas) {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92)
    if (!blob) return
    if (imageUrl) window.URL.revokeObjectURL(imageUrl)
    if (sourceImageUrl) window.URL.revokeObjectURL(sourceImageUrl)
    setImageUrl(window.URL.createObjectURL(blob))
    setSourceImageUrl("")
    setCropOpen(false)
    setBoxes(boxesFromCoordinates(hospital.coordenadas))
    setMessage("Recorte aplicado. Agora ajuste as caixas do relatório.")
  }

  function cancelCrop() {
    if (sourceImageUrl) window.URL.revokeObjectURL(sourceImageUrl)
    setSourceImageUrl("")
    setCropOpen(false)
  }

  function startMove(event, key, mode) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActive({ key, mode, startX: event.clientX, startY: event.clientY, initial: boxes[key] })
  }

  function handlePointerMove(event) {
    if (!active || !editorRef.current) return
    const rect = editorRef.current.getBoundingClientRect()
    const dx = (event.clientX - active.startX) / rect.width * 100
    const dy = (event.clientY - active.startY) / rect.height * 100
    setBoxes(current => {
      const next = { ...current }
      const original = active.initial
      if (active.mode === "resize") {
        next[active.key] = { ...original, w: clamp(original.w + dx, 8, 100 - original.x), h: clamp(original.h + dy, 4, 100 - original.y) }
      } else {
        next[active.key] = { ...original, x: clamp(original.x + dx, 0, 100 - original.w), y: clamp(original.y + dy, 0, 100 - original.h) }
      }
      return next
    })
  }

  function stopMove() { setActive(null) }

  async function saveCoordinates() {
    try {
      setSaving(true); setError(""); setMessage("")
      const saved = await updateCoordinates(hospital.id, currentCoordinates)
      onCoordinatesSaved(saved)
      setMessage("Coordenadas atualizadas")
    } catch (apiError) { setError(apiError.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Ajuste visual das coordenadas</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">Envie uma foto do relatório vazio. Recorte para aparecer somente a folha.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <label className="cursor-pointer rounded-2xl bg-ink px-4 py-3 text-center text-sm font-extrabold text-paper">
          Tirar foto
          <input type="file" accept={imageAccept} capture="environment" onChange={handleFile} className="hidden" />
        </label>
        <label className="cursor-pointer rounded-2xl border border-ink/15 px-4 py-3 text-center text-sm font-extrabold text-ink">
          Selecionar da galeria
          <input type="file" accept={imageAccept} onChange={handleFile} className="hidden" />
        </label>
      </div>
      {(message || error) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div ref={editorRef} onPointerMove={handlePointerMove} onPointerUp={stopMove} onPointerCancel={stopMove}
          className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-2xl border border-ink/15 bg-paper shadow-sm"
          style={{ aspectRatio: `${paper.width} / ${paper.height}` }}>
          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-8 text-center text-sm font-bold text-ink/45">Envie uma foto e recorte</div>}
          {Object.entries(boxes).map(([key, box]) => (
            <div key={key} onPointerDown={event => startMove(event, key, "move")}
              className={`absolute cursor-move rounded-lg border-2 ${boxColors[key]} p-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink shadow-sm`}
              style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
              {key === "carimbo" && hospital.carimboImagem ? <img src={hospital.carimboImagem} alt="" className="h-full w-full object-contain contrast-150 brightness-90 saturate-115" /> : boxLabels[key]}
              <button type="button" onPointerDown={event => startMove(event, key, "resize")}
                className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 rounded-full bg-ink text-[0px] leading-none text-paper shadow-sm">
                redim
              </button>
            </div>
          ))}
        </div>
        <aside className="rounded-2xl border border-ink/10 bg-paper/45 p-4">
          <h3 className="font-display text-2xl text-ink">Coordenadas</h3>
          <div className="mt-3 max-h-[30rem] space-y-2 overflow-auto pr-1 text-xs font-bold text-ink/70">
            {Object.entries(currentCoordinates).map(([key, value]) => <div key={key} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2"><span>{key}</span><span>{value}</span></div>)}
          </div>
          <button onClick={saveCoordinates} disabled={saving} className="mt-4 w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-paper disabled:opacity-50">
            Salvar coordenadas
          </button>
        </aside>
      </div>
      <ImageCropModal open={cropOpen} sourceImageUrl={sourceImageUrl} title="Deixe apenas o relatório"
        description="Arraste a caixa para cobrir somente a folha."
        areaLabel="Área do relatório" aspectRatio={paper.width / paper.height}
        onCancel={cancelCrop} onConfirm={confirmCrop} />
    </div>
  )
}

function RelatorioView({ hospital, onHospitalSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    return () => { if (previewUrl) window.URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    setPreviewUrl(window.URL.createObjectURL(file))
    setSuccess("Arquivo selecionado. Clique em Salvar para finalizar.")
    setError("")
  }

  async function saveReport() {
    const canvas = document.createElement("canvas")
    const img = new Image()
    img.src = previewUrl
    await new Promise(resolve => { img.onload = resolve })
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL("image/png")
    try {
      setBusy(true); setError(""); setSuccess("")
      const saved = await updateReportImage(hospital.id, { relatorioImagem: dataUrl })
      onHospitalSaved?.(saved)
      setSuccess("Relatório escaneado salvo como fundo do PDF")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  async function removeReport() {
    try {
      setBusy(true); setError(""); setSuccess("")
      const saved = await updateReportImage(hospital.id, { relatorioImagem: null })
      onHospitalSaved?.(saved)
      if (previewUrl) window.URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")
      setSuccess("Relatório removido")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Relatório escaneado</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">Envie a imagem do relatório timbrado escaneado. Essa imagem será usada como fundo ao imprimir "com relatório" na fila.</p>
      </div>

      {(error || success) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || success}</div>}

      <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
          <h3 className="font-display text-2xl text-ink">Upload</h3>
          <p className="mt-1 text-sm font-semibold text-ink/55">Envie uma foto ou scan do relatório timbrado (PNG ou JPEG).</p>
          <div className="mt-4 space-y-3">
            <label className="block cursor-pointer rounded-2xl bg-ink px-4 py-3 text-center text-sm font-extrabold text-paper">
              Selecionar imagem
              <input type="file" accept={imageAccept} onChange={handleFile} className="hidden" />
            </label>
            {previewUrl && <button type="button" onClick={saveReport} disabled={busy} className="w-full rounded-2xl bg-moss px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">Salvar relatório</button>}
            {hospital.relatorioImagem && <button type="button" onClick={removeReport} disabled={busy} className="w-full rounded-2xl border border-clay/30 px-4 py-3 text-sm font-extrabold text-clay disabled:opacity-50">Remover relatório atual</button>}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-display text-2xl text-ink">Pré-visualização</h3>
          <p className="mt-1 text-sm font-semibold text-ink/55">Imagem que será usada como fundo na impressão.</p>
          <div className="mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/40 p-5">
            {previewUrl ? <img src={previewUrl} alt="Relatório selecionado" className="max-h-96 w-full object-contain" />
              : hospital.relatorioImagem ? <img src={hospital.relatorioImagem} alt="Relatório cadastrado" className="max-h-96 w-full object-contain" />
              : <span className="text-center text-sm font-bold text-ink/45">Nenhum relatório cadastrado.</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalibracaoTab({ hospital, onCoordinatesSaved }) {
  const [activeSubtab, setActiveSubtab] = useState(subtabs[0].id)

  function handleHospitalSaved(nextHospital) {
    onCoordinatesSaved(nextHospital.coordenadas)
  }

  return (
    <section className="space-y-5 rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-moss">Calibração do timbrado</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Configuração do relatório</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">{activeSubtab === "calibracao" ? "Ajuste as coordenadas do timbrado por foto." : "Envie o relatório escaneado para impressão com fundo."}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-paper p-1">
          {subtabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveSubtab(tab.id)}
              className={`rounded-xl px-3 py-3 text-xs font-extrabold transition ${activeSubtab === tab.id ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubtab === "calibracao" && <CalibracaoView hospital={hospital} onCoordinatesSaved={onCoordinatesSaved} />}
      {activeSubtab === "relatorio" && <RelatorioView hospital={hospital} onHospitalSaved={handleHospitalSaved} />}
    </section>
  )
}
