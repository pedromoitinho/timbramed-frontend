import { useEffect, useMemo, useRef, useState } from "react"
import { ImageCropModal } from "./ImageCropModal.jsx"
import { updateCoordinates, updateExamCoordinates, updateExamImage, updateReportImage } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"

const paper = { width: 14.8, height: 21 }
const reportTitle = "RELATÓRIO"
const previewFontFamily = '"Source Serif 4", serif'
const minBodyFontSizePx = 4
const maxBodyFontSizePx = 30
const titleFontSize = 13.5
const lineGapPt = 2
const boxLabels = {
  titulo: "Titulo",
  corpo: "Corpo do texto",
  cid: "CID",
  carimbo: "Carimbo médico"
}
const boxColors = {
  titulo: "border-clay bg-clay/15",
  corpo: "border-pen bg-pen/10",
  cid: "border-moss bg-moss/15",
  carimbo: "border-clay bg-clay/15"
}
const imageAccept = "image" + "/" + "*"

const subtabs = [
  { id: "calibracao", label: "Calibração" },
  { id: "relatorio", label: "Relatório" },
  { id: "exame", label: "Exame" },
  { id: "calibracao-exame", label: "Calibração Exame" }
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

function ptToPx(pt) { return pt * 4 / 3 }

function textWidthCm(text, fontSizePx) {
  if (!text) return 0
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx.font = `${fontSizePx}px ${previewFontFamily}`
  return ctx.measureText(text).width / 96 * 2.54
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/ +/g, " ")
    .trim()
}

function capitalizeName(value) {
  return String(value || "").trim().replace(/\b\w/g, c => c.toUpperCase())
}

function buildReportPreview(report) {
  const message = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam."

  return {
    title: reportTitle,
    bodyText: normalizeWhitespace(message),
    cidText: "CID: M51.1, G56.0, M79.7",
  }
}

function boxesFromCoordinates(coordinates, preview) {
  const bodyX = cmToXPercent(coordinates.corpoXcm)
  const bodyY = cmToYPercent(coordinates.corpoYcm)
  const bodyW = cmToXPercent(Number(coordinates.corpoMaxXcm) - Number(coordinates.corpoXcm))
  const bodyH = cmToYPercent(Number(coordinates.corpoLimiteInferiorYcm) - Number(coordinates.corpoYcm))
  const cidW = Math.max(textWidthCm(preview.cidText, ptToPx(10.5)) + 0.35, 5.2)
  return {
    titulo: { x: cmToXPercent(coordinates.tituloXcm), y: cmToYPercent(coordinates.tituloYcm), w: cmToXPercent(textWidthCm(preview.title, ptToPx(titleFontSize))), h: cmToYPercent(0.7) },
    corpo: { x: bodyX, y: bodyY, w: bodyW, h: bodyH },
    cid: { x: cmToXPercent(coordinates.cidXcm), y: cmToYPercent(coordinates.cidYcm), w: cmToXPercent(cidW), h: cmToYPercent(0.95) },
    carimbo: { x: cmToXPercent(coordinates.carimboXcm), y: cmToYPercent(coordinates.carimboYcm), w: cmToXPercent(4.2), h: cmToYPercent(1.85) }
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
    carimboXcm: percentToXCm(boxes.carimbo.x),
    carimboYcm: percentToYCm(boxes.carimbo.y)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function wrapTextLines(text, fontSizePx, widthPx) {
  if (!text || widthPx <= 0) return []
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx.font = `${fontSizePx}px ${previewFontFamily}`
  const lines = []

  String(text).split("\n").forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      lines.push({ blank: true, widthPercent: 0 })
      return
    }

    let line = ""
    words.forEach(word => {
      const nextLine = line ? `${line} ${word}` : word
      if (!line || ctx.measureText(nextLine).width <= widthPx) {
        line = nextLine
      } else {
        lines.push({ blank: false, widthPercent: clamp(ctx.measureText(line).width / widthPx * 100, 12, 100) })
        line = word
      }
    })
    if (line) {
      lines.push({ blank: false, widthPercent: clamp(ctx.measureText(line).width / widthPx * 100, 12, 100) })
    }
  })

  return lines
}

