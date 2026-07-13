import Sidebar from '@/components/Sidebar'
import StyleProfileForm from '@/components/StyleProfileForm'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-zinc-500 text-sm mt-1">Tune the brand voice that personalizes every generation.</p>
          </div>
          <StyleProfileForm />
        </div>
      </main>
    </div>
  )
}
