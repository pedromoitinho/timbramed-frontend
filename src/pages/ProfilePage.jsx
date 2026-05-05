import { ProfileTab } from "../components/ProfileTab.jsx"

export function ProfilePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-4 rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-clay">Conta médica</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-ink">Perfil e pagamento</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/60">Atualize dados da conta, confirme troca de e-mail e gerencie a assinatura mensal sem entrar no produto.</p>
        </section>
        <ProfileTab />
      </div>
    </main>
  )
}
