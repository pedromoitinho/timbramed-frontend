export function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-ink/10 bg-night">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-white">TimbraMed</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
              Relatórios médicos em A5 com agilidade e precisão.
            </p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Conta</p>
            <ul className="mt-4 space-y-3">
              <li><button type="button" onClick={() => onNavigate("/perfil")} className="text-sm font-semibold text-white/70 transition hover:text-white">Perfil</button></li>
              <li><button type="button" onClick={() => onNavigate("/assinatura")} className="text-sm font-semibold text-white/70 transition hover:text-white">Assinatura</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-clay">Legal</p>
            <ul className="mt-4 space-y-3">
              <li><span className="text-sm font-semibold text-white/70">Termos de uso</span></li>
              <li><span className="text-sm font-semibold text-white/70">Privacidade</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">
            TimbraMed &mdash; todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  )
}
