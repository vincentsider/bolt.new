import React, { useState, useEffect } from 'react'
import type { Workflow, WorkflowStep } from '~/types/database'
import { useAuth } from '~/components/auth/AuthProvider'
import { regenerateWebContainerFiles, hotUpdateWebContainerFile } from '~/lib/workflow/code-parser'
import { generateWorkflowApplication } from '~/lib/workflow/generators'

interface WebContainerWorkflowStepTabsProps {
  workflow: Partial<Workflow>
  workflowFiles: Record<string, string>
  onWorkflowUpdate: (workflow: Partial<Workflow>) => void
  onFilesUpdate: (files: Record<string, string>) => void
  webcontainerRunner?: any
}

export function WebContainerWorkflowStepTabs({ 
  workflow, 
  workflowFiles, 
  onWorkflowUpdate, 
  onFilesUpdate,
  webcontainerRunner 
}: WebContainerWorkflowStepTabsProps) {
  const { organization } = useAuth()
  const [activeStep, setActiveStep] = useState<'capture' | 'review' | 'approval' | 'update'>('capture')
  const [isUpdating, setIsUpdating] = useState(false)

  // Extract current step data from workflow config
  const getCurrentStepData = () => {
    const steps = workflow.config?.steps || []
    
    return {
      capture: steps.find(s => s.type === 'capture'),
      review: steps.find(s => s.type === 'review'), 
      approval: steps.find(s => s.type === 'approve'),
      update: steps.find(s => s.type === 'update')
    }
  }

  const stepData = getCurrentStepData()

  // Update workflow configuration and regenerate WebContainer files
  const updateWorkflowConfig = async (updatedWorkflow: Partial<Workflow>) => {
    try {
      setIsUpdating(true)
      console.log('🔄 Updating workflow config and regenerating WebContainer files...')
      
      // Update workflow state
      onWorkflowUpdate(updatedWorkflow)
      
      // Regenerate WebContainer files with new configuration
      const newFiles = generateWorkflowApplication(updatedWorkflow as Workflow)
      
      // Update WebContainer
      if (webcontainerRunner) {
        await webcontainerRunner.mountWorkflow(newFiles)
        console.log('✅ WebContainer remounted with updated workflow')
      }
      
      // Update files state
      onFilesUpdate(newFiles)
      
    } catch (error) {
      console.error('Error updating workflow configuration:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Add data field to capture step
  const addDataField = async () => {
    const currentSteps = workflow.config?.steps || []
    const captureStep = currentSteps.find(s => s.type === 'capture')
    
    const newField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      validation: {}
    }
    
    let updatedSteps
    if (captureStep) {
      // Update existing capture step
      updatedSteps = currentSteps.map(step => 
        step.type === 'capture' 
          ? { 
              ...step, 
              config: { 
                ...step.config, 
                fields: [...(step.config?.fields || []), newField] 
              } 
            }
          : step
      )
    } else {
      // Create new capture step
      const newCaptureStep: WorkflowStep = {
        id: 'step-1-capture',
        name: 'Data Capture',
        type: 'capture',
        description: 'Collect required information',
        config: { fields: [newField] },
        nextSteps: []
      }
      updatedSteps = [newCaptureStep, ...currentSteps]
    }
    
    await updateWorkflowConfig({
      ...workflow,
      config: { ...workflow.config, steps: updatedSteps }
    })
  }

  // Remove data field from capture step
  const removeDataField = async (index: number) => {
    const currentSteps = workflow.config?.steps || []
    const captureStep = currentSteps.find(s => s.type === 'capture')
    
    if (captureStep && captureStep.config?.fields) {
      const updatedFields = captureStep.config.fields.filter((_, i) => i !== index)
      
      const updatedSteps = currentSteps.map(step =>
        step.type === 'capture'
          ? { ...step, config: { ...step.config, fields: updatedFields } }
          : step
      )
      
      await updateWorkflowConfig({
        ...workflow,
        config: { ...workflow.config, steps: updatedSteps }
      })
    }
  }

  // Update field properties
  const updateDataField = async (index: number, field: string, value: any) => {
    const currentSteps = workflow.config?.steps || []
    const captureStep = currentSteps.find(s => s.type === 'capture')
    
    if (captureStep && captureStep.config?.fields && captureStep.config.fields[index]) {
      const updatedFields = captureStep.config.fields.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      )
      
      const updatedSteps = currentSteps.map(step =>
        step.type === 'capture'
          ? { ...step, config: { ...step.config, fields: updatedFields } }
          : step
      )
      
      await updateWorkflowConfig({
        ...workflow,
        config: { ...workflow.config, steps: updatedSteps }
      })
    }
  }

  // Update step metadata
  const updateStepMetadata = async (stepType: string, updates: any) => {
    const currentSteps = workflow.config?.steps || []
    
    const updatedSteps = currentSteps.map(step =>
      step.type === stepType
        ? { ...step, ...updates, config: { ...step.config, ...updates.config } }
        : step
    )
    
    await updateWorkflowConfig({
      ...workflow,
      config: { ...workflow.config, steps: updatedSteps }
    })
  }

  const renderProgressBar = () => {
    const steps = ['capture', 'review', 'approval', 'update']
    const currentIndex = steps.indexOf(activeStep)
    const progressPercentage = ((currentIndex + 1) / steps.length) * 100

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => {
            const isActive = step === activeStep
            const isCompleted = index < currentIndex
            const stepLabels = {
              capture: 'Step 1: Capture',
              review: 'Step 2: Review', 
              approval: 'Step 3: Approval',
              update: 'Step 4: Update'
            }
            
            return (
              <button
                key={step}
                onClick={() => setActiveStep(step as any)}
                className={`flex-1 py-2 px-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : isCompleted
                    ? 'border-green-500 text-green-600 hover:bg-green-50'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {stepLabels[step as keyof typeof stepLabels]}
              </button>
            )
          })}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    )
  }

  const renderCaptureStep = () => {
    const step = stepData.capture
    const fields = step?.config?.fields || []
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Capture Section</h3>
          <p className="text-sm text-gray-600 mb-6">Collect data, documents, and checklist inputs from the relevant team.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
              <input
                type="text"
                value={step?.name || 'Data Capture'}
                onChange={(e) => updateStepMetadata('capture', { name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter capture step name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={step?.description || ''}
                onChange={(e) => updateStepMetadata('capture', { description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Describe what this step does"
              />
            </div>
          </div>
        </div>

        {/* Data Fields Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Data Fields</h4>
            <button
              onClick={addDataField}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : '+ Add Field'}
            </button>
          </div>
          
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={field.label || field.name}
                  onChange={(e) => updateDataField(index, 'label', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Field Label"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateDataField(index, 'type', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="file">File</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateDataField(index, 'required', e.target.checked)}
                    className="mr-1"
                  />
                  Required
                </label>
                <button
                  onClick={() => removeDataField(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  disabled={isUpdating}
                >
                  Remove
                </button>
              </div>
            ))}
            
            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No fields configured yet.</p>
                <p className="text-sm">Click "Add Field" to start building your form.</p>
              </div>
            )}
          </div>
        </div>

        {/* WebContainer Status */}
        {isUpdating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              <span className="text-blue-700 text-sm">Updating workflow application...</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderOtherSteps = (stepType: string) => {
    const step = stepData[stepType as keyof typeof stepData]
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Step {stepType === 'review' ? '2: Review' : stepType === 'approval' ? '3: Approval' : '4: Update'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
              <input
                type="text"
                value={step?.name || `${stepType.charAt(0).toUpperCase() + stepType.slice(1)}`}
                onChange={(e) => updateStepMetadata(stepType, { name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${stepType} step name`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={step?.description || ''}
                onChange={(e) => updateStepMetadata(stepType, { description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={`Describe what happens in the ${stepType} step`}
              />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              This step is automatically handled by the generated workflow application.
              Configure the behavior through the workflow logic.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 'capture': return renderCaptureStep()
      case 'review': return renderOtherSteps('review')
      case 'approval': return renderOtherSteps('approval')
      case 'update': return renderOtherSteps('update')
      default: return renderCaptureStep()
    }
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workflow Configuration</h2>
            <p className="text-sm text-gray-600">
              Configure your workflow steps. Changes will update the live WebContainer application.
            </p>
          </div>
        </div>
        
        {renderProgressBar()}
        <div className="min-h-[600px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              const steps = ['capture', 'review', 'approval', 'update']
              const currentIndex = steps.indexOf(activeStep)
              if (currentIndex > 0) {
                setActiveStep(steps[currentIndex - 1] as any)
              }
            }}
            disabled={activeStep === 'capture'}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeStep === 'capture'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            ← Previous
          </button>
          
          <div className="text-sm text-gray-500">
            Changes are automatically applied to the live workflow
          </div>
          
          <button
            onClick={() => {
              const steps = ['capture', 'review', 'approval', 'update']
              const currentIndex = steps.indexOf(activeStep)
              if (currentIndex < steps.length - 1) {
                setActiveStep(steps[currentIndex + 1] as any)
              }
            }}
            disabled={activeStep === 'update'}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeStep === 'update'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}