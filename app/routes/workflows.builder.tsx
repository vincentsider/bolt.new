import React, { useState, useEffect } from 'react'
import { useSearchParams } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow, WorkflowStep } from '~/types/database'
import { WorkflowCanvas } from '~/components/workflows/builder/WorkflowCanvas'
import { ComponentPalette } from '~/components/workflows/builder/ComponentPalette'
// import { StepConfigPanel } from '~/components/workflows/builder/config/StepConfigPanel'
import type { Node } from 'reactflow'

export default function WorkflowBuilderPage() {
  const { user, organization, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const workflowId = searchParams.get('id')
  
  const [workflow, setWorkflow] = useState<Partial<Workflow>>({
    name: 'New Workflow',
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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load workflow if ID is provided (from chat-generated workflow)
  useEffect(() => {
    if (workflowId && user && organization) {
      loadWorkflow(workflowId)
    }
  }, [workflowId, user, organization])

  const loadWorkflow = async (id: string) => {
    setLoading(true)
    try {
      const { data: workflowData, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single()

      if (error) {
        console.error('Error loading workflow:', error)
        return
      }

      // Handle both new and old data structures
      const workflowConfig = workflowData.config || {
        triggers: workflowData.triggers || [],
        steps: workflowData.steps || [],
        settings: {
          notificationChannels: [],
          errorHandling: 'stop',
          maxRetries: 3,
          timeoutMinutes: 60
        }
      };
      
      // Set workflow once to prevent flickering
      const finalWorkflow = {
        ...workflowData,
        config: workflowConfig
      };
      
      setWorkflow(finalWorkflow);
    } catch (error) {
      console.error('Error loading workflow:', error)
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

  const handleNodeSelect = React.useCallback((node: Node | null) => {
    setSelectedNode(node)
  }, [])

  function handleNodeUpdate(nodeId: string, updates: any) {
    // Update the node data and sync back to workflow steps
    console.log('Updating node:', nodeId, updates)
  }

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
        // Update existing workflow
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
        // Create new workflow
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
          // Update URL to include the new workflow ID
          window.history.replaceState({}, '', `/workflows/builder?id=${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  function handlePublishWorkflow() {
    // TODO: Implement publish functionality
    console.log('Publishing workflow:', workflow)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading workflow...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be logged in to build workflows.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
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

        {/* Workflow Description */}
        <div className="mt-3">
          <input
            type="text"
            value={workflow.description || ''}
            onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
            className="w-full text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            placeholder="Add a description for this workflow..."
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Component Palette */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <ComponentPalette />
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            initialSteps={workflow.config?.steps || []}
            onStepsChange={handleStepsChange}
            onNodeSelect={handleNodeSelect}
          />
        </div>

        {/* Configuration Panel */}
        {(selectedNode || showPreview) && (
          <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0">
            {showPreview ? (
              <WorkflowPreview workflow={workflow} />
            ) : (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Step Configuration</h3>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Step Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedNode.data?.label || 'Unnamed Step'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Step Type</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedNode.data?.stepType || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedNode.data?.description || 'No description'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select a step to configure</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface WorkflowPreviewProps {
  workflow: Partial<Workflow>
}

function WorkflowPreview({ workflow }: WorkflowPreviewProps) {
  return (
    <div className="h-full p-6 overflow-y-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Preview</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Basic Info</h4>
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Name:</strong> {workflow.name || 'Untitled'}</p>
            <p><strong>Description:</strong> {workflow.description || 'No description'}</p>
            <p><strong>Status:</strong> {workflow.status}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700">Steps ({workflow.config?.steps?.length || 0})</h4>
          <div className="mt-2 space-y-2">
            {workflow.config?.steps?.map((step, index) => (
              <div key={step.id} className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{index + 1}. {step.name}</div>
                <div className="text-gray-500 text-xs">Type: {step.type}</div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No steps added yet</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700">Settings</h4>
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Error Handling:</strong> {workflow.config?.settings?.errorHandling}</p>
            <p><strong>Max Retries:</strong> {workflow.config?.settings?.maxRetries}</p>
            <p><strong>Timeout:</strong> {workflow.config?.settings?.timeoutMinutes} minutes</p>
          </div>
        </div>
      </div>
    </div>
  )
}

