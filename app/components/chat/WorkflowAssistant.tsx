import React, { useState, useCallback } from 'react'
import { detectWorkflowIntent, type WorkflowDetection } from '~/lib/workflow/chat-to-workflow'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow } from '~/types/database'

interface WorkflowAssistantProps {
  onWorkflowCreated?: (workflow: Workflow) => void
  onShowWorkflow?: (workflow: Workflow) => void
}

export function WorkflowAssistant({ onWorkflowCreated, onShowWorkflow }: WorkflowAssistantProps) {
  const { user, organization } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  const processMessage = useCallback(async (message: string): Promise<WorkflowDetection | null> => {
    if (!message.trim()) return null

    setIsProcessing(true)
    
    try {
      // Detect workflow intent
      const detection = detectWorkflowIntent(message)
      
      if (detection.isWorkflowRequest && detection.suggestedWorkflow) {
        // Fill in missing fields
        detection.suggestedWorkflow.organization_id = organization?.id || ''
        detection.suggestedWorkflow.created_by = user?.id || ''
        
        return detection
      }
      
      return null
    } catch (error) {
      console.error('Error processing workflow message:', error)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [user, organization])

  const createWorkflow = useCallback(async (detection: WorkflowDetection): Promise<Workflow | null> => {
    if (!detection.suggestedWorkflow || !organization) return null

    try {
      // Save workflow to database
      const { data: workflow, error } = await supabase
        .from('workflows')
        .insert({
          name: detection.suggestedWorkflow.name,
          description: detection.suggestedWorkflow.description,
          organization_id: organization.id,
          created_by: user?.id || '',
          steps: detection.suggestedSteps || [],
          triggers: detection.suggestedWorkflow.triggers,
          status: 'draft',
          version: 1,
          config: detection.suggestedWorkflow.config,
          permissions: detection.suggestedWorkflow.permissions
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workflow:', error)
        return null
      }

      onWorkflowCreated?.(workflow)
      return workflow
    } catch (error) {
      console.error('Error saving workflow:', error)
      return null
    }
  }, [user, organization, onWorkflowCreated])

  return {
    processMessage,
    createWorkflow,
    isProcessing
  }
}

/**
 * Hook for integrating workflow detection into chat messages
 */
export function useWorkflowDetection() {
  const { processMessage, createWorkflow, isProcessing } = WorkflowAssistant({})

  const handleMessage = useCallback(async (message: string) => {
    const detection = await processMessage(message)
    
    if (detection && detection.isWorkflowRequest) {
      return {
        isWorkflow: true,
        confidence: detection.confidence,
        suggestion: detection.suggestedWorkflow,
        steps: detection.suggestedSteps,
        intent: detection.intent,
        createWorkflow: () => createWorkflow(detection)
      }
    }

    return {
      isWorkflow: false,
      confidence: 0
    }
  }, [processMessage, createWorkflow])

  return {
    handleMessage,
    isProcessing
  }
}