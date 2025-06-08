import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

export const EndNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative px-6 py-4 rounded-full border-2 bg-red-50 border-red-300
      ${selected ? 'ring-2 ring-red-500 ring-offset-2' : ''}
      transition-all duration-200 hover:shadow-md min-w-[120px]
    `}>
      <div className="flex items-center justify-center space-x-2">
        <span className="text-xl">🏁</span>
        <span className="text-sm font-semibold text-red-700">
          {data.label || 'End'}
        </span>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />
    </div>
  )
})

EndNode.displayName = 'EndNode'