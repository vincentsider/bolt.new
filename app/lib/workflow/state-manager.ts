import { atom, map } from 'nanostores'
import { supabase } from '~/lib/supabase'
import type { WorkflowExecution, StepExecution, Workflow } from '~/types/database'

// Global execution state
export const executionStore = map<{
  activeExecutions: Map<string, WorkflowExecution>
  completedExecutions: Map<string, WorkflowExecution>
  stepExecutions: Map<string, StepExecution[]>
  executionMetrics: Map<string, ExecutionMetrics>
}>({
  activeExecutions: new Map(),
  completedExecutions: new Map(),
  stepExecutions: new Map(),
  executionMetrics: new Map()
})

// Current selected execution
export const selectedExecutionId = atom<string | null>(null)

// Real-time updates enabled
export const realTimeEnabled = atom<boolean>(true)

// Execution metrics
export interface ExecutionMetrics {
  executionId: string
  totalSteps: number
  completedSteps: number
  failedSteps: number
  skippedSteps: number
  pendingSteps: number
  averageStepDuration: number
  totalDuration: number
  slaStatus: 'within' | 'approaching' | 'exceeded'
  progressPercentage: number
  estimatedCompletion?: string
}

// Execution events for real-time updates
export type ExecutionEvent = 
  | { type: 'execution_started'; executionId: string; execution: WorkflowExecution }
  | { type: 'execution_completed'; executionId: string; execution: WorkflowExecution }
  | { type: 'execution_failed'; executionId: string; execution: WorkflowExecution; error: any }
  | { type: 'execution_paused'; executionId: string; execution: WorkflowExecution }
  | { type: 'execution_resumed'; executionId: string; execution: WorkflowExecution }
  | { type: 'step_started'; executionId: string; stepExecution: StepExecution }
  | { type: 'step_completed'; executionId: string; stepExecution: StepExecution }
  | { type: 'step_failed'; executionId: string; stepExecution: StepExecution; error: any }
  | { type: 'step_retry'; executionId: string; stepExecution: StepExecution; attempt: number }

