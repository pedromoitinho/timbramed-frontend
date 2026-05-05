import { useCallback, useEffect, useState } from "react"
import { PublicNav } from "./components/PublicNav.jsx"
import { Footer } from "./components/Footer.jsx"
import { DashboardMedico } from "./pages/DashboardMedico.jsx"
import { LandingPage } from "./pages/LandingPage.jsx"
import { LoginPage } from "./pages/LoginPage.jsx"
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage.jsx"
import { ProfilePage } from "./pages/ProfilePage.jsx"
import { RegisterPage } from "./pages/RegisterPage.jsx"
import { SubscriptionPage } from "./pages/SubscriptionPage.jsx"
import { useAuthStore } from "./store/useAuthStore.js"
import { hasProductAccess } from "./utils/subscription.js"

function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/"
  }

  return window.location.pathname || "/"
}

export function App() {
  const user = useAuthStore(state => state.user)
  const loading = useAuthStore(state => state.loading)
  const boot = useAuthStore(state => state.boot)
  const logout = useAuthStore(state => state.logout)
  const [path, setPath] = useState(getCurrentPath)

  const navigate = useCallback(nextPath => {
    window.history.pushState({}, "", nextPath)
    setPath(nextPath)
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    boot()
  }, [boot])

  useEffect(() => {
    function handlePopState() {
      setPath(getCurrentPath())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  function handleLogout() {
    logout()
    navigate("/")
  }

  const publicNav = <PublicNav user={user} onNavigate={navigate} onLogout={handleLogout} />
  const loginRedirectPath = path === "/perfil" || path === "/assinatura" ? path : "/app"

  if (loading && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[1.5rem] bg-white px-8 py-6 text-sm font-extrabold uppercase tracking-[0.3em] text-ink shadow-sm">Carregando</div>
      </main>
    )
  }

  if (path === "/") {
    return (
      <>
        {publicNav}
        <LandingPage onNavigate={navigate} />
        <Footer onNavigate={navigate} />
      </>
    )
  }

  if (path === "/registro") {
    return (
      <>
        {publicNav}
        <RegisterPage onNavigate={navigate} onSuccess={() => navigate("/app")} />
      </>
    )
  }

  if (path === "/login") {
    return (
      <>
        {publicNav}
        <LoginPage onNavigate={navigate} onSuccess={() => navigate("/app")} />
      </>
    )
  }

  if (path === "/confirmar-email") {
    return (
      <>
        {publicNav}
        <ConfirmEmailPage onNavigate={navigate} />
      </>
    )
  }

  if (!user) {
    return (
      <>
        {publicNav}
        <LoginPage onNavigate={navigate} onSuccess={() => navigate(loginRedirectPath)} />
      </>
    )
  }

  if (path === "/perfil") {
    return (
      <>
        {publicNav}
        <ProfilePage />
      </>
    )
  }

  if (path === "/assinatura" || !hasProductAccess(user)) {
    return (
      <>
        {publicNav}
        <SubscriptionPage onNavigate={navigate} />
      </>
    )
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <a href="/"><img src="/screenshots/timbramed-logo.webp" alt="TimbraMed" className="h-12 w-auto shrink-0 sm:h-14 md:h-16" /></a>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-paper px-4 py-2 text-sm font-extrabold text-ink">{user.nome}</div>
            <button onClick={handleLogout} className="rounded-2xl bg-ink px-4 py-2 text-sm font-extrabold text-paper transition hover:-translate-y-0.5">
              Sair
            </button>
          </div>
        </header>
        <DashboardMedico user={user} />
      </div>
    </main>
  )
}
