import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

export const StartNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative px-6 py-4 rounded-full border-2 bg-green-50 border-green-300
      ${selected ? 'ring-2 ring-green-500 ring-offset-2' : ''}
      transition-all duration-200 hover:shadow-md min-w-[120px]
    `}>
      <div className="flex items-center justify-center space-x-2">
        <span className="text-xl">🚀</span>
        <span className="text-sm font-semibold text-green-700">
          {data.label || 'Start'}
        </span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  )
})

StartNode.displayName = 'StartNode'