/**
 * Agent Approval Dialog Component
 * Allows users to approve/deny agent execution steps to control costs
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AgentApprovalStep } from '~/lib/agents/types';

interface AgentApprovalDialogProps {
  step: AgentApprovalStep;
  totalCostSoFar: number;
  onApprove: () => void;
  onDeny: () => void;
  onApproveAll?: () => void;
  isVisible: boolean;
}

export function AgentApprovalDialog({
  step,
  totalCostSoFar,
  onApprove,
  onDeny,
  onApproveAll,
  isVisible
}: AgentApprovalDialogProps) {
  const [autoApprove, setAutoApprove] = useState(false);

  if (!isVisible) return null;

  const getStepIcon = () => {
    switch (step.stepType) {
      case 'agent_execution':
        return step.agentRole === 'orchestration' ? '🎯' : 
               step.agentRole === 'security' ? '🔒' :
               step.agentRole === 'design' ? '🎨' :
               step.agentRole === 'integration' ? '🔗' :
               step.agentRole === 'quality' ? '✅' : '🤖';
      case 'tool_call':
        return '🔧';
      case 'api_call':
        return '📡';
      default:
        return '❓';
    }
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getStepIcon()}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Agent Execution Approval
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Approve to continue with AI agent execution
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {step.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400">Step Cost:</span>
              <div className="font-mono font-bold text-orange-600 dark:text-orange-400">
                {formatCost(step.estimatedCost)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400">Total So Far:</span>
              <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                {formatCost(totalCostSoFar)}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              <div className="grid grid-cols-2 gap-2">
                <span>Estimated Tokens: {step.details.tokens?.toLocaleString()}</span>
                <span>API Calls: {step.details.apiCalls}</span>
              </div>
            </div>
          </div>

          {step.estimatedCost > 0.01 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-4 border-red-400">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ This step will cost more than $0.01. Are you sure you want to proceed?
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Auto-approve similar steps (disable cost control)
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={onDeny}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            
            {onApproveAll && (
              <button
                onClick={onApproveAll}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Approve All
              </button>
            )}
            
            <button
              onClick={onApprove}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Approve {formatCost(step.estimatedCost)}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Each agent execution uses Claude API and incurs costs.
            <br />
            You can cancel at any time to prevent unexpected charges.
          </p>
        </div>
      </div>
    </motion.div>
  );
}