import React, { useState } from 'react'

interface ComponentCategory {
  id: string
  name: string
  components: WorkflowComponent[]
}

interface WorkflowComponent {
  id: string
  name: string
  description: string
  icon: string
  type: string
  category: string
}

const componentCategories: ComponentCategory[] = [
  {
    id: 'input',
    name: 'Input & Data',
    components: [
      {
        id: 'capture',
        name: 'Data Capture',
        description: 'Collect data from users through forms',
        icon: '📝',
        type: 'capture',
        category: 'input'
      },
      {
        id: 'file_upload',
        name: 'File Upload',
        description: 'Allow users to upload files and documents',
        icon: '📁',
        type: 'file_upload',
        category: 'input'
      },
      {
        id: 'data_validation',
        name: 'Data Validation',
        description: 'Validate data against rules and constraints',
        icon: '✓',
        type: 'data_validation',
        category: 'input'
      },
      {
        id: 'transform',
        name: 'Transform Data',
        description: 'Modify, map, or calculate data',
        icon: '🔄',
        type: 'transform',
        category: 'input'
      },
      {
        id: 'update',
        name: 'Update Data',
        description: 'Update existing data records',
        icon: '✏️',
        type: 'update',
        category: 'input'
      },
      {
        id: 'lookup',
        name: 'Data Lookup',
        description: 'Retrieve data from external sources',
        icon: '🔍',
        type: 'lookup',
        category: 'input'
      }
    ]
  },
  {
    id: 'logic',
    name: 'Logic & Flow',
    components: [
      {
        id: 'condition',
        name: 'Condition',
        description: 'Branch workflow based on conditions',
        icon: '🔀',
        type: 'condition',
        category: 'logic'
      },
      {
        id: 'parallel',
        name: 'Parallel Steps',
        description: 'Execute multiple steps simultaneously',
        icon: '⚡',
        type: 'parallel',
        category: 'logic'
      },
      {
        id: 'loop',
        name: 'Loop/Iterate',
        description: 'Repeat steps for each item in a list',
        icon: '🔁',
        type: 'loop',
        category: 'logic'
      },
      {
        id: 'delay',
        name: 'Wait/Delay',
        description: 'Pause execution for a specified time',
        icon: '⏳',
        type: 'delay',
        category: 'logic'
      },
      {
        id: 'schedule',
        name: 'Schedule',
        description: 'Schedule execution at specific times',
        icon: '📅',
        type: 'schedule',
        category: 'logic'
      },
      {
        id: 'error_handler',
        name: 'Error Handler',
        description: 'Handle errors and define fallback actions',
        icon: '🛡️',
        type: 'error_handler',
        category: 'logic'
      }
    ]
  },
  {
    id: 'approval',
    name: 'Human Tasks',
    components: [
      {
        id: 'review',
        name: 'Review Task',
        description: 'Assign review task to a user',
        icon: '👀',
        type: 'review',
        category: 'approval'
      },
      {
        id: 'approve',
        name: 'Approval',
        description: 'Require approval before proceeding',
        icon: '✅',
        type: 'approve',
        category: 'approval'
      },
      {
        id: 'multi_approve',
        name: 'Multi-Level Approval',
        description: 'Require multiple approvals in sequence',
        icon: '👥',
        type: 'multi_approve',
        category: 'approval'
      },
      {
        id: 'delegation',
        name: 'Delegate Task',
        description: 'Delegate tasks to other users',
        icon: '🔄',
        type: 'delegation',
        category: 'approval'
      },
      {
        id: 'human_task',
        name: 'Human Task',
        description: 'Generic task requiring human action',
        icon: '👤',
        type: 'human_task',
        category: 'approval'
      },
      {
        id: 'escalation',
        name: 'Escalation',
        description: 'Escalate tasks based on time or conditions',
        icon: '📈',
        type: 'escalation',
        category: 'approval'
      }
    ]
  },
  {
    id: 'notification',
    name: 'Communication',
    components: [
      {
        id: 'notification',
        name: 'Send Notification',
        description: 'Send emails, Slack messages, or webhooks',
        icon: '📧',
        type: 'notification',
        category: 'notification'
      },
      {
        id: 'email',
        name: 'Send Email',
        description: 'Send formatted email messages',
        icon: '✉️',
        type: 'email',
        category: 'notification'
      },
      {
        id: 'sms',
        name: 'Send SMS',
        description: 'Send SMS text messages',
        icon: '📱',
        type: 'sms',
        category: 'notification'
      },
      {
        id: 'slack',
        name: 'Slack Message',
        description: 'Send messages to Slack channels',
        icon: '💬',
        type: 'slack',
        category: 'notification'
      },
      {
        id: 'teams',
        name: 'Teams Message',
        description: 'Send messages to Microsoft Teams',
        icon: '🗨️',
        type: 'teams',
        category: 'notification'
      }
    ]
  },
  {
    id: 'integration',
    name: 'Integrations',
    components: [
      {
        id: 'api_call',
        name: 'API Call',
        description: 'Make HTTP requests to external APIs',
        icon: '🔗',
        type: 'api_call',
        category: 'integration'
      },
      {
        id: 'database',
        name: 'Database Query',
        description: 'Query or update database records',
        icon: '🗄️',
        type: 'database',
        category: 'integration'
      },
      {
        id: 'spreadsheet',
        name: 'Spreadsheet',
        description: 'Read or write to Google Sheets/Excel',
        icon: '📊',
        type: 'spreadsheet',
        category: 'integration'
      },
      {
        id: 'crm',
        name: 'CRM Integration',
        description: 'Connect to Salesforce, HubSpot, etc.',
        icon: '👥',
        type: 'crm',
        category: 'integration'
      },
      {
        id: 'payment',
        name: 'Payment Processing',
        description: 'Process payments via Stripe, PayPal',
        icon: '💳',
        type: 'payment',
        category: 'integration'
      },
      {
        id: 'document_gen',
        name: 'Generate Document',
        description: 'Create PDFs, contracts, reports',
        icon: '📄',
        type: 'document_gen',
        category: 'integration'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    components: [
      {
        id: 'metrics',
        name: 'Collect Metrics',
        description: 'Gather performance and business metrics',
        icon: '📈',
        type: 'metrics',
        category: 'analytics'
      },
      {
        id: 'report',
        name: 'Generate Report',
        description: 'Create automated reports',
        icon: '📋',
        type: 'report',
        category: 'analytics'
      },
      {
        id: 'audit_log',
        name: 'Audit Log',
        description: 'Log events for compliance tracking',
        icon: '📝',
        type: 'audit_log',
        category: 'analytics'
      },
      {
        id: 'dashboard',
        name: 'Update Dashboard',
        description: 'Update business intelligence dashboards',
        icon: '📊',
        type: 'dashboard',
        category: 'analytics'
      }
    ]
  }
]

export function ComponentPalette() {
  const [activeCategory, setActiveCategory] = useState<string>('input')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter components based on search
  const filteredCategories = componentCategories.map(category => ({
    ...category,
    components: category.components.filter(component =>
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.components.length > 0)

  const onDragStart = (event: React.DragEvent, componentType: string) => {
    event.dataTransfer.setData('application/reactflow', componentType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Components</h3>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {componentCategories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeCategory === category.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchTerm ? (
          // Show all filtered components when searching
          <div className="space-y-4">
            {filteredCategories.map(category => (
              <div key={category.id}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{category.name}</h4>
                <div className="space-y-2">
                  {category.components.map(component => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>No components found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        ) : (
          // Show active category components
          <div className="space-y-2">
            {componentCategories
              .find(cat => cat.id === activeCategory)
              ?.components.map(component => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  onDragStart={onDragStart}
                />
              )) || null}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1">💡 Tip: Drag components to the canvas to add them to your workflow</p>
          <p>Use the search to quickly find specific components</p>
        </div>
      </div>
    </div>
  )
}

interface ComponentCardProps {
  component: WorkflowComponent
  onDragStart: (event: React.DragEvent, componentType: string) => void
}

function ComponentCard({ component, onDragStart }: ComponentCardProps) {
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, component.type)}
      className="p-3 border border-gray-200 rounded-lg cursor-grab hover:border-blue-300 hover:shadow-sm transition-all active:cursor-grabbing bg-white"
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{component.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {component.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {component.description}
          </p>
        </div>
      </div>
    </div>
  )
}