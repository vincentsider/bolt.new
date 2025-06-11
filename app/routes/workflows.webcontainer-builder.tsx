import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow } from '~/types/database'
import { WorkflowChat } from '~/components/workflows/builder/WorkflowChat'
import { WebContainerWorkflowStepTabs } from '~/components/workflows/WebContainerWorkflowStepTabs'
import { workflowRunner } from '~/lib/webcontainer/workflow-runner'
import { workflowComponentActions } from '~/stores/workflow-components'

interface WebContainerWorkflowPreviewProps {
  workflowFiles: {[key: string]: string}
  workflow: Partial<Workflow>
}

function WebContainerWorkflowPreview({ workflowFiles, workflow }: WebContainerWorkflowPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  // Mount and run workflow in WebContainer when files change
  useEffect(() => {
    if (workflowFiles && Object.keys(workflowFiles).length > 0) {
      mountAndRunWorkflow()
    }
  }, [workflowFiles])

  const mountAndRunWorkflow = async () => {
    try {
      setIsLoading(true)
      setLogs(['📦 Mounting workflow files...'])

      // Mount workflow files in WebContainer
      await workflowRunner.mountWorkflow(workflowFiles)
      setLogs(prev => [...prev, '✅ Files mounted successfully'])

      // Install dependencies
      setLogs(prev => [...prev, '📥 Installing dependencies...'])
      await workflowRunner.installDependencies()
      setLogs(prev => [...prev, '✅ Dependencies installed'])

      // Start the workflow server
      setLogs(prev => [...prev, '🚀 Starting workflow server...'])
      const url = await workflowRunner.startServer()
      setPreviewUrl(url)
      setLogs(prev => [...prev, `✅ Workflow server running at ${url}`])

    } catch (error) {
      console.error('Failed to run workflow in WebContainer:', error)
      setLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="bg-gray-100 border-b px-4 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Setting up workflow...</span>
              </>
            ) : previewUrl ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Workflow running at {previewUrl}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Waiting for workflow...</span>
              </>
            )}
          </div>
          <button
            onClick={mountAndRunWorkflow}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            Restart
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative">
        {previewUrl ? (
          <iframe 
            src={previewUrl} 
            className="w-full h-full border-0"
            title="Workflow Preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isLoading ? 'Setting up your workflow...' : 'Waiting for workflow'}
              </h3>
              <p className="text-gray-600 mb-4">
                {isLoading
                  ? 'Please wait while we install dependencies and start your Node.js workflow application.'
                  : 'Chat with the assistant to create your workflow application.'
                }
              </p>
              {logs.length > 0 && (
                <div className="bg-black text-green-400 text-xs font-mono p-3 rounded text-left max-h-32 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WebContainerWorkflowBuilder() {
  const { user, organization } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Workflow state
  const [workflow, setWorkflow] = useState<Partial<Workflow>>({
    name: searchParams.get('name') || 'New Workflow',
    description: '',
    status: 'draft',
    config: { 
      steps: [], 
      triggers: [], 
      settings: {
        notificationChannels: [],
        errorHandling: 'stop',
        maxRetries: 3,
        timeoutMinutes: 60
      }
    }
  })

  // WebContainer files state
  const [workflowFiles, setWorkflowFiles] = useState<{[key: string]: string}>({})
  const [generatedCode, setGeneratedCode] = useState<string>('')

  // UI state
  const [activeTab, setActiveTab] = useState<'chat' | 'builder' | 'preview'>('chat')
  const [isSaving, setIsSaving] = useState(false)

  // Auth check
  useEffect(() => {
    if (!user || !organization) {
      navigate('/auth')
    }
  }, [user, organization, navigate])

  // Save workflow to database with component persistence
  const saveWorkflow = async () => {
    if (!organization?.id || !user?.id) return

    try {
      setIsSaving(true)

      // Get component usage from the workflow components store
      const componentInstances = workflowComponentActions.getComponentsForStep('capture')
        .concat(workflowComponentActions.getComponentsForStep('review'))
        .concat(workflowComponentActions.getComponentsForStep('approval'))
        .concat(workflowComponentActions.getComponentsForStep('update'))

      // Format component usage for persistence API
      const componentUsage = {
        capture: componentInstances.filter(c => c.stepType === 'capture').map(c => ({
          id: c.componentId,
          name: c.label,
          component_type: c.componentId,
          description: `${c.label} component`
        })),
        review: componentInstances.filter(c => c.stepType === 'review').map(c => ({
          id: c.componentId,
          name: c.label,
          component_type: c.componentId,
          description: `${c.label} component`
        })),
        approval: componentInstances.filter(c => c.stepType === 'approval').map(c => ({
          id: c.componentId,
          name: c.label,
          component_type: c.componentId,
          description: `${c.label} component`
        })),
        update: componentInstances.filter(c => c.stepType === 'update').map(c => ({
          id: c.componentId,
          name: c.label,
          component_type: c.componentId,
          description: `${c.label} component`
        }))
      }

      console.log('📊 Component usage to persist:', componentUsage)

      // Use the persistence API endpoint to save workflow and create component instances
      const response = await fetch('/api/workflow-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
          name: workflow.name,
          description: workflow.description || '',
          webcontainerId: workflow.id, // Pass existing ID if updating
          generatedFiles: workflowFiles,
          componentUsage,
          userId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save workflow')
      }

      const result = await response.json()
      
      if (result.success && result.workflowId) {
        setWorkflow(prev => ({ ...prev, id: result.workflowId }))
        console.log('✅ Workflow saved with component instances:', result.workflowId)
      }

    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save when workflow changes
  useEffect(() => {
    if (workflow.name && workflow.name !== 'New Workflow') {
      const saveTimer = setTimeout(saveWorkflow, 2000)
      return () => clearTimeout(saveTimer)
    }
  }, [workflow, workflowFiles])

  // Handle workflow updates from chat
  const handleWorkflowUpdate = (updatedWorkflow: Partial<Workflow>) => {
    setWorkflow(prev => ({ ...prev, ...updatedWorkflow }))
  }

  // Handle file updates from chat (WebContainer files)
  const handleFilesUpdate = (files: {[key: string]: string}) => {
    console.log('📁 Received WebContainer files:', Object.keys(files))
    setWorkflowFiles(files)
  }

  // Handle code updates (for real-time streaming)
  const handleCodeUpdate = (code: string) => {
    setGeneratedCode(code)
  }

  // Download workflow as zip
  const downloadWorkflow = async () => {
    if (Object.keys(workflowFiles).length === 0) {
      alert('No workflow files to download')
      return
    }

    try {
      // Create and download zip file
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      Object.entries(workflowFiles).forEach(([path, content]) => {
        zip.file(path, content)
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.name?.replace(/\s+/g, '-') || 'workflow'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download workflow:', error)
      alert('Failed to download workflow')
    }
  }

  if (!user || !organization) {
    return <div>Loading...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
            <p className="text-sm text-gray-600">
              WebContainer-powered workflow builder
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-sm text-gray-600">Saving...</span>
            )}
            <button
              onClick={downloadWorkflow}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              disabled={Object.keys(workflowFiles).length === 0}
            >
              📦 Download
            </button>
            <button
              onClick={saveWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isSaving}
            >
              💾 Save
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-50 border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'chat', label: '💬 Chat', description: 'AI Assistant' },
            { id: 'builder', label: '🔧 Builder', description: '4-Step Configuration' },
            { id: 'preview', label: '👁️ Preview', description: 'Live Workflow' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs font-normal">{tab.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <WorkflowChat
            workflow={workflow}
            onWorkflowUpdate={handleWorkflowUpdate}
            onCodeUpdate={handleCodeUpdate}
            onFilesUpdate={handleFilesUpdate}
            initialInput={searchParams.get('input')}
            forceFresh={true}
          />
        )}

        {/* Builder Tab */}
        {activeTab === 'builder' && (
          <div className="h-full overflow-y-auto">
            <WebContainerWorkflowStepTabs
              workflow={workflow}
              workflowFiles={workflowFiles}
              onWorkflowUpdate={handleWorkflowUpdate}
              onFilesUpdate={handleFilesUpdate}
              webcontainerRunner={workflowRunner}
            />
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <WebContainerWorkflowPreview
            workflowFiles={workflowFiles}
            workflow={workflow}
          />
        )}
      </div>
    </div>
  )
}