import type { Workflow } from '~/types/database';

export function generateDatabaseSchema(workflow: Workflow): string {
  const captureFields = workflow.config?.steps
    ?.find(s => s.type === 'capture')
    ?.config?.fields || [];
    
  return `import fs from 'fs';
import path from 'path';

// Simple JSON-based database for WebContainer compatibility
export class Database {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'data.json');
    this.init();
  }
  
  init() {
    // Initialize JSON database file if it doesn't exist
    if (!fs.existsSync(this.dbPath)) {
      const initialData = {
        submissions: [],
        files: [],
        auditLog: []
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2));
      console.log('📄 Database initialized:', this.dbPath);
    }
  }
  
  readData() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read database:', error);
      return { submissions: [], files: [], auditLog: [] };
    }
  }
  
  writeData(data) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to write database:', error);
    }
  }
  
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  async createSubmission(submissionData) {
    const data = this.readData();
    
    const submission = {
      id: this.generateId(),
      workflowId: submissionData.workflowId || 'default',
      status: 'submitted',
      ${captureFields.map(field => `${field.name}: submissionData.data['${field.name}'] || null,`).join('\n      ')}
      submittedAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      approvalComments: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.submissions.push(submission);
    
    // Save files if any
    if (submissionData.files && submissionData.files.length > 0) {
      for (const file of submissionData.files) {
        data.files.push({
          id: this.generateId(),
          submissionId: submission.id,
          filename: file,
          originalName: file,
          uploadedAt: new Date().toISOString()
        });
      }
    }
    
    // Log the action
    this.logAction(data, submission.id, 'created', 'system', 'Submission created');
    
    this.writeData(data);
    console.log('📝 Submission created:', submission.id);
    
    return submission;
  }
  
  async getSubmission(id) {
    const data = this.readData();
    const submission = data.submissions.find(s => s.id === id);
    
    if (submission) {
      submission.files = data.files.filter(f => f.submissionId === id);
    }
    
    return submission;
  }
  
  async getAllSubmissions() {
    const data = this.readData();
    return data.submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  async updateSubmission(id, updates) {
    const data = this.readData();
    const submissionIndex = data.submissions.findIndex(s => s.id === id);
    
    if (submissionIndex === -1) {
      throw new Error('Submission not found');
    }
    
    data.submissions[submissionIndex] = {
      ...data.submissions[submissionIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Log the update
    this.logAction(data, id, 'updated', updates.approvedBy || 'system', JSON.stringify(updates));
    
    this.writeData(data);
    
    return data.submissions[submissionIndex];
  }
  
  logAction(data, submissionId, action, user, details) {
    data.auditLog.push({
      id: this.generateId(),
      submissionId,
      action,
      user,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  async getAuditLog(submissionId) {
    const data = this.readData();
    return data.auditLog
      .filter(log => log.submissionId === submissionId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}`;
}