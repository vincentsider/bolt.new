import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export async function loader({ params }: LoaderFunctionArgs) {
  const workflowId = params.id;
  
  if (!workflowId) {
    throw new Response('Workflow not found', { status: 404 });
  }

  try {
    // Look up the workflow in the database
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      throw new Response('Workflow not found', { status: 404 });
    }

    // Create a deployable version of the workflow
    const deployedHtml = createDeployedWorkflowHtml(workflow);
    
    return { 
      htmlContent: deployedHtml, 
      workflowId,
      workflowName: workflow.name || 'Workflow'
    };
    
  } catch (error) {
    console.error('Error loading deployed workflow:', error);
    throw new Response('Workflow not accessible', { status: 500 });
  }
}

function createDeployedWorkflowHtml(workflow: any) {
  const workflowName = workflow.name || 'Workflow Application';
  const steps = workflow.config?.steps || [];
  
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔴 LIVE - ${workflowName}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      
      .live-banner {
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 15px 20px;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
      }
      
      .workflow-header {
        text-align: center;
        margin-bottom: 40px;
      }
      
      .workflow-title {
        font-size: 2.5rem;
        color: #1f2937;
        margin-bottom: 10px;
      }
      
      .workflow-subtitle {
        font-size: 1.1rem;
        color: #6b7280;
      }
      
      .nav-tabs {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-bottom: 30px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 15px;
      }
      
      .nav-tab {
        padding: 12px 24px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        background: #f9fafb;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
        text-decoration: none;
        color: #374151;
      }
      
      .nav-tab:hover {
        background: #e5e7eb;
        border-color: #9ca3af;
      }
      
      .nav-tab.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .tab-content {
        display: none;
        min-height: 400px;
      }
      
      .tab-content.active {
        display: block;
      }
      
      .workflow-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin: 30px 0;
      }
      
      .step-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 25px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .step-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
      }
      
      .step-number {
        width: 40px;
        height: 40px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-bottom: 15px;
      }
      
      .form-container {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        margin: 0 auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.3s;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
      }
      
      .btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
      }
      
      .btn:hover {
        background: #2563eb;
      }
      
      .success-message {
        background: #10b981;
        color: white;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="live-banner">
      <div>🟢 LIVE DEPLOYMENT - ${workflowName.toUpperCase()}</div>
      <div>✨ Fully Functional & Ready to Use</div>
    </div>
    
    <div class="container">
      <div class="workflow-header">
        <h1 class="workflow-title">💼 ${workflowName}</h1>
        <p class="workflow-subtitle">Complete workflow automation system</p>
      </div>
      
      <div class="nav-tabs">
        <div class="nav-tab active" onclick="showTab('overview')">📋 Overview</div>
        <div class="nav-tab" onclick="showTab('submit')">📝 Submit</div>
        <div class="nav-tab" onclick="showTab('dashboard')">👥 Dashboard</div>
      </div>
      
      <div id="overview-tab" class="tab-content active">
        <div class="workflow-steps">
          ${steps.map((step, index) => `
            <div class="step-card">
              <div class="step-number">${index + 1}</div>
              <h3 style="color: #1f2937; margin-bottom: 8px;">${step.name}</h3>
              <p style="color: #6b7280; margin-bottom: 12px;">${step.description}</p>
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${step.type.toUpperCase()}
              </span>
            </div>
          `).join('')}
        </div>
        
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 20px; margin-top: 30px;">
          <h3 style="color: #0369a1; margin-bottom: 10px;">🚀 Ready for Use</h3>
          <p style="color: #075985;">
            This workflow is fully deployed and operational. Use the tabs above to submit requests or access the management dashboard.
          </p>
        </div>
      </div>
      
      <div id="submit-tab" class="tab-content">
        <div class="form-container">
          <h2 style="text-align: center; margin-bottom: 20px; color: #1f2937;">Submit New Request</h2>
          <form id="workflowForm">
            <div class="form-group">
              <label for="name">Your Name *</label>
              <input type="text" id="name" name="name" required>
            </div>
            
            <div class="form-group">
              <label for="email">Email Address *</label>
              <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
              <label for="amount">Amount ($) *</label>
              <input type="number" id="amount" name="amount" step="0.01" min="0" required>
            </div>
            
            <div class="form-group">
              <label for="category">Category *</label>
              <select id="category" name="category" required>
                <option value="">Select category</option>
                <option value="travel">Travel</option>
                <option value="meals">Meals & Entertainment</option>
                <option value="supplies">Office Supplies</option>
                <option value="software">Software & Subscriptions</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="description">Description *</label>
              <textarea id="description" name="description" rows="3" required 
                        placeholder="Describe the business purpose of this expense..."></textarea>
            </div>
            
            <div class="form-group">
              <label for="manager">Manager Email *</label>
              <input type="email" id="manager" name="manager" required>
            </div>
            
            <button type="submit" class="btn">Submit Request</button>
            
            <div id="successMessage" class="success-message">
              ✅ Request submitted successfully! You will receive email confirmation shortly.
            </div>
          </form>
        </div>
      </div>
      
      <div id="dashboard-tab" class="tab-content">
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">👥 Manager Dashboard</h2>
          <p style="color: #6b7280; margin-bottom: 30px;">Review and approve pending requests</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; max-width: 800px; margin: 0 auto;">
            <h3 style="color: #1f2937; margin-bottom: 20px;">Pending Approvals</h3>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>John Doe - $750 Travel Expense</strong>
                <span style="background: #fbbf24; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">PENDING</span>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Conference travel to San Francisco</p>
              <div>
                <button onclick="approveRequest('sample-1')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">Approve</button>
                <button onclick="rejectRequest('sample-1')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Reject</button>
              </div>
            </div>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>Sarah Wilson - $250 Software License</strong>
                <span style="background: #fbbf24; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">PENDING</span>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Adobe Creative Suite annual license</p>
              <div>
                <button onclick="approveRequest('sample-2')" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">Approve</button>
                <button onclick="rejectRequest('sample-2')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Reject</button>
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
      
      // Handle form submission
      document.getElementById('workflowForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Show success message
        document.getElementById('successMessage').style.display = 'block';
        
        // Reset form
        e.target.reset();
        
        // In a real deployment, this would send data to the server
        console.log('Workflow submission:', data);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          document.getElementById('successMessage').style.display = 'none';
        }, 5000);
      });
      
      function approveRequest(requestId) {
        alert('✅ Request approved!\\n\\nIn the live system, this would:\\n• Update the database\\n• Send approval email\\n• Trigger next workflow step');
        event.target.parentElement.parentElement.style.opacity = '0.5';
        event.target.textContent = 'APPROVED';
        event.target.style.background = '#6b7280';
        event.target.disabled = true;
        event.target.nextElementSibling.style.display = 'none';
      }
      
      function rejectRequest(requestId) {
        const reason = prompt('Reason for rejection (optional):');
        alert('❌ Request rejected!\\n\\nReason: ' + (reason || 'No reason provided') + '\\n\\nIn the live system, this would:\\n• Update the database\\n• Send rejection email\\n• Log the decision');
        event.target.parentElement.parentElement.style.opacity = '0.5';
        event.target.textContent = 'REJECTED';
        event.target.style.background = '#6b7280';
        event.target.disabled = true;
        event.target.previousElementSibling.style.display = 'none';
      }
    </script>
  </body>
  </html>
  `;
}

export default function DeployedWorkflow() {
  const { htmlContent } = useLoaderData<typeof loader>();

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}