import React, { useState, useEffect } from 'react'
import type { Node } from 'reactflow'

// Import individual config components
import { CaptureStepConfig } from './CaptureStepConfig'
import { ApprovalStepConfig } from './ApprovalStepConfig'
import { ConditionStepConfig } from './ConditionStepConfig'
import { NotificationStepConfig } from './NotificationStepConfig'
import { TransformStepConfig } from './TransformStepConfig'
import { DelayStepConfig } from './DelayStepConfig'
import { IntegrationStepConfig } from './IntegrationStepConfig'

interface StepConfigPanelProps {
  node: Node | null
  onNodeUpdate?: (nodeId: string, updates: any) => void
}

export function StepConfigPanel({ node, onNodeUpdate }: StepConfigPanelProps) {
  const [localData, setLocalData] = useState<any>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local data with node data
  useEffect(() => {
    if (node) {
      setLocalData(node.data)
      setHasChanges(false)
    }
  }, [node])

  if (!node) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mb-3">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Step Selected</h3>
          <p className="text-sm text-gray-500">Select a workflow step to configure its properties</p>
        </div>
      </div>
    )
  }

  function handleDataChange(field: string, value: any) {
    const newData = { ...localData, [field]: value }
    setLocalData(newData)
    setHasChanges(true)
  }

  function handleSave() {
    if (onNodeUpdate && hasChanges) {
      onNodeUpdate(node.id, localData)
      setHasChanges(false)
    }
  }

  function handleReset() {
    setLocalData(node.data)
    setHasChanges(false)
  }

  function renderStepConfig() {
    const stepType = localData.stepType || node.type

    switch (stepType) {
      case 'capture':
      case 'file_upload':
      case 'data_validation':
        return (
          <CaptureStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'review':
      case 'approve':
      case 'human_task':
      case 'multi_approve':
      case 'delegation':
      case 'escalation':
        return (
          <ApprovalStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'condition':
      case 'loop':
      case 'error_handler':
        return (
          <ConditionStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'notification':
      case 'email':
      case 'sms':
      case 'slack':
      case 'teams':
        return (
          <NotificationStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'transform':
      case 'update':
      case 'lookup':
        return (
          <TransformStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'delay':
      case 'schedule':
        return (
          <DelayStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      case 'api_call':
      case 'database':
      case 'spreadsheet':
      case 'crm':
      case 'payment':
      case 'document_gen':
        return (
          <IntegrationStepConfig
            data={localData}
            onChange={handleDataChange}
            stepType={stepType}
          />
        )

      default:
        return (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Configuration panel for "{stepType}" is not yet implemented.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Step Configuration</h3>
          {hasChanges && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Basic Step Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Step Name</label>
            <input
              type="text"
              value={localData.label || ''}
              onChange={(e) => handleDataChange('label', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter step name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={localData.description || ''}
              onChange={(e) => handleDataChange('description', e.target.value)}
              rows={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter step description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Step Type</label>
            <div className="mt-1 px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-md">
              {localData.stepType || node.type}
            </div>
          </div>
        </div>
      </div>

      {/* Step-Specific Configuration */}
      <div className="flex-1 overflow-y-auto p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Configuration</h4>
        {renderStepConfig()}
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-600">You have unsaved changes</span>
            <div className="space-x-2">
              <button
                onClick={handleReset}
                className="px-3 py-1 text-gray-600 hover:text-gray-800"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}