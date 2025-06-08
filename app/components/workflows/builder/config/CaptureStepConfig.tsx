import React from 'react'

interface FormField {
  id: string
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'multiselect' | 'file' | 'textarea' | 'checkbox'
  label: string
  placeholder?: string
  required: boolean
  options?: { value: string; label: string }[]
}

interface CaptureStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function CaptureStepConfig({ data, onChange, stepType }: CaptureStepConfigProps) {
  const config = data.config || {}
  const fields = config.fields || []

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addField() {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    }
    updateConfig('fields', [...fields, newField])
  }

  function updateField(index: number, field: string, value: any) {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], [field]: value }
    updateConfig('fields', newFields)
  }

  function removeField(index: number) {
    const newFields = fields.filter((_: any, i: number) => i !== index)
    updateConfig('fields', newFields)
  }

  function addOption(fieldIndex: number) {
    const newFields = [...fields]
    const field = newFields[fieldIndex]
    const options = field.options || []
    options.push({ value: '', label: '' })
    newFields[fieldIndex] = { ...field, options }
    updateConfig('fields', newFields)
  }

  function updateOption(fieldIndex: number, optionIndex: number, key: 'value' | 'label', value: string) {
    const newFields = [...fields]
    const field = newFields[fieldIndex]
    const options = [...(field.options || [])]
    options[optionIndex] = { ...options[optionIndex], [key]: value }
    newFields[fieldIndex] = { ...field, options }
    updateConfig('fields', newFields)
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const newFields = [...fields]
    const field = newFields[fieldIndex]
    const options = (field.options || []).filter((_: any, i: number) => i !== optionIndex)
    newFields[fieldIndex] = { ...field, options }
    updateConfig('fields', newFields)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'file_upload':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Allowed File Types</label>
              <input
                type="text"
                value={config.allowedTypes || ''}
                onChange={(e) => updateConfig('allowedTypes', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., .pdf,.doc,.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max File Size (MB)</label>
              <input
                type="number"
                value={config.maxSize || 10}
                onChange={(e) => updateConfig('maxSize', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Files</label>
              <input
                type="number"
                value={config.maxFiles || 1}
                onChange={(e) => updateConfig('maxFiles', parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        )

      case 'data_validation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Validation Rules</label>
              <textarea
                value={config.validationRules || ''}
                onChange={(e) => updateConfig('validationRules', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Define validation rules in JSON format"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.strictValidation || false}
                onChange={(e) => updateConfig('strictValidation', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Strict validation (fail on any error)</label>
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

      {/* Form Fields Configuration */}
      {stepType === 'capture' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-medium text-gray-700">Form Fields</h5>
            <button
              onClick={addField}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Field
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field: FormField, index: number) => (
              <div key={field.id} className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <h6 className="text-sm font-medium text-gray-800">Field {index + 1}</h6>
                  <button
                    onClick={() => removeField(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, 'label', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, 'type', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="multiselect">Multi-select</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>

                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, 'required', e.target.checked)}
                    className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-xs text-gray-700">Required field</label>
                </div>

                {/* Options for select fields */}
                {(field.type === 'select' || field.type === 'multiselect') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-600">Options</label>
                      <button
                        onClick={() => addOption(index)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Add Option
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(field.options || []).map((option: any, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) => updateOption(index, optionIndex, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateOption(index, optionIndex, 'label', e.target.value)}
                            placeholder="Label"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          <button
                            onClick={() => removeOption(index, optionIndex)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No fields configured</p>
                <p className="text-xs">Click "Add Field" to start building your form</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Options */}
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.allowDraft || false}
            onChange={(e) => updateConfig('allowDraft', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">Allow saving as draft</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.showProgress || false}
            onChange={(e) => updateConfig('showProgress', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">Show progress indicator</label>
        </div>
      </div>
    </div>
  )
}