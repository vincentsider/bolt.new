import type { Workflow, WorkflowStep } from '~/types/database';
import { generateWorkflowApplication } from './generators';

/**
 * Parse workflow configuration from generated WebContainer files
 */
export function parseWorkflowFromWebContainer(files: Record<string, string>): Workflow | null {
  try {
    const serverFile = files['server.js'];
    const engineFile = files['lib/workflow-engine.js'];
    
    if (!serverFile || !engineFile) {
      console.log('Missing required files for parsing workflow');
      return null;
    }
    
    console.log('🔍 Parsing workflow from WebContainer files...');
    
    // Extract workflow configuration from engine file
    const workflowConfig = extractWorkflowConfigFromEngine(engineFile);
    
    // Extract additional metadata from server file
    const serverMetadata = extractServerMetadata(serverFile);
    
    if (!workflowConfig) {
      console.log('Could not extract workflow config from engine file');
      return null;
    }
    
    return {
      id: '',
      name: serverMetadata.name || 'Parsed Workflow',
      description: serverMetadata.description || 'Workflow parsed from WebContainer',
      config: workflowConfig,
      status: 'draft',
      organization_id: '',
      user_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error parsing workflow from WebContainer:', error);
    return null;
  }
}

/**
 * Extract workflow configuration from the workflow engine file
 */
function extractWorkflowConfigFromEngine(engineFileContent: string): any {
  try {
    // Look for workflow configuration in the constructor
    const constructorMatch = engineFileContent.match(/constructor\(config\)\s*{[\s\S]*?this\.config\s*=\s*config/);
    
    if (!constructorMatch) {
      // Try to find a configuration object definition
      const configMatch = engineFileContent.match(/const\s+workflowConfig\s*=\s*({[\s\S]*?});/);
      if (configMatch) {
        try {
          return JSON.parse(configMatch[1]);
        } catch (e) {
          console.log('Could not parse workflow config JSON');
        }
      }
      
      // Generate default config based on detected patterns
      return generateDefaultConfigFromCode(engineFileContent);
    }
    
    // Extract steps from the engine methods
    const steps = extractStepsFromEngine(engineFileContent);
    
    return {
      steps,
      triggers: [],
      settings: {
        notificationChannels: [],
        errorHandling: 'stop',
        maxRetries: 3,
        timeoutMinutes: 60
      }
    };
    
  } catch (error) {
    console.error('Error extracting workflow config:', error);
    return null;
  }
}

/**
 * Extract workflow steps from engine methods
 */
function extractStepsFromEngine(engineContent: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  
  // Look for capture step
  if (engineContent.includes('executeCaptureStep')) {
    const captureStep = extractCaptureStepConfig(engineContent);
    if (captureStep) steps.push(captureStep);
  }
  
  // Look for approval step
  if (engineContent.includes('executeApprovalStep')) {
    const approvalStep = extractApprovalStepConfig(engineContent);
    if (approvalStep) steps.push(approvalStep);
  }
  
  // Look for review step
  if (engineContent.includes('executeReviewStep')) {
    const reviewStep = extractReviewStepConfig(engineContent);
    if (reviewStep) steps.push(reviewStep);
  }
  
  // Look for update step
  if (engineContent.includes('executeUpdateStep')) {
    const updateStep = extractUpdateStepConfig(engineContent);
    if (updateStep) steps.push(updateStep);
  }
  
  return steps;
}

/**
 * Extract capture step configuration from engine code
 */
function extractCaptureStepConfig(engineContent: string): WorkflowStep | null {
  try {
    // Look for field validation patterns
    const fieldPatterns = [
      /required\s+&&\s+!data\.data\[['"`](\w+)['"`]\]/g,
      /field\.name\s*===\s*['"`](\w+)['"`]/g,
      /data\.data\[['"`](\w+)['"`]\]/g
    ];
    
    const fields: any[] = [];
    const fieldNames = new Set<string>();
    
    // Extract field names from validation patterns
    for (const pattern of fieldPatterns) {
      let match;
      while ((match = pattern.exec(engineContent)) !== null) {
        const fieldName = match[1];
        if (fieldName && !fieldNames.has(fieldName)) {
          fieldNames.add(fieldName);
          
          // Determine field type from validation patterns
          const fieldType = determineFieldType(engineContent, fieldName);
          
          fields.push({
            name: fieldName,
            label: formatFieldLabel(fieldName),
            type: fieldType,
            required: engineContent.includes(`required && !data.data['${fieldName}']`),
            validation: {}
          });
        }
      }
    }
    
    return {
      id: 'step-1-capture',
      name: 'Data Capture',
      type: 'capture',
      description: 'Collect required information',
      config: { fields },
      nextSteps: [{ stepId: 'step-2-review' }]
    };
  } catch (error) {
    console.error('Error extracting capture step:', error);
    return null;
  }
}

/**
 * Extract approval step configuration
 */
function extractApprovalStepConfig(engineContent: string): WorkflowStep | null {
  return {
    id: 'step-3-approval',
    name: 'Approval Decision',
    type: 'approve',
    description: 'Review and approve submissions',
    config: {
      approvers: ['manager'],
      conditions: []
    },
    nextSteps: [{ stepId: 'step-4-update' }]
  };
}

/**
 * Extract review step configuration
 */
function extractReviewStepConfig(engineContent: string): WorkflowStep | null {
  return {
    id: 'step-2-review',
    name: 'Review & Validation',
    type: 'review',
    description: 'Review submitted data',
    config: {
      reviewers: ['reviewer'],
      instructions: 'Review the submitted information'
    },
    nextSteps: [{ stepId: 'step-3-approval' }]
  };
}

/**
 * Extract update step configuration
 */
function extractUpdateStepConfig(engineContent: string): WorkflowStep | null {
  return {
    id: 'step-4-update',
    name: 'System Integration',
    type: 'update',
    description: 'Update systems and send notifications',
    config: {
      integrations: [],
      notifications: true
    },
    nextSteps: []
  };
}

/**
 * Determine field type from code patterns
 */
function determineFieldType(engineContent: string, fieldName: string): string {
  if (engineContent.includes(`${fieldName}`) && engineContent.includes('email')) {
    return 'email';
  }
  if (engineContent.includes(`parseFloat(`) && engineContent.includes(fieldName)) {
    return 'number';
  }
  if (engineContent.includes('file') && engineContent.includes(fieldName)) {
    return 'file';
  }
  if (engineContent.includes('date') && engineContent.includes(fieldName)) {
    return 'date';
  }
  return 'text';
}

/**
 * Format field name to human-readable label
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Extract server metadata (name, description) from server.js
 */
function extractServerMetadata(serverContent: string): { name?: string; description?: string } {
  const metadata: { name?: string; description?: string } = {};
  
  // Look for workflow name in console.log or comments
  const nameMatch = serverContent.match(/console\.log\([^)]*Workflow[^)]*:\s*([^`'"]+)/i) ||
                   serverContent.match(/\/\*\*?\s*([^*]+)\s*\*\//);
  
  if (nameMatch) {
    metadata.name = nameMatch[1].trim().replace(/['"]/g, '');
  }
  
  return metadata;
}

/**
 * Generate default configuration when parsing fails
 */
function generateDefaultConfigFromCode(engineContent: string): any {
  const hasCapture = engineContent.includes('executeCaptureStep');
  const hasApproval = engineContent.includes('executeApprovalStep');
  const hasReview = engineContent.includes('executeReviewStep');
  const hasUpdate = engineContent.includes('executeUpdateStep');
  
  const steps = [];
  
  if (hasCapture) {
    steps.push({
      id: 'step-1-capture',
      name: 'Data Capture',
      type: 'capture',
      description: 'Collect required information',
      config: { fields: [] },
      nextSteps: hasReview ? [{ stepId: 'step-2-review' }] : hasApproval ? [{ stepId: 'step-3-approval' }] : []
    });
  }
  
  if (hasReview) {
    steps.push({
      id: 'step-2-review',
      name: 'Review',
      type: 'review',
      description: 'Review submitted data',
      config: {},
      nextSteps: hasApproval ? [{ stepId: 'step-3-approval' }] : []
    });
  }
  
  if (hasApproval) {
    steps.push({
      id: 'step-3-approval',
      name: 'Approval',
      type: 'approve',
      description: 'Approve submission',
      config: {},
      nextSteps: hasUpdate ? [{ stepId: 'step-4-update' }] : []
    });
  }
  
  if (hasUpdate) {
    steps.push({
      id: 'step-4-update',
      name: 'Update',
      type: 'update',
      description: 'Update systems',
      config: {},
      nextSteps: []
    });
  }
  
  return {
    steps,
    triggers: [],
    settings: {}
  };
}

/**
 * Regenerate WebContainer files when workflow config changes
 */
export async function regenerateWebContainerFiles(
  workflow: Workflow,
  webcontainerRunner: any
): Promise<Record<string, string>> {
  try {
    console.log('🔄 Regenerating WebContainer files from workflow config...');
    
    // Generate new application files
    const newFiles = generateWorkflowApplication(workflow);
    
    // Update WebContainer with new files
    if (webcontainerRunner) {
      await webcontainerRunner.mountWorkflow(newFiles);
      console.log('✅ WebContainer files updated and remounted');
    }
    
    return newFiles;
  } catch (error) {
    console.error('Error regenerating WebContainer files:', error);
    throw error;
  }
}

/**
 * Hot update specific files in WebContainer without full remount
 */
export async function hotUpdateWebContainerFile(
  filePath: string,
  content: string,
  webcontainerRunner: any
): Promise<void> {
  try {
    console.log(`🔥 Hot updating ${filePath} in WebContainer...`);
    
    if (webcontainerRunner) {
      await webcontainerRunner.updateFile(filePath, content);
      
      // Restart server for certain file types
      if (filePath.includes('server.js') || filePath.includes('lib/')) {
        await webcontainerRunner.restartServer();
      }
      
      console.log(`✅ Hot update complete for ${filePath}`);
    }
  } catch (error) {
    console.error(`Error hot updating ${filePath}:`, error);
    throw error;
  }
}