function measureWrappedHeightPx(text, fontSizePx, widthPx) {
  const lines = wrapTextLines(text, fontSizePx, widthPx)
  return lines.length * (fontSizePx * 1.2 + ptToPx(lineGapPt))
}

function computeAutoBodyFontSizePx(text, box) {
  const widthPx = (box.w / 100 * paper.width) / 2.54 * 96
  const heightPx = (box.h / 100 * paper.height) / 2.54 * 96
  const safeHeightPx = heightPx * 0.96

  for (let size = maxBodyFontSizePx; size >= minBodyFontSizePx; size -= 0.25) {
    if (measureWrappedHeightPx(text, size, widthPx) <= safeHeightPx) {
      return size
    }
  }

  return minBodyFontSizePx
}

function computeBodyPreviewMetrics(text, box) {
  const widthPx = (box.w / 100 * paper.width) / 2.54 * 96
  const paperHeightPx = paper.height / 2.54 * 96
  const fontSizePx = computeAutoBodyFontSizePx(text, box)
  const lineHeightPx = fontSizePx * 1.2 + ptToPx(lineGapPt)
  const lines = wrapTextLines(text, fontSizePx, widthPx)
  const heightPercent = Math.min(box.h, lines.length * lineHeightPx / paperHeightPx * 100)

  return {
    fontSizePx,
    lines,
    heightPercent: Math.max(heightPercent, cmToYPercent(0.7)),
    lineHeightPercent: lineHeightPx / Math.max(lines.length * lineHeightPx, 1) * 100
  }
}

