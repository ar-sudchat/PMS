import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'

export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  if (user.mustChangePassword) {
    redirect('/change-password')
  }

  return <MainLayout>{children}</MainLayout>
}
