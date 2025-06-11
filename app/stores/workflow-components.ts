import { atom, map } from 'nanostores';

// Component instance data that both Live Preview and 4-Step Builder share
export interface ComponentInstance {
  id: string;
  workflowId: string;
  componentId: string;
  stepType: 'capture' | 'review' | 'approval' | 'update';
  label: string;
  required: boolean;
  config: Record<string, any>;
  validation: Record<string, any>;
  position: { step: number; order: number };
  dataMapping: Record<string, any>;
  styling: {
    width?: string;
    color?: string;
    fontSize?: string;
    cssClass?: string;
    backgroundColor?: string;
    borderColor?: string;
    padding?: string;
    margin?: string;
  };
}

// Current workflow's component instances
export const $componentInstances = map<ComponentInstance[]>([]);

// Selected component for editing
export const $selectedComponent = atom<ComponentInstance | null>(null);

// Component library state
export const $componentLibrary = map<any[]>([]);

// Global workflow styling (for cosmetic changes that affect entire workflow)
export interface WorkflowStyling {
  theme: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    fontSize?: string;
  };
  layout: {
    formWidth?: string;
    spacing?: string;
    borderRadius?: string;
  };
  buttons: {
    style?: 'default' | 'rounded' | 'square';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  };
  customCSS?: string;
}

export const $workflowStyling = atom<WorkflowStyling>({
  theme: {},
  layout: {},
  buttons: {}
});

// Workflow generation state
export const $workflowGenerationState = atom<{
  isGenerating: boolean;
  currentStep: string;
  components: ComponentInstance[];
}>({
  isGenerating: false,
  currentStep: '',
  components: []
});

// Actions
export const workflowComponentActions = {
  // Set component instances from chat or API
  setComponentInstances: (instances: ComponentInstance[]) => {
    console.log('📝 Setting component instances:', instances.length);
    $componentInstances.set(instances);
  },

  // Add a single component instance
  addComponentInstance: (instance: ComponentInstance) => {
    const current = $componentInstances.get();
    $componentInstances.set([...current, instance]);
  },

  // Update component instance configuration
  updateComponentInstance: (id: string, updates: Partial<ComponentInstance>) => {
    const current = $componentInstances.get();
    const updated = current.map(instance => 
      instance.id === id ? { ...instance, ...updates } : instance
    );
    $componentInstances.set(updated);
  },

  // Remove component instance
  removeComponentInstance: (id: string) => {
    const current = $componentInstances.get();
    $componentInstances.set(current.filter(instance => instance.id !== id));
  },

  // Get components for specific step
  getComponentsForStep: (stepType: string): ComponentInstance[] => {
    const current = $componentInstances.get();
    return current.filter(instance => instance.stepType === stepType);
  },

  // Generate HTML from component instances for Live Preview
  generateLivePreviewHTML: (stepType: string): string => {
    const stepComponents = workflowComponentActions.getComponentsForStep(stepType);
    
    let html = `<div class="workflow-step-content">\n`;
    html += `<h2>Step ${getStepNumber(stepType)}: ${getStepTitle(stepType)}</h2>\n`;
    
    stepComponents.forEach(component => {
      html += generateComponentHTML(component);
    });
    
    html += `</div>`;
    return html;
  },

  // Generate 4-Step Builder data from component instances
  generate4StepBuilderData: (stepType: string): any => {
    const stepComponents = workflowComponentActions.getComponentsForStep(stepType);
    
    return {
      title: getStepTitle(stepType),
      components: stepComponents.map(component => ({
        id: component.id,
        type: component.componentId,
        label: component.label,
        required: component.required,
        config: component.config,
        validation: component.validation
      }))
    };
  },

  // Start workflow generation process
  startGeneration: (userInput: string) => {
    $workflowGenerationState.set({
      isGenerating: true,
      currentStep: 'Analyzing requirements...',
      components: []
    });
  },

  // Update generation progress
  updateGenerationState: (step: string, components?: ComponentInstance[]) => {
    const current = $workflowGenerationState.get();
    $workflowGenerationState.set({
      ...current,
      currentStep: step,
      components: components || current.components
    });
  },

  // Complete generation
  completeGeneration: (finalComponents: ComponentInstance[]) => {
    $componentInstances.set(finalComponents);
    $workflowGenerationState.set({
      isGenerating: false,
      currentStep: 'Complete',
      components: finalComponents
    });
  },

  // Update workflow styling (for cosmetic changes)
  updateWorkflowStyling: (updates: Partial<WorkflowStyling>) => {
    const current = $workflowStyling.get();
    $workflowStyling.set({
      theme: { ...current.theme, ...updates.theme },
      layout: { ...current.layout, ...updates.layout },
      buttons: { ...current.buttons, ...updates.buttons },
      customCSS: updates.customCSS || current.customCSS
    });
  },

  // Regenerate complete workflow HTML from current component instances and styling
  regenerateWorkflowCode: (): { html: string; css: string } => {
    const instances = $componentInstances.get();
    const styling = $workflowStyling.get();
    
    // Generate HTML from component instances
    const html = generateCompleteWorkflowHTML(instances, styling);
    
    // Generate CSS from styling configuration
    const css = generateWorkflowCSS(styling, instances);
    
    return { html, css };
  },

  // Update multiple component instances (for batch updates from chat)
  updateMultipleComponents: (updates: Array<{ id: string; updates: Partial<ComponentInstance> }>) => {
    const current = $componentInstances.get();
    const updated = current.map(instance => {
      const update = updates.find(u => u.id === instance.id);
      return update ? { ...instance, ...update.updates } : instance;
    });
    $componentInstances.set(updated);
  },

  // Add multiple component instances (for bulk additions from chat)
  addMultipleComponents: (newInstances: ComponentInstance[]) => {
    const current = $componentInstances.get();
    $componentInstances.set([...current, ...newInstances]);
  }
};