function CalibracaoView({ hospital, onCoordinatesSaved, onSwitchToRelatorio }) {
  const previewReport = usePrintQueueStore(state => state.fila[0] || state.concluidos[0])
  const reportPreview = useMemo(() => buildReportPreview(previewReport), [previewReport])
  const [boxes, setBoxes] = useState(() => boxesFromCoordinates(hospital.coordenadas, reportPreview))
  const [active, setActive] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const editorRef = useRef(null)
  const hasReport = !!hospital.relatorioImagem

  const bodyPreviewMetrics = useMemo(() => computeBodyPreviewMetrics(reportPreview.bodyText, boxes.corpo), [boxes.corpo, reportPreview.bodyText])
  const currentCoordinates = useMemo(() => coordinatesFromBoxes(boxes), [boxes])

  useEffect(() => {
    setBoxes(boxesFromCoordinates(hospital.coordenadas, reportPreview))
  }, [hospital.coordenadas, reportPreview])

  function startMove(event, key, mode, initialBox = boxes[key]) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActive({
      key,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: initialBox
    })
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
      } else if (active.mode === "resize-w") {
        next[active.key] = { ...original, w: clamp(original.w + dx, 8, 100 - original.x) }
      } else if (active.mode === "resize-h") {
        next[active.key] = { ...original, h: clamp(original.h + dy, 4, 100 - original.y) }
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

  function renderReportBoxContent(key) {
    if (key === "carimbo" && hospital.carimboImagem) {
      return <img src={hospital.carimboImagem} alt="" className="pointer-events-none h-full w-full object-contain contrast-150 brightness-90 saturate-115" />
    }

    if (key === "titulo") {
      return <span className="pointer-events-none rounded-sm bg-paper/80 px-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">{boxLabels[key]}</span>
    }

    if (key === "corpo") {
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="leading-[1.2] text-ink/80"
            style={{
              fontFamily: previewFontFamily,
              fontSize: `${bodyPreviewMetrics.fontSizePx}px`,
              textAlign: "justify",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              hyphens: "auto"
            }}
          >
            {reportPreview.bodyText}
          </div>
        </div>
      )
    }

    if (key === "cid") {
      return (
        <span
          className="pointer-events-none absolute left-0 top-0 inline-block rounded-sm bg-paper/80 px-1 py-0.5 font-extrabold tracking-[0.12em] text-ink"
            style={{
              fontFamily: previewFontFamily,
              fontSize: `${ptToPx(10.5)}px`,
              whiteSpace: "nowrap"
            }}
        >
          {reportPreview.cidText}
        </span>
      )
    }

    return <span className="pointer-events-none p-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">{boxLabels[key]}</span>
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Ajuste visual das coordenadas</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">O relatório escaneado aparece automaticamente como fundo para ajustar as caixas de texto.</p>
      </div>
      {!hasReport && (
        <div className="rounded-2xl border border-dashed border-clay/30 bg-clay/5 p-5 text-center">
          <p className="text-sm font-bold text-clay">Nenhum relatório enviado ainda.</p>
          <p className="mt-1 text-sm font-semibold text-ink/55">Envie o relatório timbrado escaneado primeiro.</p>
          <button type="button" onClick={onSwitchToRelatorio}
            className="mt-4 rounded-2xl bg-ink px-6 py-3 text-sm font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5">
            Ir para Relatório
          </button>
        </div>
      )}
      {(message || error) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div ref={editorRef} onPointerMove={handlePointerMove} onPointerUp={stopMove} onPointerCancel={stopMove}
          className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-2xl border border-ink/15 bg-paper shadow-sm"
          style={{ aspectRatio: `${paper.width} / ${paper.height}` }}>
          {hasReport ? <img src={hospital.relatorioImagem} alt="" className="h-full w-full object-fill" /> : <div className="flex h-full items-center justify-center p-8 text-center text-sm font-bold text-ink/45">Envie um relatório para ajustar as coordenadas</div>}
          {hasReport && Object.entries(boxes).map(([key, box]) => {
            return (
              <div key={key} onPointerDown={event => startMove(event, key, "move", box)}
                className={`absolute cursor-move rounded-lg border-2 ${boxColors[key]} text-ink shadow-sm`}
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
                {renderReportBoxContent(key)}
                {key === "corpo" && (
                  <>
                    <div onPointerDown={event => startMove(event, key, "resize-w", box)}
                      className="absolute right-0 top-1/2 h-8 w-3 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-full bg-ink/70 text-[0px] leading-none text-paper shadow-sm" />
                    <div onPointerDown={event => startMove(event, key, "resize-h", box)}
                      className="absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full bg-ink/70 text-[0px] leading-none text-paper shadow-sm" />
                    <button type="button" onPointerDown={event => startMove(event, key, "resize", box)}
                      className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full bg-ink text-[0px] leading-none text-paper shadow-sm">
                      redim
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <aside className="rounded-2xl border border-ink/10 bg-paper/45 p-4">
          <h3 className="font-display text-2xl text-ink">Coordenadas</h3>
          <div className="mt-3 rounded-2xl border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink">
            Fonte do corpo: {bodyPreviewMetrics.fontSizePx.toFixed(1)}px
          </div>
          <div className="mt-3 max-h-[30rem] space-y-2 overflow-auto pr-1 text-xs font-bold text-ink/70">
            {Object.entries(currentCoordinates).map(([key, value]) => <div key={key} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2"><span>{key}</span><span>{value}</span></div>)}
          </div>
          <button onClick={saveCoordinates} disabled={saving} className="mt-4 w-full rounded-2xl bg-ink px-4 py-3 font-extrabold text-paper disabled:opacity-50">
            Salvar coordenadas
          </button>
        </aside>
      </div>
    </div>
  )
}

function RelatorioView({ hospital, onHospitalSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [cropSourceUrl, setCropSourceUrl] = useState("")
  const [cropOpen, setCropOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl)
      if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    }
  }, [previewUrl, cropSourceUrl])

  function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl(window.URL.createObjectURL(file))
    setCropOpen(true)
    setError("")
    setSuccess("")
  }

  function cancelCrop() {
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl("")
    setCropOpen(false)
  }

  async function confirmCrop(canvas) {
    const blob = await canvasToBlob(canvas, "image/png", 0.95)
    if (!blob) return
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setPreviewUrl(window.URL.createObjectURL(blob))
    setCropSourceUrl("")
    setCropOpen(false)
    setSuccess("Recorte aplicado. Clique em Salvar para finalizar.")
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

      <ImageCropModal open={cropOpen} sourceImageUrl={cropSourceUrl} title="Recorte o relatório"
        description="Arraste a caixa para deixar somente a área útil do relatório timbrado."
        areaLabel="Área do relatório" aspectRatio={paper.width / paper.height} onCancel={cancelCrop} onConfirm={confirmCrop} />
    </div>
  )
}

function ExameView({ hospital, onHospitalSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [cropSourceUrl, setCropSourceUrl] = useState("")
  const [cropOpen, setCropOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl)
      if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    }
  }, [previewUrl, cropSourceUrl])

  function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl(window.URL.createObjectURL(file))
    setCropOpen(true)
    setError("")
    setSuccess("")
  }

  function cancelCrop() {
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setCropSourceUrl("")
    setCropOpen(false)
  }

  async function confirmCrop(canvas) {
    const blob = await canvasToBlob(canvas, "image/png", 0.95)
    if (!blob) return
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    if (cropSourceUrl) window.URL.revokeObjectURL(cropSourceUrl)
    setPreviewUrl(window.URL.createObjectURL(blob))
    setCropSourceUrl("")
    setCropOpen(false)
    setSuccess("Recorte aplicado. Clique em Salvar para finalizar.")
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
      const saved = await updateExamImage(hospital.id, { exameImagem: dataUrl })
      onHospitalSaved?.(saved)
      setSuccess("Exame escaneado salvo como fundo do PDF")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  async function removeReport() {
    try {
      setBusy(true); setError(""); setSuccess("")
      const saved = await updateExamImage(hospital.id, { exameImagem: null })
      onHospitalSaved?.(saved)
      if (previewUrl) window.URL.revokeObjectURL(previewUrl)
      setPreviewUrl("")
      setSuccess("Exame removido")
    } catch (apiError) { setError(apiError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Exame escaneado</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">Envie a foto do formulário de solicitação de exame. Essa imagem será usada como fundo ao imprimir.</p>
      </div>

      {(error || success) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || success}</div>}

      <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
          <h3 className="font-display text-2xl text-ink">Upload</h3>
          <p className="mt-1 text-sm font-semibold text-ink/55">Envie uma foto ou scan do formulário de exame (PNG ou JPEG).</p>
          <div className="mt-4 space-y-3">
            <label className="block cursor-pointer rounded-2xl bg-ink px-4 py-3 text-center text-sm font-extrabold text-paper">
              Selecionar imagem
              <input type="file" accept={imageAccept} onChange={handleFile} className="hidden" />
            </label>
            {previewUrl && <button type="button" onClick={saveReport} disabled={busy} className="w-full rounded-2xl bg-moss px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">Salvar exame</button>}
            {hospital.exameImagem && <button type="button" onClick={removeReport} disabled={busy} className="w-full rounded-2xl border border-clay/30 px-4 py-3 text-sm font-extrabold text-clay disabled:opacity-50">Remover exame atual</button>}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-display text-2xl text-ink">Pré-visualização</h3>
          <p className="mt-1 text-sm font-semibold text-ink/55">Imagem que será usada como fundo na impressão de exames.</p>
          <div className="mt-4 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/40 p-5">
            {previewUrl ? <img src={previewUrl} alt="Exame selecionado" className="max-h-96 w-full object-contain" />
              : hospital.exameImagem ? <img src={hospital.exameImagem} alt="Exame cadastrado" className="max-h-96 w-full object-contain" />
              : <span className="text-center text-sm font-bold text-ink/45">Nenhum exame cadastrado.</span>}
          </div>
        </div>
      </div>

      <ImageCropModal open={cropOpen} sourceImageUrl={cropSourceUrl} title="Recorte o exame"
        description="Arraste a caixa para deixar somente a área útil do formulário de exame."
        areaLabel="Área do exame" aspectRatio={paper.width / paper.height} onCancel={cancelCrop} onConfirm={confirmCrop} />
    </div>
  )
}

const examBoxLabels = {
  nome: "Nome",
  endereco: "Endereco",
  identidade: "Identidade",
  motivo: "Motivo",
  exameSolicitado: "Exame solicitado",
  codigo: "Codigo",
  paciente: "Paciente"
}
const examBoxColors = {
  nome: "border-clay bg-clay/15",
  endereco: "border-pen bg-pen/10",
  identidade: "border-moss bg-moss/15",
  motivo: "border-ink bg-ink/10",
  exameSolicitado: "border-clay bg-clay/15",
  codigo: "border-pen bg-pen/10",
  paciente: "border-moss bg-moss/15"
}
const defaultExamBoxes = {
  nome: { x: 10, y: 5, w: 30, h: 5 },
  endereco: { x: 10, y: 12, w: 40, h: 5 },
  identidade: { x: 10, y: 19, w: 25, h: 5 },
  motivo: { x: 10, y: 26, w: 50, h: 6 },
  exameSolicitado: { x: 10, y: 34, w: 35, h: 5 },
  codigo: { x: 10, y: 41, w: 20, h: 5 },
  paciente: { x: 10, y: 48, w: 30, h: 5 }
}

function boxesFromExamCoordinates(coordinates) {
  if (!coordinates) return { ...defaultExamBoxes }
  return {
    nome: { x: cmToXPercent(coordinates.nomeXcm), y: cmToYPercent(coordinates.nomeYcm), w: 30, h: 5 },
    endereco: { x: cmToXPercent(coordinates.enderecoXcm), y: cmToYPercent(coordinates.enderecoYcm), w: 40, h: 5 },
    identidade: { x: cmToXPercent(coordinates.identidadeXcm), y: cmToYPercent(coordinates.identidadeYcm), w: 25, h: 5 },
    motivo: { x: cmToXPercent(coordinates.motivoXcm), y: cmToYPercent(coordinates.motivoYcm), w: 50, h: 6 },
    exameSolicitado: { x: cmToXPercent(coordinates.exameSolicitadoXcm), y: cmToYPercent(coordinates.exameSolicitadoYcm), w: 35, h: 5 },
    codigo: { x: cmToXPercent(coordinates.codigoXcm), y: cmToYPercent(coordinates.codigoYcm), w: 20, h: 5 },
    paciente: { x: cmToXPercent(coordinates.pacienteXcm), y: cmToYPercent(coordinates.pacienteYcm), w: 30, h: 5 }
  }
}

function examCoordinatesFromBoxes(boxes) {
  return {
    nomeXcm: percentToXCm(boxes.nome.x),
    nomeYcm: percentToYCm(boxes.nome.y),
    enderecoXcm: percentToXCm(boxes.endereco.x),
    enderecoYcm: percentToYCm(boxes.endereco.y),
    identidadeXcm: percentToXCm(boxes.identidade.x),
    identidadeYcm: percentToYCm(boxes.identidade.y),
    motivoXcm: percentToXCm(boxes.motivo.x),
    motivoYcm: percentToYCm(boxes.motivo.y),
    exameSolicitadoXcm: percentToXCm(boxes.exameSolicitado.x),
    exameSolicitadoYcm: percentToYCm(boxes.exameSolicitado.y),
    codigoXcm: percentToXCm(boxes.codigo.x),
    codigoYcm: percentToYCm(boxes.codigo.y),
    pacienteXcm: percentToXCm(boxes.paciente.x),
    pacienteYcm: percentToYCm(boxes.paciente.y)
  }
}

function CalibracaoExameView({ hospital, onSwitchToExame, onCoordinatesSaved }) {
  const [boxes, setBoxes] = useState(() => boxesFromExamCoordinates(hospital.coordenadasExame))
  const [active, setActive] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const editorRef = useRef(null)
  const hasExame = !!hospital.exameImagem

  const currentCoordinates = useMemo(() => examCoordinatesFromBoxes(boxes), [boxes])

  useEffect(() => {
    setBoxes(boxesFromExamCoordinates(hospital.coordenadasExame))
  }, [hospital.coordenadasExame])

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
      } else if (active.mode === "resize-w") {
        next[active.key] = { ...original, w: clamp(original.w + dx, 8, 100 - original.x) }
      } else if (active.mode === "resize-h") {
        next[active.key] = { ...original, h: clamp(original.h + dy, 4, 100 - original.y) }
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
      const saved = await updateExamCoordinates(hospital.id, currentCoordinates)
      onCoordinatesSaved(saved)
      setMessage("Coordenadas do exame atualizadas")
    } catch (apiError) { setError(apiError.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Calibração do exame</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">Ajuste a posição de cada campo na solicitação de exame.</p>
      </div>
      {!hasExame && (
        <div className="rounded-2xl border border-dashed border-clay/30 bg-clay/5 p-5 text-center">
          <p className="text-sm font-bold text-clay">Nenhum exame enviado ainda.</p>
          <p className="mt-1 text-sm font-semibold text-ink/55">Envie o formulário de exame escaneado primeiro.</p>
          <button type="button" onClick={onSwitchToExame}
            className="mt-4 rounded-2xl bg-ink px-6 py-3 text-sm font-extrabold text-paper shadow-sm transition hover:-translate-y-0.5">
            Ir para Exame
          </button>
        </div>
      )}
      {(message || error) && <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div ref={editorRef} onPointerMove={handlePointerMove} onPointerUp={stopMove} onPointerCancel={stopMove}
          className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-2xl border border-ink/15 bg-paper shadow-sm"
          style={{ aspectRatio: `${paper.width} / ${paper.height}` }}>
          {hasExame ? <img src={hospital.exameImagem} alt="" className="h-full w-full object-fill" /> : <div className="flex h-full items-center justify-center p-8 text-center text-sm font-bold text-ink/45">Envie um exame para ajustar as coordenadas</div>}
          {hasExame && Object.entries(boxes).map(([key, box]) => (
            <div key={key} onPointerDown={event => startMove(event, key, "move")}
              className={`absolute cursor-move rounded-lg border-2 ${examBoxColors[key]} p-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink shadow-sm`}
              style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}>
              {examBoxLabels[key]}
              <div onPointerDown={event => startMove(event, key, "resize-w")}
                className="absolute right-0 top-1/2 h-8 w-3 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-full bg-ink/70 text-[0px] leading-none text-paper shadow-sm" />
              <div onPointerDown={event => startMove(event, key, "resize-h")}
                className="absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full bg-ink/70 text-[0px] leading-none text-paper shadow-sm" />
              <button type="button" onPointerDown={event => startMove(event, key, "resize")}
                className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full bg-ink text-[0px] leading-none text-paper shadow-sm">
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
    </div>
  )
}

export function CalibracaoTab({ hospital, onCoordinatesSaved, onHospitalSaved }) {
  const [activeSubtab, setActiveSubtab] = useState(subtabs[0].id)

  function handleHospitalSaved(nextHospital) {
    onCoordinatesSaved(nextHospital.coordenadas)
    onHospitalSaved?.(nextHospital)
  }

  function handleExamCoordinatesSaved(nextCoordinates) {
    onHospitalSaved?.({ ...hospital, coordenadasExame: nextCoordinates })
  }

  return (
    <section className="space-y-5 rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-moss">Calibração do timbrado</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Configuração do relatório</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">{activeSubtab === "calibracao" ? "Ajuste as coordenadas do timbrado por foto." : activeSubtab === "relatorio" ? "Envie o relatório escaneado para impressão com fundo." : activeSubtab === "exame" ? "Envie o formulário de exame escaneado." : "Ajuste as coordenadas dos campos do exame."}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-paper p-1">
          {subtabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveSubtab(tab.id)}
              className={`rounded-xl px-3 py-3 text-xs font-extrabold transition ${activeSubtab === tab.id ? "bg-ink text-paper" : "text-ink hover:bg-white"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubtab === "calibracao" && <CalibracaoView hospital={hospital} onCoordinatesSaved={onCoordinatesSaved} onSwitchToRelatorio={() => setActiveSubtab("relatorio")} />}
      {activeSubtab === "relatorio" && <RelatorioView hospital={hospital} onHospitalSaved={handleHospitalSaved} />}
      {activeSubtab === "exame" && <ExameView hospital={hospital} onHospitalSaved={handleHospitalSaved} />}
      {activeSubtab === "calibracao-exame" && <CalibracaoExameView hospital={hospital} onSwitchToExame={() => setActiveSubtab("exame")} onCoordinatesSaved={handleExamCoordinatesSaved} />}
    </section>
  )
}


