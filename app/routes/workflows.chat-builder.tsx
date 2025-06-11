import * as React from 'react'
import { useSearchParams } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow, WorkflowStep } from '~/types/database'
import { WorkflowChat } from '~/components/workflows/builder/WorkflowChat'
import { WorkflowStepTabs } from '~/components/workflows/WorkflowStepTabs'

export default function ChatWorkflowBuilder() {
  const { user, organization, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const workflowId = searchParams.get('id')
  const prompt = searchParams.get('prompt') || ''
  const steps = searchParams.get('steps') || ''
  
  const [workflow, setWorkflow] = React.useState<Partial<Workflow>>({
    name: '',
    description: '',
    prompt: prompt || '',
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
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (steps) {
      try {
        const parsedSteps = JSON.parse(decodeURIComponent(steps))
        setWorkflow(prev => ({
          ...prev,
          name: prompt.split(' ').slice(0, 5).join(' '),
          prompt: prompt,
          config: {
            ...prev.config!,
            steps: parsedSteps
          }
        }))
      } catch (error) {
        console.error('Error parsing steps:', error)
      }
    }
    
    if (!authLoading && workflowId && organization) {
      loadWorkflow()
    } else {
      setLoading(false)
    }
  }, [authLoading, workflowId, organization, prompt, steps])

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

  const handleWorkflowChange = React.useCallback((updates: Partial<Workflow>) => {
    setWorkflow(prev => ({ ...prev, ...updates }))
  }, [])

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
        prompt: workflow.prompt || '',
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
          console.log('Workflow created successfully:', data)
          window.history.replaceState({}, '', `/workflows/chat-builder?id=${data.id}`)
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
              Chat Workflow Builder
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
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <WorkflowChat 
            workflow={workflow}
            onWorkflowChange={handleWorkflowChange}
            onStepsChange={handleStepsChange}
          />
        </div>

        <div className="w-1/2 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Generated Workflow</h2>
            <p className="text-gray-600">{workflow.prompt || 'Describe your workflow to generate steps'}</p>
          </div>
          
          {workflow.config?.steps && workflow.config.steps.length > 0 && (
            <WorkflowStepTabs 
              steps={workflow.config.steps}
              onStepsChange={handleStepsChange}
            />
          )}
          
        </div>
      </div>
    </div>
  )
}