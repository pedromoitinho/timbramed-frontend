import { useEffect, useMemo, useRef, useState } from "react"
import { ImageCropModal } from "./ImageCropModal.jsx"
import { updateCoordinates } from "../services/api.js"

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

export function CalibracaoTab({ hospital, onCoordinatesSaved }) {
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
      if (imageUrl) {
        window.URL.revokeObjectURL(imageUrl)
      }

      if (sourceImageUrl) {
        window.URL.revokeObjectURL(sourceImageUrl)
      }
    }
  }, [imageUrl, sourceImageUrl])

  function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (sourceImageUrl) {
      window.URL.revokeObjectURL(sourceImageUrl)
    }

    const nextUrl = window.URL.createObjectURL(file)
    setSourceImageUrl(nextUrl)
    setCropOpen(true)
    setMessage("Recorte a foto para deixar somente o relatório. Remova mesa, fundo e bordas externas antes de calibrar.")
    setError("")
  }

  async function confirmCrop(canvas) {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92)

    if (!blob) {
      return
    }

    if (imageUrl) {
      window.URL.revokeObjectURL(imageUrl)
    }

    if (sourceImageUrl) {
      window.URL.revokeObjectURL(sourceImageUrl)
    }

    setImageUrl(window.URL.createObjectURL(blob))
    setSourceImageUrl("")
    setCropOpen(false)
    setBoxes(boxesFromCoordinates(hospital.coordenadas))
    setMessage("Recorte aplicado. Agora ajuste as caixas do relatório arrastando ou redimensionando.")
  }

  function cancelCrop() {
    if (sourceImageUrl) {
      window.URL.revokeObjectURL(sourceImageUrl)
    }

    setSourceImageUrl("")
    setCropOpen(false)
  }

  function startMove(event, key, mode) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActive({
      key,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: boxes[key]
    })
  }

  function handlePointerMove(event) {
    if (!active || !editorRef.current) {
      return
    }

    const rect = editorRef.current.getBoundingClientRect()
    const dx = (event.clientX - active.startX) / rect.width * 100
    const dy = (event.clientY - active.startY) / rect.height * 100

    setBoxes(current => {
      const next = { ...current }
      const original = active.initial

      if (active.mode === "resize") {
        const w = clamp(original.w + dx, 8, 100 - original.x)
        const h = clamp(original.h + dy, 4, 100 - original.y)
        next[active.key] = { ...original, w, h }
      } else {
        const x = clamp(original.x + dx, 0, 100 - original.w)
        const y = clamp(original.y + dy, 0, 100 - original.h)
        next[active.key] = { ...original, x, y }
      }

      return next
    })
  }

  function stopMove() {
    setActive(null)
  }

  async function saveCoordinates() {
    try {
      setSaving(true)
      setError("")
      setMessage("")
      const saved = await updateCoordinates(hospital.id, currentCoordinates)
      onCoordinatesSaved(saved)
      setMessage("Coordenadas atualizadas no plano cartesiano")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-moss">Calibração do timbrado</p>
        <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Ajuste visual das coordenadas</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/60">Envie uma foto do relatório vazio. Antes de calibrar, recorte a imagem para aparecer somente a folha do relatório, sem fundo.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <label className="cursor-pointer rounded-2xl bg-ink px-4 py-3 text-center text-sm font-extrabold text-paper">
          Tirar foto
          <input type="file" accept={imageAccept} capture="environment" onChange={handleFile} className="hidden" />
        </label>
        <label className="cursor-pointer rounded-2xl border border-ink/15 px-4 py-3 text-center text-sm font-extrabold text-ink">
          Selecionar da galeria
          <input type="file" accept={imageAccept} onChange={handleFile} className="hidden" />
        </label>
      </div>
      {(message || error) && <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${error ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>{error || message}</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={editorRef}
          onPointerMove={handlePointerMove}
          onPointerUp={stopMove}
          onPointerCancel={stopMove}
          className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-2xl border border-ink/15 bg-paper shadow-sm"
          style={{ aspectRatio: `${paper.width} / ${paper.height}` }}
        >
          {imageUrl ? <img src={imageUrl} alt="Relatório vazio recortado" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-8 text-center text-sm font-bold text-ink/45">Envie uma foto e recorte para visualizar somente o relatório</div>}
          {Object.entries(boxes).map(([key, box]) => (
            <div
              key={key}
              onPointerDown={event => startMove(event, key, "move")}
              className={`absolute cursor-move rounded-lg border-2 ${boxColors[key]} p-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink shadow-sm`}
              style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
            >
              {key === "carimbo" && hospital.carimboImagem ? <img src={hospital.carimboImagem} alt="Carimbo cadastrado" className="h-full w-full object-contain contrast-150 brightness-90 saturate-115" /> : boxLabels[key]}
              <button
                type="button"
                onPointerDown={event => startMove(event, key, "resize")}
                className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 rounded-full bg-ink text-[0px] leading-none text-paper shadow-sm"
              >
                redimensionar
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

      <ImageCropModal
        open={cropOpen}
        sourceImageUrl={sourceImageUrl}
        title="Deixe apenas o relatório"
        description="Arraste a caixa para cobrir somente a folha. Retire mesa, fundo, dedos e sombras externas para não atrapalhar a calibração."
        areaLabel="Área do relatório"
        aspectRatio={paper.width / paper.height}
        onCancel={cancelCrop}
        onConfirm={confirmCrop}
      />
    </section>
  )
}
