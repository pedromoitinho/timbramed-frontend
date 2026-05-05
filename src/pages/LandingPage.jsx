const highlights = [
  { label: "Assinatura", value: "R$ 79,90/mês", detail: "com 7 dias grátis" },
  { label: "Validação", value: "CPF + CRM únicos", detail: "proteção contra múltiplas contas de teste" },
  { label: "Formato", value: "A5 calibrado", detail: "ajuste visual por boxes e coordenadas" }
]

const workflow = [
  {
    id: "01",
    title: "Cadastro médico",
    text: "Crie sua conta com CPF, CRM, endereço e e-mail válidos."
  },
  {
    id: "02",
    title: "Ativação da assinatura",
    text: "Teste grátis de 7 dias com cartão validado pelo Mercado Pago."
  },
  {
    id: "03",
    title: "Uso diário no consultório",
    text: "Atendimento, fila e calibração no mesmo ambiente operacional."
  }
]

export function LandingPage({ onNavigate }) {
  return (
    <main className="bg-[#eef3f8] text-ink">
      <section className="relative isolate min-h-[32rem] overflow-hidden">
        <img src="/screenshots/timbramed-hero-celular.png" alt="Tela de atendimento do TimbraMed" className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-[2px] sm:hidden" />
        <img src="/screenshots/timbramed-hero-computador.png" alt="Tela de atendimento do TimbraMed" className="absolute inset-0 h-full w-full scale-110 object-cover object-[center_30%] blur-[2px] hidden sm:block" />
        <div className="absolute inset-0 bg-ink/80" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-xs font-extrabold uppercase tracking-[0.34em] text-[#f5cbb7]">Relatórios médicos em A5</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-none text-white sm:text-6xl lg:text-7xl">TimbraMed</h1>
          <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-white/80">
            Plataforma profissional para médicos que precisam padronizar relatórios, manter fila de impressão organizada e calibrar timbrado com previsibilidade.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <button type="button" onClick={() => onNavigate("/registro")} className="rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5">
              Criar conta médica
            </button>
            <button type="button" onClick={() => onNavigate("/login")} className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-sm font-extrabold text-white backdrop-blur transition hover:-translate-y-0.5">
              Fazer login
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-4 px-4 pb-14 sm:mt-24 sm:grid-cols-3 sm:px-6 md:gap-5 lg:px-8">
        {highlights.map(item => (
          <article key={item.label} className="rounded-2xl border border-ink/10 bg-white px-5 py-5 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-moss">{item.label}</p>
            <p className="mt-2 text-xl font-extrabold text-ink">{item.value}</p>
            <p className="mt-1 text-sm font-semibold text-ink/65">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-clay">Funcionalidades</p>
        <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Tudo que seu consultório precisa</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Atendimento</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Fluxo completo de criação de relatórios: preencha paciente, selecione o CID
              e escreva o texto do relatório manualmente. 
              É só revisar e salvar na fila de impressão.
            </p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Fila de impressão</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Gerencie os relatórios aguardando impressão em lote. Selecione um ou vários pacientes,
              pesquise por nome ou CID, e imprima tudo de uma vez. O PDF gerado respeita
              a calibração A5 do seu timbrado.
            </p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Catálogo inteligente</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Cadastre seus próprios CIDs e o carimbo médico.
              Os CIDs ficam disponíveis para seleção durante o atendimento,
              agilizando o preenchimento do relatório.
            </p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Calibração A5</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Tire uma foto do seu papel timbrado e ajuste visualmente as áreas do relatório:
              título, corpo do texto, CID, encerramento e carimbo. Arraste e redimensione cada
              box com precisão — as coordenadas são mapeadas em centímetros reais no formato A5.
            </p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Carimbo digital</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Faça upload da foto do seu carimbo médico e o sistema remove automaticamente o fundo,
              ajusta contraste e realça a visualização. O carimbo tratado é inserido no PDF no
              posicionamento calibrado, dispensando carimbo físico.
            </p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h3 className="font-display text-2xl text-ink">Histórico completo</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
              Todos os relatórios impressos ficam armazenados no histórico. Re-imprima quando
              precisar sem perder o rastro. Pesquise por paciente, CID ou data de
              impressão para encontrar rapidamente qualquer laudo.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-ink py-14 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#f5cbb7]">Como funciona</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {workflow.map(item => (
              <article key={item.id} className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <p className="text-sm font-extrabold text-[#f5cbb7]">{item.id}</p>
                <h3 className="mt-3 font-display text-3xl">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/78">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
