import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

interface WorkflowStepNodeData {
  stepType: string
  label: string
  description?: string
  config?: any
  arcadeTool?: any
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

export const WorkflowStepNode = memo(({ data, selected }: NodeProps<WorkflowStepNodeData>) => {
  const getStepIcon = (stepType: string): string => {
    const icons: Record<string, string> = {
      'capture': '📝',
      'review': '👀',
      'approve': '✅',
      'update': '✏️',
      'condition': '🔀',
      'parallel': '⚡',
      'delay': '⏳',
      'notification': '📧',
      'transform': '🔄',
      'human_task': '👤',
    }
    return icons[stepType] || '⚙️'
  }

  const getStepColor = (stepType: string): string => {
    const colors: Record<string, string> = {
      'capture': 'bg-blue-50 border-blue-200',
      'review': 'bg-orange-50 border-orange-200',
      'approve': 'bg-green-50 border-green-200',
      'update': 'bg-purple-50 border-purple-200',
      'condition': 'bg-yellow-50 border-yellow-200',
      'parallel': 'bg-indigo-50 border-indigo-200',
      'delay': 'bg-gray-50 border-gray-200',
      'notification': 'bg-pink-50 border-pink-200',
      'transform': 'bg-cyan-50 border-cyan-200',
      'human_task': 'bg-emerald-50 border-emerald-200',
    }
    return colors[stepType] || 'bg-gray-50 border-gray-200'
  }

  const getStatusIndicator = (status?: string) => {
    if (!status) return null

    const indicators: Record<string, { color: string; icon: string }> = {
      'pending': { color: 'bg-gray-400', icon: '⏳' },
      'running': { color: 'bg-blue-500', icon: '▶️' },
      'completed': { color: 'bg-green-500', icon: '✅' },
      'failed': { color: 'bg-red-500', icon: '❌' },
    }

    const indicator = indicators[status]
    if (!indicator) return null

    return (
      <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${indicator.color} flex items-center justify-center`}>
        <span className="text-xs text-white">{indicator.icon}</span>
      </div>
    )
  }

  return (
    <div className={`
      relative px-4 py-3 rounded-lg border-2 min-w-[180px] max-w-[220px]
      ${getStepColor(data.stepType)}
      ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      transition-all duration-200 hover:shadow-md
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Status Indicator */}
      {getStatusIndicator(data.status)}

      {/* Node Content */}
      <div className="flex items-start space-x-3">
        <div className="text-xl flex-shrink-0">
          {getStepIcon(data.stepType)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {data.label}
          </h4>
          
          {data.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {data.description}
            </p>
          )}

          {/* Configuration Summary */}
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500">
                {getConfigSummary(data.stepType, data.config)}
              </div>
            </div>
          )}

          {/* Arcade Tool Indicator */}
          {data.arcadeTool && (
            <div className="mt-2 flex items-center space-x-1">
              <span className="text-xs text-indigo-600">🔗</span>
              <span className="text-xs text-indigo-600 font-medium">
                {data.arcadeTool.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  )
})

WorkflowStepNode.displayName = 'WorkflowStepNode'

function getConfigSummary(stepType: string, config: any): string {
  switch (stepType) {
    case 'capture':
      const fieldCount = config.fields?.length || 0
      return `${fieldCount} field${fieldCount !== 1 ? 's' : ''}`
    
    case 'review':
    case 'approve':
    case 'human_task':
      return config.assignee || config.approver || config.reviewer || 'Unassigned'
    
    case 'condition':
      return `${config.field} ${config.operator} ${config.value}`
    
    case 'delay':
      return `${config.duration} ${config.unit}`
    
    case 'parallel':
      const branchCount = config.branches?.length || 0
      return `${branchCount} branch${branchCount !== 1 ? 'es' : ''}`
    
    case 'notification':
      const channelCount = config.channels?.length || 0
      return `${channelCount} channel${channelCount !== 1 ? 's' : ''}`
    
    case 'transform':
      const mappingCount = config.mappings?.length || 0
      const calcCount = config.calculations?.length || 0
      return `${mappingCount + calcCount} operation${(mappingCount + calcCount) !== 1 ? 's' : ''}`
    
    case 'update':
      const updateCount = Object.keys(config.updates || {}).length
      return `${updateCount} field${updateCount !== 1 ? 's' : ''}`
    
    default:
      return 'Configured'
  }
}