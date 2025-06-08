import { useState } from 'react'
import { WorkflowList } from '~/components/workflows/WorkflowList'
import { WorkflowEditor } from '~/components/workflows/WorkflowEditor'
import { useAuth } from '~/components/auth/AuthProvider'
import type { Workflow } from '~/types/database'

export default function WorkflowsPage() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | undefined>()

  function handleCreateNew() {
    setSelectedWorkflow(undefined)
    setView('create')
  }

  function handleEditWorkflow(workflow: Workflow) {
    setSelectedWorkflow(workflow)
    setView('edit')
  }

  function handleSave(workflow: Workflow) {
    setView('list')
    setSelectedWorkflow(undefined)
  }

  function handleCancel() {
    setView('list')
    setSelectedWorkflow(undefined)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be logged in to access workflows.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'list' && (
          <WorkflowList
            onWorkflowSelect={handleEditWorkflow}
            onCreateNew={handleCreateNew}
          />
        )}
        
        {(view === 'create' || view === 'edit') && (
          <WorkflowEditor
            workflow={selectedWorkflow}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}