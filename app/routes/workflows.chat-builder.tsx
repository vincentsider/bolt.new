import React, { useState, useEffect } from 'react'
import { useSearchParams } from '@remix-run/react'
import { useAuth } from '~/components/auth/AuthProvider'
import { supabase } from '~/lib/supabase'
import type { Workflow, WorkflowStep } from '~/types/database'
import { SimpleWorkflowCanvas } from '~/components/workflows/builder/SimpleWorkflowCanvas'
import { WorkflowChat } from '~/components/workflows/builder/WorkflowChat'
import { WorkflowStepTabs } from '~/components/workflows/WorkflowStepTabs'
import type { Node } from 'reactflow'
import { useStore } from '@nanostores/react'
import { $componentInstances, $workflowStyling, workflowComponentActions } from '~/stores/workflow-components'

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
  const componentInstances = useStore($componentInstances)

  // FIXED: Force live preview updates when content OR component instances change
  useEffect(() => {
    console.log('🔄 LIVE PREVIEW UPDATE: Components:', componentInstances.length, 'Files:', Object.keys(workflowFiles).length, 'Code length:', generatedCode.length)
    
    // Prioritize component instances over generated code
    if (componentInstances.length > 0) {
      console.log('🧩 Using component instances for preview')
      generateComponentBasedPreview()
    } else if (Object.keys(workflowFiles).length > 0) {
      console.log('📁 Using persistent workflow files for preview')
      generateLivePreview(workflowFiles)
    } else if (generatedCode && generatedCode.length > 100) {
      console.log('📝 Using generated code for preview')
      generateLivePreview(generatedCode)
    } else {
      console.log('⚠️ No substantial content for preview yet')
    }
  }, [generatedCode, workflowFiles, Object.keys(workflowFiles).length, componentInstances])

  // NEW: Generate preview from component instances
  const generateComponentBasedPreview = () => {
    try {
      setIsLoading(true)
      console.log('🧩 Generating component-based preview with', componentInstances.length, 'components')
      
      const workflowName = workflow.name || 'Component Workflow'
      const actionName = extractActionName(workflowName) || 'Submit'
      
      const componentHTML = createComponentBasedWorkflowHtml(componentInstances, workflow, actionName)
      setHtmlContent(componentHTML)
      
    } catch (error) {
      console.error('Error generating component-based preview:', error)
      setHtmlContent(createErrorHtml())
    } finally {
      setIsLoading(false)
    }
  }

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

  // Helper functions to generate step content
  const generateStep1Form = (workflow: Partial<Workflow>) => {
    const workflowName = workflow.name || 'Form'
    const isFeedback = workflowName.toLowerCase().includes('feedback')
    
    if (isFeedback) {
      return `
        <div class="container">
          <h2>📝 Step 1: Feedback Collection</h2>
          <form id="feedbackForm" class="workflow-form">
            <div class="form-group">
              <label for="customerName">Customer Name *</label>
              <input type="text" id="customerName" name="customerName" required>
            </div>
            
            <div class="form-group">
              <label for="email">Email Address *</label>
              <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
              <label for="product">Product/Service *</label>
              <select id="product" name="product" required>
                <option value="">Select Product/Service</option>
                <option value="website">Website</option>
                <option value="app">Mobile App</option>
                <option value="support">Customer Support</option>
                <option value="billing">Billing</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="rating">Overall Rating *</label>
              <select id="rating" name="rating" required>
                <option value="">Select Rating</option>
                <option value="5">⭐⭐⭐⭐⭐ Excellent (5)</option>
                <option value="4">⭐⭐⭐⭐ Good (4)</option>
                <option value="3">⭐⭐⭐ Average (3)</option>
                <option value="2">⭐⭐ Poor (2)</option>
                <option value="1">⭐ Very Poor (1)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="comments">Feedback Comments *</label>
              <textarea id="comments" name="comments" rows="4" required placeholder="Please share your detailed feedback..."></textarea>
            </div>
            
            <div class="form-group">
              <label for="recommend">Would you recommend us to others?</label>
              <div class="radio-group">
                <label><input type="radio" name="recommend" value="yes" required> Yes</label>
                <label><input type="radio" name="recommend" value="no" required> No</label>
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary">Submit Feedback</button>
          </form>
        </div>
      `
    }
    
    return `
      <div class="container">
        <h2>📝 Step 1: Data Collection</h2>
        <form class="workflow-form">
          <div class="form-group">
            <label for="name">Name *</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" required>
          </div>
          <button type="submit" class="btn btn-primary">Submit</button>
        </form>
      </div>
    `
  }

  const generateStep2Review = (workflow: Partial<Workflow>) => {
    const workflowName = workflow.name || 'Form'
    const isFeedback = workflowName.toLowerCase().includes('feedback')
    
    if (isFeedback) {
      return `
        <div class="container">
          <h2>👥 Step 2: Team Review</h2>
          <div class="review-section">
            <div class="review-item">
              <h3>Submitted Feedback</h3>
              <div class="data-display">
                <p><strong>Customer:</strong> John Smith (john.smith@email.com)</p>
                <p><strong>Product:</strong> Website</p>
                <p><strong>Rating:</strong> ⭐⭐⭐⭐ Good (4/5)</p>
                <p><strong>Comments:</strong> "The website is user-friendly but could use better search functionality. Overall satisfied with the service."</p>
                <p><strong>Recommendation:</strong> Yes</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="review-actions">
              <h4>Review Decision</h4>
              <div class="action-buttons">
                <button class="btn btn-success">✓ Forward to Response Team</button>
                <button class="btn btn-warning">⚠ Request More Information</button>
                <button class="btn btn-danger">✗ Mark as Invalid</button>
              </div>
              
              <div class="form-group">
                <label for="reviewNotes">Review Notes</label>
                <textarea id="reviewNotes" rows="3" placeholder="Add internal notes about this feedback..."></textarea>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    return `
      <div class="container">
        <h2>👥 Step 2: Team Review</h2>
        <p>Review submitted information and make decisions.</p>
      </div>
    `
  }

  const generateStep3Approval = (workflow: Partial<Workflow>) => {
    const workflowName = workflow.name || 'Form'
    const isFeedback = workflowName.toLowerCase().includes('feedback')
    
    if (isFeedback) {
      return `
        <div class="container">
          <h2>✅ Step 3: Response Approval</h2>
          <div class="approval-section">
            <div class="feedback-summary">
              <h3>Feedback Summary</h3>
              <div class="summary-card">
                <p><strong>Customer:</strong> John Smith</p>
                <p><strong>Rating:</strong> 4/5 stars</p>
                <p><strong>Issue Type:</strong> Feature Request (Search functionality)</p>
                <p><strong>Priority:</strong> Medium</p>
              </div>
            </div>
            
            <div class="response-draft">
              <h4>Proposed Response</h4>
              <div class="response-preview">
                <p>Dear John,</p>
                <p>Thank you for your valuable feedback about our website. We're pleased to hear you find it user-friendly overall.</p>
                <p>Regarding the search functionality, we're actively working on improvements and will include your suggestions in our next update planned for next quarter.</p>
                <p>We appreciate your continued business and recommendation!</p>
                <p>Best regards,<br>Customer Success Team</p>
              </div>
            </div>
            
            <div class="approval-actions">
              <h4>Approval Decision</h4>
              <div class="action-buttons">
                <button class="btn btn-success">✓ Approve Response</button>
                <button class="btn btn-warning">📝 Request Revision</button>
                <button class="btn btn-danger">✗ Reject</button>
              </div>
              
              <div class="form-group">
                <label for="approvalComments">Approval Comments</label>
                <textarea id="approvalComments" rows="2" placeholder="Any specific instructions or feedback..."></textarea>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    return `
      <div class="container">
        <h2>✅ Step 3: Approval</h2>
        <p>Final approval and sign-off process.</p>
      </div>
    `
  }

  const generateStep4FollowUp = (workflow: Partial<Workflow>) => {
    const workflowName = workflow.name || 'Form'
    const isFeedback = workflowName.toLowerCase().includes('feedback')
    
    if (isFeedback) {
      return `
        <div class="container">
          <h2>🔄 Step 4: Follow-up & Integration</h2>
          <div class="followup-section">
            <div class="integration-status">
              <h3>System Integration</h3>
              <div class="status-list">
                <div class="status-item completed">
                  <span class="status-icon">✅</span>
                  <span>CRM Updated - Customer record enhanced</span>
                </div>
                <div class="status-item completed">
                  <span class="status-icon">✅</span>
                  <span>Analytics Platform - Feedback logged</span>
                </div>
                <div class="status-item completed">
                  <span class="status-icon">✅</span>
                  <span>Response Sent - Customer notified</span>
                </div>
                <div class="status-item pending">
                  <span class="status-icon">⏳</span>
                  <span>Product Team - Feature request logged</span>
                </div>
              </div>
            </div>
            
            <div class="followup-actions">
              <h4>Follow-up Actions</h4>
              <div class="action-list">
                <div class="action-item">
                  <input type="checkbox" checked disabled>
                  <span>Send confirmation email to customer</span>
                </div>
                <div class="action-item">
                  <input type="checkbox" checked disabled>
                  <span>Update customer satisfaction score</span>
                </div>
                <div class="action-item">
                  <input type="checkbox">
                  <span>Schedule follow-up call (if rating < 3)</span>
                </div>
                <div class="action-item">
                  <input type="checkbox">
                  <span>Add to monthly feedback report</span>
                </div>
              </div>
            </div>
            
            <div class="metrics">
              <h4>Workflow Metrics</h4>
              <div class="metrics-grid">
                <div class="metric">
                  <div class="metric-value">2.5 hrs</div>
                  <div class="metric-label">Processing Time</div>
                </div>
                <div class="metric">
                  <div class="metric-value">3</div>
                  <div class="metric-label">People Involved</div>
                </div>
                <div class="metric">
                  <div class="metric-value">4/5</div>
                  <div class="metric-label">Customer Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    return `
      <div class="container">
        <h2>🔄 Step 4: Follow-up & Integration</h2>
        <p>System integration and follow-up actions.</p>
      </div>
    `
  }

  const createLiveWorkflowHtml = (indexHtml: string, submitHtml: string, css: string, workflow: Partial<Workflow>) => {
    // Extract workflow name and make it dynamic
    const workflowName = workflow.name || 'Workflow'
    const actionName = extractActionName(workflowName) || 'Submit'
    
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
        
        /* Workflow Step Styling */
        .workflow-form {
          max-width: 600px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }
        .radio-group {
          display: flex;
          gap: 20px;
        }
        .radio-group label {
          display: flex;
          align-items: center;
          font-weight: normal;
        }
        .review-section, .approval-section, .followup-section {
          max-width: 800px;
          margin: 0 auto;
        }
        .data-display {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #007bff;
        }
        .action-buttons {
          display: flex;
          gap: 10px;
          margin: 15px 0;
          flex-wrap: wrap;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-primary { background: #007bff; color: white; }
        .summary-card {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin: 10px 0;
        }
        .response-preview {
          background: #f1f8e9;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #c8e6c9;
          font-style: italic;
          line-height: 1.6;
        }
        .status-list {
          margin: 15px 0;
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          margin: 5px 0;
          background: #f8f9fa;
          border-radius: 6px;
        }
        .status-item.completed {
          background: #d4edda;
        }
        .status-item.pending {
          background: #fff3cd;
        }
        .action-list {
          margin: 15px 0;
        }
        .action-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          margin: 5px 0;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .metric {
          text-align: center;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
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
          <div class="nav-tab" onclick="showTab('step1')">📝 Step 1: ${actionName}</div>
          <div class="nav-tab" onclick="showTab('step2')">👥 Step 2: Team Review</div>
          <div class="nav-tab" onclick="showTab('step3')">✅ Step 3: Approval</div>
          <div class="nav-tab" onclick="showTab('step4')">🔄 Step 4: Follow-up</div>
        </div>
        
        <div id="home-tab" class="tab-content active">
          ${indexHtml.replace(/<html[^>]*>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '')}
        </div>
        
        <div id="step1-tab" class="tab-content">
          ${submitHtml ? submitHtml.replace(/<html[^>]*>|<\/html>|<head>.*?<\/head>|<body[^>]*>|<\/body>/gs, '') : generateStep1Form(workflow)}
        </div>
        
        <div id="step2-tab" class="tab-content">
          ${generateStep2Review(workflow)}
        </div>
        
        <div id="step3-tab" class="tab-content">
          ${generateStep3Approval(workflow)}
        </div>
        
        <div id="step4-tab" class="tab-content">
          ${generateStep4FollowUp(workflow)}
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

// NEW: Create component-based workflow HTML
function createComponentBasedWorkflowHtml(
  componentInstances: any[], 
  workflow: Partial<Workflow>, 
  actionName: string
): string {
  const workflowName = workflow.name || 'Component Workflow'
  
  // Group components by step
  const stepComponents = {
    capture: componentInstances.filter(c => c.stepType === 'capture'),
    review: componentInstances.filter(c => c.stepType === 'review'), 
    approval: componentInstances.filter(c => c.stepType === 'approval'),
    update: componentInstances.filter(c => c.stepType === 'update')
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live Workflow Preview - ${workflowName}</title>
      <style>
        body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .live-preview-banner {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 20px;
          margin: -20px -20px 20px -20px;
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
        .workflow-step-content {
          max-width: 600px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-primary { background: #007bff; color: white; }
        .button-group {
          display: flex;
          gap: 10px;
          margin: 15px 0;
        }
        .approval-actions {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }
        .component-placeholder {
          padding: 20px;
          background: #f8f9fa;
          border: 1px dashed #ccc;
          border-radius: 6px;
          text-align: center;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="live-preview-banner">
        <div>🔴 LIVE PREVIEW - ${workflowName}</div>
        <div>✨ Component-Based Workflow</div>
      </div>
      
      <div class="live-nav">
        <div class="nav-tabs">
          <div class="nav-tab active" onclick="showTab('home')">🏠 Home</div>
          ${stepComponents.capture.length > 0 ? `<div class="nav-tab" onclick="showTab('step1')">📝 Step 1: ${actionName}</div>` : ''}
          ${stepComponents.review.length > 0 ? `<div class="nav-tab" onclick="showTab('step2')">👥 Step 2: Review</div>` : ''}
          ${stepComponents.approval.length > 0 ? `<div class="nav-tab" onclick="showTab('step3')">✅ Step 3: Approval</div>` : ''}
          ${stepComponents.update.length > 0 ? `<div class="nav-tab" onclick="showTab('step4')">🔄 Step 4: Integration</div>` : ''}
        </div>
        
        <div id="home-tab" class="tab-content active">
          <div class="workflow-step-content">
            <h2>🏠 ${workflowName} Overview</h2>
            <p>This workflow consists of ${Object.values(stepComponents).filter(steps => steps.length > 0).length} steps with ${componentInstances.length} total components.</p>
            
            <div style="margin: 20px 0;">
              <h3>Workflow Steps:</h3>
              <ul>
                ${stepComponents.capture.length > 0 ? `<li><strong>Step 1: Data Capture</strong> - ${stepComponents.capture.length} components</li>` : ''}
                ${stepComponents.review.length > 0 ? `<li><strong>Step 2: Review</strong> - ${stepComponents.review.length} components</li>` : ''}
                ${stepComponents.approval.length > 0 ? `<li><strong>Step 3: Approval</strong> - ${stepComponents.approval.length} components</li>` : ''}
                ${stepComponents.update.length > 0 ? `<li><strong>Step 4: Integration</strong> - ${stepComponents.update.length} components</li>` : ''}
              </ul>
            </div>
          </div>
        </div>
        
        ${stepComponents.capture.length > 0 ? `
          <div id="step1-tab" class="tab-content">
            ${workflowComponentActions.generateLivePreviewHTML('capture')}
          </div>
        ` : ''}
        
        ${stepComponents.review.length > 0 ? `
          <div id="step2-tab" class="tab-content">
            ${workflowComponentActions.generateLivePreviewHTML('review')}
          </div>
        ` : ''}
        
        ${stepComponents.approval.length > 0 ? `
          <div id="step3-tab" class="tab-content">
            ${workflowComponentActions.generateLivePreviewHTML('approval')}
          </div>
        ` : ''}
        
        ${stepComponents.update.length > 0 ? `
          <div id="step4-tab" class="tab-content">
            ${workflowComponentActions.generateLivePreviewHTML('update')}
          </div>
        ` : ''}
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
              alert('✅ Form submitted successfully!\\n\\nThis is a component-based preview showing the workflow structure.');
              return false;
            });
          });
        });
      </script>
    </body>
    </html>
  `
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

// Helper function to extract action name from workflow name
function extractActionName(workflowName: string): string {
  if (workflowName.toLowerCase().includes('feedback')) return 'Submit Feedback'
  if (workflowName.toLowerCase().includes('expense')) return 'Submit Expense'
  if (workflowName.toLowerCase().includes('approval')) return 'Submit Request'
  if (workflowName.toLowerCase().includes('onboarding')) return 'Start Onboarding'
  if (workflowName.toLowerCase().includes('review')) return 'Submit Review'
  
  // Default pattern
  const words = workflowName.split(' ')
  return `Submit ${words[0] || 'Form'}`
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
  
  // Subscribe to component instances and workflow styling for auto-regeneration
  const componentInstances = useStore($componentInstances)
  const workflowStyling = useStore($workflowStyling)

  // Auto-regenerate code when component instances or styling changes
  useEffect(() => {
    if (componentInstances.length > 0) {
      console.log('🔄 Component instances changed, auto-regenerating workflow code')
      try {
        const { html, css } = workflowComponentActions.regenerateWorkflowCode()
        setGeneratedCode(html)
        setWorkflowFiles(prev => ({
          ...prev,
          'index.html': html,
          'style.css': css
        }))
        console.log('✅ Auto-regeneration complete')
      } catch (error) {
        console.error('❌ Auto-regeneration failed:', error)
      }
    }
  }, [componentInstances, workflowStyling])

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

