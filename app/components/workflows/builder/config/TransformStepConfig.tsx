import React from 'react'

interface TransformStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function TransformStepConfig({ data, onChange, stepType }: TransformStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addTransformation() {
    const transformations = config.transformations || []
    transformations.push({
      id: `transform_${Date.now()}`,
      source: '',
      target: '',
      operation: 'copy',
      function: ''
    })
    updateConfig('transformations', transformations)
  }

  function updateTransformation(index: number, field: string, value: any) {
    const transformations = [...(config.transformations || [])]
    transformations[index] = { ...transformations[index], [field]: value }
    updateConfig('transformations', transformations)
  }

  function removeTransformation(index: number) {
    const transformations = (config.transformations || []).filter((_: any, i: number) => i !== index)
    updateConfig('transformations', transformations)
  }

  function addMapping() {
    const mappings = config.mappings || []
    mappings.push({
      id: `mapping_${Date.now()}`,
      from: '',
      to: '',
      type: 'direct'
    })
    updateConfig('mappings', mappings)
  }

  function updateMapping(index: number, field: string, value: any) {
    const mappings = [...(config.mappings || [])]
    mappings[index] = { ...mappings[index], [field]: value }
    updateConfig('mappings', mappings)
  }

  function removeMapping(index: number) {
    const mappings = (config.mappings || []).filter((_: any, i: number) => i !== index)
    updateConfig('mappings', mappings)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'transform':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Data Transformations</label>
                <button
                  onClick={addTransformation}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Transformation
                </button>
              </div>

              <div className="space-y-3">
                {(config.transformations || []).map((transform: any, index: number) => (
                  <div key={transform.id || index} className="p-4 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Transformation {index + 1}</span>
                      <button
                        onClick={() => removeTransformation(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Source Field</label>
                        <input
                          type="text"
                          value={transform.source || ''}
                          onChange={(e) => updateTransformation(index, 'source', e.target.value)}
                          placeholder="data.originalField"
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Target Field</label>
                        <input
                          type="text"
                          value={transform.target || ''}
                          onChange={(e) => updateTransformation(index, 'target', e.target.value)}
                          placeholder="data.newField"
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600">Operation</label>
                      <select
                        value={transform.operation || 'copy'}
                        onChange={(e) => updateTransformation(index, 'operation', e.target.value)}
                        className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="copy">Copy value</option>
                        <option value="uppercase">Convert to uppercase</option>
                        <option value="lowercase">Convert to lowercase</option>
                        <option value="trim">Trim whitespace</option>
                        <option value="format_date">Format date</option>
                        <option value="format_number">Format number</option>
                        <option value="concat">Concatenate</option>
                        <option value="split">Split string</option>
                        <option value="replace">Replace text</option>
                        <option value="calculate">Calculate</option>
                        <option value="custom">Custom function</option>
                      </select>
                    </div>

                    {transform.operation === 'custom' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Custom Function</label>
                        <textarea
                          value={transform.function || ''}
                          onChange={(e) => updateTransformation(index, 'function', e.target.value)}
                          rows={3}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="return value.toUpperCase();"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {(config.transformations || []).length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No transformations configured</p>
                    <p className="text-xs">Add transformations to modify data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'update':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Object</label>
              <input
                type="text"
                value={config.targetObject || ''}
                onChange={(e) => updateConfig('targetObject', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., user, order, invoice"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Update Conditions</label>
              <textarea
                value={config.conditions || ''}
                onChange={(e) => updateConfig('conditions', e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="id = data.userId"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Field Updates</label>
                <button
                  onClick={addMapping}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Field
                </button>
              </div>

              <div className="space-y-2">
                {(config.mappings || []).map((mapping: any, index: number) => (
                  <div key={mapping.id || index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={mapping.to || ''}
                      onChange={(e) => updateMapping(index, 'to', e.target.value)}
                      placeholder="Field name"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-xs text-gray-500">=</span>
                    <input
                      type="text"
                      value={mapping.from || ''}
                      onChange={(e) => updateMapping(index, 'from', e.target.value)}
                      placeholder="data.value"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={() => removeMapping(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'lookup':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lookup Source</label>
              <select
                value={config.source || 'database'}
                onChange={(e) => updateConfig('source', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="database">Database</option>
                <option value="api">External API</option>
                <option value="spreadsheet">Spreadsheet</option>
                <option value="file">File</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lookup Key</label>
              <input
                type="text"
                value={config.lookupKey || ''}
                onChange={(e) => updateConfig('lookupKey', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Field to match on (e.g., data.email)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Return Fields</label>
              <input
                type="text"
                value={config.returnFields || ''}
                onChange={(e) => updateConfig('returnFields', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Comma-separated fields to return"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Query/Endpoint</label>
              <textarea
                value={config.query || ''}
                onChange={(e) => updateConfig('query', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="SQL query or API endpoint"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.cacheResults || false}
                onChange={(e) => updateConfig('cacheResults', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Cache results for 1 hour</label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Step-specific configuration */}
      {getStepSpecificConfig()}

      {/* Output Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Output Variable</label>
          <input
            type="text"
            value={config.outputVariable || ''}
            onChange={(e) => updateConfig('outputVariable', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Variable name to store result"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.preserveOriginal || true}
              onChange={(e) => updateConfig('preserveOriginal', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Preserve original data</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.validateOutput || false}
              onChange={(e) => updateConfig('validateOutput', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Validate transformed data</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.logTransformation || false}
              onChange={(e) => updateConfig('logTransformation', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Log transformation details</label>
          </div>
        </div>
      </div>

      {/* Error Handling */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">On Error</label>
          <select
            value={config.onError || 'fail'}
            onChange={(e) => updateConfig('onError', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="fail">Fail workflow</option>
            <option value="skip">Skip transformation</option>
            <option value="default">Use default value</option>
            <option value="retry">Retry operation</option>
          </select>
        </div>

        {config.onError === 'default' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Value</label>
            <input
              type="text"
              value={config.defaultValue || ''}
              onChange={(e) => updateConfig('defaultValue', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Value to use on error"
            />
          </div>
        )}
      </div>
    </div>
  )
}