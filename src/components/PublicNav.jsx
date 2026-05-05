export function PublicNav({ user, onNavigate, onLogout }) {
  const navButtonClass = "rounded-2xl border border-ink/15 bg-white px-5 py-2.5 text-sm font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <button type="button" onClick={() => onNavigate("/")} className="flex items-center gap-3 text-left">
          <img src="/screenshots/timbramed-logo.webp" alt="TimbraMed" className="h-12 w-auto shrink-0 sm:h-14 md:h-16" />
          <span className="sr-only">TimbraMed - Relatórios médicos em A5</span>
        </button>
        <nav className="flex flex-wrap gap-3">
          {!user && <button type="button" onClick={() => onNavigate("/login")} className={navButtonClass}>Login</button>}
          {!user && <button type="button" onClick={() => onNavigate("/registro")} className={navButtonClass}>Registro</button>}
          <button type="button" onClick={() => onNavigate("/perfil")} className={navButtonClass}>Perfil</button>
          <button type="button" onClick={() => onNavigate(user ? "/app" : "/login")} className={navButtonClass}>Acessar produto</button>
          {user && <button type="button" onClick={onLogout} className={navButtonClass}>Sair</button>}
        </nav>
      </div>
    </header>
  )
}
