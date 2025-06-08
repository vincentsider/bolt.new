import React, { useState } from 'react'
import { executionEngine } from '~/lib/workflow/execution-engine'
import { stateManager } from '~/lib/workflow/state-manager'
import type { WorkflowExecution } from '~/types/database'

interface ExecutionControlsProps {
  execution: WorkflowExecution
  onUpdate?: () => void
}

export function ExecutionControls({ execution, onUpdate }: ExecutionControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canPause = execution.status === 'running'
  const canResume = execution.status === 'paused' 
  const canCancel = ['running', 'paused'].includes(execution.status)

  async function handlePause() {
    setLoading('pause')
    setError(null)
    
    try {
      await executionEngine.pauseExecution(execution.id)
      await stateManager.updateExecutionStatus(execution.id, 'paused')
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause execution')
    } finally {
      setLoading(null)
    }
  }

  async function handleResume() {
    setLoading('resume')
    setError(null)
    
    try {
      await executionEngine.resumeExecution(execution.id)
      await stateManager.updateExecutionStatus(execution.id, 'running')
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume execution')
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this execution? This action cannot be undone.')) {
      return
    }

    setLoading('cancel')
    setError(null)
    
    try {
      await executionEngine.cancelExecution(execution.id)
      await stateManager.updateExecutionStatus(execution.id, 'cancelled')
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        {canPause && (
          <button
            onClick={handlePause}
            disabled={loading === 'pause'}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading === 'pause' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Pausing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </>
            )}
          </button>
        )}

        {canResume && (
          <button
            onClick={handleResume}
            disabled={loading === 'resume'}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading === 'resume' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Resuming...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </>
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={loading === 'cancel'}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {loading === 'cancel' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cancelling...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cancel
              </>
            )}
          </button>
        )}
      </div>

      {/* Execution Status Info */}
      <div className="bg-gray-50 rounded-md p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Current Status:</span>
          <span className={`font-medium ${
            execution.status === 'running' ? 'text-blue-600' :
            execution.status === 'paused' ? 'text-yellow-600' :
            execution.status === 'completed' ? 'text-green-600' :
            execution.status === 'failed' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
          </span>
        </div>
        
        {execution.current_steps && execution.current_steps.length > 0 && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-500">Current Steps:</span>
            <span className="text-gray-900">{execution.current_steps.length} active</span>
          </div>
        )}
        
        {execution.sla_deadline && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-500">SLA Deadline:</span>
            <span className={`font-medium ${
              new Date(execution.sla_deadline) < new Date() ? 'text-red-600' : 'text-gray-900'
            }`}>
              {new Date(execution.sla_deadline).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}