import { useEffect, useRef, useState } from "react"

const defaultCropBox = { x: 8, y: 4, w: 84, h: 92 }
const cropHandles = [
  { mode: "nw", corner: true, className: "-left-1.5 -top-1.5 h-5 w-5 cursor-nwse-resize rounded-full" },
  { mode: "n", corner: false, className: "left-1/2 -top-1.5 h-5 w-8 -translate-x-1/2 cursor-ns-resize rounded-full" },
  { mode: "ne", corner: true, className: "-right-1.5 -top-1.5 h-5 w-5 cursor-nesw-resize rounded-full" },
  { mode: "e", corner: false, className: "-right-1.5 top-1/2 h-8 w-5 -translate-y-1/2 cursor-ew-resize rounded-full" },
  { mode: "se", corner: true, className: "-bottom-1.5 -right-1.5 h-5 w-5 cursor-nwse-resize rounded-full" },
  { mode: "s", corner: false, className: "-bottom-1.5 left-1/2 h-5 w-8 -translate-x-1/2 cursor-ns-resize rounded-full" },
  { mode: "sw", corner: true, className: "-bottom-1.5 -left-1.5 h-5 w-5 cursor-nesw-resize rounded-full" },
  { mode: "w", corner: false, className: "-left-1.5 top-1/2 h-8 w-5 -translate-y-1/2 cursor-ew-resize rounded-full" }
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function createDefaultCropBox(aspectRatio) {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return defaultCropBox
  }

  const margin = 6
  const availableWidth = 100 - margin * 2
  const availableHeight = 100 - margin * 2
  let width = availableWidth
  let height = width / aspectRatio

  if (height > availableHeight) {
    height = availableHeight
    width = height * aspectRatio
  }

  return {
    x: Number(((100 - width) / 2).toFixed(3)),
    y: Number(((100 - height) / 2).toFixed(3)),
    w: Number(width.toFixed(3)),
    h: Number(height.toFixed(3))
  }
}

