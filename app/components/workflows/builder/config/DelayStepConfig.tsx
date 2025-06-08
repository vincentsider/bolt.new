import React from 'react'

interface DelayStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function DelayStepConfig({ data, onChange, stepType }: DelayStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Delay Type</label>
              <select
                value={config.delayType || 'fixed'}
                onChange={(e) => updateConfig('delayType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="fixed">Fixed duration</option>
                <option value="dynamic">Dynamic (based on data)</option>
                <option value="business_hours">Business hours only</option>
                <option value="condition">Wait for condition</option>
              </select>
            </div>

            {config.delayType === 'fixed' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <input
                    type="number"
                    value={config.duration || 1}
                    onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={config.unit || 'minutes'}
                    onChange={(e) => updateConfig('unit', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            )}

            {config.delayType === 'dynamic' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration Field</label>
                <input
                  type="text"
                  value={config.durationField || ''}
                  onChange={(e) => updateConfig('durationField', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="data.delayMinutes"
                />
                <p className="text-xs text-gray-500 mt-1">Field containing delay duration in minutes</p>
              </div>
            )}

            {config.delayType === 'business_hours' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={config.businessStart || '09:00'}
                      onChange={(e) => updateConfig('businessStart', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={config.businessEnd || '17:00'}
                      onChange={(e) => updateConfig('businessEnd', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Days</label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <div key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(config.businessDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).includes(day)}
                          onChange={(e) => {
                            const businessDays = config.businessDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                            if (e.target.checked) {
                              updateConfig('businessDays', [...businessDays, day])
                            } else {
                              updateConfig('businessDays', businessDays.filter((d: string) => d !== day))
                            }
                          }}
                          className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                        />
                        <label className="ml-1 text-xs text-gray-700">{day.slice(0, 3)}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {config.delayType === 'condition' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition Field</label>
                  <input
                    type="text"
                    value={config.conditionField || ''}
                    onChange={(e) => updateConfig('conditionField', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="data.approvalStatus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Value</label>
                  <input
                    type="text"
                    value={config.expectedValue || ''}
                    onChange={(e) => updateConfig('expectedValue', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="approved"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check Interval (minutes)</label>
                  <input
                    type="number"
                    value={config.checkInterval || 5}
                    onChange={(e) => updateConfig('checkInterval', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        )

      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
              <select
                value={config.scheduleType || 'datetime'}
                onChange={(e) => updateConfig('scheduleType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="datetime">Specific date/time</option>
                <option value="relative">Relative to current time</option>
                <option value="recurring">Recurring schedule</option>
                <option value="cron">Cron expression</option>
              </select>
            </div>

            {config.scheduleType === 'datetime' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={config.scheduleDate || ''}
                    onChange={(e) => updateConfig('scheduleDate', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={config.scheduleTime || ''}
                    onChange={(e) => updateConfig('scheduleTime', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            )}

            {config.scheduleType === 'relative' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delay</label>
                  <input
                    type="number"
                    value={config.relativeDelay || 1}
                    onChange={(e) => updateConfig('relativeDelay', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={config.relativeUnit || 'hours'}
                    onChange={(e) => updateConfig('relativeUnit', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            )}

            {config.scheduleType === 'recurring' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Frequency</label>
                  <select
                    value={config.frequency || 'daily'}
                    onChange={(e) => updateConfig('frequency', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Execution Time</label>
                  <input
                    type="time"
                    value={config.executionTime || '09:00'}
                    onChange={(e) => updateConfig('executionTime', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                {config.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                    <select
                      value={config.dayOfWeek || 'monday'}
                      onChange={(e) => updateConfig('dayOfWeek', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                )}

                {config.frequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Month</label>
                    <input
                      type="number"
                      value={config.dayOfMonth || 1}
                      onChange={(e) => updateConfig('dayOfMonth', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                      max="31"
                    />
                  </div>
                )}
              </div>
            )}

            {config.scheduleType === 'cron' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cron Expression</label>
                <input
                  type="text"
                  value={config.cronExpression || ''}
                  onChange={(e) => updateConfig('cronExpression', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0 9 * * 1-5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: minute hour day month day-of-week
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Step-specific configuration */}
      {getStepSpecificConfig()}

      {/* Timeout Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Maximum Wait Time</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={config.maxWaitDuration || ''}
              onChange={(e) => updateConfig('maxWaitDuration', parseInt(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Duration"
            />
            <select
              value={config.maxWaitUnit || 'hours'}
              onChange={(e) => updateConfig('maxWaitUnit', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for no timeout. Workflow will fail if timeout is exceeded.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">On Timeout</label>
          <select
            value={config.onTimeout || 'fail'}
            onChange={(e) => updateConfig('onTimeout', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="fail">Fail workflow</option>
            <option value="continue">Continue anyway</option>
            <option value="skip">Skip to next step</option>
            <option value="retry">Retry operation</option>
          </select>
        </div>
      </div>

      {/* Notification Options */}
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.notifyOnStart || false}
            onChange={(e) => updateConfig('notifyOnStart', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">Notify when delay starts</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.notifyOnComplete || false}
            onChange={(e) => updateConfig('notifyOnComplete', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">Notify when delay completes</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={config.allowEarlyResume || false}
            onChange={(e) => updateConfig('allowEarlyResume', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">Allow manual early resume</label>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Timezone</label>
        <select
          value={config.timezone || 'UTC'}
          onChange={(e) => updateConfig('timezone', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Asia/Shanghai">Shanghai</option>
        </select>
      </div>
    </div>
  )
}