import { useState, useEffect } from 'react'
import type { 
  WorkflowTrigger, 
  TriggerTemplate, 
  TriggerConversation,
  TriggerSetupQuestion,
  TriggerConfig 
} from '~/types/trigger-library'
import { TriggerMapper } from '~/lib/ai/trigger-mapper'

interface TriggerConfigurationProps {
  workflowId: string
  organizationId: string
  triggers: WorkflowTrigger[]
  onTriggersUpdate: (triggers: WorkflowTrigger[]) => void
  onClose: () => void
}

export function TriggerConfiguration({ 
  workflowId, 
  organizationId, 
  triggers, 
  onTriggersUpdate,
  onClose 
}: TriggerConfigurationProps) {
  const [availableTriggers, setAvailableTriggers] = useState<TriggerTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TriggerTemplate | null>(null)
  const [conversation, setConversation] = useState<TriggerConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({})

  useEffect(() => {
    loadAvailableTriggers()
  }, [organizationId])

  const loadAvailableTriggers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trigger-library?organization_id=${organizationId}&active=true`)
      if (!response.ok) throw new Error('Failed to load triggers')
      
      const data = await response.json() as { triggers?: TriggerTemplate[] }
      setAvailableTriggers(data.triggers || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load triggers')
    } finally {
      setLoading(false)
    }
  }

  const startTriggerConfiguration = async (template: TriggerTemplate) => {
    setSelectedTemplate(template)
    
    // Initialize conversation
    const mapper = new TriggerMapper(organizationId)
    const conv = await mapper.startTriggerConversation(workflowId, template, '')
    setConversation(conv)
    setCurrentAnswers({})
  }

  const handleAnswerSubmit = (questionId: string, answer: any) => {
    if (!conversation) return
    
    try {
      const mapper = new TriggerMapper(organizationId)
      const updatedConv = mapper.answerQuestion(conversation, questionId, answer)
      setConversation(updatedConv)
      
      // Store answer locally
      setCurrentAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }))
      
      // If conversation is complete, create the trigger
      if (updatedConv.isComplete && updatedConv.generatedConfig) {
        createTrigger(updatedConv.generatedConfig)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process answer')
    }
  }

  const createTrigger = async (config: TriggerConfig) => {
    if (!selectedTemplate) return
    
    try {
      const newTrigger: Partial<WorkflowTrigger> = {
        workflowId,
        templateId: selectedTemplate.id,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        active: true,
        config,
        dataMapping: { mappings: [], staticData: {} },
        triggerCount: 0,
        errorCount: 0
      }
      
      // In a real implementation, this would save to the database
      // For now, just update the local state
      const createdTrigger: WorkflowTrigger = {
        ...newTrigger as WorkflowTrigger,
        id: `trigger-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user'
      }
      
      onTriggersUpdate([...triggers, createdTrigger])
      
      // Reset state
      setSelectedTemplate(null)
      setConversation(null)
      setCurrentAnswers({})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trigger')
    }
  }

  const removeTrigger = (triggerId: string) => {
    onTriggersUpdate(triggers.filter(t => t.id !== triggerId))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Workflow Triggers</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Existing Triggers */}
          {triggers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Configured Triggers</h3>
              <div className="space-y-2">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <p className="font-medium text-gray-900">{trigger.name}</p>
                        <p className="text-sm text-gray-600">{trigger.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTrigger(trigger.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trigger Configuration */}
          {selectedTemplate && conversation ? (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configure {selectedTemplate.name}
              </h3>
              
              {conversation.remainingQuestions.length > 0 ? (
                <TriggerQuestionForm
                  question={conversation.remainingQuestions[0]}
                  onSubmit={(answer) => handleAnswerSubmit(conversation.remainingQuestions[0].id, answer)}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-green-600 font-medium">Configuration complete!</p>
                  <p className="text-gray-600 mt-2">Your trigger is being created...</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Available Triggers */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add New Trigger</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableTriggers.map((trigger) => (
                  <button
                    key={trigger.id}
                    onClick={() => startTriggerConfiguration(trigger)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{trigger.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{trigger.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trigger.typicalUseCases.slice(0, 2).map((useCase, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {useCase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

interface TriggerQuestionFormProps {
  question: TriggerSetupQuestion
  onSubmit: (answer: any) => void
}

function TriggerQuestionForm({ question, onSubmit }: TriggerQuestionFormProps) {
  const [answer, setAnswer] = useState<any>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.required && !answer) {
      alert('This field is required')
      return
    }
    onSubmit(answer)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {question.helpText && (
          <p className="text-sm text-gray-600 mb-2">{question.helpText}</p>
        )}
        
        {question.type === 'text' && (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={question.required}
          />
        )}
        
        {question.type === 'number' && (
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={question.required}
          />
        )}
        
        {question.type === 'select' && question.options && (
          <select
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        
        {question.type === 'multi_select' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(answer) && answer.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAnswer([...(Array.isArray(answer) ? answer : []), option])
                    } else {
                      setAnswer((Array.isArray(answer) ? answer : []).filter(v => v !== option))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )}
        
        {question.type === 'boolean' && (
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="true"
                checked={answer === true}
                onChange={() => setAnswer(true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="false"
                checked={answer === false}
                onChange={() => setAnswer(false)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">No</span>
            </label>
          </div>
        )}
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Next
      </button>
    </form>
  )
}