// Helper functions
function getStepNumber(stepType: string): number {
  switch (stepType) {
    case 'capture': return 1;
    case 'review': return 2;
    case 'approval': return 3;
    case 'update': return 4;
    default: return 1;
  }
}

function getStepTitle(stepType: string): string {
  switch (stepType) {
    case 'capture': return 'Data Capture';
    case 'review': return 'Review & Validation';
    case 'approval': return 'Approval Decision';
    case 'update': return 'System Integration';
    default: return 'Workflow Step';
  }
}

function generateComponentHTML(component: ComponentInstance): string {
  // Generate HTML based on component type with styling
  const componentStyling = generateComponentStyling(component.styling);
  
  switch (component.componentId) {
    case 'short-text-box':
      return `
        <div class="form-group" data-component-id="${component.id}" style="${componentStyling}">
          <label for="${component.id}">${component.label}${component.required ? ' *' : ''}</label>
          <input 
            type="text" 
            id="${component.id}" 
            name="${component.id}"
            ${component.required ? 'required' : ''}
            placeholder="${component.config.placeholder || ''}"
            class="form-control ${component.styling.cssClass || ''}"
          />
        </div>
      `;
      
    case 'email-input':
      return `
        <div class="form-group" data-component-id="${component.id}" style="${componentStyling}">
          <label for="${component.id}">${component.label}${component.required ? ' *' : ''}</label>
          <input 
            type="email" 
            id="${component.id}" 
            name="${component.id}"
            ${component.required ? 'required' : ''}
            placeholder="${component.config.placeholder || ''}"
            class="form-control ${component.styling.cssClass || ''}"
          />
        </div>
      `;
      
    case 'file-upload':
      return `
        <div class="form-group" data-component-id="${component.id}" style="${componentStyling}">
          <label for="${component.id}">${component.label}${component.required ? ' *' : ''}</label>
          <input 
            type="file" 
            id="${component.id}" 
            name="${component.id}"
            ${component.required ? 'required' : ''}
            class="form-control ${component.styling.cssClass || ''}"
            accept="${component.config.accept || '*'}"
          />
        </div>
      `;
      
    case 'approve-reject-buttons':
      return `
        <div class="approval-actions" data-component-id="${component.id}" style="${componentStyling}">
          <h4>${component.label}</h4>
          <div class="button-group">
            <button type="button" class="btn btn-success ${component.styling.cssClass || ''}" data-action="approve">
              ✓ Approve
            </button>
            <button type="button" class="btn btn-danger ${component.styling.cssClass || ''}" data-action="reject">
              ✗ Reject
            </button>
          </div>
        </div>
      `;
      
    default:
      return `
        <div class="form-group" data-component-id="${component.id}" style="${componentStyling}">
          <label>${component.label}</label>
          <div class="component-placeholder">
            Component type: ${component.componentId}
          </div>
        </div>
      `;
  }
}

