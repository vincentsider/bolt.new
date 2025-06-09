import React, { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { WorkflowStep } from '~/types/database'

interface SimpleWorkflowCanvasProps {
  initialSteps?: WorkflowStep[]
  onStepsChange?: (steps: WorkflowStep[]) => void
  onNodeSelect?: (node: any) => void
}

interface ComponentPaletteItem {
  type: WorkflowStep['type']
  label: string
  icon: string
  description: string
  color: string
}

const COMPONENT_PALETTE: ComponentPaletteItem[] = [
  { type: 'capture', label: 'Capture', icon: '📝', description: 'Collect data from users', color: 'bg-blue-500' },
  { type: 'review', label: 'Review', icon: '👀', description: 'Review submitted data', color: 'bg-purple-500' },
  { type: 'approve', label: 'Approve', icon: '✅', description: 'Approval decision point', color: 'bg-green-500' },
  { type: 'update', label: 'Update', icon: '🔄', description: 'Update or transform data', color: 'bg-orange-500' },
  { type: 'condition', label: 'Condition', icon: '🔀', description: 'Conditional branching', color: 'bg-yellow-500' },
  { type: 'parallel', label: 'Parallel', icon: '⚡', description: 'Run steps in parallel', color: 'bg-red-500' }
]

// Custom node component for workflow steps
function WorkflowNode({ data, selected }: { data: any, selected: boolean }) {
  const paletteItem = COMPONENT_PALETTE.find(item => item.type === data.type)
  
  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[160px] ${
      selected ? 'border-blue-500' : 'border-gray-200'
    }`}>
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-lg">{paletteItem?.icon || '📄'}</span>
        <span className="font-medium text-sm text-gray-900">{data.name}</span>
      </div>
      <div className="text-xs text-gray-600 mb-2">{data.description}</div>
      <div className={`text-xs px-2 py-1 rounded text-white ${paletteItem?.color || 'bg-gray-500'}`}>
        {data.type}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  workflowStep: WorkflowNode
}

export function SimpleWorkflowCanvas({ 
  initialSteps = [], 
  onStepsChange,
  onNodeSelect
}: SimpleWorkflowCanvasProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [draggedType, setDraggedType] = useState<WorkflowStep['type'] | null>(null)

  // Convert workflow steps to React Flow nodes
  const convertStepsToNodes = useCallback((workflowSteps: WorkflowStep[]): Node[] => {
    return workflowSteps.map((step, index) => ({
      id: step.id,
      type: 'workflowStep',
      position: { x: 200 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
      data: {
        name: step.name,
        description: step.description,
        type: step.type,
        config: step.config
      }
    }))
  }, [])

  // Convert workflow steps to React Flow edges
  const convertStepsToEdges = useCallback((workflowSteps: WorkflowStep[]): Edge[] => {
    const newEdges: Edge[] = []
    workflowSteps.forEach((step, index) => {
      step.nextSteps.forEach(nextStep => {
        newEdges.push({
          id: `${step.id}-${nextStep.stepId}`,
          source: step.id,
          target: nextStep.stepId,
          type: 'smoothstep',
          animated: true
        })
      })
      
      // Auto-connect sequential steps if no explicit connections
      if (step.nextSteps.length === 0 && index < workflowSteps.length - 1) {
        newEdges.push({
          id: `${step.id}-${workflowSteps[index + 1].id}`,
          source: step.id,
          target: workflowSteps[index + 1].id,
          type: 'smoothstep',
          animated: true
        })
      }
    })
    return newEdges
  }, [])

  useEffect(() => {
    setSteps(initialSteps)
    if (initialSteps.length > 0) {
      const newNodes = convertStepsToNodes(initialSteps)
      const newEdges = convertStepsToEdges(initialSteps)
      setNodes(newNodes)
      setEdges(newEdges)
    }
  }, [initialSteps, convertStepsToNodes, convertStepsToEdges, setNodes, setEdges])

  useEffect(() => {
    if (onStepsChange) {
      onStepsChange(steps)
    }
  }, [steps, onStepsChange])

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node)
    }
  }, [onNodeSelect])

  // Handle drag start from palette
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowStep['type']) => {
    setDraggedType(nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      
      if (!draggedType) return
      
      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50
      }

      const paletteItem = COMPONENT_PALETTE.find(item => item.type === draggedType)!
      const newStepId = `step-${Date.now()}`
      
      const newNode: Node = {
        id: newStepId,
        type: 'workflowStep',
        position,
        data: {
          name: `New ${paletteItem.label}`,
          description: paletteItem.description,
          type: draggedType,
          config: {}
        }
      }

      const newStep: WorkflowStep = {
        id: newStepId,
        name: `New ${paletteItem.label}`,
        description: paletteItem.description,
        type: draggedType,
        config: {},
        nextSteps: []
      }

      setNodes((nds) => nds.concat(newNode))
      setSteps((prevSteps) => [...prevSteps, newStep])
      setDraggedType(null)
    },
    [draggedType, setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex bg-gray-50">
        {/* Left Panel - Component Palette */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Components</h3>
          <div className="space-y-3">
            {COMPONENT_PALETTE.map((item) => (
              <div
                key={item.type}
                className="p-3 border border-gray-200 rounded-lg cursor-grab hover:shadow-md transition-shadow bg-white"
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {steps.length > 0 && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="font-medium">✨ {steps.length} Steps Created</div>
                <div className="text-xs mt-1">Drag components above to add more steps</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - React Flow Canvas */}
        <div className="flex-1 relative">
          {steps.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.1 }}
            >
              <Background color="#f1f5f9" size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const paletteItem = COMPONENT_PALETTE.find(item => item.type === node.data?.type)
                  return paletteItem?.color.replace('bg-', '#') || '#6b7280'
                }}
                className="bg-white border border-gray-200"
              />
            </ReactFlow>
          ) : (
            <div 
              className="h-full flex items-center justify-center bg-gray-50"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <div className="text-center space-y-4 max-w-md">
                <div className="text-6xl mb-4">🎨</div>
                <div className="text-xl font-semibold text-gray-700">Visual Workflow Builder</div>
                <p className="text-gray-600">
                  Start by chatting with the AI to generate a workflow, or drag components from the left panel to build manually.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>💬 Chat: "Create an expense approval workflow"</div>
                  <div>🎯 Or drag & drop components to design manually</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}