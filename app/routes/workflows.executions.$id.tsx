import { useParams } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { ExecutionMonitor } from '~/components/workflows/ExecutionMonitor'
import { ExecutionControls } from '~/components/workflows/ExecutionControls'
import { useAuth } from '~/components/auth/AuthProvider'
import { useExecutionState } from '~/lib/workflow/state-manager'
import { supabase } from '~/lib/supabase'
import type { Workflow } from '~/types/database'

export default function ExecutionPage() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { execution, metrics, steps } = useExecutionState(id || null)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (execution) {
      loadWorkflow(execution.workflow_id)
    }
  }, [execution])

  async function loadWorkflow(workflowId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setWorkflow(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow')
    } finally {
      setLoading(false)
    }
  }

  function handleExecutionUpdate() {
    // Force refresh - in a real app this would be handled by real-time updates
    window.location.reload()
  }

  if (authLoading || loading) {
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
          <p className="text-gray-600">You need to be logged in to view workflow executions.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Execution not found</h1>
          <p className="text-gray-600">The requested workflow execution could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Execution Details
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {workflow ? `Workflow: ${workflow.name}` : 'Loading workflow...'}
              </p>
            </div>
            
            {/* Execution ID and Status */}
            <div className="text-right">
              <p className="text-sm text-gray-500">Execution ID</p>
              <p className="font-mono text-sm text-gray-900">{execution.id}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <ExecutionMonitor 
              executionId={id}
              autoRefresh={true}
              refreshInterval={3000}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Execution Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Execution Controls
              </h2>
              <ExecutionControls 
                execution={execution}
                onUpdate={handleExecutionUpdate}
              />
            </div>

            {/* Metrics Summary */}
            {metrics && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Metrics
                </h2>
                
                <div className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{Math.round(metrics.progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Step Counts */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Completed</p>
                      <p className="font-medium text-green-600">{metrics.completedSteps}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Failed</p>
                      <p className="font-medium text-red-600">{metrics.failedSteps}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pending</p>
                      <p className="font-medium text-gray-600">{metrics.pendingSteps}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Skipped</p>
                      <p className="font-medium text-yellow-600">{metrics.skippedSteps}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <p className="text-gray-500 text-sm">Total Duration</p>
                    <p className="font-medium">{formatDuration(metrics.totalDuration)}</p>
                  </div>

                  {/* Average Step Duration */}
                  <div>
                    <p className="text-gray-500 text-sm">Avg Step Duration</p>
                    <p className="font-medium">{formatDuration(metrics.averageStepDuration)}</p>
                  </div>

                  {/* SLA Status */}
                  <div>
                    <p className="text-gray-500 text-sm">SLA Status</p>
                    <p className={`font-medium ${
                      metrics.slaStatus === 'within' ? 'text-green-600' :
                      metrics.slaStatus === 'approaching' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {metrics.slaStatus.charAt(0).toUpperCase() + metrics.slaStatus.slice(1)}
                    </p>
                  </div>

                  {/* Estimated Completion */}
                  {metrics.estimatedCompletion && execution.status === 'running' && (
                    <div>
                      <p className="text-gray-500 text-sm">Est. Completion</p>
                      <p className="font-medium text-sm">
                        {new Date(metrics.estimatedCompletion).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Workflow Details */}
            {workflow && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Workflow Details
                </h2>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{workflow.name}</p>
                  </div>
                  
                  {workflow.description && (
                    <div>
                      <p className="text-gray-500">Description</p>
                      <p className="text-gray-900">{workflow.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-gray-500">Version</p>
                    <p className="font-medium">{workflow.version}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{workflow.status}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-gray-900">{new Date(workflow.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}