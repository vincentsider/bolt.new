/**
 * Real-Time Workflow Validator Component
 * Provides live validation feedback during workflow building using multi-agent system
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from '~/utils/debounce';
import type { ValidationResult, AgentRole } from '~/lib/agents';

interface RealTimeValidatorProps {
  workflowData: {
    code?: string;
    components?: any[];
    integrations?: string[];
    uiElements?: any[];
  };
  validationTypes?: ('security' | 'design' | 'integration' | 'quality' | 'all')[];
  onValidationComplete?: (results: ValidationResult[]) => void;
  onValidationStart?: () => void;
  autoValidate?: boolean;
  debounceMs?: number;
  className?: string;
}

interface ValidationState {
  isValidating: boolean;
  results: ValidationResult[];
  lastValidation: Date | null;
  error: string | null;
}

interface ValidationSummary {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  score: number;
}

export function RealTimeValidator({
  workflowData,
  validationTypes = ['all'],
  onValidationComplete,
  onValidationStart,
  autoValidate = false,
  debounceMs = 1000,
  className = ''
}: RealTimeValidatorProps) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    results: [],
    lastValidation: null,
    error: null
  });

  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (data: typeof workflowData, types: typeof validationTypes) => {
      if (!data || (!data.code && !data.components && !data.integrations && !data.uiElements)) {
        return;
      }

      setValidationState(prev => ({ ...prev, isValidating: true, error: null }));
      onValidationStart?.();

      try {
        const validationType = types.includes('all') ? 'all' : types[0];
        
        const response = await fetch('/api/multi-agent-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            action: 'validate_realtime',
            workflowData: data,
            validationType
          })
        });

        if (!response.ok) {
          throw new Error('Validation request failed');
        }

        const result = await response.json();

        const newResults = result.issues || [];
        
        setValidationState({
          isValidating: false,
          results: newResults,
          lastValidation: new Date(),
          error: null
        });

        // Add to history (keep last 10 validations)
        setValidationHistory(prev => [...newResults, ...prev].slice(0, 10));

        onValidationComplete?.(newResults);

      } catch (error) {
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          error: error.message
        }));
      }
    }, debounceMs),
    [debounceMs, onValidationComplete, onValidationStart]
  );

  // Auto-validate when workflow data changes
  useEffect(() => {
    if (autoValidate) {
      debouncedValidate(workflowData, validationTypes);
    }
  }, [workflowData, validationTypes, autoValidate, debouncedValidate]);

  // Manual validation trigger
  const triggerValidation = useCallback(() => {
    debouncedValidate(workflowData, validationTypes);
  }, [workflowData, validationTypes, debouncedValidate]);

  // Calculate validation summary
  const validationSummary = useMemo((): ValidationSummary => {
    const results = validationState.results;
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    return { total, passed, warnings, failed, score };
  }, [validationState.results]);

  // Group results by agent/type
  const groupedResults = useMemo(() => {
    const groups: Record<string, ValidationResult[]> = {};
    validationState.results.forEach(result => {
      const key = `${result.agentRole}-${result.type}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    });
    return groups;
  }, [validationState.results]);

  const getStatusColor = (status: ValidationResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAgentIcon = (agentRole: AgentRole) => {
    const icons = {
      orchestration: '🎯',
      security: '🔒',
      design: '🎨',
      integration: '🔗',
      quality: '✅'
    };
    return icons[agentRole] || '🤖';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Real-Time Validation
          </h3>
          {validationState.isValidating && (
            <div className="flex items-center gap-2 ml-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-blue-600 dark:text-blue-400">Validating...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Validation Score */}
          <div className={`text-sm font-medium ${getScoreColor(validationSummary.score)}`}>
            Score: {validationSummary.score}%
          </div>

          {/* Manual validation button */}
          <button
            onClick={triggerValidation}
            disabled={validationState.isValidating}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validate
          </button>
        </div>
      </div>

      {/* Validation Summary */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {validationSummary.passed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Passed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {validationSummary.warnings}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {validationSummary.failed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {validationSummary.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {validationState.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-red-500">❌</span>
            <span className="text-sm text-red-700 dark:text-red-300">
              Validation Error: {validationState.error}
            </span>
          </div>
        </div>
      )}

      {/* Validation Results */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence mode="wait">
          {validationState.results.length === 0 && !validationState.isValidating && !validationState.error && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <span className="text-4xl mb-2 block">✨</span>
              <p>No validation issues found!</p>
              <p className="text-sm">Your workflow looks good.</p>
            </div>
          )}

          {Object.entries(groupedResults).map(([groupKey, results]) => {
            const [agentRole, type] = groupKey.split('-');
            return (
              <motion.div
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span>{getAgentIcon(agentRole as AgentRole)}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {agentRole.charAt(0).toUpperCase() + agentRole.slice(1)} - {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    <span className="ml-auto text-xs text-gray-600 dark:text-gray-400">
                      {results.length} issue{results.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {results.map((result, index) => (
                    <motion.div
                      key={`${groupKey}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          result.status === 'passed' ? 'bg-green-500' :
                          result.status === 'warning' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {result.message}
                          </div>
                          
                          {result.suggestions && result.suggestions.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Suggestions:
                              </div>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {result.suggestions.map((suggestion, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-blue-500 flex-shrink-0">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.details && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                                View Details
                              </summary>
                              <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {validationState.lastValidation && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 text-center">
          Last validated: {validationState.lastValidation.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Validation Status Indicator
 */
export function ValidationStatusIndicator({ 
  validationResults, 
  className = '' 
}: { 
  validationResults: ValidationResult[];
  className?: string;
}) {
  const summary = useMemo(() => {
    const total = validationResults.length;
    const failed = validationResults.filter(r => r.status === 'failed').length;
    const warnings = validationResults.filter(r => r.status === 'warning').length;
    const passed = total - failed - warnings;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    return { total, failed, warnings, passed, score };
  }, [validationResults]);

  const getIndicatorColor = () => {
    if (summary.failed > 0) return 'bg-red-500';
    if (summary.warnings > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getIndicatorIcon = () => {
    if (summary.failed > 0) return '❌';
    if (summary.warnings > 0) return '⚠️';
    return '✅';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
      <span className="text-sm font-medium">
        {getIndicatorIcon()} {summary.score}%
      </span>
      {summary.total > 0 && (
        <span className="text-xs text-gray-500">
          ({summary.failed + summary.warnings} issues)
        </span>
      )}
    </div>
  );
}