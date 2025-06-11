import { getSupabaseServer } from '~/lib/.server/supabase';
import { ComponentMapper, type ComponentSuggestion } from '~/lib/.server/component-mapper';
import { ComponentTemplateProcessor, type FieldConfig } from './component-template-processor';

export interface LoadedComponents {
  capture: ComponentSuggestion[];
  review: ComponentSuggestion[];
  approval: ComponentSuggestion[];
  update: ComponentSuggestion[];
}

export interface ComponentUsageLog {
  componentId: string;
  componentName: string;
  workflowDescription: string;
  usageContext: 'capture' | 'review' | 'approval' | 'update';
  confidence: number;
  timestamp: Date;
}

export class ComponentLoader {
  private organizationId: string;
  private componentMapper: ComponentMapper;
  private usageLogs: ComponentUsageLog[] = [];

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.componentMapper = new ComponentMapper(organizationId);
  }

  /**
   * Load and suggest components based on workflow description
   */
  async loadComponentsForWorkflow(workflowDescription: string): Promise<LoadedComponents> {
    console.log('🚀 COMPONENT LOADER: Starting component loading process');
    console.log(`📋 Organization ID: ${this.organizationId}`);
    console.log(`📝 Workflow Description: ${workflowDescription}`);
    
    try {
      // Use ComponentMapper to get AI-suggested components
      const suggestions = await this.componentMapper.suggestComponentsForWorkflow(workflowDescription);
      
      // Log component usage for analytics
      this.logComponentUsage(suggestions, workflowDescription);
      
      console.log('✅ COMPONENT LOADER: Successfully loaded components');
      console.log(`📊 Components loaded: Capture(${suggestions.capture.length}), Review(${suggestions.review.length}), Approval(${suggestions.approval.length}), Update(${suggestions.update.length})`);
      
      return suggestions;
    } catch (error) {
      console.error('❌ COMPONENT LOADER: Failed to load components:', error);
      return {
        capture: [],
        review: [],
        approval: [],
        update: []
      };
    }
  }

  /**
   * Generate HTML form from loaded components and field configurations
   */
  async generateFormHtml(
    components: ComponentSuggestion[],
    fieldConfigs: FieldConfig[]
  ): Promise<{ html: string; css: string; usedComponents: string[] }> {
    console.log(`🎨 COMPONENT LOADER: Generating form HTML with ${components.length} components`);
    
    const usedComponents: string[] = [];
    let formHtml = '';
    let combinedCss = '';
    const processedFields = new Set<string>();
    
    // Process each component
    for (const component of components) {
      // Find matching field configuration
      const matchingField = fieldConfigs.find(field => 
        !processedFields.has(field.name) && 
        this.isFieldMatchForComponent(field, component)
      );
      
      if (matchingField) {
        try {
          const processed = ComponentTemplateProcessor.processTemplate(component, matchingField);
          formHtml += processed.html + '\n';
          if (processed.css) {
            combinedCss += processed.css + '\n';
          }
          
          processedFields.add(matchingField.name);
          usedComponents.push(`${component.name} (${component.component_type})`);
          
          console.log(`✅ Used component: ${component.name} for field: ${matchingField.name}`);
        } catch (error) {
          console.error(`❌ Failed to process component ${component.name}:`, error);
        }
      }
    }
    
    // Add any remaining fields that weren't covered by components
    const remainingFields = fieldConfigs.filter(f => !processedFields.has(f.name));
    if (remainingFields.length > 0) {
      console.log(`⚠️ Adding ${remainingFields.length} fields without specific components`);
      const fallbackHtml = this.generateFallbackFields(remainingFields);
      formHtml += fallbackHtml;
    }
    
    return { html: formHtml, css: combinedCss, usedComponents };
  }

  /**
   * Check if a field matches a component
   */
  private isFieldMatchForComponent(field: FieldConfig, component: ComponentSuggestion): boolean {
    // Check by name similarity
    const fieldNameLower = field.name.toLowerCase().replace(/[_-]/g, ' ');
    const componentNameLower = component.name.toLowerCase();
    
    if (fieldNameLower.includes(componentNameLower) || componentNameLower.includes(fieldNameLower)) {
      return true;
    }
    
    // Check by type mapping
    const expectedType = this.getExpectedFieldType(component.component_type);
    if (field.type === expectedType) {
      return true;
    }
    
    // Check by keywords in component
    if (component.matches && component.matches.some(match => 
      fieldNameLower.includes(match.toLowerCase())
    )) {
      return true;
    }
    
    return false;
  }

  /**
   * Get expected field type for component type
   */
  private getExpectedFieldType(componentType: string): string {
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

  /**
   * Generate fallback HTML for fields without components
   */
  private generateFallbackFields(fields: FieldConfig[]): string {
    return fields.map(field => {
      const type = field.type || 'text';
      const required = field.required ? 'required' : '';
      const requiredIndicator = field.required ? ' <span class="required">*</span>' : '';
      
      if (type === 'textarea') {
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label}${requiredIndicator}</label>
            <textarea 
              id="${field.name}" 
              name="${field.name}"
              ${required}
              placeholder="${field.placeholder || ''}"
              class="form-control"
              rows="4"
            ></textarea>
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
      }
      
      if (type === 'select' && field.options) {
        return `
          <div class="form-group">
            <label for="${field.name}">${field.label}${requiredIndicator}</label>
            <select 
              id="${field.name}" 
              name="${field.name}"
              ${required}
              class="form-control"
            >
              <option value="">-- Select --</option>
              ${field.options.map(opt => 
                `<option value="${opt.value}">${opt.label}</option>`
              ).join('')}
            </select>
            ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
          </div>`;
      }
      
      return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${requiredIndicator}</label>
          <input 
            type="${type}" 
            id="${field.name}" 
            name="${field.name}"
            ${required}
            placeholder="${field.placeholder || ''}"
            class="form-control"
          />
          ${field.helpText ? `<small class="help-text">${field.helpText}</small>` : ''}
        </div>`;
    }).join('\n');
  }

  /**
   * Log component usage for analytics
   */
  private logComponentUsage(components: LoadedComponents, workflowDescription: string): void {
    const timestamp = new Date();
    
    // Log each component usage
    Object.entries(components).forEach(([context, componentList]) => {
      componentList.forEach(component => {
        this.usageLogs.push({
          componentId: component.id,
          componentName: component.name,
          workflowDescription,
          usageContext: context as any,
          confidence: component.confidence,
          timestamp
        });
      });
    });
    
    // Save logs to database (async, non-blocking)
    this.saveUsageLogs().catch(error => {
      console.error('Failed to save component usage logs:', error);
    });
  }

  /**
   * Save usage logs to database
   */
  private async saveUsageLogs(): Promise<void> {
    if (this.usageLogs.length === 0) return;
    
    try {
      const logsToSave = this.usageLogs.map(log => ({
        organization_id: this.organizationId,
        component_id: log.componentId,
        component_name: log.componentName,
        workflow_description: log.workflowDescription,
        usage_context: log.usageContext,
        confidence_score: log.confidence,
        used_at: log.timestamp.toISOString()
      }));
      
      const { error } = await supabase
        .from('component_usage_logs')
        .insert(logsToSave);
      
      if (error) {
        console.error('Error saving component usage logs:', error);
      } else {
        console.log(`📊 Saved ${logsToSave.length} component usage logs`);
        this.usageLogs = []; // Clear saved logs
      }
    } catch (error) {
      console.error('Failed to save component usage logs:', error);
    }
  }

  /**
   * Get usage analytics for components
   */
  async getComponentUsageAnalytics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('component_usage_logs')
        .select('component_name, usage_context, confidence_score, count(*)')
        .eq('organization_id', this.organizationId)
        .gte('used_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('count', { ascending: false });
      
      if (error) {
        console.error('Error fetching usage analytics:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      return null;
    }
  }
}