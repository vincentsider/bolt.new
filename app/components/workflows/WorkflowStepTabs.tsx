import React, { useState } from 'react'
import type { Workflow, WorkflowTrigger as DatabaseWorkflowTrigger } from '~/types/database'
import type { WorkflowTrigger as TriggerLibraryWorkflowTrigger } from '~/types/trigger-library'
import { TriggerConfiguration } from './TriggerConfiguration'
import { useAuth } from '~/components/auth/AuthProvider'

interface WorkflowStepTabsProps {
  workflow: Partial<Workflow>
  onWorkflowUpdate: (workflow: Partial<Workflow>) => void
}

interface StepData {
  // Capture Step
  capture?: {
    title: string
    assignedTeam: string
    dataFields: Array<{
      label: string
      type: 'text' | 'dropdown' | 'date' | 'number' | 'email' | 'file'
      required: boolean
      validation?: string
      systemMapping?: string
    }>
    checklistQuestions: Array<{
      question: string
      type: 'yes_no' | 'multiple_choice'
      required: boolean
      options?: string[]
    }>
    fileUploads: Array<{
      documentType: string
      mandatory: boolean
    }>
  }
  // Review Step
  review?: {
    title: string
    assignedReviewers: string[]
    instructions: string
    displayInfo: string[]
  }
  // Approval Step
  approval?: {
    title: string
    approvalType: 'single' | 'multi_level'
    approvingDepartment: string[]
    conditions: Array<{
      rule: string
      escalation?: string
    }>
  }
  // Update Step
  update?: {
    title: string
    targetSystems: string[]
    fieldsToSync: Array<{
      source: string
      destination: string
    }>
    triggers: string[]
  }
}

