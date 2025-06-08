import React from 'react'

interface ApprovalStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function ApprovalStepConfig({ data, onChange, stepType }: ApprovalStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addApprover() {
    const approvers = config.approvers || []
    approvers.push({ id: '', name: '', email: '', role: '' })
    updateConfig('approvers', approvers)
  }

  function updateApprover(index: number, field: string, value: string) {
    const approvers = [...(config.approvers || [])]
    approvers[index] = { ...approvers[index], [field]: value }
    updateConfig('approvers', approvers)
  }

  function removeApprover(index: number) {
    const approvers = (config.approvers || []).filter((_: any, i: number) => i !== index)
    updateConfig('approvers', approvers)
  }

  const getStepSpecificFields = () => {
    switch (stepType) {
      case 'review':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Reviewer</label>
              <select
                value={config.reviewer || ''}
                onChange={(e) => updateConfig('reviewer', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select reviewer...</option>
                <option value="auto">Auto-assign</option>
                <option value="manager">Direct manager</option>
                <option value="team_lead">Team lead</option>
                <option value="specific">Specific user</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Review Criteria</label>
              <textarea
                value={config.reviewCriteria || ''}
                onChange={(e) => updateConfig('reviewCriteria', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="What should the reviewer focus on?"
              />
            </div>
          </div>
        )

      case 'approve':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Approver</label>
              <select
                value={config.approver || ''}
                onChange={(e) => updateConfig('approver', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select approver...</option>
                <option value="auto">Auto-assign</option>
                <option value="manager">Direct manager</option>
                <option value="department_head">Department head</option>
                <option value="finance">Finance team</option>
                <option value="specific">Specific user</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Approval Threshold</label>
              <input
                type="number"
                value={config.threshold || ''}
                onChange={(e) => updateConfig('threshold', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., 1000 (for amount-based approval)"
              />
            </div>
          </div>
        )

      case 'multi_approve':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Approvers</label>
                <button
                  onClick={addApprover}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Approver
                </button>
              </div>

              <div className="space-y-3">
                {(config.approvers || []).map((approver: any, index: number) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Approver {index + 1}</span>
                      <button
                        onClick={() => removeApprover(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={approver.name || ''}
                        onChange={(e) => updateApprover(index, 'name', e.target.value)}
                        placeholder="Name"
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="email"
                        value={approver.email || ''}
                        onChange={(e) => updateApprover(index, 'email', e.target.value)}
                        placeholder="Email"
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Approval Type</label>
              <select
                value={config.approvalType || 'sequential'}
                onChange={(e) => updateConfig('approvalType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="sequential">Sequential (one after another)</option>
                <option value="parallel">Parallel (all at once)</option>
                <option value="consensus">Consensus (majority required)</option>
                <option value="unanimous">Unanimous (all must approve)</option>
              </select>
            </div>
          </div>
        )

      case 'delegation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Delegate To</label>
              <input
                type="text"
                value={config.delegateTo || ''}
                onChange={(e) => updateConfig('delegateTo', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="User or role to delegate to"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Delegation Reason</label>
              <textarea
                value={config.delegationReason || ''}
                onChange={(e) => updateConfig('delegationReason', e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Why is this task being delegated?"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.notifyOriginal || false}
                onChange={(e) => updateConfig('notifyOriginal', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Notify original assignee</label>
            </div>
          </div>
        )

      case 'escalation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Escalate To</label>
              <select
                value={config.escalateTo || ''}
                onChange={(e) => updateConfig('escalateTo', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select escalation target...</option>
                <option value="manager">Manager</option>
                <option value="department_head">Department head</option>
                <option value="executive">Executive team</option>
                <option value="custom">Custom user</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Escalation Trigger</label>
              <select
                value={config.escalationTrigger || 'time'}
                onChange={(e) => updateConfig('escalationTrigger', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="time">Time-based</option>
                <option value="attempts">Failed attempts</option>
                <option value="manual">Manual trigger</option>
              </select>
            </div>

            {config.escalationTrigger === 'time' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Escalate After (hours)</label>
                <input
                  type="number"
                  value={config.escalationHours || 24}
                  onChange={(e) => updateConfig('escalationHours', parseInt(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
          </div>
        )

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Assignee</label>
            <input
              type="text"
              value={config.assignee || ''}
              onChange={(e) => updateConfig('assignee', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="User or role to assign this task"
            />
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Step-specific fields */}
      {getStepSpecificFields()}

      {/* Common fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <select
            value={config.dueDate || 'none'}
            onChange={(e) => updateConfig('dueDate', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="none">No due date</option>
            <option value="1_hour">1 hour</option>
            <option value="4_hours">4 hours</option>
            <option value="1_day">1 day</option>
            <option value="3_days">3 days</option>
            <option value="1_week">1 week</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {config.dueDate === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Custom Duration (hours)</label>
            <input
              type="number"
              value={config.customHours || ''}
              onChange={(e) => updateConfig('customHours', parseInt(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Instructions</label>
          <textarea
            value={config.instructions || ''}
            onChange={(e) => updateConfig('instructions', e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Instructions for the assignee"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            value={config.priority || 'medium'}
            onChange={(e) => updateConfig('priority', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.allowComments || true}
              onChange={(e) => updateConfig('allowComments', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Allow comments</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.requireComment || false}
              onChange={(e) => updateConfig('requireComment', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Require comment when rejecting</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.sendNotification || true}
              onChange={(e) => updateConfig('sendNotification', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Send notification to assignee</label>
          </div>
        </div>
      </div>
    </div>
  )
}