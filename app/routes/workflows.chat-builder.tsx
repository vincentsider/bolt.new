import React, { useState, useEffect } from 'react'
import { useSearchParams } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow, WorkflowStep } from '~/types/database'
import { SimpleWorkflowCanvas } from '~/components/workflows/builder/SimpleWorkflowCanvas'
import { WorkflowChat } from '~/components/workflows/builder/WorkflowChat'
import { WorkflowStepTabs } from '~/components/workflows/WorkflowStepTabs'
import type { Node } from 'reactflow'

interface BoltStyleCodeViewProps {
  workflowFiles: {[key: string]: string}
}

interface WorkflowLivePreviewProps {
  generatedCode: string
  workflowFiles: {[key: string]: string}
  workflow: Partial<Workflow>
}

function WorkflowLivePreview({ generatedCode, workflowFiles, workflow }: WorkflowLivePreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // FIXED: Force live preview updates when content changes
  useEffect(() => {
    console.log('🔄 LIVE PREVIEW UPDATE: Files changed', Object.keys(workflowFiles).length, 'Code length:', generatedCode.length)
    
    if (Object.keys(workflowFiles).length > 0) {
      console.log('📁 Using persistent workflow files for preview')
      generateLivePreview(workflowFiles)
    } else if (generatedCode && generatedCode.length > 100) {
      console.log('📝 Using generated code for preview')
      generateLivePreview(generatedCode)
    } else {
      console.log('⚠️ No substantial content for preview yet')
    }
  }, [generatedCode, workflowFiles, Object.keys(workflowFiles).length])

  const generateLivePreview = (input: string | {[key: string]: string}) => {
    try {
      setIsLoading(true)
      
      let files: {[key: string]: string} = {}
      
      if (typeof input === 'object') {
        // We have persistent files
        files = input
        console.log('Using persistent files:', Object.keys(files))
      } else {
        // Extract from code string
        const hasBoltArtifact = input.includes('<boltArtifact') && input.includes('</boltArtifact>')
        
        if (!hasBoltArtifact) {
          console.log('No boltArtifact found, showing fallback')
          setHtmlContent(createFallbackWorkflowHtml(workflow))
          return
        }
        
        files = extractFilesFromCode(input)
        console.log('Extracted files from code:', Object.keys(files))
      }
      
      // Get the main HTML file (usually index.html or submit.html)
      const mainHtmlFile = files['views/index.html'] || files['index.html'] || ''
      const submitHtmlFile = files['views/submit.html'] || files['submit.html'] || ''
      const cssFile = files['public/css/style.css'] || files['style.css'] || ''
      
      if (mainHtmlFile && mainHtmlFile.length > 100) {
        console.log('Found main HTML file, creating live preview')
        // Create a complete HTML document with embedded CSS and working forms
        const liveHtml = createLiveWorkflowHtml(mainHtmlFile, submitHtmlFile, cssFile, workflow)
        setHtmlContent(liveHtml)
      } else {
        console.log('No substantial HTML files found, showing fallback')
        // Fallback: Show the waiting state
        setHtmlContent(createFallbackWorkflowHtml(workflow))
      }
    } catch (error) {
      console.error('Error generating live preview:', error)
      setHtmlContent(createErrorHtml())
    } finally {
      setIsLoading(false)
    }
  }

  const extractFilesFromCode = (code: string): {[key: string]: string} => {
    const files: {[key: string]: string} = {}
    const fileMatches = code.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]*)"[^>]*>(.*?)<\/boltAction>/gs)
    
    for (const match of fileMatches) {
      files[match[1]] = match[2].trim()
    }
    
    return files
  }

  const createLiveWorkflowHtml = (indexHtml: string, submitHtml: string, css: string, workflow: Partial<Workflow>) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Workflow Preview - ${workflow.name || 'Expense Approval'}</title>
      <style>
        ${css}
        
        /* Live preview enhancements */
        body { margin: 0; padding: 20px; }
        .live-preview-banner {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 20px;
          margin: -20px -20px 20px -20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .live-nav {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .nav-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .nav-tab {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #f9fafb;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .nav-tab.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="live-preview-banner">
        <div>🔴 LIVE PREVIEW - ${workflow.name || 'Expense Approval Workflow'}</div>
        <div>✨ Interactive & Functional</div>
      </div>
      
      <div class="live-nav">
        <div class="nav-tabs">
          <div class="nav-tab active" onclick="showTab('home')">🏠 Home</div>
          <div class="nav-tab" onclick="showTab('submit')">📝 Submit Expense</div>
          <div class="nav-tab" onclick="showTab('dashboard')">👥 Manager Dashboard</div>
        </div>
        
        <div id="home-tab" class="tab-content active">
          ${indexHtml.replace(/<html[^>]*>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '')}
        </div>
        
        <div id="submit-tab" class="tab-content">
          ${submitHtml ? submitHtml.replace(/<html[^>]*>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '') : '<p>Submit form not available in preview</p>'}
        </div>
        
        <div id="dashboard-tab" class="tab-content">
          <div class="container">
            <h2>Manager Dashboard</h2>
            <p>This would show pending approvals and workflow management tools.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Sample Pending Approvals</h3>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; margin: 10px 0;">
                <strong>John Doe</strong> - $750 Travel Expense
                <div style="margin-top: 5px; font-size: 14px; color: #666;">
                  Submitted: Today | Category: Travel
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script>
        function showTab(tabName) {
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected tab
          document.getElementById(tabName + '-tab').classList.add('active');
          event.target.classList.add('active');
        }
        
        // Make forms interactive but prevent actual submission
        document.addEventListener('DOMContentLoaded', function() {
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            form.addEventListener('submit', function(e) {
              e.preventDefault();
              alert('✅ Form submitted successfully!\\n\\nThis is a live preview. The actual workflow backend runs separately.\\n\\nTo test the full workflow:\\n1. Deploy the workflow\\n2. Or run locally with the generated code');
              return false;
            });
          });
          
          // Override any fetch calls to /api endpoints
          const originalFetch = window.fetch;
          window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.startsWith('/api/')) {
              alert('🔔 API Call Intercepted\\n\\nThis preview cannot make API calls to the workflow backend.\\n\\nThe workflow needs to be deployed or run locally to test API functionality.');
              return Promise.reject(new Error('API calls not available in preview'));
            }
            return originalFetch.apply(this, args);
          };
        });
      </script>
    </body>
    </html>
    `
  }

  const createFallbackWorkflowHtml = (workflow: Partial<Workflow>) => {
    return `
    <div style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 500px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🤖</div>
        <h2 style="color: #374151; margin-bottom: 15px; font-size: 24px;">No Workflow Generated Yet</h2>
        <p style="color: #6b7280; margin-bottom: 30px; line-height: 1.6;">
          Chat with the AI assistant to generate your workflow application. Once generated, you'll see the live, interactive preview here.
        </p>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            💡 <strong>Try saying:</strong> "Create an expense approval workflow" or "Build a customer onboarding process"
          </p>
        </div>
        
        <div style="text-align: left; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
          <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">What you'll see once generated:</h4>
          <ul style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Live, interactive workflow application</li>
            <li>Working forms you can fill out and test</li>
            <li>Approval dashboards with real functionality</li>
            <li>Complete navigation between workflow steps</li>
          </ul>
        </div>
      </div>
    </div>
    `
  }

  const createErrorHtml = () => {
    return `
    <div style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px;">
        <h3 style="color: #dc2626; margin: 0 0 10px 0;">Preview Error</h3>
        <p style="color: #7f1d1d; margin: 0;">Unable to generate live preview. Please generate workflow code first.</p>
      </div>
    </div>
    `
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating live preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <iframe 
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        title="Live Workflow Preview"
        sandbox="allow-scripts allow-forms allow-same-origin"
      />
    </div>
  )
}

function BoltStyleCodeView({ workflowFiles }: BoltStyleCodeViewProps) {
  const [files, setFiles] = useState<{[key: string]: string}>({})
  const [fileOrder, setFileOrder] = useState<string[]>([])

  useEffect(() => {
    if (Object.keys(workflowFiles).length > 0) {
      // Use persistent workflow files
      setFiles(workflowFiles)
      setFileOrder(Object.keys(workflowFiles))
    }
  }, [workflowFiles])

  if (Object.keys(files).length === 0) {
    return (
      <div className="h-full bg-gray-900 text-green-400 p-4 overflow-y-auto font-mono text-sm">
        <div className="mb-4">
          <div className="text-white font-bold">Generated Workflow Code</div>
          <div className="text-gray-400 text-xs">Chat with the assistant to generate workflow code</div>
        </div>
        <div className="text-yellow-400">// Waiting for workflow generation...</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 text-green-400 overflow-y-auto font-mono text-sm">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4">
        <div className="text-white font-bold">Generated Workflow Application</div>
        <div className="text-gray-400 text-xs">{fileOrder.length} files generated</div>
      </div>
      
      <div className="p-4 space-y-6">
        {fileOrder.map((filePath, index) => (
          <div key={filePath} className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">📄</span>
                <span className="text-white font-medium">{filePath}</span>
                <span className="text-gray-500 text-xs">
                  ({files[filePath]?.split('\n').length || 0} lines)
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-900">
              <pre className="text-green-400 text-xs leading-relaxed whitespace-pre-wrap">
                {files[filePath] || 'Loading...'}
              </pre>
            </div>
          </div>
        ))}
        
        {fileOrder.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-yellow-400 mb-2">⚡ Generating workflow files...</div>
            <div className="text-sm">Files will appear here as they are created</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWorkflowBuilderPage() {
  const { user, organization, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const workflowId = searchParams.get('id')
  const initialInput = searchParams.get('input')
  const initialName = searchParams.get('name')
  const forceFresh = searchParams.get('fresh') === 'true' || !workflowId // Force fresh if no workflow ID (new workflow)
  
  const [workflow, setWorkflow] = useState<Partial<Workflow>>({
    name: initialName || 'New Workflow',
    description: '',
    status: 'draft',
    config: {
      triggers: [],
      steps: [],
      settings: {
        notificationChannels: [],
        errorHandling: 'stop',
        maxRetries: 3,
        timeoutMinutes: 60
      }
    }
  })
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentView, setCurrentView] = useState<'preview' | 'canvas' | 'code'>('preview')
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [workflowFiles, setWorkflowFiles] = useState<{[key: string]: string}>({})

  // Load workflow if ID is provided
  useEffect(() => {
    if (workflowId && user && organization) {
      loadWorkflow(workflowId)
    }
  }, [workflowId, user, organization])

  const loadWorkflow = async (id: string) => {
    setLoading(true)
    try {
      const { data: workflowData, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single()

      if (error) {
        console.error('Error loading workflow:', error)
        return
      }

      const workflowConfig = workflowData.config || {
        triggers: workflowData.triggers || [],
        steps: workflowData.steps || [],
        settings: {
          notificationChannels: [],
          errorHandling: 'stop',
          maxRetries: 3,
          timeoutMinutes: 60
        }
      };
      
      setWorkflow({
        ...workflowData,
        config: workflowConfig
      });
    } catch (error) {
      console.error('Error loading workflow:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWorkflowUpdate = React.useCallback((updatedWorkflow: Partial<Workflow>) => {
    setWorkflow(updatedWorkflow)
  }, [])

  const handleCodeUpdate = React.useCallback((code: string) => {
    setGeneratedCode(code)
  }, [])

  const handleFilesUpdate = React.useCallback((files: {[key: string]: string}) => {
    setWorkflowFiles(files)
  }, [])

  const handleStepsChange = React.useCallback((steps: WorkflowStep[]) => {
    setWorkflow(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        steps
      }
    }))
  }, [])

  const handleNodeSelect = React.useCallback((node: Node | null) => {
    setSelectedNode(node)
  }, [])

  const updateSelectedNodeData = React.useCallback((field: string, value: any) => {
    if (!selectedNode) return

    setWorkflow(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        steps: prev.config!.steps.map(step => 
          step.id === selectedNode.id 
            ? { ...step, [field]: value }
            : step
        )
      }
    }))

    setSelectedNode(prev => prev ? {
      ...prev,
      data: { ...prev.data, [field]: value }
    } : null)
  }, [selectedNode])

  const updateSelectedNodeConfig = React.useCallback((path: string[], value: any) => {
    if (!selectedNode) return

    const updateNestedConfig = (config: any, pathArray: string[], newValue: any): any => {
      if (pathArray.length === 1) {
        return { ...config, [pathArray[0]]: newValue }
      }
      const [currentKey, ...restPath] = pathArray
      return {
        ...config,
        [currentKey]: updateNestedConfig(config[currentKey] || {}, restPath, newValue)
      }
    }

    setWorkflow(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        steps: prev.config!.steps.map(step => 
          step.id === selectedNode.id 
            ? { ...step, config: updateNestedConfig(step.config, path, value) }
            : step
        )
      }
    }))

    setSelectedNode(prev => prev ? {
      ...prev,
      data: { 
        ...prev.data, 
        config: updateNestedConfig(prev.data?.config || {}, path, value)
      }
    } : null)
  }, [selectedNode])

  const deleteSelectedNode = React.useCallback(() => {
    if (!selectedNode) return

    setWorkflow(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        steps: prev.config!.steps.filter(step => step.id !== selectedNode.id)
      }
    }))

    setSelectedNode(null)
  }, [selectedNode])

  async function handleSaveWorkflow() {
    if (!user || !organization) return
    
    try {
      const workflowData = {
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || '',
        status: workflow.status || 'draft',
        version: 1,
        config: {
          triggers: workflow.config?.triggers || [],
          steps: workflow.config?.steps || [],
          settings: workflow.config?.settings || {
            notificationChannels: [],
            errorHandling: 'stop',
            maxRetries: 3,
            timeoutMinutes: 60
          }
        },
        permissions: {
          view: ['builder', 'reviewer', 'approver', 'auditor', 'sysadmin'],
          edit: ['builder', 'sysadmin'],
          execute: ['builder', 'approver', 'sysadmin'],
          approve: ['approver', 'sysadmin']
        },
        organization_id: organization.id,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (workflowId) {
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId)
          .eq('organization_id', organization.id)

        if (error) {
          console.error('Error updating workflow:', error)
        } else {
          console.log('Workflow updated successfully')
        }
      } else {
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            ...workflowData,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating workflow:', error)
        } else {
          console.log('Workflow created successfully')
          window.history.replaceState({}, '', `/workflows/chat-builder?id=${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  async function handlePublishWorkflow() {
    if (!workflow.config?.steps?.length) {
      alert('No workflow steps to deploy. Please generate a workflow first.')
      return
    }

    if (!generatedCode && Object.keys(workflowFiles).length === 0) {
      alert('No generated code found. Please generate the workflow code first.')
      return
    }

    try {
      setLoading(true)
      
      // First save the workflow
      await handleSaveWorkflow()
      
      // Show deployment preview
      const shouldDeploy = confirm(`Deploy "${workflow.name}" workflow?\n\nThis will:\n• Create a live workflow application\n• Generate all necessary files\n• Set up the database\n• Make it accessible via URL\n\nContinue?`)
      
      if (!shouldDeploy) {
        setLoading(false)
        return
      }

      // Use persistent files if available, otherwise extract from generated code
      const files = Object.keys(workflowFiles).length > 0 
        ? workflowFiles 
        : extractFilesFromGeneratedCode(generatedCode)
      
      // Create deployment payload
      const deploymentData = {
        workflowId: workflowId || workflow.name?.toLowerCase().replace(/\s+/g, '-'),
        name: workflow.name,
        description: workflow.description,
        files: files,
        steps: workflow.config.steps,
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: user?.id,
          organizationId: organization?.id
        }
      }

      console.log('Deploying workflow with', Object.keys(files).length, 'files')

      // Call deployment API
      const response = await fetch('/api/deploy-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      })

      if (!response.ok) {
        throw new Error('Deployment failed')
      }

      const result = await response.json()
      
      // Update workflow status to published WITHOUT causing a re-render that resets chat
      setWorkflow(prev => ({ ...prev, status: 'published' }))
      
      // Show success message with deployment URL
      alert(`🎉 Workflow deployed successfully!\n\nDeployment URL: ${result.url}\nAdmin Dashboard: ${result.dashboardUrl}\n\nYour workflow is now live and ready to use!`)
      
    } catch (error) {
      console.error('Deployment error:', error)
      alert('Deployment failed. Please try again or check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  function extractFilesFromGeneratedCode(code: string): {[key: string]: string} {
    const files: {[key: string]: string} = {}
    
    // Extract boltAction file operations
    const fileMatches = code.matchAll(/<boltAction[^>]*type="file"[^>]*filePath="([^"]*)"[^>]*>(.*?)<\/boltAction>/gs)
    
    for (const match of fileMatches) {
      const filePath = match[1]
      const fileContent = match[2].trim()
      files[filePath] = fileContent
    }
    
    return files
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading workflow...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be logged in to build workflows.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Chat Workflow Builder
            </h1>
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={workflow.name || ''}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Workflow Name"
              />
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                workflow.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                workflow.status === 'published' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {workflow.status}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setCurrentView('preview')}
                className={`px-3 py-2 text-sm ${currentView === 'preview' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
              >
                🖥️ Live Preview
              </button>
              <button
                onClick={() => setCurrentView('canvas')}
                className={`px-3 py-2 text-sm ${currentView === 'canvas' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
              >
                📋 4-Step Builder
              </button>
              <button
                onClick={() => setCurrentView('code')}
                className={`px-3 py-2 text-sm ${currentView === 'code' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
              >
                💻 Code
              </button>
            </div>
            
            <button
              onClick={handleSaveWorkflow}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Save Draft
            </button>
            
            <button
              onClick={handlePublishWorkflow}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!workflow.config?.steps?.length}
            >
              Deploy Workflow
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={workflow.description || ''}
            onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
            className="w-full text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            placeholder="Describe what this workflow does..."
          />
        </div>
      </div>

      {/* Main Content - Split Screen like original Bolt.new */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat Interface */}
        <div className="flex flex-col h-full border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1" style={{minWidth: '400px'}}>
          <WorkflowChat 
            workflow={workflow}
            onWorkflowUpdate={handleWorkflowUpdate}
            onCodeUpdate={handleCodeUpdate}
            onFilesUpdate={handleFilesUpdate}
            initialInput={initialInput}
            forceFresh={forceFresh}
          />
        </div>

        {/* Right Panel - Live Preview, Canvas, or Code */}
        <div className="flex-1 flex flex-col bg-bolt-elements-background-depth-2">
          {currentView === 'preview' && (
            /* Live Preview - Running Workflow Application */
            <WorkflowLivePreview generatedCode={generatedCode} workflowFiles={workflowFiles} workflow={workflow} />
          )}
          
          {currentView === 'canvas' && (
            /* 4-Step Workflow Builder */
            <WorkflowStepTabs
              workflow={workflow}
              onWorkflowUpdate={handleWorkflowUpdate}
            />
          )}
          
          {currentView === 'code' && (
            /* Code View - Bolt.new Style */
            <BoltStyleCodeView workflowFiles={workflowFiles} />
          )}
        </div>
      </div>
    </div>
  )
}

