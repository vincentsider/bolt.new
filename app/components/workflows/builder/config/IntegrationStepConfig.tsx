import React from 'react'

interface IntegrationStepConfigProps {
  data: any
  onChange: (field: string, value: any) => void
  stepType: string
}

export function IntegrationStepConfig({ data, onChange, stepType }: IntegrationStepConfigProps) {
  const config = data.config || {}

  function updateConfig(configField: string, value: any) {
    const newConfig = { ...config, [configField]: value }
    onChange('config', newConfig)
  }

  function addHeader() {
    const headers = config.headers || []
    headers.push({ key: '', value: '' })
    updateConfig('headers', headers)
  }

  function updateHeader(index: number, field: string, value: string) {
    const headers = [...(config.headers || [])]
    headers[index] = { ...headers[index], [field]: value }
    updateConfig('headers', headers)
  }

  function removeHeader(index: number) {
    const headers = (config.headers || []).filter((_: any, i: number) => i !== index)
    updateConfig('headers', headers)
  }

  function addParameter() {
    const parameters = config.parameters || []
    parameters.push({ key: '', value: '', type: 'string' })
    updateConfig('parameters', parameters)
  }

  function updateParameter(index: number, field: string, value: any) {
    const parameters = [...(config.parameters || [])]
    parameters[index] = { ...parameters[index], [field]: value }
    updateConfig('parameters', parameters)
  }

  function removeParameter(index: number) {
    const parameters = (config.parameters || []).filter((_: any, i: number) => i !== index)
    updateConfig('parameters', parameters)
  }

  const getStepSpecificConfig = () => {
    switch (stepType) {
      case 'api_call':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">HTTP Method</label>
              <select
                value={config.method || 'GET'}
                onChange={(e) => updateConfig('method', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Headers</label>
                <button
                  onClick={addHeader}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Header
                </button>
              </div>
              <div className="space-y-2">
                {(config.headers || []).map((header: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={header.key || ''}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      value={header.value || ''}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Header value"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={() => removeHeader(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Request Body</label>
                <textarea
                  value={config.body || ''}
                  onChange={(e) => updateConfig('body', e.target.value)}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="JSON request body"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Authentication</label>
              <select
                value={config.authType || 'none'}
                onChange={(e) => updateConfig('authType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api_key">API Key</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>
            </div>

            {config.authType === 'bearer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Bearer Token</label>
                <input
                  type="password"
                  value={config.bearerToken || ''}
                  onChange={(e) => updateConfig('bearerToken', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Token value"
                />
              </div>
            )}

            {config.authType === 'api_key' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key Name</label>
                  <input
                    type="text"
                    value={config.apiKeyName || ''}
                    onChange={(e) => updateConfig('apiKeyName', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="X-API-Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key Value</label>
                  <input
                    type="password"
                    value={config.apiKeyValue || ''}
                    onChange={(e) => updateConfig('apiKeyValue', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Key value"
                  />
                </div>
              </div>
            )}
          </div>
        )

      case 'database':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Database Type</label>
              <select
                value={config.dbType || 'postgresql'}
                onChange={(e) => updateConfig('dbType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mongodb">MongoDB</option>
                <option value="redis">Redis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Connection String</label>
              <input
                type="password"
                value={config.connectionString || ''}
                onChange={(e) => updateConfig('connectionString', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Database connection string"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Query Type</label>
              <select
                value={config.queryType || 'select'}
                onChange={(e) => updateConfig('queryType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="select">SELECT</option>
                <option value="insert">INSERT</option>
                <option value="update">UPDATE</option>
                <option value="delete">DELETE</option>
                <option value="custom">Custom Query</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SQL Query</label>
              <textarea
                value={config.query || ''}
                onChange={(e) => updateConfig('query', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="SELECT * FROM table WHERE column = $1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Query Parameters</label>
                <button
                  onClick={addParameter}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Parameter
                </button>
              </div>
              <div className="space-y-2">
                {(config.parameters || []).map((param: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={param.key || ''}
                      onChange={(e) => updateParameter(index, 'key', e.target.value)}
                      placeholder="Parameter name"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <select
                      value={param.type || 'string'}
                      onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                    <input
                      type="text"
                      value={param.value || ''}
                      onChange={(e) => updateParameter(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={() => removeParameter(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'spreadsheet':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Spreadsheet Type</label>
              <select
                value={config.spreadsheetType || 'google_sheets'}
                onChange={(e) => updateConfig('spreadsheetType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="google_sheets">Google Sheets</option>
                <option value="excel_online">Excel Online</option>
                <option value="airtable">Airtable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Spreadsheet ID/URL</label>
              <input
                type="text"
                value={config.spreadsheetId || ''}
                onChange={(e) => updateConfig('spreadsheetId', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Spreadsheet ID or URL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sheet/Tab Name</label>
              <input
                type="text"
                value={config.sheetName || ''}
                onChange={(e) => updateConfig('sheetName', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Sheet1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Operation</label>
              <select
                value={config.operation || 'read'}
                onChange={(e) => updateConfig('operation', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="read">Read data</option>
                <option value="append">Append row</option>
                <option value="update">Update cells</option>
                <option value="clear">Clear range</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cell Range</label>
              <input
                type="text"
                value={config.range || ''}
                onChange={(e) => updateConfig('range', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="A1:Z100"
              />
            </div>

            {config.operation !== 'read' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Mapping</label>
                <textarea
                  value={config.dataMapping || ''}
                  onChange={(e) => updateConfig('dataMapping', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Column mappings in JSON format"
                />
              </div>
            )}
          </div>
        )

      case 'crm':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">CRM Platform</label>
              <select
                value={config.crmPlatform || 'salesforce'}
                onChange={(e) => updateConfig('crmPlatform', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="salesforce">Salesforce</option>
                <option value="hubspot">HubSpot</option>
                <option value="pipedrive">Pipedrive</option>
                <option value="zoho">Zoho CRM</option>
                <option value="freshsales">Freshsales</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Object Type</label>
              <select
                value={config.objectType || 'contact'}
                onChange={(e) => updateConfig('objectType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="contact">Contact</option>
                <option value="lead">Lead</option>
                <option value="opportunity">Opportunity</option>
                <option value="account">Account</option>
                <option value="case">Case</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Action</label>
              <select
                value={config.action || 'create'}
                onChange={(e) => updateConfig('action', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="create">Create record</option>
                <option value="update">Update record</option>
                <option value="search">Search records</option>
                <option value="delete">Delete record</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Field Mapping</label>
              <textarea
                value={config.fieldMapping || ''}
                onChange={(e) => updateConfig('fieldMapping', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Field mappings in JSON format"
              />
            </div>
          </div>
        )

      case 'payment':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Provider</label>
              <select
                value={config.provider || 'stripe'}
                onChange={(e) => updateConfig('provider', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
                <option value="braintree">Braintree</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Operation</label>
              <select
                value={config.operation || 'charge'}
                onChange={(e) => updateConfig('operation', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="charge">Charge payment</option>
                <option value="refund">Process refund</option>
                <option value="capture">Capture payment</option>
                <option value="void">Void payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount Field</label>
              <input
                type="text"
                value={config.amountField || ''}
                onChange={(e) => updateConfig('amountField', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="data.amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={config.currency || 'usd'}
                onChange={(e) => updateConfig('currency', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="cad">CAD</option>
                <option value="aud">AUD</option>
              </select>
            </div>
          </div>
        )

      case 'document_gen':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Document Type</label>
              <select
                value={config.documentType || 'pdf'}
                onChange={(e) => updateConfig('documentType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="pdf">PDF</option>
                <option value="word">Word Document</option>
                <option value="excel">Excel Spreadsheet</option>
                <option value="powerpoint">PowerPoint</option>
                <option value="html">HTML</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Template Source</label>
              <select
                value={config.templateSource || 'upload'}
                onChange={(e) => updateConfig('templateSource', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="upload">Upload template</option>
                <option value="url">Template URL</option>
                <option value="library">Template library</option>
                <option value="html">HTML template</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Template</label>
              {config.templateSource === 'html' ? (
                <textarea
                  value={config.template || ''}
                  onChange={(e) => updateConfig('template', e.target.value)}
                  rows={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="HTML template with variables like {{data.name}}"
                />
              ) : (
                <input
                  type="text"
                  value={config.template || ''}
                  onChange={(e) => updateConfig('template', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Template URL or ID"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Output Filename</label>
              <input
                type="text"
                value={config.filename || ''}
                onChange={(e) => updateConfig('filename', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="document_{workflow.id}.pdf"
              />
            </div>
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

      {/* Response Handling */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Response Variable</label>
          <input
            type="text"
            value={config.responseVariable || ''}
            onChange={(e) => updateConfig('responseVariable', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Variable name to store response"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Response Mapping</label>
          <textarea
            value={config.responseMapping || ''}
            onChange={(e) => updateConfig('responseMapping', e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Map response fields to workflow variables"
          />
        </div>
      </div>

      {/* Error Handling */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Timeout (seconds)</label>
          <input
            type="number"
            value={config.timeout || 30}
            onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min="1"
            max="300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Retry Attempts</label>
          <input
            type="number"
            value={config.retryAttempts || 3}
            onChange={(e) => updateConfig('retryAttempts', parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            min="0"
            max="10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">On Error</label>
          <select
            value={config.onError || 'fail'}
            onChange={(e) => updateConfig('onError', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="fail">Fail workflow</option>
            <option value="continue">Continue with empty result</option>
            <option value="retry">Retry with exponential backoff</option>
            <option value="fallback">Use fallback value</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.logRequest || false}
              onChange={(e) => updateConfig('logRequest', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Log request details</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.logResponse || false}
              onChange={(e) => updateConfig('logResponse', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Log response details</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.validateResponse || false}
              onChange={(e) => updateConfig('validateResponse', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Validate response format</label>
          </div>
        </div>
      </div>
    </div>
  )
}