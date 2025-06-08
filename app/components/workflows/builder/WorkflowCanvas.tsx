import * as React from 'react'
import { useCallback, useState, useMemo } from 'react'
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  ConnectionMode,
  Panel,
  MarkerType,
  ReactFlowProvider,
} from 'reactflow'
import type { Node, Edge, NodeTypes, Connection } from 'reactflow'
import 'reactflow/dist/style.css'

import { WorkflowStepNode } from './nodes/WorkflowStepNode'
import { StartNode } from './nodes/StartNode'
import { EndNode } from './nodes/EndNode'
import type { WorkflowStep } from '~/types/database'

interface WorkflowCanvasProps {
  initialSteps?: WorkflowStep[]
  onStepsChange?: (steps: WorkflowStep[]) => void
  onNodeSelect?: (node: Node | null) => void
  readonly?: boolean
}

export function WorkflowCanvas({ 
  initialSteps = [], 
  onStepsChange, 
  onNodeSelect,
  readonly = false 
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    workflowStep: WorkflowStepNode,
    start: StartNode,
    end: EndNode,
  }), [])

  // Initialize canvas with workflow steps (only once)
  React.useEffect(() => {
    if (!initialized) {
      if (initialSteps.length > 0) {
        const initialNodes = convertStepsToNodes(initialSteps)
        const initialEdges = convertStepsToEdges(initialSteps)
        setNodes(initialNodes)
        setEdges(initialEdges)
      } else {
        // Create default start and end nodes
        setNodes([
          {
            id: 'start',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Start' },
            deletable: false,
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 250, y: 400 },
            data: { label: 'End' },
            deletable: false,
          }
        ])
        setEdges([])
      }
      setInitialized(true)
    }
  }, [initialSteps, setNodes, setEdges, initialized])

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    onNodeSelect?.(node)
  }, [onNodeSelect])

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect?.(null)
  }, [onNodeSelect])

  // Handle drag over for component palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop from component palette
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    const reactFlowWrapper = document.querySelector('.react-flow')
    if (!reactFlowWrapper) return

    const reactFlowBounds = reactFlowWrapper.getBoundingClientRect()
    const componentType = event.dataTransfer.getData('application/reactflow')

    if (componentType) {
      const position = {
        x: event.clientX - reactFlowBounds.left - 100, // Center the node
        y: event.clientY - reactFlowBounds.top - 50,
      }

      const newNode: Node = {
        id: `${componentType}-${Date.now()}`,
        type: 'workflowStep',
        position,
        data: {
          stepType: componentType,
          label: getStepLabel(componentType),
          config: getDefaultConfig(componentType),
        },
      }

      setNodes((nds) => [...nds, newNode])
    }
  }, [setNodes])

  // Convert nodes/edges back to workflow steps
  const exportSteps = useCallback((): WorkflowStep[] => {
    const steps: WorkflowStep[] = []

    nodes.forEach(node => {
      if (node.type === 'workflowStep') {
        const connectedEdges = edges.filter(edge => edge.source === node.id)
        const nextSteps = connectedEdges.map(edge => ({
          stepId: edge.target!,
          condition: edge.data?.condition || null
        }))

        steps.push({
          id: node.id,
          type: node.data.stepType,
          name: node.data.label,
          description: node.data.description,
          config: node.data.config || {},
          nextSteps,
          arcadeTool: node.data.arcadeTool
        })
      }
    })

    return steps
  }, [nodes, edges])

  // Update parent component when steps change (debounced)
  React.useEffect(() => {
    if (onStepsChange && initialized) {
      const timeoutId = setTimeout(() => {
        const steps = exportSteps()
        onStepsChange(steps)
      }, 500) // Debounce for 500ms
      
      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, exportSteps, onStepsChange, initialized])

  return (
    <ReactFlowProvider>
      <div className="h-full w-full relative" style={{ minHeight: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          style={{ width: '100%', height: '100%' }}
          deleteKeyCode={readonly ? null : ['Backspace', 'Delete']}
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'start': return '#10b981'
                case 'end': return '#ef4444'
                default: return '#3b82f6'
              }
            }}
            nodeStrokeWidth={3}
            pannable
            zoomable
          />
          
          {/* Canvas Controls */}
          <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 m-4">
            <div className="space-y-2">
              <button
                onClick={() => {
                  setNodes([
                    { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' }, deletable: false },
                    { id: 'end', type: 'end', position: { x: 250, y: 400 }, data: { label: 'End' }, deletable: false }
                  ])
                  setEdges([])
                }}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={readonly}
              >
                Clear Canvas
              </button>
              
              <button
                onClick={() => {
                  const steps = exportSteps()
                  console.log('Exported steps:', steps)
                }}
                className="w-full px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
              >
                Export Steps
              </button>

              {selectedNode && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Selected:</p>
                  <p className="text-sm font-medium">{selectedNode.data.label}</p>
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}

// Helper functions
function convertStepsToNodes(steps: WorkflowStep[]): Node[] {
  const nodes: Node[] = [
    {
      id: 'start',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { label: 'Start' },
      deletable: false,
    }
  ]

  steps.forEach((step, index) => {
    nodes.push({
      id: step.id,
      type: 'workflowStep',
      position: { x: 250, y: 150 + (index * 120) },
      data: {
        stepType: step.type,
        label: step.name,
        description: step.description,
        config: step.config,
        arcadeTool: step.arcadeTool,
      },
    })
  })

  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: 250, y: 150 + (steps.length * 120) },
    data: { label: 'End' },
    deletable: false,
  })

  return nodes
}

