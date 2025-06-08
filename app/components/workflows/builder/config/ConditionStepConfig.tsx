import React from 'react'

interface ConditionStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function ConditionStepConfig({ data, onChange, stepType }: ConditionStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addCondition() {
    const conditions = config.conditions || []
    conditions.push({
      id: `condition_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      name: `Condition ${conditions.length + 1}`
    })
    updateConfig('conditions', conditions)
  }

  function updateCondition(index: number, field: string, value: any) {
    const conditions = [...(config.conditions || [])]
    conditions[index] = { ...conditions[index], [field]: value }
    updateConfig('conditions', conditions)
  }

  function removeCondition(index: number) {
    const conditions = (config.conditions || []).filter((_: any, i: number) => i !== index)
    updateConfig('conditions', conditions)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Conditions</label>
                <button
                  onClick={addCondition}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Condition
                </button>
              </div>

              <div className="space-y-3">
                {(config.conditions || []).map((condition: any, index: number) => (
                  <div key={condition.id || index} className="p-4 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={condition.name || ''}
                        onChange={(e) => updateCondition(index, 'name', e.target.value)}
                        placeholder="Condition name"
                        className="font-medium text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                      />
                      <button
                        onClick={() => removeCondition(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Field</label>
                        <input
                          type="text"
                          value={condition.field || ''}
                          onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          placeholder="data.amount"
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Operator</label>
                        <select
                          value={condition.operator || 'equals'}
                          onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not equals</option>
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                          <option value="greater_equal">Greater or equal</option>
                          <option value="less_equal">Less or equal</option>
                          <option value="contains">Contains</option>
                          <option value="starts_with">Starts with</option>
                          <option value="ends_with">Ends with</option>
                          <option value="is_empty">Is empty</option>
                          <option value="is_not_empty">Is not empty</option>
                          <option value="in">In list</option>
                          <option value="not_in">Not in list</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Value</label>
                        <input
                          type="text"
                          value={condition.value || ''}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          placeholder="Comparison value"
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {(config.conditions || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No conditions configured</p>
                    <p className="text-xs">Add conditions to control workflow branching</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Logic Operator</label>
              <select
                value={config.logicOperator || 'AND'}
                onChange={(e) => updateConfig('logicOperator', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="AND">AND (all conditions must be true)</option>
                <option value="OR">OR (any condition can be true)</option>
              </select>
            </div>
          </div>
        )

      case 'loop':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Loop Type</label>
              <select
                value={config.loopType || 'foreach'}
                onChange={(e) => updateConfig('loopType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="foreach">For each item</option>
                <option value="while">While condition is true</option>
                <option value="until">Until condition is true</option>
                <option value="fixed">Fixed number of times</option>
              </select>
            </div>

            {config.loopType === 'foreach' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Array Field</label>
                <input
                  type="text"
                  value={config.arrayField || ''}
                  onChange={(e) => updateConfig('arrayField', e.target.value)}
                  placeholder="data.items"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}

            {(config.loopType === 'while' || config.loopType === 'until') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition Field</label>
                  <input
                    type="text"
                    value={config.conditionField || ''}
                    onChange={(e) => updateConfig('conditionField', e.target.value)}
                    placeholder="data.hasMore"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition Value</label>
                  <input
                    type="text"
                    value={config.conditionValue || ''}
                    onChange={(e) => updateConfig('conditionValue', e.target.value)}
                    placeholder="true"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            )}

            {config.loopType === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Iterations</label>
                <input
                  type="number"
                  value={config.iterations || 1}
                  onChange={(e) => updateConfig('iterations', parseInt(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  min="1"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Iterations (safety limit)</label>
              <input
                type="number"
                value={config.maxIterations || 100}
                onChange={(e) => updateConfig('maxIterations', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.parallelExecution || false}
                onChange={(e) => updateConfig('parallelExecution', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Execute iterations in parallel</label>
            </div>
          </div>
        )

      case 'error_handler':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Error Types to Handle</label>
              <div className="mt-2 space-y-2">
                {['timeout', 'validation', 'external_api', 'system', 'business_rule'].map(errorType => (
                  <div key={errorType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(config.errorTypes || []).includes(errorType)}
                      onChange={(e) => {
                        const errorTypes = config.errorTypes || []
                        if (e.target.checked) {
                          updateConfig('errorTypes', [...errorTypes, errorType])
                        } else {
                          updateConfig('errorTypes', errorTypes.filter((t: string) => t !== errorType))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 capitalize">
                      {errorType.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Handling Strategy</label>
              <select
                value={config.handlingStrategy || 'retry'}
                onChange={(e) => updateConfig('handlingStrategy', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="retry">Retry with backoff</option>
                <option value="fallback">Execute fallback steps</option>
                <option value="skip">Skip and continue</option>
                <option value="stop">Stop execution</option>
                <option value="escalate">Escalate to human</option>
              </select>
            </div>

            {config.handlingStrategy === 'retry' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Retry Attempts</label>
                  <input
                    type="number"
                    value={config.maxRetries || 3}
                    onChange={(e) => updateConfig('maxRetries', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Retry Delay (seconds)</label>
                  <input
                    type="number"
                    value={config.retryDelay || 5}
                    onChange={(e) => updateConfig('retryDelay', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {getStepSpecificConfig()}

      {/* Default path */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Default Action</label>
        <select
          value={config.defaultAction || 'continue'}
          onChange={(e) => updateConfig('defaultAction', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="continue">Continue to next step</option>
          <option value="stop">Stop workflow</option>
          <option value="wait">Wait for manual intervention</option>
        </select>
      </div>
    </div>
  )
}