import type { Workflow } from '~/types/database';

export function generateWorkflowEngine(workflow: Workflow): string {
  return `export class WorkflowEngine {
  constructor(config) {
    this.config = config;
    this.currentStep = 0;
    this.state = {};
  }
  
  async executeStep(stepType, data) {
    console.log(\`Executing \${stepType} step with data:\`, data);
    
    const step = this.config.steps.find(s => s.type === stepType);
    if (!step) {
      throw new Error(\`Step type '\${stepType}' not found in workflow\`);
    }
    
    // Validate step data
    if (stepType === 'capture') {
      return await this.executeCaptureStep(step, data);
    } else if (stepType === 'approve') {
      return await this.executeApprovalStep(step, data);
    } else if (stepType === 'review') {
      return await this.executeReviewStep(step, data);
    } else if (stepType === 'update') {
      return await this.executeUpdateStep(step, data);
    }
    
    throw new Error(\`Unknown step type: \${stepType}\`);
  }
  
  async executeCaptureStep(step, data) {
    // Validate required fields
    const fields = step.config?.fields || [];
    const errors = [];
    
    for (const field of fields) {
      if (field.required && !data.data[field.name]) {
        errors.push(\`\${field.label || field.name} is required\`);
      }
      
      // Type validation
      if (data.data[field.name] && field.type === 'email') {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(data.data[field.name])) {
          errors.push(\`\${field.label || field.name} must be a valid email\`);
        }
      }
      
      if (data.data[field.name] && field.type === 'number') {
        const num = parseFloat(data.data[field.name]);
        if (isNaN(num)) {
          errors.push(\`\${field.label || field.name} must be a number\`);
        }
        if (field.min !== undefined && num < field.min) {
          errors.push(\`\${field.label || field.name} must be at least \${field.min}\`);
        }
        if (field.max !== undefined && num > field.max) {
          errors.push(\`\${field.label || field.name} must be at most \${field.max}\`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    // Process any business logic
    const processedData = await this.processBusinessLogic(step, data);
    
    return {
      success: true,
      stepId: step.id,
      data: processedData,
      nextStep: step.nextSteps?.[0]?.stepId
    };
  }
  
  async executeApprovalStep(step, data) {
    const { decision, comments, approvedBy } = data;
    
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      throw new Error('Invalid approval decision');
    }
    
    // Check approval conditions
    const conditions = step.config?.conditions || [];
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, data)) {
        throw new Error(\`Condition not met: \${condition.description || 'Unknown condition'}\`);
      }
    }
    
    return {
      success: true,
      stepId: step.id,
      decision,
      comments,
      approvedBy,
      timestamp: new Date()
    };
  }
  
  async executeReviewStep(step, data) {
    // Review logic
    return {
      success: true,
      stepId: step.id,
      reviewedBy: data.reviewedBy,
      reviewNotes: data.notes,
      timestamp: new Date()
    };
  }
  
  async executeUpdateStep(step, data) {
    // Integration update logic
    const integrations = step.config?.integrations || [];
    const results = [];
    
    for (const integration of integrations) {
      try {
        const result = await this.executeIntegration(integration, data);
        results.push({ integration: integration.name, success: true, result });
      } catch (error) {
        results.push({ integration: integration.name, success: false, error: error.message });
      }
    }
    
    return {
      success: true,
      stepId: step.id,
      integrationResults: results,
      timestamp: new Date()
    };
  }
  
  async processBusinessLogic(step, data) {
    // Apply any transformation rules
    const processed = { ...data.data };
    
    // Example: Auto-calculate fields
    if (step.config?.calculations) {
      for (const calc of step.config.calculations) {
        if (calc.type === 'sum') {
          processed[calc.target] = calc.fields.reduce((sum, field) => {
            return sum + (parseFloat(processed[field]) || 0);
          }, 0);
        }
      }
    }
    
    return processed;
  }
  
  async evaluateCondition(condition, data) {
    // Evaluate workflow conditions
    switch (condition.type) {
      case 'field_value':
        const fieldValue = data[condition.field];
        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'greater_than':
            return parseFloat(fieldValue) > parseFloat(condition.value);
          case 'less_than':
            return parseFloat(fieldValue) < parseFloat(condition.value);
          case 'contains':
            return String(fieldValue).includes(condition.value);
          default:
            return true;
        }
      
      case 'role':
        return data.approvedBy && condition.roles.includes(data.userRole);
      
      default:
        return true;
    }
  }
  
  async executeIntegration(integration, data) {
    // Placeholder for integration execution
    console.log(\`Executing integration: \${integration.name}\`);
    
    // In real implementation, this would call external APIs
    return {
      message: \`Integration \${integration.name} executed successfully\`,
      timestamp: new Date()
    };
  }
  
  getNextStep(currentStepId) {
    const currentStep = this.config.steps.find(s => s.id === currentStepId);
    if (!currentStep || !currentStep.nextSteps || currentStep.nextSteps.length === 0) {
      return null;
    }
    
    // For now, return first next step
    // In advanced implementation, this could evaluate conditions
    return currentStep.nextSteps[0].stepId;
  }
  
  async validateWorkflow() {
    // Validate the entire workflow configuration
    const errors = [];
    
    if (!this.config.steps || this.config.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }
    
    // Check for required step types
    const hasCapture = this.config.steps.some(s => s.type === 'capture');
    if (!hasCapture) {
      errors.push('Workflow must have at least one capture step');
    }
    
    // Validate step connections
    for (const step of this.config.steps) {
      if (step.nextSteps) {
        for (const next of step.nextSteps) {
          const nextStep = this.config.steps.find(s => s.id === next.stepId);
          if (!nextStep) {
            errors.push(\`Step \${step.id} references non-existent next step: \${next.stepId}\`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}`;
}