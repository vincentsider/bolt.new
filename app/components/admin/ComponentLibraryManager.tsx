import React, { useState, useEffect } from 'react'
import type { 
  ComponentDefinition, 
  ComponentGroup, 
  ComponentType, 
  WorkflowStepType,
  AIKeyword,
  ComponentProperty,
  ComponentStats,
  CreateComponentRequest
} from '~/types/component-library'

interface ComponentLibraryManagerProps {
  organizationId: string
  userId: string
}

export function ComponentLibraryManager({ organizationId, userId }: ComponentLibraryManagerProps) {
  const [components, setComponents] = useState<ComponentDefinition[]>([])
  const [stats, setStats] = useState<ComponentStats | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<{
    group?: ComponentGroup
    active?: boolean
    search: string
  }>({ search: '' })

  const componentGroups: { value: ComponentGroup; label: string }[] = [
    { value: 'basic_inputs', label: 'Basic Inputs' },
    { value: 'document_handling', label: 'Document Handling' },
    { value: 'lookups_status', label: 'Look-ups & Status' },
    { value: 'financial_specific', label: 'Financial-Specific' },
    { value: 'layout_helpers', label: 'Layout Helpers' },
    { value: 'approval_signoff', label: 'Approval & Sign-off' },
    { value: 'automation_hooks', label: 'Automation Hooks' }
  ]

  const componentTypes: { [K in ComponentGroup]: { value: ComponentType; label: string }[] } = {
    basic_inputs: [
      { value: 'short_text_box', label: 'Short Text Box' },
      { value: 'long_text_box', label: 'Long Text Box' },
      { value: 'number_field', label: 'Number Field' },
      { value: 'date_picker', label: 'Date Picker' },
      { value: 'dropdown_list', label: 'Drop-down List' },
      { value: 'multi_select_list', label: 'Multi-Select List' },
      { value: 'yes_no_buttons', label: 'Yes / No Buttons' },
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'checklist', label: 'Checklist' }
    ],
    document_handling: [
      { value: 'file_upload', label: 'File Upload' },
      { value: 'sharepoint_link', label: 'SharePoint Link' },
      { value: 'document_viewer', label: 'Document Viewer' }
    ],
    lookups_status: [
      { value: 'record_search', label: 'Record Search' },
      { value: 'status_badge', label: 'Status Badge' }
    ],
    financial_specific: [
      { value: 'currency_amount', label: 'Currency & Amount' },
      { value: 'risk_score_meter', label: 'Risk Score Meter' }
    ],
    layout_helpers: [
      { value: 'section_accordion', label: 'Section Accordion' },
      { value: 'step_progress_bar', label: 'Step Progress Bar' },
      { value: 'review_table', label: 'Review Table' }
    ],
    approval_signoff: [
      { value: 'approve_reject_buttons', label: 'Approve / Reject Buttons' },
      { value: 'digital_signature_box', label: 'Digital Signature Box' },
      { value: 'confirmation_tick', label: 'Confirmation Tick' }
    ],
    automation_hooks: [
      { value: 'hidden_api_push', label: 'Hidden API Push' },
      { value: 'ocr_extractor', label: 'OCR Extractor' },
      { value: 'audit_logger', label: 'Audit Logger' }
    ]
  }

  const workflowSteps: { value: WorkflowStepType; label: string }[] = [
    { value: 'capture', label: 'Capture' },
    { value: 'review', label: 'Review' },
    { value: 'approval', label: 'Approval' },
    { value: 'update', label: 'Update' }
  ]

  useEffect(() => {
    loadComponents()
    loadStats()
  }, [organizationId])

  const loadComponents = async () => {
    try {
      const response = await fetch(`/api/component-library?organization_id=${organizationId}`)
      const data = await response.json()
      setComponents(data.components || [])
    } catch (error) {
      console.error('Failed to load components:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/component-library/stats?organization_id=${organizationId}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const filteredComponents = components.filter(component => {
    if (filter.group && component.group !== filter.group) return false
    if (filter.active !== undefined && component.active !== filter.active) return false
    if (filter.search && !component.name.toLowerCase().includes(filter.search.toLowerCase()) && 
        !component.description.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const handleCreateComponent = () => {
    setSelectedComponent(null)
    setIsCreating(true)
    setIsEditing(true)
  }

  const handleEditComponent = (component: ComponentDefinition) => {
    setSelectedComponent(component)
    setIsCreating(false)
    setIsEditing(true)
  }

  const handleDeleteComponent = async (componentId: string) => {
    if (!confirm('Are you sure you want to delete this component? This action cannot be undone.')) {
      return
    }

    try {
      await fetch(`/api/component-library/${componentId}`, {
        method: 'DELETE'
      })
      await loadComponents()
      await loadStats()
      if (selectedComponent?.id === componentId) {
        setSelectedComponent(null)
      }
    } catch (error) {
      console.error('Failed to delete component:', error)
      alert('Failed to delete component')
    }
  }

  const handleToggleActive = async (component: ComponentDefinition) => {
    try {
      await fetch(`/api/component-library/${component.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !component.active })
      })
      await loadComponents()
      await loadStats()
    } catch (error) {
      console.error('Failed to toggle component status:', error)
      alert('Failed to update component status')
    }
  }

  const renderComponentCard = (component: ComponentDefinition) => {
    const groupLabel = componentGroups.find(g => g.value === component.group)?.label || component.group
    
    return (
      <div 
        key={component.id}
        className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
          selectedComponent?.id === component.id
            ? 'border-blue-500 shadow-lg'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        } ${
          !component.active ? 'opacity-60' : ''
        }`}
        onClick={() => setSelectedComponent(component)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: component.color }}
            >
              {component.icon}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{component.name}</h3>
              <p className="text-sm text-gray-500">{groupLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleActive(component)
              }}
              className={`px-2 py-1 text-xs rounded-full ${
                component.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {component.active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{component.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{component.aiKeywords.length} AI keywords</span>
          <span>Steps: {component.compatibleSteps.join(', ')}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditComponent(component)
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteComponent(component.id)
            }}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  const renderStatsCard = () => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalComponents}</div>
          <div className="text-sm text-gray-600">Total Components</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{stats.activeComponents}</div>
          <div className="text-sm text-gray-600">Active Components</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {Object.keys(stats.componentsByGroup).length}
          </div>
          <div className="text-sm text-gray-600">Component Groups</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-600">
            {Object.values(stats.usageStats).reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <ComponentEditor
        component={selectedComponent}
        isCreating={isCreating}
        organizationId={organizationId}
        userId={userId}
        onSave={async () => {
          setIsEditing(false)
          setIsCreating(false)
          await loadComponents()
          await loadStats()
        }}
        onCancel={() => {
          setIsEditing(false)
          setIsCreating(false)
        }}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Component Library Manager</h1>
          <p className="text-gray-600">Manage workflow components and AI mapping</p>
        </div>
        <button
          onClick={handleCreateComponent}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Add Component
        </button>
      </div>

      {/* Stats */}
      {renderStatsCard()}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search components..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <select
              value={filter.group || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, group: e.target.value as ComponentGroup || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Groups</option>
              {componentGroups.map(group => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter.active === undefined ? '' : filter.active.toString()}
              onChange={(e) => setFilter(prev => ({ 
                ...prev, 
                active: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilter({ search: '' })}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComponents.map(renderComponentCard)}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-xl mb-2">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No components found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or create a new component.</p>
          <button
            onClick={handleCreateComponent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First Component
          </button>
        </div>
      )}
    </div>
  )
}

// Component Editor Sub-component
interface ComponentEditorProps {
  component: ComponentDefinition | null
  isCreating: boolean
  organizationId: string
  userId: string
  onSave: () => void
  onCancel: () => void
}

function ComponentEditor({ component, isCreating, organizationId, userId, onSave, onCancel }: ComponentEditorProps) {
  const [formData, setFormData] = useState<CreateComponentRequest>({
    name: component?.name || '',
    description: component?.description || '',
    group: component?.group || 'basic_inputs',
    type: component?.type || 'short_text_box',
    active: component?.active ?? true,
    aiKeywords: component?.aiKeywords || [],
    typicalExamples: component?.typicalExamples || [],
    properties: component?.properties || [],
    icon: component?.icon || '📝',
    color: component?.color || '#3B82F6',
    compatibleSteps: component?.compatibleSteps || ['capture'],
    htmlTemplate: component?.htmlTemplate || '<input type="text" class="form-input" />',
    cssClasses: component?.cssClasses || ['form-input'],
    jsValidation: component?.jsValidation || '',
    apiEndpoint: component?.apiEndpoint || '',
    dataMapping: component?.dataMapping || {}
  })
  
  const [saving, setSaving] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [newExample, setNewExample] = useState('')
  const [newProperty, setNewProperty] = useState<Partial<ComponentProperty>>({})

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = isCreating 
        ? '/api/component-library'
        : `/api/component-library/${component!.id}`
      
      const method = isCreating ? 'POST' : 'PUT'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          createdBy: userId
        })
      })
      
      onSave()
    } catch (error) {
      console.error('Failed to save component:', error)
      alert('Failed to save component')
    } finally {
      setSaving(false)
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setFormData(prev => ({
        ...prev,
        aiKeywords: [...prev.aiKeywords, { keyword: newKeyword.trim(), weight: 5 }]
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aiKeywords: prev.aiKeywords.filter((_, i) => i !== index)
    }))
  }

  const addExample = () => {
    if (newExample.trim()) {
      setFormData(prev => ({
        ...prev,
        typicalExamples: [...prev.typicalExamples, newExample.trim()]
      }))
      setNewExample('')
    }
  }

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      typicalExamples: prev.typicalExamples.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isCreating ? 'Create New Component' : `Edit ${component?.name}`}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Component'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Short Text Box"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
              <select
                value={formData.group}
                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value as ComponentGroup }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic_inputs">Basic Inputs</option>
                <option value="document_handling">Document Handling</option>
                <option value="lookups_status">Look-ups & Status</option>
                <option value="financial_specific">Financial-Specific</option>
                <option value="layout_helpers">Layout Helpers</option>
                <option value="approval_signoff">Approval & Sign-off</option>
                <option value="automation_hooks">Automation Hooks</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Lets a user type a small piece of information."
              required
            />
          </div>

          {/* AI Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Keywords</label>
            <p className="text-sm text-gray-600 mb-3">
              Keywords that help the AI select this component when users describe their needs.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter keyword (e.g., 'name', 'text', 'input')"
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.aiKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword.keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Typical Examples */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Typical Examples</label>
            <p className="text-sm text-gray-600 mb-3">
              Real-world examples of when this component would be used.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter example (e.g., 'First name', 'Passport number')"
                onKeyPress={(e) => e.key === 'Enter' && addExample()}
              />
              <button
                onClick={addExample}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.typicalExamples.map((example, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <span className="text-sm">{example}</span>
                  <button
                    onClick={() => removeExample(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Compatible Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compatible Workflow Steps</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['capture', 'review', 'approval', 'update'] as WorkflowStepType[]).map(step => (
                <label key={step} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.compatibleSteps.includes(step)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          compatibleSteps: [...prev.compatibleSteps, step]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          compatibleSteps: prev.compatibleSteps.filter(s => s !== step)
                        }))
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{step}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="📝"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* HTML Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HTML Template</label>
            <textarea
              value={formData.htmlTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, htmlTemplate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={4}
              placeholder='<input type="text" class="form-input" />'
            />
          </div>
        </div>
      </div>
    </div>
  )
}