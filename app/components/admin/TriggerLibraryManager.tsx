import { useState, useEffect } from 'react'
import type { 
  TriggerTemplate, 
  TriggerType, 
  TriggerCategory, 
  TriggerStats,
  CreateTriggerTemplateRequest,
  UpdateTriggerTemplateRequest,
  AITriggerKeyword,
  TriggerSetupQuestion,
  TriggerConfigSchema
} from '~/types/trigger-library'

interface TriggerLibraryManagerProps {
  organizationId: string
  userId: string
}

type ViewMode = 'list' | 'create' | 'edit'

export function TriggerLibraryManager({ organizationId, userId }: TriggerLibraryManagerProps) {
  const [triggers, setTriggers] = useState<TriggerTemplate[]>([])
  const [stats, setStats] = useState<TriggerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerTemplate | null>(null)
  const [filterType, setFilterType] = useState<TriggerType | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<TriggerCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTriggers()
    loadStats()
  }, [organizationId])

  const loadTriggers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trigger-library?organization_id=${organizationId}`)
      if (!response.ok) throw new Error('Failed to load triggers')
      
      const data = await response.json()
      setTriggers(data.triggers || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load triggers')
      setTriggers([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/trigger-library/stats?organization_id=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load trigger stats:', err)
    }
  }

  const saveTrigger = async (triggerData: CreateTriggerTemplateRequest | UpdateTriggerTemplateRequest) => {
    try {
      const isEdit = selectedTrigger !== null
      const url = isEdit 
        ? `/api/trigger-library/${selectedTrigger!.id}`
        : `/api/trigger-library`
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...triggerData,
          organizationId,
          createdBy: userId
        })
      })

      if (!response.ok) {
        throw new Error(isEdit ? 'Failed to update trigger' : 'Failed to create trigger')
      }

      await loadTriggers()
      await loadStats()
      setViewMode('list')
      setSelectedTrigger(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trigger')
    }
  }

  const deleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/trigger-library/${triggerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete trigger')

      await loadTriggers()
      await loadStats()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trigger')
    }
  }

  const toggleTriggerStatus = async (triggerId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/trigger-library/${triggerId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      })

      if (!response.ok) throw new Error('Failed to update trigger status')

      await loadTriggers()
      await loadStats()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trigger status')
    }
  }

  const filteredTriggers = triggers.filter(trigger => {
    const matchesType = filterType === 'all' || trigger.type === filterType
    const matchesCategory = filterCategory === 'all' || trigger.category === filterCategory
    const matchesSearch = searchQuery === '' || 
      trigger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trigger.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesType && matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trigger library...</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <TriggerEditor
        trigger={selectedTrigger}
        onSave={saveTrigger}
        onCancel={() => {
          setViewMode('list')
          setSelectedTrigger(null)
        }}
        isEdit={viewMode === 'edit'}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Trigger Library Manager</h1>
            <p className="text-gray-600">Manage automated workflow triggers and AI mapping</p>
          </div>
          <button
            onClick={() => setViewMode('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Trigger
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalTriggers}</p>
                <p className="text-gray-600">Total Triggers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.activeTriggers}</p>
                <p className="text-gray-600">Active Triggers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v11a2 2 0 002 2h6a2 2 0 002-2V7H7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEvents}</p>
                <p className="text-gray-600">Total Events</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.averageProcessingTime)}ms</p>
                <p className="text-gray-600">Avg Processing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TriggerType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="email_received">Email Received</option>
              <option value="file_added">File Added</option>
              <option value="record_created">Record Created</option>
              <option value="record_updated">Record Updated</option>
              <option value="webhook">Webhook</option>
              <option value="condition_met">Condition Met</option>
            </select>
          </div>
          
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TriggerCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="user_initiated">User Initiated</option>
              <option value="time_based">Time Based</option>
              <option value="event_based">Event Based</option>
              <option value="system_based">System Based</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              setSearchQuery('')
              setFilterType('all')
              setFilterCategory('all')
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Triggers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTriggers.map((trigger) => (
          <TriggerCard
            key={trigger.id}
            trigger={trigger}
            onEdit={() => {
              setSelectedTrigger(trigger)
              setViewMode('edit')
            }}
            onDelete={() => deleteTrigger(trigger.id)}
            onToggleStatus={(active) => toggleTriggerStatus(trigger.id, active)}
          />
        ))}
      </div>

      {filteredTriggers.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No triggers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || filterType !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Get started by creating your first trigger.'
            }
          </p>
          {searchQuery === '' && filterType === 'all' && filterCategory === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setViewMode('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Trigger
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TriggerCardProps {
  trigger: TriggerTemplate
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: (active: boolean) => void
}

function TriggerCard({ trigger, onEdit, onDelete, onToggleStatus }: TriggerCardProps) {
  const getCategoryColor = (category: TriggerCategory) => {
    switch (category) {
      case 'user_initiated': return 'bg-blue-100 text-blue-800'
      case 'time_based': return 'bg-green-100 text-green-800'
      case 'event_based': return 'bg-purple-100 text-purple-800'
      case 'system_based': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label={trigger.name}>
            {trigger.icon}
          </span>
          <h3 className="font-semibold text-gray-900 truncate">{trigger.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleStatus(!trigger.active)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              trigger.active 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {trigger.active && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{trigger.description}</p>

      <div className="flex items-center justify-between mb-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(trigger.category)}`}>
          {trigger.category.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-500 capitalize">{trigger.type.replace('_', ' ')}</span>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">AI Keywords:</div>
        <div className="flex flex-wrap gap-1">
          {trigger.aiKeywords.slice(0, 3).map((keyword, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {keyword.keyword} ({keyword.weight})
            </span>
          ))}
          {trigger.aiKeywords.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{trigger.aiKeywords.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">Setup Questions:</div>
        <div className="text-sm text-gray-600">
          {trigger.setupQuestions.length} questions configured
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Updated {new Date(trigger.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

interface TriggerEditorProps {
  trigger: TriggerTemplate | null
  onSave: (data: CreateTriggerTemplateRequest | UpdateTriggerTemplateRequest) => void
  onCancel: () => void
  isEdit: boolean
}

function TriggerEditor({ trigger, onSave, onCancel, isEdit }: TriggerEditorProps) {
  const [formData, setFormData] = useState<CreateTriggerTemplateRequest>(() => ({
    name: trigger?.name || '',
    description: trigger?.description || '',
    type: trigger?.type || 'manual',
    category: trigger?.category || 'user_initiated',
    active: trigger?.active ?? true,
    aiKeywords: trigger?.aiKeywords || [],
    typicalUseCases: trigger?.typicalUseCases || [],
    configSchema: trigger?.configSchema || { properties: {}, required: [] },
    icon: trigger?.icon || '⚡',
    color: trigger?.color || '#3B82F6',
    setupQuestions: trigger?.setupQuestions || [],
    requiredIntegrations: trigger?.requiredIntegrations || [],
    supportedSystems: trigger?.supportedSystems || []
  }))

  const [currentKeyword, setCurrentKeyword] = useState<AITriggerKeyword>({
    keyword: '',
    weight: 5,
    triggerType: formData.type
  })

  const [currentQuestion, setCurrentQuestion] = useState<TriggerSetupQuestion>({
    id: '',
    question: '',
    type: 'text',
    required: false,
    configMapping: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addKeyword = () => {
    if (currentKeyword.keyword.trim()) {
      setFormData(prev => ({
        ...prev,
        aiKeywords: [...prev.aiKeywords, { ...currentKeyword, triggerType: prev.type }]
      }))
      setCurrentKeyword({ keyword: '', weight: 5, triggerType: formData.type })
    }
  }

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aiKeywords: prev.aiKeywords.filter((_, i) => i !== index)
    }))
  }

  const addQuestion = () => {
    if (currentQuestion.question.trim() && currentQuestion.configMapping.trim()) {
      setFormData(prev => ({
        ...prev,
        setupQuestions: [...prev.setupQuestions, { ...currentQuestion, id: `q${Date.now()}` }]
      }))
      setCurrentQuestion({
        id: '',
        question: '',
        type: 'text',
        required: false,
        configMapping: ''
      })
    }
  }

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      setupQuestions: prev.setupQuestions.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEdit ? 'Edit Trigger' : 'Create New Trigger'}
        </h1>
        <p className="text-gray-600">Configure trigger settings and AI mapping</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Email Received Trigger"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="⚡"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this trigger does and when it should be used..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TriggerType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="email_received">Email Received</option>
                <option value="file_added">File Added</option>
                <option value="record_created">Record Created</option>
                <option value="record_updated">Record Updated</option>
                <option value="webhook">Webhook</option>
                <option value="condition_met">Condition Met</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TriggerCategory }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user_initiated">User Initiated</option>
                <option value="time_based">Time Based</option>
                <option value="event_based">Event Based</option>
                <option value="system_based">System Based</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active (available for use)</span>
              </label>
            </div>
          </div>
        </div>

        {/* AI Keywords */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Keywords</h2>
          <p className="text-gray-600 text-sm mb-4">
            Configure keywords that help the AI understand when to suggest this trigger
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
              <input
                type="text"
                value={currentKeyword.keyword}
                onChange={(e) => setCurrentKeyword(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., email, schedule"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={currentKeyword.weight}
                onChange={(e) => setCurrentKeyword(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addKeyword}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Keyword
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {formData.aiKeywords.map((keyword, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{keyword.keyword}</span>
                  <span className="text-sm text-gray-600">Weight: {keyword.weight}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeKeyword(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Questions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Questions</h2>
          <p className="text-gray-600 text-sm mb-4">
            Questions the AI will ask users to configure this trigger
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <input
                type="text"
                value={currentQuestion.question}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., What email address should we monitor?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Config Field</label>
              <input
                type="text"
                value={currentQuestion.configMapping}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, configMapping: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., email.mailbox"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
              <select
                value={currentQuestion.type}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="select">Select</option>
                <option value="multi_select">Multi Select</option>
                <option value="boolean">Yes/No</option>
                <option value="number">Number</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentQuestion.required}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Required</span>
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Question
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {formData.setupQuestions.map((question, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{question.question}</span>
                  <span className="text-sm text-gray-600">→ {question.configMapping}</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">{question.type}</span>
                  {question.required && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Required</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {isEdit ? 'Update Trigger' : 'Create Trigger'}
          </button>
        </div>
      </form>
    </div>
  )
}