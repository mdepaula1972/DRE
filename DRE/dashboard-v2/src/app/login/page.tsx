import { login, signup } from './actions'
import { Landmark, AlertCircle } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  // Para Next.js 15, searchParams pode ser assíncrono, mas estamos no 14
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Landmark size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">DRE Gerencial SaaS</h1>
          <p className="text-slate-400 text-sm mt-2">Faça login para acessar suas demonstrações</p>
        </div>

        <div className="p-8">
          <form className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                E-mail corporativo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors text-slate-900 bg-slate-50 focus:bg-white"
                placeholder="voce@empresa.com.br"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors text-slate-900 bg-slate-50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            {searchParams?.message && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <p>{searchParams.message}</p>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                formAction={login}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
              >
                Entrar
              </button>
              <button
                formAction={signup}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg border border-slate-200 transition-colors shadow-sm"
              >
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
