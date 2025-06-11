import type { Workflow, WorkflowStep } from '~/types/database';

export function generateWorkflowServer(workflow: Workflow): string {
  const steps = workflow.config?.steps || [];
  const captureStep = steps.find(s => s.type === 'capture');
  const approvalStep = steps.find(s => s.type === 'approve');
  
  return `import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { Database } from './lib/database.js';
import { WorkflowEngine } from './lib/workflow-engine.js';
import { NotificationService } from './lib/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// Initialize services
const db = new Database();
const engine = new WorkflowEngine(${JSON.stringify(workflow.config, null, 2)});
const notifications = new NotificationService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', workflow: '${workflow.name}' });
});

${captureStep ? generateCaptureEndpoint(captureStep) : ''}

${approvalStep ? generateApprovalEndpoint(approvalStep) : ''}

// Get workflow status
app.get('/api/workflow/:id', async (req, res) => {
  try {
    const submission = await db.getSubmission(req.params.id);
    res.json(submission);
  } catch (error) {
    res.status(404).json({ error: 'Submission not found' });
  }
});

// List all submissions
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await db.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(\`🚀 Workflow server running at http://localhost:\${port}\`);
  console.log(\`📋 Workflow: ${workflow.name}\`);
});
`;
}

function generateCaptureEndpoint(step: WorkflowStep): string {
  const fields = step.config?.fields || [];
  
  return `
// Submit workflow data
app.post('/api/workflow/submit', upload.any(), async (req, res) => {
  try {
    console.log('Received submission:', req.body);
    
    // Validate required fields
    const errors = [];
    ${fields.filter(f => f.required).map(field => `
    if (!req.body['${field.name}']) {
      errors.push('${field.label || field.name} is required');
    }`).join('')}
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    // Execute capture step
    const result = await engine.executeStep('capture', {
      data: req.body,
      files: req.files || []
    });
    
    // Save to database
    const submission = await db.createSubmission({
      workflowId: '${step.id}',
      data: req.body,
      files: req.files?.map(f => f.filename) || [],
      status: 'submitted',
      createdAt: new Date()
    });
    
    // Send notifications
    await notifications.sendSubmissionConfirmation(submission);
    
    res.json({ 
      success: true, 
      id: submission.id,
      message: 'Workflow submitted successfully!'
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(400).json({ error: error.message });
  }
});`;
}

function generateApprovalEndpoint(step: WorkflowStep): string {
  return `
// Approve or reject submission
app.post('/api/workflow/:id/approve', async (req, res) => {
  try {
    const { decision, comments } = req.body;
    
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }
    
    // Get submission
    const submission = await db.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Execute approval step
    const result = await engine.executeStep('approve', {
      submissionId: req.params.id,
      decision,
      comments,
      approvedBy: req.body.approverEmail || 'system'
    });
    
    // Update submission status
    await db.updateSubmission(req.params.id, {
      status: decision,
      approvalComments: comments,
      approvedAt: new Date(),
      approvedBy: req.body.approverEmail
    });
    
    // Send notifications
    await notifications.sendApprovalNotification(submission, decision, comments);
    
    res.json({ 
      success: true, 
      decision,
      message: \`Submission \${decision}\`
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(400).json({ error: error.message });
  }
});`;
}