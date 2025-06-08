import React, { useEffect, useState } from 'react'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/components/auth/AuthProvider'
import { useFieldSecurity } from '~/lib/security/field-level'
import type { Workflow } from '~/types/database'

interface WorkflowListProps {
  onWorkflowSelect?: (workflow: Workflow) => void
  onCreateNew?: () => void
}

export function WorkflowList({ onWorkflowSelect, onCreateNew }: WorkflowListProps) {
  const { user, profile } = useAuth()
  const fieldSecurity = useFieldSecurity(profile?.role || 'reviewer', profile?.organization_id || '')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && profile) {
      loadWorkflows()
    }
  }, [user, profile])

  async function loadWorkflows() {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('updated_at', { ascending: false })

      if (fetchError) {
        setError('Failed to load workflows: ' + fetchError.message)
        return
      }

      setWorkflows(data || [])
    } catch (err) {
      setError('Error loading workflows')
      console.error('Error loading workflows:', err)
    } finally {
      setLoading(false)
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id)

      if (error) {
        setError('Failed to delete workflow: ' + error.message)
        return
      }

      setWorkflows(prev => prev.filter(w => w.id !== id))
    } catch (err) {
      setError('Error deleting workflow')
      console.error('Error deleting workflow:', err)
    }
  }

  function getStatusColor(status: Workflow['status']) {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Workflow
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-500 mb-4">Create your first workflow to get started.</p>
          <button
            onClick={onCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onWorkflowSelect?.(workflow)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                  {workflow.description && (
                    <p className="text-gray-600 text-sm mt-1">{workflow.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                    {workflow.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteWorkflow(workflow.id)
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Version {workflow.version}</span>
                <span>Updated {new Date(workflow.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}