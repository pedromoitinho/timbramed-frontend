import { create } from "zustand"

export const usePrintQueueStore = create((set, get) => ({
  fila: [],
  concluidos: [],
  selecionadosFila: [],
  selecionadosConcluidos: [],
  carregando: false,
  erro: "",
  setCarregando: carregando => set({ carregando }),
  setErro: erro => set({ erro }),
  setReports: reports => set({
    fila: reports.filter(report => report.status === "PENDENTE"),
    concluidos: reports.filter(report => report.status === "CONCLUIDO"),
    selecionadosFila: [],
    selecionadosConcluidos: []
  }),
  addReport: report => set(state => ({
    fila: [report, ...state.fila]
  })),
  patchReport: (id, patch) => set(state => {
    const apply = report => report.id === id ? { ...report, ...patch } : report
    return {
      fila: state.fila.map(apply),
      concluidos: state.concluidos.map(apply)
    }
  }),
  toggleFila: id => set(state => ({
    selecionadosFila: state.selecionadosFila.includes(id)
      ? state.selecionadosFila.filter(selectedId => selectedId !== id)
      : [...state.selecionadosFila, id]
  })),
  toggleTodosFila: () => {
    const state = get()
    const allSelected = state.fila.length > 0 && state.selecionadosFila.length === state.fila.length
    set({ selecionadosFila: allSelected ? [] : state.fila.map(report => report.id) })
  },
  toggleConcluido: id => set(state => ({
    selecionadosConcluidos: state.selecionadosConcluidos.includes(id)
      ? state.selecionadosConcluidos.filter(selectedId => selectedId !== id)
      : [...state.selecionadosConcluidos, id]
  })),
  toggleTodosConcluidos: () => {
    const state = get()
    const allSelected = state.concluidos.length > 0 && state.selecionadosConcluidos.length === state.concluidos.length
    set({ selecionadosConcluidos: allSelected ? [] : state.concluidos.map(report => report.id) })
  },
  clearConcluidosSelection: () => set({ selecionadosConcluidos: [] }),
  markCompleted: ids => set(state => {
    const moved = state.fila
      .filter(report => ids.includes(report.id))
      .map(report => ({ ...report, status: "CONCLUIDO", impressoEm: new Date().toISOString() }))

    return {
      fila: state.fila.filter(report => !ids.includes(report.id)),
      concluidos: [...moved, ...state.concluidos],
      selecionadosFila: state.selecionadosFila.filter(id => !ids.includes(id))
    }
  })
}))