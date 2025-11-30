import { useRouter } from 'next/navigation'

// ... dentro do componente Sidebar:
const router = useRouter()

const handleSignOut = async () => {
  await signOut()
  window.location.href = '/login'
}

// ... e no botão:
<button
  onClick={handleSignOut}
  className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
>
  <LogOut className="w-5 h-5" />
  <span className="font-medium">Sair</span>
</button>
