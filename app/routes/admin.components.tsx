import { type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { ComponentLibraryManager } from '~/components/admin/ComponentLibraryManager'

export async function loader({ request }: LoaderFunctionArgs) {
  // In a real app, you'd check admin permissions here
  return { 
    title: 'Component Library Manager',
    description: 'Manage workflow components and AI mapping'
  }
}

export default function AdminComponentsPage() {
  const data = useLoaderData<typeof loader>()
  const { user, organization } = useAuth()

  if (!user || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need to be logged in as an admin to access this page.</p>
        </div>
      </div>
    )
  }

  // In a real app, check if user has admin role
  const isAdmin = user.role === 'sysadmin' || user.role === 'admin'
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600">You need admin privileges to manage the component library.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ComponentLibraryManager 
        organizationId={organization.id}
        userId={user.id}
      />
    </div>
  )
}