export function ImageCropModal({
  open,
  sourceImageUrl,
  eyebrow = "Recorte obrigatorio",
  title = "Ajuste o recorte",
  description = "Arraste a caixa para selecionar apenas a area necessaria.",
  areaLabel = "Area selecionada",
  confirmLabel = "Usar recorte",
  aspectRatio = null,
  onCancel,
  onConfirm
}) {
  const [cropBox, setCropBox] = useState(defaultCropBox)
  const [activeCrop, setActiveCrop] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const cropStageRef = useRef(null)
  const cropImageRef = useRef(null)

  useEffect(() => {
    if (open) {
      setCropBox(createDefaultCropBox(aspectRatio))
      setActiveCrop(null)
      setBusy(false)
      setError("")
    }
  }, [aspectRatio, open, sourceImageUrl])

  if (!open) {
    return null
  }

  function startCrop(event, mode) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveCrop({
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: cropBox
    })
  }

  function handleCropMove(event) {
    if (!activeCrop || !cropStageRef.current) {
      return
    }

    const rect = cropStageRef.current.getBoundingClientRect()
    const dx = (event.clientX - activeCrop.startX) / rect.width * 100
    const dy = (event.clientY - activeCrop.startY) / rect.height * 100

    setCropBox(() => {
      const original = activeCrop.initial

      if (activeCrop.mode === "move") {
        return {
          ...original,
          x: clamp(original.x + dx, 0, 100 - original.w),
          y: clamp(original.y + dy, 0, 100 - original.h)
        }
      }

      if (aspectRatio && ["nw", "ne", "sw", "se"].includes(activeCrop.mode)) {
        const minWidth = 12
        const minHeight = minWidth / aspectRatio
        const mode = activeCrop.mode
        const anchorX = mode.includes("w") ? original.x + original.w : original.x
        const anchorY = mode.includes("n") ? original.y + original.h : original.y
        const cornerX = mode.includes("w") ? original.x + dx : original.x + original.w + dx
        const cornerY = mode.includes("n") ? original.y + dy : original.y + original.h + dy
        const dirX = mode.includes("w") ? -1 : 1
        const dirY = mode.includes("n") ? -1 : 1
        const maxWidth = dirX === 1 ? 100 - anchorX : anchorX
        const maxHeight = dirY === 1 ? 100 - anchorY : anchorY
        let width = Math.abs(cornerX - anchorX)
        let height = Math.abs(cornerY - anchorY)

        if (width / Math.max(height, 0.001) > aspectRatio) {
          width = height * aspectRatio
        } else {
          height = width / aspectRatio
        }

        width = Math.max(width, minWidth)
        height = Math.max(height, minHeight)

        const scale = Math.min(1, maxWidth / width, maxHeight / height)
        width *= scale
        height *= scale

        const left = dirX === 1 ? anchorX : anchorX - width
        const top = dirY === 1 ? anchorY : anchorY - height

        return {
          x: Number(clamp(left, 0, 100 - width).toFixed(3)),
          y: Number(clamp(top, 0, 100 - height).toFixed(3)),
          w: Number(width.toFixed(3)),
          h: Number(height.toFixed(3))
        }
      }

      const minSize = 12
      const originalRight = original.x + original.w
      const originalBottom = original.y + original.h
      let nextLeft = original.x
      let nextTop = original.y
      let nextRight = originalRight
      let nextBottom = originalBottom

      if (activeCrop.mode.includes("w")) {
        nextLeft = clamp(original.x + dx, 0, originalRight - minSize)
      }

      if (activeCrop.mode.includes("e")) {
        nextRight = clamp(originalRight + dx, original.x + minSize, 100)
      }

      if (activeCrop.mode.includes("n")) {
        nextTop = clamp(original.y + dy, 0, originalBottom - minSize)
      }

      if (activeCrop.mode.includes("s")) {
        nextBottom = clamp(originalBottom + dy, original.y + minSize, 100)
      }

      return {
        x: nextLeft,
        y: nextTop,
        w: nextRight - nextLeft,
        h: nextBottom - nextTop
      }
    })
  }

  function stopCrop() {
    setActiveCrop(null)
  }

  async function confirmCrop() {
    const image = cropImageRef.current

    if (!image) {
      return
    }

    const canvas = document.createElement("canvas")
    const sourceX = cropBox.x / 100 * image.naturalWidth
    const sourceY = cropBox.y / 100 * image.naturalHeight
    const sourceW = cropBox.w / 100 * image.naturalWidth
    const sourceH = cropBox.h / 100 * image.naturalHeight
    canvas.width = Math.max(1, Math.round(sourceW))
    canvas.height = Math.max(1, Math.round(sourceH))
    const context = canvas.getContext("2d")

    if (!context) {
      return
    }

    try {
      setBusy(true)
      setError("")
      context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height)
      await onConfirm(canvas)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBusy(false)
    }
  }

  const visibleHandles = aspectRatio ? cropHandles.filter(handle => handle.corner) : cropHandles

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-3">
      <div className="max-h-[96vh] w-full max-w-5xl overflow-auto rounded-[1.5rem] bg-white p-4 shadow-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">{eyebrow}</p>
            <h3 className="mt-2 font-display text-3xl text-ink">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ink/60">{description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-72">
            <button type="button" onClick={onCancel} disabled={busy} className="rounded-2xl border border-ink/15 px-4 py-3 text-sm font-extrabold text-ink disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={confirmCrop} disabled={busy} className="rounded-2xl bg-ink px-4 py-3 text-sm font-extrabold text-paper disabled:opacity-50">{busy ? "Processando" : confirmLabel}</button>
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm font-bold text-clay">{error}</div>}
        <div className="mt-5 overflow-auto rounded-2xl bg-paper p-3">
          <div
            ref={cropStageRef}
            onPointerMove={handleCropMove}
            onPointerUp={stopCrop}
            onPointerCancel={stopCrop}
            className="relative mx-auto w-fit max-w-full touch-none"
          >
            <img ref={cropImageRef} src={sourceImageUrl} alt="Imagem para recortar" className="block max-h-[68vh] max-w-full select-none rounded-xl" />
            <div className="absolute inset-0 bg-ink/35" />
            <div
              onPointerDown={event => startCrop(event, "move")}
              className="absolute cursor-move border-2 border-paper bg-white/10 shadow-[0_0_0_9999px_rgba(16,25,54,0.45)]"
              style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}
            >
              <div className="absolute left-2 top-2 rounded-full bg-paper px-3 py-1 text-xs font-extrabold text-ink">{areaLabel}</div>
              {visibleHandles.map(handle => (
                <button
                  key={handle.mode}
                  type="button"
                  onPointerDown={event => startCrop(event, handle.mode)}
                  className={`absolute bg-paper/95 text-[0px] text-ink shadow-sm ${handle.className}`}
                >
                  {handle.mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
