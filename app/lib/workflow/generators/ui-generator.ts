import type { Workflow, WorkflowStep } from '~/types/database';

export async function generateWorkflowUI(workflow: Workflow, organizationId?: string): Promise<string> {
  const steps = workflow.config?.steps || [];
  const captureStep = steps.find(s => s.type === 'capture');
  const fields = captureStep?.config?.fields || [];
  
  // For now, just use the fallback templates to avoid server-only imports
  // Component library integration will be handled server-side
  const formHTML = generateFormFields(fields);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${workflow.name || 'Workflow'}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="workflow-container">
    <header class="workflow-header">
      <h1>${workflow.name || 'Workflow Application'}</h1>
      <p>${workflow.description || 'Complete the form below to submit your request.'}</p>
    </header>
    
    <main class="workflow-content">
      <div class="tabs">
        <button class="tab-button active" data-tab="submit">📝 Submit</button>
        <button class="tab-button" data-tab="status">📊 Status</button>
        <button class="tab-button" data-tab="history">📜 History</button>
      </div>
      
      <div class="tab-content active" id="submit-tab">
        <form id="workflow-form" class="workflow-form">
          ${formHTML}
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              Submit ${workflow.name || 'Workflow'}
            </button>
            <button type="reset" class="btn btn-secondary">
              Clear Form
            </button>
          </div>
        </form>
      </div>
      
      <div class="tab-content" id="status-tab">
        <div class="status-container">
          <h2>Check Submission Status</h2>
          <div class="status-search">
            <input type="text" id="submission-id" placeholder="Enter submission ID">
            <button onclick="checkStatus()" class="btn btn-primary">Check Status</button>
          </div>
          <div id="status-result"></div>
        </div>
      </div>
      
      <div class="tab-content" id="history-tab">
        <div class="history-container">
          <h2>Recent Submissions</h2>
          <div id="submissions-list"></div>
        </div>
      </div>
    </main>
    
    <div id="notification" class="notification"></div>
  </div>
  
  <script src="app.js"></script>
</body>
</html>`;
}

function generateFormFields(fields: any[]): string {
  return fields.map(field => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <input 
              type="${field.type}" 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
              class="form-control"
            />
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'number':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <input 
              type="number" 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              ${field.min !== undefined ? `min="${field.min}"` : ''}
              ${field.max !== undefined ? `max="${field.max}"` : ''}
              ${field.step !== undefined ? `step="${field.step}"` : ''}
              class="form-control"
            />
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'textarea':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <textarea 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              rows="${field.rows || 4}"
              class="form-control"
            >${field.defaultValue || ''}</textarea>
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'select':
      case 'dropdown':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <select 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              class="form-control"
            >
              <option value="">-- Select --</option>
              ${(field.options || []).map((opt: any) => 
                `<option value="${opt.value || opt}">${opt.label || opt}</option>`
              ).join('')}
            </select>
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'file':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <input 
              type="file" 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              ${field.accept ? `accept="${field.accept}"` : ''}
              ${field.multiple ? 'multiple' : ''}
              class="form-control"
            />
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'date':
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <input 
              type="date" 
              id="${field.name}" 
              name="${field.name}"
              ${field.required ? 'required' : ''}
              ${field.min ? `min="${field.min}"` : ''}
              ${field.max ? `max="${field.max}"` : ''}
              class="form-control"
            />
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      case 'checkbox':
        return `
          <div class="form-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                id="${field.name}" 
                name="${field.name}"
                ${field.required ? 'required' : ''}
                value="true"
              />
              ${field.label || field.name}${field.required ? ' <span class="required">*</span>' : ''}
            </label>
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
          
      default:
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label || field.name}</label>
            <input 
              type="text" 
              id="${field.name}" 
              name="${field.name}"
              class="form-control"
            />
          </div>`;
    }
  }).join('\n');
}

// 🎯 COMPONENT LIBRARY INTEGRATION: Generate form from standardized components
async function generateFormFromComponents(components: ComponentSuggestion[], fields: any[]): Promise<string> {
  if (!components || components.length === 0) {
    console.log('⚠️ COMPONENT LIBRARY: No components provided, using fallback templates');
    return generateFormFields(fields);
  }
  
  console.log(`🎯 COMPONENT LIBRARY: Generating form using ${components.length} standardized components`);
  
  let formHTML = '';
  const usedComponents: string[] = [];
  
  for (const component of components) {
    try {
      // Use component's HTML template with customization
      let componentHTML = component.html_template || '';
      
      // Find matching field configuration
      const matchingField = fields.find(f => 
        f.name?.toLowerCase().includes(component.name.toLowerCase()) ||
        f.type === component.component_type
      );
      
      if (matchingField && componentHTML) {
        // Replace placeholders in component template
        componentHTML = componentHTML
          .replace(/\{\{name\}\}/g, matchingField.name || component.name.toLowerCase())
          .replace(/\{\{label\}\}/g, matchingField.label || component.name)
          .replace(/\{\{type\}\}/g, matchingField.type || 'text')
          .replace(/\{\{required\}\}/g, matchingField.required ? 'required' : '')
          .replace(/\{\{placeholder\}\}/g, matchingField.placeholder || '');
        
        formHTML += componentHTML + '\n';
        usedComponents.push(component.name);
        console.log(`✅ COMPONENT USED: "${component.name}" (${component.component_type}) - Standardized template applied`);
      } else {
        // Fallback to basic template for this component
        formHTML += generateBasicFieldFromComponent(component) + '\n';
        usedComponents.push(`${component.name} (fallback)`);
        console.log(`⚠️ COMPONENT FALLBACK: "${component.name}" - Using basic template (no matching field found)`);
      }
    } catch (error) {
      console.error(`❌ COMPONENT ERROR: Failed to generate component "${component.name}":`, error);
      // Fallback to basic field
      formHTML += generateBasicFieldFromComponent(component) + '\n';
      usedComponents.push(`${component.name} (error)`);
    }
  }
  
  // Add any remaining fields not covered by components
  const coveredFields = new Set();
  components.forEach(comp => {
    const field = fields.find(f => 
      f.name?.toLowerCase().includes(comp.name.toLowerCase()) ||
      f.type === comp.component_type
    );
    if (field) coveredFields.add(field.name);
  });
  
  const remainingFields = fields.filter(f => !coveredFields.has(f.name));
  if (remainingFields.length > 0) {
    console.log(`➕ FALLBACK FIELDS: Adding ${remainingFields.length} fields not covered by component library`);
    formHTML += generateFormFields(remainingFields);
  }
  
  // 📊 LOG COMPONENT USAGE SUMMARY
  console.log('');
  console.log('📊 COMPONENT LIBRARY USAGE SUMMARY:');
  console.log('=====================================');
  console.log(`🎯 Total Components Used: ${usedComponents.length}`);
  console.log(`📦 Components from Library: ${usedComponents.filter(c => !c.includes('fallback') && !c.includes('error')).length}`);
  console.log(`⚠️ Fallback Templates: ${usedComponents.filter(c => c.includes('fallback')).length}`);
  console.log(`❌ Error Templates: ${usedComponents.filter(c => c.includes('error')).length}`);
  console.log(`➕ Manual Fields Added: ${remainingFields.length}`);
  console.log('📋 Component Details:');
  usedComponents.forEach((comp, i) => {
    const status = comp.includes('fallback') ? '⚠️' : comp.includes('error') ? '❌' : '✅';
    console.log(`   ${i + 1}. ${status} ${comp}`);
  });
  console.log('=====================================');
  console.log('');
  
  return formHTML;
}

// Generate basic field template from component definition
function generateBasicFieldFromComponent(component: ComponentSuggestion): string {
  const fieldName = component.name.toLowerCase().replace(/\s+/g, '_');
  const fieldType = mapComponentTypeToInputType(component.component_type);
  
  return `
    <div class="form-group">
      <label for="${fieldName}">${component.name}</label>
      <input 
        type="${fieldType}" 
        id="${fieldName}" 
        name="${fieldName}"
        class="form-control"
        placeholder="${component.description}"
      />
      <small class="help-text">${component.description}</small>
    </div>`;
}

// Map component types to HTML input types
function mapComponentTypeToInputType(componentType: string): string {
  const typeMap: Record<string, string> = {
    'short-text-box': 'text',
    'long-text-box': 'textarea',
    'email-input': 'email',
    'number-input': 'number',
    'date-picker': 'date',
    'file-upload': 'file',
    'dropdown-select': 'select',
    'checkbox': 'checkbox',
    'radio-button': 'radio'
  };
  
  return typeMap[componentType] || 'text';
}

export function generateWorkflowCSS(): string {
  return `/* Workflow Styles */
