/**
 * Multi-Agent Workflow Builder
 * Integrates the multi-agent system with the visual workflow builder
 * Provides split-screen chat + visual builder experience
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiAgentChat } from '~/components/chat/MultiAgentChat';
import { WorkflowCanvas } from './WorkflowCanvas';
import { ComponentPalette } from './ComponentPalette';
import { StepConfigPanel } from './config/StepConfigPanel';
import { RealTimeValidator } from '../RealTimeValidator';
import { AgentStatusMonitor } from '../AgentStatusMonitor';
import { useMultiAgentValidation } from '~/lib/agents/hooks/useMultiAgentValidation';
import type { ValidationResult, AgentRole } from '~/lib/agents';
import type { WorkflowStep } from '~/types/workflow';

interface MultiAgentWorkflowBuilderProps {
  initialWorkflow?: any;
  onSave?: (workflow: any) => void;
  onPublish?: (workflow: any) => void;
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
}

interface WorkflowState {
  id?: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  generatedCode?: string;
  metadata?: {
    createdBy: 'chat' | 'visual';
    lastModified: Date;
    agentAnalysis?: {
      securityScore: number;
      designScore: number;
      integrationScore: number;
      qualityScore: number;
    };
  };
}

export function MultiAgentWorkflowBuilder({
  initialWorkflow,
  onSave,
  onPublish,
  organizationId,
  userId,
  userRole,
  permissions
}: MultiAgentWorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<WorkflowState>({
    name: '',
    description: '',
    steps: [],
    ...initialWorkflow,
    metadata: {
      createdBy: 'chat',
      lastModified: new Date(),
      ...initialWorkflow?.metadata
    }
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'visual' | 'validate'>('chat');
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showAgentMonitor, setShowAgentMonitor] = useState(false);

  // Real-time validation of workflow data
  const {
    isValidating,
    results: realtimeValidationResults,
    validationSummary,
    validate: triggerValidation,
    hasErrors,
    hasWarnings
  } = useMultiAgentValidation({
    code: workflow.generatedCode,
    components: workflow.steps,
    integrations: workflow.steps
      .filter(step => step.type === 'integration')
      .map(step => step.config?.integration || 'unknown'),
    uiElements: workflow.steps
      .filter(step => step.type === 'capture')
      .map(step => step.config)
  }, {
    autoValidate: false,
    debounceMs: 2000,
    onValidationComplete: (results) => {
      setValidationResults(results);
    }
  });

  // Handle workflow generation from chat
  const handleWorkflowGenerated = useCallback(async (workflowCode: string, chatMessage?: string) => {
    try {
      // Parse the generated workflow code to extract workflow structure
      const generatedWorkflow = await parseWorkflowFromCode(workflowCode, chatMessage);
      
      setWorkflow(prev => ({
        ...prev,
        ...generatedWorkflow,
        generatedCode: workflowCode,
        metadata: {
          ...prev.metadata,
          createdBy: 'chat',
          lastModified: new Date()
        }
      }));

      // Automatically switch to visual tab to show the generated workflow
      setActiveTab('visual');
      
      // Trigger agent validation
      setTimeout(() => triggerValidation(), 500);
      
    } catch (error) {
      console.error('Failed to parse generated workflow:', error);
    }
  }, [triggerValidation]);

  // Handle workflow updates from visual builder
  const handleWorkflowUpdate = useCallback((updates: Partial<WorkflowState>) => {
    setWorkflow(prev => ({
      ...prev,
      ...updates,
      metadata: {
        ...prev.metadata,
        createdBy: 'visual',
        lastModified: new Date()
      }
    }));
  }, []);

  // Handle step selection in visual builder
  const handleStepSelection = useCallback((stepId: string | null) => {
    setSelectedStep(stepId);
  }, []);

  // Handle validation results from agents
  const handleValidationResults = useCallback((results: ValidationResult[]) => {
    setValidationResults(results);
    
    // Update workflow metadata with agent analysis
    const analysis = calculateAgentAnalysis(results);
    setWorkflow(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        agentAnalysis: analysis
      }
    }));
  }, []);

  // Save workflow
  const handleSave = useCallback(async () => {
    if (onSave) {
      await onSave(workflow);
    }
  }, [workflow, onSave]);

  // Publish workflow
  const handlePublish = useCallback(async () => {
    // Ensure validation passes before publishing
    if (hasErrors) {
      alert('Please fix validation errors before publishing');
      return;
    }

    if (onPublish) {
      await onPublish(workflow);
    }
  }, [workflow, onPublish, hasErrors]);

  const userContext = {
    organizationId,
    userId,
    userRole,
    permissions,
    sessionId: `builder-${Date.now()}`
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Component Palette (when in visual mode) */}
      <AnimatePresence>
        {activeTab === 'visual' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <ComponentPalette
              onAddStep={(step) => {
                handleWorkflowUpdate({
                  steps: [...workflow.steps, step]
                });
              }}
              searchFilter=""
              selectedCategory="all"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with tabs and actions */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Tab Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                💬 Chat Builder
              </button>
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                🎨 Visual Builder
              </button>
              <button
                onClick={() => setActiveTab('validate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  activeTab === 'validate'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                🔍 Validation
                {(hasErrors || hasWarnings) && (
                  <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                    hasErrors ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                )}
              </button>
            </div>

            {/* Workflow Info and Actions */}
            <div className="flex items-center gap-3">
              {/* Workflow Name */}
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => handleWorkflowUpdate({ name: e.target.value })}
                placeholder="Untitled Workflow"
                className="px-3 py-1 text-lg font-medium bg-transparent border-none focus:outline-none focus:bg-white dark:focus:bg-gray-700 rounded"
              />

              {/* Agent Status Toggle */}
              <button
                onClick={() => setShowAgentMonitor(!showAgentMonitor)}
                className={`p-2 rounded-lg transition-colors ${
                  isAgentActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
                title="Toggle Agent Monitor"
              >
                🤖
              </button>

              {/* Actions */}
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Save
              </button>
              <button
                onClick={handlePublish}
                disabled={hasErrors}
                className={`px-4 py-2 rounded-lg font-medium ${
                  hasErrors
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Publish
              </button>
            </div>
          </div>

          {/* Workflow Description */}
          {workflow.description && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {workflow.description}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1"
                >
                  <MultiAgentChat
                    onWorkflowGenerated={handleWorkflowGenerated}
                    onValidationResults={handleValidationResults}
                    workflowContext={{
                      workflowId: workflow.id,
                      currentCode: workflow.generatedCode,
                      integrations: workflow.steps
                        .filter(step => step.type === 'integration')
                        .map(step => step.config?.integration || 'unknown')
                    }}
                  />
                </motion.div>
              )}

              {activeTab === 'visual' && (
                <motion.div
                  key="visual"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 flex"
                >
                  <div className="flex-1">
                    <WorkflowCanvas
                      workflow={workflow}
                      selectedStep={selectedStep}
                      onSelectStep={handleStepSelection}
                      onUpdateWorkflow={handleWorkflowUpdate}
                      validationResults={validationResults}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'validate' && (
                <motion.div
                  key="validate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex-1 p-4"
                >
                  <RealTimeValidator
                    workflowData={{
                      code: workflow.generatedCode,
                      components: workflow.steps,
                      integrations: workflow.steps
                        .filter(step => step.type === 'integration')
                        .map(step => step.config?.integration || 'unknown'),
                      uiElements: workflow.steps
                        .filter(step => step.type === 'capture')
                        .map(step => step.config)
                    }}
                    onValidationComplete={handleValidationResults}
                    className="max-w-4xl mx-auto"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Step Configuration (when step is selected) */}
          <AnimatePresence>
            {selectedStep && activeTab === 'visual' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <StepConfigPanel
                  step={workflow.steps.find(s => s.id === selectedStep)}
                  workflowContext={workflow}
                  onUpdateStep={(stepId, updates) => {
                    const updatedSteps = workflow.steps.map(step =>
                      step.id === stepId ? { ...step, ...updates } : step
                    );
                    handleWorkflowUpdate({ steps: updatedSteps });
                  }}
                  onClose={() => setSelectedStep(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Agent Monitor Overlay */}
      <AnimatePresence>
        {showAgentMonitor && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 h-full w-96 z-50 shadow-2xl"
          >
            <AgentStatusMonitor
              isVisible={true}
              onAgentClick={(agentRole: AgentRole) => {
                console.log('Agent clicked:', agentRole);
                // Could open agent-specific details or logs
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Parse workflow structure from generated code
 */
async function parseWorkflowFromCode(workflowCode: string, chatMessage?: string): Promise<Partial<WorkflowState>> {
  try {
    // This would be enhanced with actual code parsing logic
    // For now, we'll extract basic structure from comments or metadata in the code
    
    const nameMatch = workflowCode.match(/\/\/ Workflow: (.+)/);
    const descriptionMatch = workflowCode.match(/\/\/ Description: (.+)/);
    
    return {
      name: nameMatch?.[1] || 'Generated Workflow',
      description: descriptionMatch?.[1] || chatMessage || 'AI-generated workflow',
      steps: extractStepsFromCode(workflowCode)
    };
  } catch (error) {
    console.error('Failed to parse workflow from code:', error);
    return {
      name: 'Generated Workflow',
      description: 'AI-generated workflow',
      steps: []
    };
  }
}

/**
 * Extract workflow steps from generated code
 */
function extractStepsFromCode(code: string): WorkflowStep[] {
  // This would be enhanced with actual code analysis
  // For now, return basic structure based on common patterns
  
  const steps: WorkflowStep[] = [];
  
  // Look for common workflow patterns
  if (code.includes('form') || code.includes('input')) {
    steps.push({
      id: 'capture-1',
      type: 'capture',
      name: 'Data Collection',
      config: { form: { fields: [] } }
    });
  }
  
  if (code.includes('approve') || code.includes('review')) {
    steps.push({
      id: 'approve-1', 
      type: 'approve',
      name: 'Approval Process',
      config: { approvers: [] }
    });
  }
  
  if (code.includes('email') || code.includes('notify')) {
    steps.push({
      id: 'notify-1',
      type: 'update',
      name: 'Notification',
      config: { type: 'email' }
    });
  }
  
  return steps;
}

/**
 * Calculate agent analysis scores from validation results
 */
function calculateAgentAnalysis(results: ValidationResult[]) {
  const calculateScore = (agentType: string) => {
    const agentResults = results.filter(r => r.type === agentType);
    if (agentResults.length === 0) return 100;
    
    const passed = agentResults.filter(r => r.status === 'passed').length;
    return Math.round((passed / agentResults.length) * 100);
  };

  return {
    securityScore: calculateScore('security'),
    designScore: calculateScore('design'),
    integrationScore: calculateScore('integration'),
    qualityScore: calculateScore('quality')
  };
}