export function WorkflowStepTabs({ workflow, onWorkflowUpdate }: WorkflowStepTabsProps) {
  const { organization } = useAuth()
  const [activeStep, setActiveStep] = useState<'capture' | 'review' | 'approval' | 'update'>('capture')
  const [showTriggerConfig, setShowTriggerConfig] = useState(false)
  const [workflowTriggers, setWorkflowTriggers] = useState<TriggerLibraryWorkflowTrigger[]>([])

  // Convert trigger library triggers to database triggers
  const convertToDbTrigger = (trigger: TriggerLibraryWorkflowTrigger): DatabaseWorkflowTrigger => {
    return {
      id: trigger.id,
      type: 'manual', // Default type, could be determined from template
      enabled: trigger.active,
      config: trigger.config || {}
    }
  }
  const [stepData, setStepData] = useState<StepData>({
    capture: {
      title: 'Employee Information Capture',
      assignedTeam: 'HR Department',
      dataFields: [
        { label: 'First Name', type: 'text', required: true },
        { label: 'Last Name', type: 'text', required: true },
        { label: 'Email Address', type: 'email', required: true },
        { label: 'Department', type: 'dropdown', required: true },
        { label: 'Start Date', type: 'date', required: true }
      ],
      checklistQuestions: [
        { question: 'Has employee completed mandatory training?', type: 'yes_no', required: true },
        { question: 'Background check status', type: 'multiple_choice', required: true, options: ['Pending', 'Completed', 'Not Required'] }
      ],
      fileUploads: [
        { documentType: 'Photo ID', mandatory: true },
        { documentType: 'Signed Contract', mandatory: true },
        { documentType: 'Emergency Contact Form', mandatory: false }
      ]
    },
    review: {
      title: 'HR Manager Review',
      assignedReviewers: ['HR Manager', 'Department Head'],
      instructions: 'Review all submitted information for completeness and accuracy',
      displayInfo: ['Personal Information', 'Documentation', 'Checklist Responses']
    },
    approval: {
      title: 'Final Approval',
      approvalType: 'multi_level',
      approvingDepartment: ['HR Director', 'Department Manager'],
      conditions: [
        { rule: 'If salary > $100k, escalate to VP', escalation: 'VP Approval Required' },
        { rule: 'If remote position, additional IT approval needed', escalation: 'IT Director' }
      ]
    },
    update: {
      title: 'System Integration',
      targetSystems: ['HRIS System', 'Payroll System', 'Access Management'],
      fieldsToSync: [
        { source: 'Employee Name', destination: 'HRIS.employee_name' },
        { source: 'Department', destination: 'HRIS.department' },
        { source: 'Start Date', destination: 'Payroll.start_date' }
      ],
      triggers: ['After final approval', 'Before start date']
    }
  })

  const updateStepData = (step: keyof StepData, data: any) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data }
    }))
  }

  const addDataField = () => {
    if (!stepData.capture) return
    const newField = { label: '', type: 'text' as const, required: false }
    updateStepData('capture', {
      dataFields: [...stepData.capture.dataFields, newField]
    })
  }

  const removeDataField = (index: number) => {
    if (!stepData.capture) return
    const fields = stepData.capture.dataFields.filter((_, i) => i !== index)
    updateStepData('capture', { dataFields: fields })
  }

  const addChecklistQuestion = () => {
    if (!stepData.capture) return
    const newQuestion = { question: '', type: 'yes_no' as const, required: false }
    updateStepData('capture', {
      checklistQuestions: [...stepData.capture.checklistQuestions, newQuestion]
    })
  }

  const addFileUpload = () => {
    if (!stepData.capture) return
    const newUpload = { documentType: '', mandatory: false }
    updateStepData('capture', {
      fileUploads: [...stepData.capture.fileUploads, newUpload]
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
    const data = stepData.capture!
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Capture Section</h3>
          <p className="text-sm text-gray-600 mb-6">Collect data, documents, and checklist inputs from the relevant team.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / Name of Capture Step</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => updateStepData('capture', { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter capture step title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Team / Department</label>
              <input
                type="text"
                value={data.assignedTeam}
                onChange={(e) => updateStepData('capture', { assignedTeam: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter assigned team"
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
            >
              + Add Field
            </button>
          </div>
          
          <div className="space-y-3">
            {data.dataFields.map((field, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => {
                    const fields = [...data.dataFields]
                    fields[index] = { ...field, label: e.target.value }
                    updateStepData('capture', { dataFields: fields })
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Field Label"
                />
                <select
                  value={field.type}
                  onChange={(e) => {
                    const fields = [...data.dataFields]
                    fields[index] = { ...field, type: e.target.value as any }
                    updateStepData('capture', { dataFields: fields })
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="text">Text</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="file">File</option>
                </select>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => {
                      const fields = [...data.dataFields]
                      fields[index] = { ...field, required: e.target.checked }
                      updateStepData('capture', { dataFields: fields })
                    }}
                    className="mr-1"
                  />
                  Required
                </label>
                <button
                  onClick={() => removeDataField(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist Questions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Checklist Questions</h4>
            <button
              onClick={addChecklistQuestion}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Question
            </button>
          </div>
          
          <div className="space-y-3">
            {data.checklistQuestions.map((question, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={question.question}
                  onChange={(e) => {
                    const questions = [...data.checklistQuestions]
                    questions[index] = { ...question, question: e.target.value }
                    updateStepData('capture', { checklistQuestions: questions })
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                  placeholder="Question Text"
                />
                <div className="flex items-center gap-3">
                  <select
                    value={question.type}
                    onChange={(e) => {
                      const questions = [...data.checklistQuestions]
                      questions[index] = { ...question, type: e.target.value as any }
                      updateStepData('capture', { checklistQuestions: questions })
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="yes_no">Yes/No</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(e) => {
                        const questions = [...data.checklistQuestions]
                        questions[index] = { ...question, required: e.target.checked }
                        updateStepData('capture', { checklistQuestions: questions })
                      }}
                      className="mr-1"
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Uploads */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">File Uploads</h4>
            <button
              onClick={addFileUpload}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Upload
            </button>
          </div>
          
          <div className="space-y-3">
            {data.fileUploads.map((upload, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={upload.documentType}
                  onChange={(e) => {
                    const uploads = [...data.fileUploads]
                    uploads[index] = { ...upload, documentType: e.target.value }
                    updateStepData('capture', { fileUploads: uploads })
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Document Type"
                />
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={upload.mandatory}
                    onChange={(e) => {
                      const uploads = [...data.fileUploads]
                      uploads[index] = { ...upload, mandatory: e.target.checked }
                      updateStepData('capture', { fileUploads: uploads })
                    }}
                    className="mr-1"
                  />
                  Mandatory
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderReviewStep = () => {
    const data = stepData.review!
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Review Section</h3>
          <p className="text-sm text-gray-600 mb-6">Allow designated users to review submitted data and documentation.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / Name of Review Step</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => updateStepData('review', { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter review step title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Reviewer(s) / Team</label>
              <input
                type="text"
                value={data.assignedReviewers.join(', ')}
                onChange={(e) => updateStepData('review', { assignedReviewers: e.target.value.split(', ') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reviewers (comma separated)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Instructions</label>
              <textarea
                value={data.instructions}
                onChange={(e) => updateStepData('review', { instructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Optional notes for reviewers"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Information to Display</label>
              <div className="space-y-2">
                {['Data captured in previous step', 'Checklist answers', 'Uploaded documents', 'Custom data fields'].map((item, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={data.displayInfo.includes(item)}
                      onChange={(e) => {
                        const info = e.target.checked
                          ? [...data.displayInfo, item]
                          : data.displayInfo.filter(i => i !== item)
                        updateStepData('review', { displayInfo: info })
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium text-gray-900 mb-2">Decision Options</h5>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">✓ Proceed</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">✗ Reject</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderApprovalStep = () => {
    const data = stepData.approval!
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Approval Section</h3>
          <p className="text-sm text-gray-600 mb-6">Secure formal sign-off from designated approvers.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / Name of Approval Step</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => updateStepData('approval', { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter approval step title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Type</label>
              <select
                value={data.approvalType}
                onChange={(e) => updateStepData('approval', { approvalType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="single">Single Approval</option>
                <option value="multi_level">Multi-level Approval</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approving Department / Roles</label>
              <input
                type="text"
                value={data.approvingDepartment.join(', ')}
                onChange={(e) => updateStepData('approval', { approvingDepartment: e.target.value.split(', ') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter approving departments (comma separated)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conditions for Approval</label>
              <div className="space-y-3">
                {data.conditions.map((condition, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <input
                      type="text"
                      value={condition.rule}
                      onChange={(e) => {
                        const conditions = [...data.conditions]
                        conditions[index] = { ...condition, rule: e.target.value }
                        updateStepData('approval', { conditions })
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                      placeholder="e.g., if amount > $X, escalate to Director"
                    />
                    {condition.escalation && (
                      <input
                        type="text"
                        value={condition.escalation}
                        onChange={(e) => {
                          const conditions = [...data.conditions]
                          conditions[index] = { ...condition, escalation: e.target.value }
                          updateStepData('approval', { conditions })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Escalation details"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newCondition = { rule: '', escalation: '' }
                    updateStepData('approval', {
                      conditions: [...data.conditions, newCondition]
                    })
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Add Condition
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderUpdateStep = () => {
    const data = stepData.update!
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Step 4: Update Section (Automation)</h3>
          <p className="text-sm text-gray-600 mb-6">Push validated data into core systems via API integrations.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / Name of Update Step</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => updateStepData('update', { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter update step title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target System(s)</label>
              <input
                type="text"
                value={data.targetSystems.join(', ')}
                onChange={(e) => updateStepData('update', { targetSystems: e.target.value.split(', ') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Viewpoint, CRM, SharePoint (comma separated)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fields to Sync</label>
              <div className="space-y-3">
                {data.fieldsToSync.map((field, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <input
                      type="text"
                      value={field.source}
                      onChange={(e) => {
                        const fields = [...data.fieldsToSync]
                        fields[index] = { ...field, source: e.target.value }
                        updateStepData('update', { fieldsToSync: fields })
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Data source (from capture step)"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="text"
                      value={field.destination}
                      onChange={(e) => {
                        const fields = [...data.fieldsToSync]
                        fields[index] = { ...field, destination: e.target.value }
                        updateStepData('update', { fieldsToSync: fields })
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Destination field"
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newField = { source: '', destination: '' }
                    updateStepData('update', {
                      fieldsToSync: [...data.fieldsToSync, newField]
                    })
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Add Field Mapping
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Triggers</label>
              <input
                type="text"
                value={data.triggers.join(', ')}
                onChange={(e) => updateStepData('update', { triggers: e.target.value.split(', ') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="When to trigger (e.g., after approval, before deadline)"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 'capture': return renderCaptureStep()
      case 'review': return renderReviewStep()
      case 'approval': return renderApprovalStep()
      case 'update': return renderUpdateStep()
      default: return renderCaptureStep()
    }
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Trigger Configuration Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Workflow Builder</h2>
          <button
            onClick={() => setShowTriggerConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
          >
            <span>⚡</span>
            <span>Configure Triggers ({workflowTriggers.length})</span>
          </button>
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
          
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              onClick={() => {
                // Save the current step configuration
                console.log('Saving step configuration:', stepData)
                // Here you would typically save to the workflow
              }}
            >
              💾 Save Configuration
            </button>
            
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
      
      {/* Trigger Configuration Modal */}
      {showTriggerConfig && organization && workflow.id && (
        <TriggerConfiguration
          workflowId={workflow.id}
          organizationId={organization.id}
          triggers={workflowTriggers}
          onTriggersUpdate={(triggers) => {
            setWorkflowTriggers(triggers)
            // Convert triggers to database format and update workflow
            const dbTriggers = triggers.map(convertToDbTrigger)
            onWorkflowUpdate({
              ...workflow,
              config: {
                triggers: dbTriggers,
                steps: workflow.config?.steps || [],
                settings: workflow.config?.settings || {
                  notificationChannels: [],
                  errorHandling: 'stop',
                  maxRetries: 3,
                  timeoutMinutes: 60
                }
              }
            })
          }}
          onClose={() => setShowTriggerConfig(false)}
        />
      )}
    </div>
  )
}