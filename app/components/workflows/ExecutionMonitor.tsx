import React, { useState, useEffect } from 'react'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/components/auth/AuthProvider'
import type { WorkflowExecution, StepExecution } from '~/types/database'

interface ExecutionMonitorProps {
  executionId?: string
  workflowId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ExecutionMonitor({ 
  executionId, 
  workflowId, 
  autoRefresh = true,
  refreshInterval = 5000 
}: ExecutionMonitorProps) {
  const { profile } = useAuth()
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null)
  const [stepExecutions, setStepExecutions] = useState<StepExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.organization_id) {
      loadExecutions()
    }
  }, [profile?.organization_id, workflowId])

  useEffect(() => {
    if (executionId) {
      loadExecutionDetails(executionId)
    }
  }, [executionId])

  useEffect(() => {
    if (selectedExecution) {
      loadStepExecutions(selectedExecution.id)
    }
  }, [selectedExecution])

  useEffect(() => {
    if (autoRefresh && selectedExecution) {
      const interval = setInterval(() => {
        loadExecutionDetails(selectedExecution.id)
        loadStepExecutions(selectedExecution.id)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedExecution, refreshInterval])

  async function loadExecutions() {
    try {
      setError(null)
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('organization_id', profile!.organization_id)
        .order('started_at', { ascending: false })
        .limit(50)

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setExecutions(data || [])

      if (executionId) {
        const execution = data?.find(e => e.id === executionId)
        if (execution) {
          setSelectedExecution(execution)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions')
    } finally {
      setLoading(false)
    }
  }

  async function loadExecutionDetails(id: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setSelectedExecution(data)
    } catch (err) {
      console.error('Failed to load execution details:', err)
    }
  }

  async function loadStepExecutions(id: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('step_executions')
        .select('*')
        .eq('execution_id', id)
        .order('started_at', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setStepExecutions(data || [])
    } catch (err) {
      console.error('Failed to load step executions:', err)
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-600'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'skipped': return 'bg-gray-100 text-gray-500'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'running': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'cancelled': return '⏹️'
      case 'paused': return '⏸️'
      case 'pending': return '⏳'
      case 'in_progress': return '🔄'
      case 'skipped': return '⏭️'
      default: return '❓'
    }
  }

  function formatDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
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
      {/* Execution List */}
      {!executionId && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Executions</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedExecution(execution)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(execution.status)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Execution {execution.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Started {new Date(execution.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDuration(execution.started_at, execution.completed_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {executions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No executions found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execution Details */}
      {selectedExecution && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Execution Details
            </h2>
            {!executionId && (
              <button
                onClick={() => setSelectedExecution(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Execution Summary */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-lg">{getStatusIcon(selectedExecution.status)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedExecution.status)}`}>
                    {selectedExecution.status}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDuration(selectedExecution.started_at, selectedExecution.completed_at)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Initiator</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedExecution.context?.initiator?.type || 'Unknown'}
                </p>
              </div>
            </div>

            {selectedExecution.sla_deadline && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  SLA Deadline: {new Date(selectedExecution.sla_deadline).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Step Executions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Step Progress</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {stepExecutions.map((step, index) => (
                <div key={step.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.status === 'completed' ? 'bg-green-100 text-green-600' :
                        step.status === 'failed' ? 'bg-red-100 text-red-600' :
                        step.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {step.step_name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                          {step.started_at && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(step.started_at, step.completed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {step.status === 'failed' && step.output?.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                          {step.output.error.message || 'Unknown error'}
                        </div>
                      )}
                      
                      {step.output?.retry_attempt && (
                        <div className="mt-2 text-xs text-gray-500">
                          Retry attempt: {step.output.retry_attempt}
                        </div>
                      )}
                      
                      {step.actor && (
                        <div className="mt-1 text-xs text-gray-500">
                          {step.actor.type === 'user' ? `Assigned to: ${step.actor.name}` : `Executed by: ${step.actor.type}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {stepExecutions.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No step executions found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}