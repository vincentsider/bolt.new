// Trigger Monitor Service
// Background service for monitoring and executing workflow triggers

import { createClient } from '@supabase/supabase-js'
import { TriggerEngine } from './trigger-engine'
import type { WorkflowTrigger, TriggerMonitor } from '~/types/trigger-library'

export class TriggerMonitorService {
  private engines: Map<string, TriggerEngine> = new Map()
  private isRunning = false
  private checkInterval: NodeJS.Timeout | null = null
  
  constructor(
    private supabaseUrl: string,
    private supabaseServiceKey: string
  ) {}

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Trigger monitor service is already running')
      return
    }
    
    console.log('Starting trigger monitor service...')
    this.isRunning = true
    
    // Initial check
    await this.checkAndStartMonitors()
    
    // Set up periodic checks every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.checkAndStartMonitors()
    }, 300000) // 5 minutes
  }

  /**
   * Stop the monitoring service
   */
  async stop(): Promise<void> {
    console.log('Stopping trigger monitor service...')
    this.isRunning = false
    
    // Clear periodic check
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    // Stop all engines
    for (const [orgId, engine] of this.engines) {
      console.log(`Stopping trigger engine for organization ${orgId}`)
      // Stop all monitors in this engine
      // In real implementation, engine would have a stopAll() method
    }
    
    this.engines.clear()
  }

  /**
   * Check for active triggers and start monitoring
   */
  private async checkAndStartMonitors(): Promise<void> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
      
      // Get all active workflow triggers grouped by organization
      const { data: activeTriggers, error } = await supabase
        .from('workflow_triggers')
        .select(`
          *,
          workflows!inner(
            organization_id,
            status
          )
        `)
        .eq('active', true)
        .eq('workflows.status', 'published')
      
      if (error) {
        console.error('Failed to fetch active triggers:', error)
        return
      }
      
      // Group triggers by organization
      const triggersByOrg = new Map<string, WorkflowTrigger[]>()
      
      for (const trigger of activeTriggers || []) {
        const orgId = trigger.workflows.organization_id
        if (!triggersByOrg.has(orgId)) {
          triggersByOrg.set(orgId, [])
        }
        triggersByOrg.get(orgId)!.push(trigger)
      }
      
      // Start monitoring for each organization
      for (const [orgId, triggers] of triggersByOrg) {
        await this.startOrganizationMonitoring(orgId, triggers)
      }
      
      // Clean up engines for organizations with no active triggers
      for (const [orgId, engine] of this.engines) {
        if (!triggersByOrg.has(orgId)) {
          console.log(`No active triggers for organization ${orgId}, stopping engine`)
          this.engines.delete(orgId)
        }
      }
      
    } catch (error) {
      console.error('Error in trigger monitor check:', error)
    }
  }

  /**
   * Start monitoring for an organization's triggers
   */
  private async startOrganizationMonitoring(
    organizationId: string, 
    triggers: WorkflowTrigger[]
  ): Promise<void> {
    // Get or create engine for this organization
    let engine = this.engines.get(organizationId)
    if (!engine) {
      console.log(`Creating trigger engine for organization ${organizationId}`)
      engine = new TriggerEngine(organizationId, this.supabaseUrl, this.supabaseServiceKey)
      this.engines.set(organizationId, engine)
    }
    
    // Start monitoring each trigger
    for (const trigger of triggers) {
      try {
        await engine.startMonitoring(trigger)
        console.log(`Started monitoring trigger ${trigger.id} (${trigger.name})`)
      } catch (error) {
        console.error(`Failed to start monitoring for trigger ${trigger.id}:`, error)
      }
    }
  }

  /**
   * Get monitoring status for all triggers
   */
  async getMonitoringStatus(): Promise<{
    isRunning: boolean
    organizations: number
    totalTriggers: number
    monitors: TriggerMonitor[]
  }> {
    const monitors: TriggerMonitor[] = []
    let totalTriggers = 0
    
    // Collect monitors from all engines
    for (const [orgId, engine] of this.engines) {
      // In real implementation, engine would expose its monitors
      // For now, just count
      totalTriggers++
    }
    
    return {
      isRunning: this.isRunning,
      organizations: this.engines.size,
      totalTriggers,
      monitors
    }
  }

  /**
   * Manually execute a trigger (for testing)
   */
  async executeTrigger(
    organizationId: string, 
    triggerId: string, 
    eventData: any = {}
  ): Promise<void> {
    const engine = this.engines.get(organizationId)
    if (!engine) {
      throw new Error(`No engine found for organization ${organizationId}`)
    }
    
    // Fetch trigger details
    const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    const { data: trigger, error } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('id', triggerId)
      .single()
    
    if (error || !trigger) {
      throw new Error(`Trigger ${triggerId} not found`)
    }
    
    await engine.executeTrigger(trigger, eventData)
  }
}

// Singleton instance
let monitorService: TriggerMonitorService | null = null

/**
 * Get or create the trigger monitor service instance
 */
export function getTriggerMonitorService(
  supabaseUrl: string,
  supabaseServiceKey: string
): TriggerMonitorService {
  if (!monitorService) {
    monitorService = new TriggerMonitorService(supabaseUrl, supabaseServiceKey)
  }
  return monitorService
}

/**
 * Start the trigger monitoring service (call this on server startup)
 */
export async function startTriggerMonitoring(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const service = getTriggerMonitorService(supabaseUrl, supabaseServiceKey)
  await service.start()
}