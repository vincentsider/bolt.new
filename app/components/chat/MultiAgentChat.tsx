/**
 * Multi-Agent Chat Component
 * Integrates the multi-agent system with the existing chat interface
 */

import { useState, useEffect, useRef } from 'react';
import { useFetcher } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentRole, AgentResponse, ValidationResult, AgentApprovalStep } from '~/lib/agents';
import { AgentApprovalDialog } from './AgentApprovalDialog';

interface MultiAgentChatProps {
  onWorkflowGenerated?: (workflowCode: string) => void;
  onValidationResults?: (results: ValidationResult[]) => void;
  workflowContext?: {
    workflowId?: string;
    currentCode?: string;
    integrations?: string[];
  };
  costLimit?: number; // Maximum cost in USD
  approvalMode?: 'auto' | 'step-by-step' | 'batch';
}

interface AgentStatus {
  [agentId: string]: {
    status: 'idle' | 'active' | 'completed' | 'error';
    isActive: boolean;
  };
}

interface AgentMessage {
  id: string;
  agentRole: AgentRole;
  content: string;
  timestamp: Date;
  type: 'response' | 'validation' | 'suggestion';
  metadata?: {
    executionTime?: number;
    toolsUsed?: number;
    confidence?: number;
  };
}

export function MultiAgentChat({ 
  onWorkflowGenerated, 
  onValidationResults, 
  workflowContext,
  costLimit = 0.50, // Default $0.50 limit
  approvalMode = 'step-by-step' // Default to step-by-step approval
}: MultiAgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus>({});
  const [activeAgents, setActiveAgents] = useState<Set<AgentRole>>(new Set());
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [pendingApproval, setPendingApproval] = useState<AgentApprovalStep | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [approvalResolver, setApprovalResolver] = useState<((approved: boolean) => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetcher = useFetcher();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Poll agent statuses while processing
    if (isProcessing) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/multi-agent-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Replace with actual token management
            },
            body: JSON.stringify({ action: 'agent_status' })
          });
          
          if (response.ok) {
            const data = await response.json();
            setAgentStatuses(data.statuses);
            setActiveAgents(new Set(
              Object.entries(data.statuses)
                .filter(([_, status]: [string, any]) => status.isActive)
                .map(([agentId]: [string, any]) => agentId.replace('-agent', '') as AgentRole)
            ));
          }
        } catch (error) {
          console.error('Failed to fetch agent statuses:', error);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  // Approval callback function
  const handleApproval = async (step: AgentApprovalStep): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingApproval(step);
      setApprovalResolver(() => resolve);
    });
  };

  const handleApprovalResponse = (approved: boolean) => {
    if (approvalResolver) {
      approvalResolver(approved);
      setPendingApproval(null);
      setApprovalResolver(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setIsProcessing(true);
    setTotalCost(0); // Reset cost tracking
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      agentRole: 'orchestration',
      content: `User: ${userMessage}`,
      timestamp: new Date(),
      type: 'response'
    }]);

    try {
      const response = await fetch('/api/multi-agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Replace with actual token management
        },
        body: JSON.stringify({
          action: 'process_workflow',
          message: userMessage,
          workflowId: workflowContext?.workflowId,
          approvalMode,
          maxCost: costLimit,
          approvalCallback: approvalMode !== 'auto' ? 'enabled' : undefined
        })
      });

      if (!response.ok) {
        let errorDetails = 'Unknown server error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(`Server error: ${errorDetails}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add agent responses to messages
        if (data.agentResponses) {
          const agentMessages: AgentMessage[] = data.agentResponses.map((agentResponse: AgentResponse) => ({
            id: crypto.randomUUID(),
            agentRole: agentResponse.agentRole,
            content: agentResponse.content,
            timestamp: new Date(),
            type: 'response',
            metadata: agentResponse.metadata
          }));
          setMessages(prev => [...prev, ...agentMessages]);
        }

        // Add final synthesized response
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          agentRole: 'orchestration',
          content: data.response,
          timestamp: new Date(),
          type: 'response',
          metadata: { executionTime: data.executionTime }
        }]);

        // Handle workflow code generation
        if (data.workflowCode && onWorkflowGenerated) {
          onWorkflowGenerated(data.workflowCode);
        }

        // Handle validation results
        if (data.validationResults && data.validationResults.length > 0) {
          setValidationResults(data.validationResults);
          if (onValidationResults) {
            onValidationResults(data.validationResults);
          }
        }

        // Add suggestions as messages
        if (data.suggestions && data.suggestions.length > 0) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            agentRole: 'orchestration',
            content: `**Suggestions:**\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}`,
            timestamp: new Date(),
            type: 'suggestion'
          }]);
        }

        // Update total cost
        if (data.totalCost) {
          setTotalCost(data.totalCost);
        }

        // Handle approval needed
        if (data.needsApproval && data.stepsPending && data.stepsPending.length > 0) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            agentRole: 'orchestration',
            content: `⏸️ **Execution Paused**\n\nThe workflow execution has been paused for your approval. This helps control costs by letting you approve each step.\n\n**Cost so far:** $${data.totalCost?.toFixed(4) || '0.0000'}\n**Pending steps:** ${data.stepsPending.length}`,
            timestamp: new Date(),
            type: 'suggestion'
          }]);
        }
      } else {
        const errorMessage = data.error || 'Unknown server error';
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          agentRole: 'orchestration',
          content: `❌ **Error:** ${errorMessage}${data.totalCost ? `\n\n**Cost incurred:** $${data.totalCost.toFixed(4)}` : ''}`,
          timestamp: new Date(),
          type: 'response'
        }]);
        
        if (data.totalCost) {
          setTotalCost(data.totalCost);
        }
      }
    } catch (error) {
      console.error('MultiAgent chat error:', error);
      
      // Enhanced error handling to avoid "Error: undefined"
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // If we still have no meaningful error message, provide context
      if (!errorMessage || errorMessage === 'undefined') {
        errorMessage = 'Network connection failed or server configuration error. Please check your internet connection and try again.';
      }
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agentRole: 'orchestration',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
        type: 'response'
      }]);
    } finally {
      setIsProcessing(false);
      setActiveAgents(new Set());
    }
  };

  const getAgentDisplayName = (role: AgentRole): string => {
    const names = {
      orchestration: 'Orchestrator',
      security: 'Security Agent',
      design: 'Design Agent',
      integration: 'Integration Agent',
      quality: 'Quality Agent'
    };
    return names[role] || role;
  };

  const getAgentColor = (role: AgentRole): string => {
    const colors = {
      orchestration: 'bg-blue-500',
      security: 'bg-red-500',
      design: 'bg-purple-500',
      integration: 'bg-green-500',
      quality: 'bg-yellow-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const getAgentIcon = (role: AgentRole): string => {
    const icons = {
      orchestration: '🎯',
      security: '🔒',
      design: '🎨',
      integration: '🔗',
      quality: '✅'
    };
    return icons[role] || '🤖';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Agent Status Bar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agents:</span>
        {(['orchestration', 'security', 'design', 'integration', 'quality'] as AgentRole[]).map(role => (
          <motion.div
            key={role}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${activeAgents.has(role) 
                ? `${getAgentColor(role)} text-white` 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }
            `}
            animate={{ 
              scale: activeAgents.has(role) ? [1, 1.1, 1] : 1,
              transition: { duration: 0.5, repeat: activeAgents.has(role) ? Infinity : 0 }
            }}
          >
            <span>{getAgentIcon(role)}</span>
            <span className="hidden sm:inline">{getAgentDisplayName(role).split(' ')[0]}</span>
          </motion.div>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {/* Cost Display */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Cost:</span>
            <span className={`font-mono font-bold ${
              totalCost > costLimit * 0.8 ? 'text-red-500' :
              totalCost > costLimit * 0.5 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              ${totalCost.toFixed(4)}
            </span>
            <span className="text-gray-500">/ ${costLimit.toFixed(2)}</span>
            
            {/* Approval Mode Indicator */}
            <span className={`px-2 py-1 rounded-full text-xs ${
              approvalMode === 'auto' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
              approvalMode === 'step-by-step' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              {approvalMode === 'auto' ? '🔓 Auto' : approvalMode === 'step-by-step' ? '🔒 Step' : '🔒 Batch'}
            </span>
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`
                flex gap-3 p-3 rounded-lg
                ${message.agentRole === 'orchestration' && message.content.startsWith('User:')
                  ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                  : 'bg-gray-50 dark:bg-gray-800'
                }
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm
                ${getAgentColor(message.agentRole)} text-white
              `}>
                {getAgentIcon(message.agentRole)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {getAgentDisplayName(message.agentRole)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.metadata?.executionTime && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({message.metadata.executionTime}ms)
                    </span>
                  )}
                </div>
                <div className={`
                  text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none
                  ${message.type === 'suggestion' ? 'italic' : ''}
                `}>
                  {message.content.split('\n').map((line, i) => (
                    <div key={i}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong>{line.slice(2, -2)}</strong>
                      ) : line.startsWith('• ') ? (
                        <div className="ml-2">• {line.slice(2)}</div>
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </div>
                {message.metadata?.toolsUsed && message.metadata.toolsUsed > 0 && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Used {message.metadata.toolsUsed} tool{message.metadata.toolsUsed > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Validation Results Summary */}
      {validationResults.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Validation Issues: {validationResults.filter(v => v.status === 'failed').length} errors, {' '}
            {validationResults.filter(v => v.status === 'warning').length} warnings
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the workflow you want to create..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Send'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Powered by 5 specialized AI agents: Security, Design, Integration, Quality, and Orchestration
          {approvalMode !== 'auto' && (
            <span className="ml-2 text-green-600 dark:text-green-400">
              • Cost control enabled - you'll approve each step
            </span>
          )}
        </div>
      </form>

      {/* Approval Dialog */}
      {pendingApproval && (
        <AgentApprovalDialog
          step={pendingApproval}
          totalCostSoFar={totalCost}
          onApprove={() => handleApprovalResponse(true)}
          onDeny={() => handleApprovalResponse(false)}
          onApproveAll={() => {
            handleApprovalResponse(true);
            // Switch to auto mode for remaining steps
            // Note: This would need to be implemented in the backend
          }}
          isVisible={true}
        />
      )}
    </div>
  );
}