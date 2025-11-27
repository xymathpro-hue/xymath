import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">xy</span>
            </div>
            <span className="text-xl font-bold text-gray-900">xyMath</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">Entrar</Link>
            <Link href="/cadastro" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">Começar Grátis</Link>
          </div>
        </nav>
      </header>

      <main className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Avaliações de <span className="text-indigo-600">Matemática</span> simplificadas
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Crie simulados, corrija com QR Code e acompanhe o desempenho dos seus alunos do 6º ano ao Ensino Médio. Alinhado à BNCC.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cadastro" className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 font-semibold text-lg">Criar Conta Gratuita</Link>
              <Link href="/login" className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-xl hover:bg-indigo-50 font-semibold text-lg">Já tenho conta</Link>
            </div>
          </div>

          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Banco de Questões BNCC</h3>
              <p className="text-gray-600">Crie questões organizadas por habilidades da BNCC e descritores SAEB. Filtre por ano, unidade temática e dificuldade.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Correção por QR Code</h3>
              <p className="text-gray-600">Gere gabaritos com QR Code único por aluno. Escaneie com o celular e as respostas são registradas automaticamente.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Análise Completa</h3>
              <p className="text-gray-600">Visualize o desempenho por turma, aluno, questão e habilidade. Identifique pontos de melhoria.</p>
            </div>
          </div>

          <div className="mt-24 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Do 6º ano ao Ensino Médio</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série EM', '2ª Série EM', '3ª Série EM'].map((ano) => (
                <span key={ano} className="bg-white px-6 py-3 rounded-full shadow-md text-gray-700 font-medium">{ano}</span>
              ))}
            </div>
          </div>

          <div className="mt-24 bg-indigo-600 rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Comece a usar gratuitamente</h2>
            <p className="text-indigo-100 text-lg mb-8 max-w-2xl mx-auto">Cadastre suas turmas, crie seu banco de questões e aplique seu primeiro simulado hoje.</p>
            <Link href="/cadastro" className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-xl hover:bg-indigo-50 font-semibold text-lg">Criar Minha Conta</Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 border-t mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><span className="text-white font-bold">xy</span></div>
            <span className="font-semibold text-gray-900">xyMath</span>
          </div>
          <p className="text-gray-500 text-sm">© 2024 xyMath. Plataforma de avaliação de Matemática.</p>
        </div>
      </footer>
    </div>
  )
}
