/**
 * Agent Status Monitor Component
 * Real-time monitoring of multi-agent system status and performance
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AgentRole } from '~/lib/agents';

interface AgentMetrics {
  [agentId: string]: {
    executionTime: number;
    isComplete: boolean;
  };
}

interface AgentStatus {
  [agentId: string]: {
    status: 'idle' | 'active' | 'completed' | 'error';
    isActive: boolean;
  };
}

interface AgentCapabilities {
  [role in AgentRole]: string[];
}

interface AgentStatusMonitorProps {
  isVisible?: boolean;
  refreshInterval?: number;
  onAgentClick?: (agentRole: AgentRole) => void;
}

export function AgentStatusMonitor({ 
  isVisible = true, 
  refreshInterval = 2000,
  onAgentClick 
}: AgentStatusMonitorProps) {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus>({});
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics>({});
  const [agentCapabilities, setAgentCapabilities] = useState<AgentCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const fetchAgentData = async () => {
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
          setAgentStatuses(data.statuses || {});
          setAgentMetrics(data.metrics || {});
          setAgentCapabilities(data.capabilities || null);
          setError(null);
        } else {
          setError('Failed to fetch agent status');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchAgentData();

    // Set up polling
    const interval = setInterval(fetchAgentData, refreshInterval);

    return () => clearInterval(interval);
  }, [isVisible, refreshInterval]);

  const getAgentDisplayName = (agentId: string): string => {
    const role = agentId.replace('-agent', '') as AgentRole;
    const names = {
      'orchestration': 'Orchestrator',
      'security': 'Security Agent',
      'design': 'Design Agent',
      'integration': 'Integration Agent',
      'quality': 'Quality Agent'
    };
    return names[role] || agentId;
  };

  const getAgentRole = (agentId: string): AgentRole => {
    return agentId.replace('-agent', '') as AgentRole;
  };

  const getStatusColor = (status: string, isActive: boolean): string => {
    if (isActive) return 'bg-blue-500 animate-pulse';
    
    switch (status) {
      case 'idle': return 'bg-gray-400';
      case 'active': return 'bg-blue-500 animate-pulse';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getAgentIcon = (agentId: string): string => {
    const role = getAgentRole(agentId);
    const icons = {
      'orchestration': '🎯',
      'security': '🔒',
      'design': '🎨',
      'integration': '🔗',
      'quality': '✅'
    };
    return icons[role] || '🤖';
  };

  const formatExecutionTime = (time: number): string => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading Agent Status...
          </h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-500">❌</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Agent Monitor Error
          </h3>
        </div>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Multi-Agent System Status
        </h3>
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          Updates every {refreshInterval / 1000}s
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(agentStatuses).map(([agentId, status]) => {
          const metrics = agentMetrics[agentId];
          const role = getAgentRole(agentId);
          const capabilities = agentCapabilities?.[role] || [];

          return (
            <motion.div
              key={agentId}
              layout
              className={`
                p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
              `}
              onClick={() => onAgentClick?.(role)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                {/* Agent Icon and Status Indicator */}
                <div className="relative">
                  <div className="text-2xl">{getAgentIcon(agentId)}</div>
                  <div 
                    className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800
                      ${getStatusColor(status.status, status.isActive)}
                    `}
                  />
                </div>

                {/* Agent Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getAgentDisplayName(agentId)}
                    </span>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${status.isActive 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : status.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : status.status === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }
                    `}>
                      {status.isActive ? 'Active' : status.status}
                    </span>
                  </div>

                  {/* Capabilities */}
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {capabilities.slice(0, 2).join(', ')}
                    {capabilities.length > 2 && ` +${capabilities.length - 2} more`}
                  </div>

                  {/* Execution Metrics */}
                  {metrics && (
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Execution: {formatExecutionTime(metrics.executionTime)}
                      </span>
                      <span>
                        Status: {metrics.isComplete ? 'Complete' : 'Running'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Activity Indicator */}
                {status.isActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System Overview */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Active Agents:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {Object.values(agentStatuses).filter(s => s.isActive).length}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Agents:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {Object.keys(agentStatuses).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Agent Status Bar for embedding in other components
 */
export function AgentStatusBar({ className = '' }: { className?: string }) {
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [totalAgents, setTotalAgents] = useState(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/multi-agent-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ action: 'agent_status' })
        });

        if (response.ok) {
          const data = await response.json();
          const active = new Set(
            Object.entries(data.statuses || {})
              .filter(([_, status]: [string, any]) => status.isActive)
              .map(([agentId]: [string, any]) => agentId)
          );
          setActiveAgents(active);
          setTotalAgents(Object.keys(data.statuses || {}).length);
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Agents:</span>
        <span className="text-xs text-gray-900 dark:text-gray-100">
          {activeAgents.size}/{totalAgents}
        </span>
      </div>
      {activeAgents.size > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 dark:text-green-400">Active</span>
        </div>
      )}
    </div>
  );
}