function convertStepsToEdges(steps: WorkflowStep[]): Edge[] {
  const edges: Edge[] = []

  // Connect start to first step if exists
  if (steps.length > 0) {
    edges.push({
      id: 'start-to-first',
      source: 'start',
      target: steps[0].id,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
    })
  }

  // Connect steps based on nextSteps
  steps.forEach(step => {
    step.nextSteps?.forEach(nextStep => {
      edges.push({
        id: `${step.id}-to-${nextStep.stepId}`,
        source: step.id,
        target: nextStep.stepId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { condition: nextStep.condition },
      })
    })
  })

  // Connect last steps to end
  const stepIds = new Set(steps.map(s => s.id))
  const referencedSteps = new Set(steps.flatMap(s => s.nextSteps?.map(ns => ns.stepId) || []))
  const finalSteps = steps.filter(s => !referencedSteps.has(s.id))

  finalSteps.forEach(step => {
    edges.push({
      id: `${step.id}-to-end`,
      source: step.id,
      target: 'end',
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
    })
  })

  return edges
}

function getStepLabel(stepType: string): string {
  const labels: Record<string, string> = {
    'capture': 'Data Capture',
    'review': 'Review Task',
    'approve': 'Approval',
    'update': 'Update Data',
    'condition': 'Condition',
    'parallel': 'Parallel Steps',
    'delay': 'Wait/Delay',
    'notification': 'Send Notification',
    'transform': 'Transform Data',
    'human_task': 'Human Task',
  }
  return labels[stepType] || stepType
}

function getDefaultConfig(stepType: string): any {
  const configs: Record<string, any> = {
    'capture': {
      fields: [],
      required: true,
    },
    'review': {
      reviewer: null,
      deadline: null,
    },
    'approve': {
      approver: null,
      deadline: null,
    },
    'update': {
      updates: {},
    },
    'condition': {
      field: '',
      operator: 'equals',
      value: '',
    },
    'parallel': {
      branches: [],
      wait_for: 'all',
    },
    'delay': {
      duration: 1,
      unit: 'minutes',
    },
    'notification': {
      channels: [],
      template: '',
      recipients: [],
    },
    'transform': {
      mappings: [],
      calculations: [],
    },
    'human_task': {
      assignee: null,
      taskType: 'review',
      deadline: null,
    },
  }
  return configs[stepType] || {}
}