export class WorkflowStateManager {
  private eventListeners: ((event: ExecutionEvent) => void)[] = []
  private realtimeSubscription: any = null
  private metricsUpdateInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupRealtimeUpdates()
    this.startMetricsUpdates()
  }

  /**
   * Start tracking an execution
   */
  async startTracking(executionId: string): Promise<void> {
    try {
      // Load execution details
      const execution = await this.loadExecution(executionId)
      if (!execution) {
        throw new Error('Execution not found')
      }

      // Add to active executions
      const store = executionStore.get()
      store.activeExecutions.set(executionId, execution)
      executionStore.set(store)

      // Load step executions
      await this.loadStepExecutions(executionId)

      // Calculate initial metrics
      await this.updateMetrics(executionId)

      // Emit event
      this.emitEvent({
        type: 'execution_started',
        executionId,
        execution
      })

    } catch (error) {
      console.error('Failed to start tracking execution:', error)
    }
  }

  /**
   * Stop tracking an execution
   */
  stopTracking(executionId: string): void {
    const store = executionStore.get()
    
    // Move from active to completed if exists
    const execution = store.activeExecutions.get(executionId)
    if (execution) {
      store.completedExecutions.set(executionId, execution)
      store.activeExecutions.delete(executionId)
    }

    // Clean up metrics for completed executions (keep last 100)
    if (store.completedExecutions.size > 100) {
      const oldestKey = store.completedExecutions.keys().next().value
      store.completedExecutions.delete(oldestKey)
      store.executionMetrics.delete(oldestKey)
      store.stepExecutions.delete(oldestKey)
    }

    executionStore.set(store)
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string, 
    status: WorkflowExecution['status'],
    completedAt?: string
  ): Promise<void> {
    const store = executionStore.get()
    const execution = store.activeExecutions.get(executionId)
    
    if (execution) {
      const updatedExecution = {
        ...execution,
        status,
        ...(completedAt && { completed_at: completedAt })
      }

      store.activeExecutions.set(executionId, updatedExecution)
      executionStore.set(store)

      // Update metrics
      await this.updateMetrics(executionId)

      // Emit appropriate event
      switch (status) {
        case 'completed':
          this.emitEvent({ type: 'execution_completed', executionId, execution: updatedExecution })
          this.stopTracking(executionId)
          break
        case 'failed':
          this.emitEvent({ type: 'execution_failed', executionId, execution: updatedExecution, error: null })
          this.stopTracking(executionId)
          break
        case 'paused':
          this.emitEvent({ type: 'execution_paused', executionId, execution: updatedExecution })
          break
        case 'running':
          this.emitEvent({ type: 'execution_resumed', executionId, execution: updatedExecution })
          break
      }
    }
  }

  /**
   * Update step execution status
   */
  async updateStepStatus(stepExecution: StepExecution): Promise<void> {
    const store = executionStore.get()
    const steps = store.stepExecutions.get(stepExecution.execution_id) || []
    
    // Update or add step execution
    const stepIndex = steps.findIndex(s => s.id === stepExecution.id)
    if (stepIndex >= 0) {
      steps[stepIndex] = stepExecution
    } else {
      steps.push(stepExecution)
    }

    store.stepExecutions.set(stepExecution.execution_id, steps)
    executionStore.set(store)

    // Update metrics
    await this.updateMetrics(stepExecution.execution_id)

    // Emit event
    switch (stepExecution.status) {
      case 'in_progress':
        this.emitEvent({ type: 'step_started', executionId: stepExecution.execution_id, stepExecution })
        break
      case 'completed':
        this.emitEvent({ type: 'step_completed', executionId: stepExecution.execution_id, stepExecution })
        break
      case 'failed':
        this.emitEvent({ type: 'step_failed', executionId: stepExecution.execution_id, stepExecution, error: stepExecution.output?.error })
        break
    }
  }

  /**
   * Calculate and update execution metrics
   */
  async updateMetrics(executionId: string): Promise<void> {
    const store = executionStore.get()
    const execution = store.activeExecutions.get(executionId) || store.completedExecutions.get(executionId)
    const steps = store.stepExecutions.get(executionId) || []

    if (!execution) return

    // Calculate step metrics
    const totalSteps = steps.length
    const completedSteps = steps.filter(s => s.status === 'completed').length
    const failedSteps = steps.filter(s => s.status === 'failed').length
    const skippedSteps = steps.filter(s => s.status === 'skipped').length
    const pendingSteps = steps.filter(s => s.status === 'pending').length

    // Calculate durations
    const completedStepDurations = steps
      .filter(s => s.status === 'completed' && s.started_at && s.completed_at)
      .map(s => new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime())

    const averageStepDuration = completedStepDurations.length > 0
      ? completedStepDurations.reduce((sum, duration) => sum + duration, 0) / completedStepDurations.length
      : 0

    const totalDuration = execution.completed_at
      ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
      : Date.now() - new Date(execution.started_at).getTime()

    // Calculate progress
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

    // Calculate SLA status
    const slaStatus = this.calculateSLAStatus(execution, totalDuration)

    // Estimate completion time
    const estimatedCompletion = this.estimateCompletion(
      execution,
      steps,
      averageStepDuration,
      completedSteps,
      totalSteps
    )

    const metrics: ExecutionMetrics = {
      executionId,
      totalSteps,
      completedSteps,
      failedSteps,
      skippedSteps,
      pendingSteps,
      averageStepDuration,
      totalDuration,
      slaStatus,
      progressPercentage,
      estimatedCompletion
    }

    store.executionMetrics.set(executionId, metrics)
    executionStore.set(store)
  }

  /**
   * Get execution metrics
   */
  getMetrics(executionId: string): ExecutionMetrics | null {
    return executionStore.get().executionMetrics.get(executionId) || null
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(executionStore.get().activeExecutions.values())
  }

  /**
   * Get step executions for an execution
   */
  getStepExecutions(executionId: string): StepExecution[] {
    return executionStore.get().stepExecutions.get(executionId) || []
  }

  /**
   * Subscribe to execution events
   */
  addEventListener(listener: (event: ExecutionEvent) => void): () => void {
    this.eventListeners.push(listener)
    
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index >= 0) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * Setup real-time updates from Supabase
   */
  private setupRealtimeUpdates(): void {
    if (!realTimeEnabled.get()) return

    // Subscribe to workflow execution changes
    this.realtimeSubscription = supabase
      .channel('workflow_executions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_executions'
      }, (payload) => {
        this.handleExecutionUpdate(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'step_executions'
      }, (payload) => {
        this.handleStepUpdate(payload)
      })
      .subscribe()
  }

  /**
   * Handle real-time execution updates
   */
  private handleExecutionUpdate(payload: any): void {
    const { new: newRecord, old: oldRecord, eventType } = payload

    if (eventType === 'UPDATE' && newRecord) {
      this.updateExecutionStatus(
        newRecord.id,
        newRecord.status,
        newRecord.completed_at
      )
    }
  }

  /**
   * Handle real-time step updates
   */
  private handleStepUpdate(payload: any): void {
    const { new: newRecord, eventType } = payload

    if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
      this.updateStepStatus(newRecord)
    }
  }

  /**
   * Start periodic metrics updates
   */
  private startMetricsUpdates(): void {
    this.metricsUpdateInterval = setInterval(() => {
      const activeExecutions = this.getActiveExecutions()
      activeExecutions.forEach(execution => {
        this.updateMetrics(execution.id)
      })
    }, 10000) // Update every 10 seconds
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ExecutionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    })
  }

  /**
   * Load execution from database
   */
  private async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error) {
      console.error('Failed to load execution:', error)
      return null
    }

    return data
  }

  /**
   * Load step executions from database
   */
  private async loadStepExecutions(executionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('step_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true })

    if (error) {
      console.error('Failed to load step executions:', error)
      return
    }

    const store = executionStore.get()
    store.stepExecutions.set(executionId, data || [])
    executionStore.set(store)
  }

  /**
   * Calculate SLA status
   */
  private calculateSLAStatus(execution: WorkflowExecution, currentDuration: number): 'within' | 'approaching' | 'exceeded' {
    if (!execution.sla_deadline) return 'within'

    const deadline = new Date(execution.sla_deadline).getTime()
    const now = execution.completed_at ? new Date(execution.completed_at).getTime() : Date.now()
    
    if (now > deadline) return 'exceeded'
    
    const timeLeft = deadline - now
    const slaBuffer = 30 * 60 * 1000 // 30 minutes buffer

    if (timeLeft < slaBuffer) return 'approaching'
    
    return 'within'
  }

  /**
   * Estimate completion time
   */
  private estimateCompletion(
    execution: WorkflowExecution,
    steps: StepExecution[],
    avgStepDuration: number,
    completedSteps: number,
    totalSteps: number
  ): string | undefined {
    if (execution.completed_at || totalSteps === 0 || avgStepDuration === 0) {
      return undefined
    }

    const remainingSteps = totalSteps - completedSteps
    const estimatedRemainingTime = remainingSteps * avgStepDuration

    const estimatedCompletion = new Date(Date.now() + estimatedRemainingTime)
    return estimatedCompletion.toISOString()
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe()
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval)
    }

    this.eventListeners.length = 0
  }
}

// Global state manager instance
export const stateManager = new WorkflowStateManager()

// Helper hooks for React components
export function useExecutionState(executionId: string | null) {
  const [execution, setExecution] = React.useState<WorkflowExecution | null>(null)
  const [metrics, setMetrics] = React.useState<ExecutionMetrics | null>(null)
  const [steps, setSteps] = React.useState<StepExecution[]>([])

  React.useEffect(() => {
    if (!executionId) return

    // Load initial data
    const store = executionStore.get()
    setExecution(
      store.activeExecutions.get(executionId) || 
      store.completedExecutions.get(executionId) || 
      null
    )
    setMetrics(store.executionMetrics.get(executionId) || null)
    setSteps(store.stepExecutions.get(executionId) || [])

    // Subscribe to updates
    const unsubscribe = executionStore.subscribe((newStore) => {
      setExecution(
        newStore.activeExecutions.get(executionId) || 
        newStore.completedExecutions.get(executionId) || 
        null
      )
      setMetrics(newStore.executionMetrics.get(executionId) || null)
      setSteps(newStore.stepExecutions.get(executionId) || [])
    })

    return unsubscribe
  }, [executionId])

  return { execution, metrics, steps }
}

// React import for hooks (this would normally be at the top)
import React from 'react'