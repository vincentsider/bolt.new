/**
 * React Hook for Multi-Agent Validation
 * Provides easy integration of multi-agent validation in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ValidationResult, AgentRole } from '../types';

interface ValidationOptions {
  autoValidate?: boolean;
  debounceMs?: number;
  validationType?: 'security' | 'design' | 'integration' | 'quality' | 'all';
  onValidationStart?: () => void;
  onValidationComplete?: (results: ValidationResult[]) => void;
  onValidationError?: (error: string) => void;
}

interface ValidationState {
  isValidating: boolean;
  results: ValidationResult[];
  lastValidated: Date | null;
  error: string | null;
}

interface WorkflowData {
  code?: string;
  components?: any[];
  integrations?: string[];
  uiElements?: any[];
}

export function useMultiAgentValidation(
  workflowData: WorkflowData,
  options: ValidationOptions = {}
) {
  const {
    autoValidate = false,
    debounceMs = 1000,
    validationType = 'all',
    onValidationStart,
    onValidationComplete,
    onValidationError
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    results: [],
    lastValidated: null,
    error: null
  });

  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | undefined>();

  // Validation function
  const performValidation = useCallback(async (
    data: WorkflowData,
    signal?: AbortSignal
  ): Promise<ValidationResult[]> => {
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
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    const result = await response.json() as {
      isValid: boolean;
      issues?: ValidationResult[];
      error?: string;
    };
    
    if (!result.isValid && result.error) {
      throw new Error(result.error);
    }

    return result.issues || [];
  }, [validationType]);

  // Cancel function for debounced validation
  const cancelDebouncedValidation = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
  }, []);

  // Debounced validation with cancel support
  const debouncedValidate = useCallback((data: WorkflowData) => {
    // Clear existing timer
    cancelDebouncedValidation();

    // Set new timer
    debounceTimerRef.current = window.setTimeout(async () => {
      // Cancel previous validation if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Skip validation if no meaningful data
      if (!data || (!data.code && !data.components && !data.integrations && !data.uiElements)) {
        return;
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setValidationState(prev => ({ 
        ...prev, 
        isValidating: true, 
        error: null 
      }));

      onValidationStart?.();

      try {
        const results = await performValidation(data, abortController.signal);

        // Only update state if this validation wasn't aborted
        if (!abortController.signal.aborted) {
          setValidationState({
            isValidating: false,
            results,
            lastValidated: new Date(),
            error: null
          });

          // Add to validation history
          setValidationHistory(prev => [
            ...results,
            ...prev.slice(0, 50) // Keep last 50 validation results
          ]);

          onValidationComplete?.(results);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          const errorMessage = (error instanceof Error ? error.message : 'Validation failed');
          
          setValidationState(prev => ({
            ...prev,
            isValidating: false,
            error: errorMessage
          }));

          onValidationError?.(errorMessage);
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }, debounceMs);
  }, [debounceMs, performValidation, onValidationStart, onValidationComplete, onValidationError, cancelDebouncedValidation]);

  // Auto-validate when data changes
  useEffect(() => {
    if (autoValidate) {
      debouncedValidate(workflowData);
    }

    // Cleanup function to abort ongoing validation
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [workflowData, autoValidate, debouncedValidate]);

  // Manual validation trigger
  const validate = useCallback(
    async (data?: WorkflowData): Promise<ValidationResult[]> => {
      const dataToValidate = data || workflowData;
      
      // Cancel any ongoing debounced validation
      cancelDebouncedValidation();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setValidationState(prev => ({ 
        ...prev, 
        isValidating: true, 
        error: null 
      }));

      onValidationStart?.();

      try {
        const results = await performValidation(dataToValidate);

        setValidationState({
          isValidating: false,
          results,
          lastValidated: new Date(),
          error: null
        });

        setValidationHistory(prev => [
          ...results,
          ...prev.slice(0, 50)
        ]);

        onValidationComplete?.(results);

        return results;
      } catch (error) {
        const errorMessage = (error instanceof Error ? error.message : 'Validation failed');
        
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          error: errorMessage
        }));

        onValidationError?.(errorMessage);
        throw error;
      }
    },
    [workflowData, performValidation, cancelDebouncedValidation, onValidationStart, onValidationComplete, onValidationError]
  );

  // Clear validation results
  const clearResults = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      results: [],
      error: null
    }));
  }, []);

  // Get validation summary
  const getValidationSummary = useCallback(() => {
    const results = validationState.results;
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    return {
      total,
      passed,
      warnings,
      failed,
      score,
      hasIssues: warnings > 0 || failed > 0,
      hasCriticalIssues: failed > 0
    };
  }, [validationState.results]);

  // Get results by agent role
  const getResultsByAgent = useCallback((agentRole: AgentRole) => {
    return validationState.results.filter(result => result.agentRole === agentRole);
  }, [validationState.results]);

  // Get results by validation type
  const getResultsByType = useCallback((type: 'security' | 'design' | 'integration' | 'quality') => {
    return validationState.results.filter(result => result.type === type);
  }, [validationState.results]);

  return {
    // State
    isValidating: validationState.isValidating,
    results: validationState.results,
    lastValidated: validationState.lastValidated,
    error: validationState.error,
    validationHistory,

    // Actions
    validate,
    clearResults,

    // Computed values
    validationSummary: getValidationSummary(),
    getResultsByAgent,
    getResultsByType,

    // Utils
    hasResults: validationState.results.length > 0,
    hasErrors: validationState.results.some(r => r.status === 'failed'),
    hasWarnings: validationState.results.some(r => r.status === 'warning'),
  };
}

/**
 * Hook for real-time security validation
 */
export function useSecurityValidation(workflowData: WorkflowData, options: Omit<ValidationOptions, 'validationType'> = {}) {
  return useMultiAgentValidation(workflowData, {
    ...options,
    validationType: 'security'
  });
}

/**
 * Hook for real-time design validation
 */
export function useDesignValidation(workflowData: WorkflowData, options: Omit<ValidationOptions, 'validationType'> = {}) {
  return useMultiAgentValidation(workflowData, {
    ...options,
    validationType: 'design'
  });
}

/**
 * Hook for real-time integration validation
 */
export function useIntegrationValidation(workflowData: WorkflowData, options: Omit<ValidationOptions, 'validationType'> = {}) {
  return useMultiAgentValidation(workflowData, {
    ...options,
    validationType: 'integration'
  });
}

/**
 * Hook for real-time quality validation
 */
export function useQualityValidation(workflowData: WorkflowData, options: Omit<ValidationOptions, 'validationType'> = {}) {
  return useMultiAgentValidation(workflowData, {
    ...options,
    validationType: 'quality'
  });
}