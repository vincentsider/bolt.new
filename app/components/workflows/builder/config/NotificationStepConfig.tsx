import React from 'react'

interface NotificationStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function NotificationStepConfig({ data, onChange, stepType }: NotificationStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addRecipient() {
    const recipients = config.recipients || []
    recipients.push({ type: 'email', value: '', name: '' })
    updateConfig('recipients', recipients)
  }

  function updateRecipient(index: number, field: string, value: string) {
    const recipients = [...(config.recipients || [])]
    recipients[index] = { ...recipients[index], [field]: value }
    updateConfig('recipients', recipients)
  }

  function removeRecipient(index: number) {
    const recipients = (config.recipients || []).filter((_: any, i: number) => i !== index)
    updateConfig('recipients', recipients)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Template</label>
              <select
                value={config.template || 'custom'}
                onChange={(e) => updateConfig('template', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="custom">Custom template</option>
                <option value="approval_request">Approval request</option>
                <option value="task_assignment">Task assignment</option>
                <option value="workflow_complete">Workflow complete</option>
                <option value="error_notification">Error notification</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => updateConfig('subject', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Email subject line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => updateConfig('body', e.target.value)}
                rows={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Email content (supports variables like {user.name}, {workflow.name})"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.isHtml || false}
                onChange={(e) => updateConfig('isHtml', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Send as HTML email</label>
            </div>
          </div>
        )

      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Slack Channel</label>
              <input
                type="text"
                value={config.channel || ''}
                onChange={(e) => updateConfig('channel', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., #general, #approvals"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Slack message content"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.mentionChannel || false}
                  onChange={(e) => updateConfig('mentionChannel', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Mention @channel</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.threadReply || false}
                  onChange={(e) => updateConfig('threadReply', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Reply in thread</label>
              </div>
            </div>
          </div>
        )

      case 'sms':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMS Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                rows={3}
                maxLength={160}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="SMS message content (160 character limit)"
              />
              <div className="text-xs text-gray-500 mt-1">
                {(config.message || '').length}/160 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SMS Provider</label>
              <select
                value={config.provider || 'twilio'}
                onChange={(e) => updateConfig('provider', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="twilio">Twilio</option>
                <option value="aws_sns">AWS SNS</option>
                <option value="messagebird">MessageBird</option>
              </select>
            </div>
          </div>
        )

      case 'teams':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Teams Channel</label>
              <input
                type="text"
                value={config.channel || ''}
                onChange={(e) => updateConfig('channel', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Teams channel or chat ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Teams message content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message Type</label>
              <select
                value={config.messageType || 'text'}
                onChange={(e) => updateConfig('messageType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="text">Plain text</option>
                <option value="adaptive_card">Adaptive card</option>
                <option value="activity_feed">Activity feed</option>
              </select>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Notification Type</label>
              <select
                value={config.notificationType || 'email'}
                onChange={(e) => updateConfig('notificationType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="sms">SMS</option>
                <option value="teams">Microsoft Teams</option>
                <option value="webhook">Webhook</option>
                <option value="push">Push notification</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message Template</label>
              <textarea
                value={config.template || ''}
                onChange={(e) => updateConfig('template', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Notification message template"
              />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Step-specific configuration */}
      {getStepSpecificConfig()}

      {/* Recipients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Recipients</label>
          <button
            onClick={addRecipient}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Recipient
          </button>
        </div>

        <div className="space-y-3">
          {(config.recipients || []).map((recipient: any, index: number) => (
            <div key={index} className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Recipient {index + 1}</span>
                <button
                  onClick={() => removeRecipient(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={recipient.type || 'email'}
                  onChange={(e) => updateRecipient(index, 'type', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="email">Email</option>
                  <option value="user">User</option>
                  <option value="role">Role</option>
                  <option value="phone">Phone</option>
                </select>
                <input
                  type="text"
                  value={recipient.value || ''}
                  onChange={(e) => updateRecipient(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={recipient.name || ''}
                  onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                  placeholder="Name (optional)"
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          ))}

          {(config.recipients || []).length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <p className="text-sm">No recipients configured</p>
              <p className="text-xs">Add recipients to send notifications</p>
            </div>
          )}
        </div>
      </div>

      {/* General Options */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            value={config.priority || 'normal'}
            onChange={(e) => updateConfig('priority', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.retryOnFailure || false}
              onChange={(e) => updateConfig('retryOnFailure', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Retry on failure</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.trackDelivery || false}
              onChange={(e) => updateConfig('trackDelivery', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Track delivery status</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.includeAttachments || false}
              onChange={(e) => updateConfig('includeAttachments', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Include workflow attachments</label>
          </div>
        </div>
      </div>
    </div>
  )
}