// Generate complete workflow HTML from component instances
function generateCompleteWorkflowHTML(instances: ComponentInstance[], styling: WorkflowStyling): string {
  const stepComponents = {
    capture: instances.filter(c => c.stepType === 'capture'),
    review: instances.filter(c => c.stepType === 'review'),
    approval: instances.filter(c => c.stepType === 'approval'),
    update: instances.filter(c => c.stepType === 'update')
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generated Workflow</title>
      <style>
        ${generateWorkflowCSS(styling, instances)}
      </style>
    </head>
    <body>
      <div class="workflow-container" style="font-family: ${styling.theme.fontFamily || 'inherit'};">
        <div class="workflow-header">
          <h1 style="color: ${styling.theme.primaryColor || '#333'};">Workflow Application</h1>
        </div>
        
        <div class="workflow-tabs">
          ${stepComponents.capture.length > 0 ? '<button class="tab-btn active" onclick="showStep(\'capture\')">📝 Submit</button>' : ''}
          ${stepComponents.review.length > 0 ? '<button class="tab-btn" onclick="showStep(\'review\')">👥 Review</button>' : ''}
          ${stepComponents.approval.length > 0 ? '<button class="tab-btn" onclick="showStep(\'approval\')">✅ Approve</button>' : ''}
          ${stepComponents.update.length > 0 ? '<button class="tab-btn" onclick="showStep(\'update\')">🔄 Complete</button>' : ''}
        </div>

        ${stepComponents.capture.length > 0 ? `
        <div id="capture-step" class="workflow-step active">
          <h2>Step 1: Data Capture</h2>
          <form class="workflow-form">
            ${stepComponents.capture.map(comp => generateComponentHTML(comp)).join('\\n')}
            <button type="submit" class="btn btn-primary workflow-submit-btn">Submit</button>
          </form>
        </div>
        ` : ''}

        ${stepComponents.review.length > 0 ? `
        <div id="review-step" class="workflow-step">
          <h2>Step 2: Review</h2>
          <div class="review-content">
            ${stepComponents.review.map(comp => generateComponentHTML(comp)).join('\\n')}
          </div>
        </div>
        ` : ''}

        ${stepComponents.approval.length > 0 ? `
        <div id="approval-step" class="workflow-step">
          <h2>Step 3: Approval</h2>
          <div class="approval-content">
            ${stepComponents.approval.map(comp => generateComponentHTML(comp)).join('\\n')}
          </div>
        </div>
        ` : ''}

        ${stepComponents.update.length > 0 ? `
        <div id="update-step" class="workflow-step">
          <h2>Step 4: Integration</h2>
          <div class="update-content">
            ${stepComponents.update.map(comp => generateComponentHTML(comp)).join('\\n')}
          </div>
        </div>
        ` : ''}
      </div>

      <script>
        function showStep(stepName) {
          // Hide all steps
          document.querySelectorAll('.workflow-step').forEach(step => {
            step.classList.remove('active');
          });
          document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Show selected step
          document.getElementById(stepName + '-step').classList.add('active');
          event.target.classList.add('active');
        }

        // Handle form submissions
        document.addEventListener('DOMContentLoaded', function() {
          const forms = document.querySelectorAll('form');
          forms.forEach(form => {
            form.addEventListener('submit', function(e) {
              e.preventDefault();
              alert('✅ Form submitted successfully!\\\\n\\\\nThis is a generated workflow preview.');
              return false;
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}

// Generate CSS for workflow styling
function generateWorkflowCSS(styling: WorkflowStyling, instances: ComponentInstance[]): string {
  return `
    body {
      margin: 0;
      padding: 20px;
      background-color: ${styling.theme.backgroundColor || '#f5f5f5'};
      font-family: ${styling.theme.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
      font-size: ${styling.theme.fontSize || '14px'};
    }

    .workflow-container {
      max-width: ${styling.layout.formWidth || '800px'};
      margin: 0 auto;
      background: white;
      border-radius: ${styling.layout.borderRadius || '8px'};
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .workflow-header {
      background: ${styling.theme.primaryColor || '#007bff'};
      color: white;
      padding: 20px;
      text-align: center;
    }

    .workflow-header h1 {
      margin: 0;
      font-size: 24px;
    }

    .workflow-tabs {
      display: flex;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .tab-btn {
      flex: 1;
      padding: 15px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: #e9ecef;
    }

    .tab-btn.active {
      background: white;
      color: ${styling.theme.primaryColor || '#007bff'};
      border-bottom: 2px solid ${styling.theme.primaryColor || '#007bff'};
    }

    .workflow-step {
      display: none;
      padding: ${styling.layout.spacing || '30px'};
    }

    .workflow-step.active {
      display: block;
    }

    .workflow-form {
      max-width: 600px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: ${styling.layout.spacing || '20px'};
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 2px solid #e1e5e9;
      border-radius: ${styling.layout.borderRadius || '6px'};
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: ${styling.theme.primaryColor || '#007bff'};
    }

    .btn {
      padding: ${styling.buttons.size === 'large' ? '12px 24px' : styling.buttons.size === 'small' ? '6px 12px' : '8px 16px'};
      border: none;
      border-radius: ${styling.buttons.style === 'rounded' ? '25px' : styling.buttons.style === 'square' ? '0' : '6px'};
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: ${styling.buttons.color || styling.theme.primaryColor || '#007bff'};
      color: white;
    }

    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .button-group {
      display: flex;
      gap: 10px;
      margin: 15px 0;
    }

    .approval-actions {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: ${styling.layout.borderRadius || '8px'};
      margin: 20px 0;
    }

    .workflow-submit-btn {
      width: 100%;
      margin-top: 20px;
    }

    /* Custom CSS from user */
    ${styling.customCSS || ''}
  `;
}

// Generate component-specific styling
function generateComponentStyling(styling: ComponentInstance['styling']): string {
  const styles: string[] = [];
  
  if (styling.width) styles.push(`width: ${styling.width}`);
  if (styling.color) styles.push(`color: ${styling.color}`);
  if (styling.fontSize) styles.push(`font-size: ${styling.fontSize}`);
  if (styling.backgroundColor) styles.push(`background-color: ${styling.backgroundColor}`);
  if (styling.borderColor) styles.push(`border-color: ${styling.borderColor}`);
  if (styling.padding) styles.push(`padding: ${styling.padding}`);
  if (styling.margin) styles.push(`margin: ${styling.margin}`);
  
  return styles.join('; ');
}