:root {
  --primary-color: #007bff;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-bg: #f8f9fa;
  --border-color: #dee2e6;
  --text-muted: #6c757d;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: var(--light-bg);
  margin: 0;
  padding: 0;
}

.workflow-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.workflow-header {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
  text-align: center;
}

.workflow-header h1 {
  margin: 0 0 10px 0;
  color: var(--primary-color);
}

.workflow-header p {
  color: var(--text-muted);
  margin: 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-muted);
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab-button:hover {
  color: var(--primary-color);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  display: none;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-content.active {
  display: block;
}

/* Form Styles */
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
  color: #555;
}

.form-control {
  width: 100%;
  padding: 10px 15px;
  font-size: 16px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 8px;
  width: auto;
}

.required {
  color: var(--danger-color);
}

.help-text {
  display: block;
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 14px;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.btn-secondary {
  background-color: var(--light-bg);
  color: #333;
  border: 2px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: #e2e6ea;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

/* Notifications */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  transform: translateX(400px);
  transition: transform 0.3s;
  z-index: 1000;
}

.notification.show {
  transform: translateX(0);
}

.notification.success {
  background-color: var(--success-color);
}

.notification.error {
  background-color: var(--danger-color);
}

.notification.info {
  background-color: var(--info-color);
}

/* Status and History */
.status-container,
.history-container {
  max-width: 800px;
  margin: 0 auto;
}

.status-search {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.status-search input {
  flex: 1;
}

#status-result,
#submissions-list {
  margin-top: 20px;
}

.submission-item {
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
  background: var(--light-bg);
}

.submission-item h3 {
  margin: 0 0 10px 0;
  color: var(--primary-color);
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.submitted {
  background-color: var(--info-color);
  color: white;
}

.status-badge.approved {
  background-color: var(--success-color);
  color: white;
}

.status-badge.rejected {
  background-color: var(--danger-color);
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .workflow-container {
    padding: 10px;
  }
  
  .workflow-header {
    padding: 20px;
  }
  
  .tab-content {
    padding: 20px;
  }
  
  .tabs {
    overflow-x: auto;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}`;
}