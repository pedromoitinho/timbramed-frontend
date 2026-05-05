import { useEffect, useMemo, useState } from "react"
import { AtendimentoTab } from "../components/AtendimentoTab.jsx"
import { CadastrosTab } from "../components/CadastrosTab.jsx"
import { CalibracaoTab } from "../components/CalibracaoTab.jsx"
import { ConcluidosTab } from "../components/ConcluidosTab.jsx"
import { FilaTab } from "../components/FilaTab.jsx"
import { getHospital, listCatalog, listHospitals, listReports } from "../services/api.js"
import { usePrintQueueStore } from "../store/usePrintQueueStore.js"

const tabs = [
  { id: "atendimento", label: "Atendimento", title: "Atendimento", description: "Preencha paciente, CID e mensagem do relatório." },
  { id: "fila", label: "Fila", title: "Fila de impressão", description: "Selecione pacientes aguardando e imprima em lote." },
  { id: "concluidos", label: "Concluídos", title: "Concluídos", description: "Selecione pacientes já impressos para re-imprimir." },
  { id: "cadastros", label: "Cadastros", title: "Cadastros", description: "Gerencie CIDs e carimbo." },
  { id: "calibracao", label: "Calibração", title: "Calibração", description: "Ajuste as coordenadas do timbrado por foto." }
]

const emptyCatalog = { cids: [] }

export function DashboardMedico({ user }) {
  const [hospital, setHospital] = useState(null)
  const [catalog, setCatalog] = useState(emptyCatalog)
  const [activeTab, setActiveTab] = useState("atendimento")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const setReports = usePrintQueueStore(state => state.setReports)

  const activeInfo = useMemo(() => tabs.find(tab => tab.id === activeTab) || tabs[0], [activeTab])

  async function reloadCatalog(nextHospitalId = hospital?.id) {
    if (!nextHospitalId) return
    const data = await listCatalog(nextHospitalId)
    setCatalog(data)
  }

  async function reloadReports(nextHospitalId = hospital?.id) {
    if (!nextHospitalId) return
    const reports = await listReports(nextHospitalId)
    setReports(reports)
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError("")
        const hospitals = await listHospitals()
        const current = hospitals.find(item => item.id === user?.hospitalAtualId) || hospitals[0]
        if (!current) {
          setHospital(null)
          setError("Nenhum ambiente configurado para este médico")
          return
        }
        const fullHospital = await getHospital(current.id)
        setHospital(fullHospital)
        const [catalogData, reports] = await Promise.all([listCatalog(current.id), listReports(current.id)])
        setCatalog(catalogData)
        setReports(reports)
      } catch (apiError) {
        setError(apiError.message)
      } finally { setLoading(false) }
    }
    load()
  }, [setReports, user?.hospitalAtualId])

  function handleCoordinatesSaved(coordinates) {
    setHospital(current => ({ ...current, coordenadas: coordinates }))
  }

  function handleHospitalSaved(nextHospital) {
    setHospital(nextHospital)
  }

  if (loading) {
    return <section className="rounded-[1.5rem] bg-white p-6 text-sm font-extrabold uppercase tracking-[0.3em] text-ink shadow-sm">Carregando</section>
  }

  if (error || !hospital) {
    return <section className="rounded-[1.5rem] bg-white p-6 text-sm font-bold text-clay shadow-sm">{error || "Ambiente não encontrado"}</section>
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid min-h-[8.5rem] gap-4 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-clay">Dashboard Médico</p>
            <h1 className="mt-2 truncate font-display text-4xl leading-none text-ink sm:text-5xl">{activeInfo.title}</h1>
            <p className="mt-2 text-sm font-semibold text-ink/60">TimbraMed A5</p>
            <p className="mt-1 text-sm font-semibold text-ink/45">{activeInfo.description}</p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-2 lg:min-w-0 lg:justify-end">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-extrabold transition ${activeTab === tab.id ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-ink/10"}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      {activeTab === "atendimento" && <AtendimentoTab hospital={hospital} catalog={catalog} />}
      {activeTab === "fila" && <FilaTab hospital={hospital} user={user} />}
      {activeTab === "concluidos" && <ConcluidosTab hospital={hospital} user={user} />}
      {activeTab === "cadastros" && <CadastrosTab hospital={hospital} catalog={catalog} reloadCatalog={reloadCatalog} onHospitalSaved={handleHospitalSaved} />}
      {activeTab === "calibracao" && <CalibracaoTab hospital={hospital} onCoordinatesSaved={handleCoordinatesSaved} />}
    </div>
  )
}
