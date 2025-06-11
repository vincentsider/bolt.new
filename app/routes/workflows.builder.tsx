import * as React from 'react'
import { useSearchParams } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow, WorkflowStep } from '~/types/database'
import { ComponentPalette } from '~/components/workflows/builder/ComponentPalette'

interface WorkflowPreviewProps {
  workflow: Partial<Workflow>
}

function WorkflowPreview({ workflow }: WorkflowPreviewProps) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-medium mb-4">Workflow Preview</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">Name</h4>
          <p className="text-gray-600">{workflow.name || 'Untitled'}</p>
        </div>
        <div>
          <h4 className="font-medium">Description</h4>
          <p className="text-gray-600">{workflow.description || 'No description'}</p>
        </div>
        <div>
          <h4 className="font-medium">Steps</h4>
          <div className="space-y-2 mt-2">
            {(workflow.config?.steps || []).map((step, index) => (
              <div key={step.id} className="p-3 bg-gray-50 rounded">
                <p className="font-medium">Step {index + 1}: {step.name}</p>
                <p className="text-sm text-gray-600">Type: {step.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowBuilder() {
  const { user, organization, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const workflowId = searchParams.get('id')
  const [loading, setLoading] = React.useState(true)
  const [showPreview, setShowPreview] = React.useState(false)
  const [workflow, setWorkflow] = React.useState<Partial<Workflow>>({
    name: '',
    description: '',
    status: 'draft',
    config: {
      triggers: [],
      steps: [],
      settings: {
        notificationChannels: [],
        errorHandling: 'stop',
        maxRetries: 3,
        timeoutMinutes: 60
      }
    }
  })

  React.useEffect(() => {
    if (!authLoading && workflowId && organization) {
      loadWorkflow()
    } else {
      setLoading(false)
    }
  }, [authLoading, workflowId, organization])

  async function loadWorkflow() {
    if (!workflowId || !organization) return
    
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('organization_id', organization.id)
        .single()

      if (error) {
        console.error('Error loading workflow:', error)
      } else if (data) {
        setWorkflow(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStepsChange = React.useCallback((steps: WorkflowStep[]) => {
    setWorkflow(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        steps
      }
    }))
  }, [])

  async function handleSaveWorkflow() {
    if (!user || !organization) return
    
    try {
      const workflowData = {
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || '',
        status: workflow.status || 'draft',
        version: 1,
        config: {
          triggers: workflow.config?.triggers || [],
          steps: workflow.config?.steps || [],
          settings: workflow.config?.settings || {
            notificationChannels: [],
            errorHandling: 'stop',
            maxRetries: 3,
            timeoutMinutes: 60
          }
        },
        permissions: {
          view: ['builder', 'reviewer', 'approver', 'auditor', 'sysadmin'],
          edit: ['builder', 'sysadmin'],
          execute: ['builder', 'approver', 'sysadmin'],
          approve: ['approver', 'sysadmin']
        },
        organization_id: organization.id,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (workflowId) {
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId)
          .eq('organization_id', organization.id)

        if (error) {
          console.error('Error updating workflow:', error)
        } else {
          console.log('Workflow updated successfully')
        }
      } else {
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            ...workflowData,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating workflow:', error)
        } else {
          console.log('Workflow created successfully')
          window.history.replaceState({}, '', `/workflows/builder?id=${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  function handlePublishWorkflow() {
    console.log('Publishing workflow:', workflow)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the workflow builder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {workflowId ? 'Edit Workflow' : 'Workflow Builder'}
            </h1>
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={workflow.name || ''}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Workflow Name"
              />
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                workflow.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                workflow.status === 'published' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {workflow.status}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            <button
              onClick={handleSaveWorkflow}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Save Draft
            </button>
            
            <button
              onClick={handlePublishWorkflow}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!workflow.config?.steps?.length}
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <ComponentPalette />
        </div>

        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Workflow Steps</h2>
            <p className="text-gray-600">
              Drag and drop components from the palette to build your workflow.
            </p>
            <div className="mt-6 space-y-2">
              {(workflow.config?.steps || []).map((step, index) => (
                <div key={step.id} className="p-4 border rounded">
                  <h3 className="font-medium">Step {index + 1}: {step.name}</h3>
                  <p className="text-sm text-gray-600">Type: {step.type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0">
            <WorkflowPreview workflow={workflow} />
          </div>
        )}
      </div>
    </div>
  )
}