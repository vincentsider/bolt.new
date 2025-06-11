import { getSupabaseServer } from './supabase';
import { ComponentMapper, type ComponentSuggestion } from './component-mapper';

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
  private context?: any;

  constructor(organizationId: string, context?: any) {
    this.organizationId = organizationId;
    this.context = context;
    this.componentMapper = new ComponentMapper(organizationId, context);
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
      console.error('❌ COMPONENT LOADER: Error loading components:', error);
      // Return empty components on error
      return {
        capture: [],
        review: [],
        approval: [],
        update: []
      };
    }
  }

  /**
   * Generate form HTML using component templates
   */
  async generateFormHtml(
    components: ComponentSuggestion[], 
    fields: Array<{ name: string; label: string; type: string; required?: boolean }>
  ): Promise<{ html: string; css: string; usedComponents: string[] }> {
    console.log('🎨 COMPONENT LOADER: Generating form HTML with components');
    
    let formHtml = '';
    let formCss = '';
    const usedComponents: string[] = [];
    const usedComponentIds = new Set<string>();
    
    for (const field of fields) {
      // Find best matching component
      const matchingComponent = this.findBestComponentMatch(components, field);
      
      if (matchingComponent && matchingComponent.html_template) {
        // Process template with field data
        const processed = this.processTemplate(matchingComponent, field);
        formHtml += processed.html + '\n';
        
        if (processed.css && !usedComponentIds.has(matchingComponent.id)) {
          formCss += processed.css + '\n';
          usedComponentIds.add(matchingComponent.id);
        }
        
        usedComponents.push(`${matchingComponent.name} (${matchingComponent.component_type})`);
        
        console.log(`✅ Used component: ${matchingComponent.name} for field: ${field.name}`);
      } else {
        // Fallback to basic HTML
        formHtml += this.generateFallbackField(field) + '\n';
        console.log(`⚠️ No component match for field: ${field.name}, using fallback`);
      }
    }
    
    console.log(`📊 COMPONENT LOADER: Generated form with ${usedComponents.length} components`);
    
    return { html: formHtml, css: formCss, usedComponents };
  }

  private findBestComponentMatch(
    components: ComponentSuggestion[], 
    field: { name: string; label: string; type: string }
  ): ComponentSuggestion | null {
    // Map field types to component types
    const typeMapping: Record<string, string[]> = {
      'text': ['short-text-box', 'text-input'],
      'email': ['email-input', 'short-text-box'],
      'number': ['number-input', 'currency-input'],
      'textarea': ['long-text-box', 'textarea'],
      'select': ['dropdown', 'select-box'],
      'file': ['file-upload', 'document-upload'],
      'date': ['date-picker', 'date-input'],
      'checkbox': ['checkbox', 'boolean-input'],
      'radio': ['radio-buttons', 'single-choice']
    };
    
    const acceptableTypes = typeMapping[field.type] || [field.type];
    
    // Find components matching the field type
    const matches = components.filter(c => 
      acceptableTypes.includes(c.component_type) ||
      c.name.toLowerCase().includes(field.name.toLowerCase()) ||
      c.name.toLowerCase().includes(field.label.toLowerCase())
    );
    
    // Return highest confidence match
    return matches.sort((a, b) => b.confidence - a.confidence)[0] || null;
  }

  private processTemplate(
    component: ComponentSuggestion,
    field: { name: string; label: string; type: string; required?: boolean }
  ): { html: string; css: string } {
    let html = component.html_template || '';
    
    // Replace placeholders
    html = html.replace(/{{name}}/g, field.name);
    html = html.replace(/{{label}}/g, field.label);
    html = html.replace(/{{required}}/g, field.required ? 'required' : '');
    html = html.replace(/{{type}}/g, field.type);
    
    // Extract CSS if present
    const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    const css = cssMatch ? cssMatch[1] : '';
    
    // Remove style tag from HTML
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
    
    return { html, css };
  }

  private generateFallbackField(field: { name: string; label: string; type: string; required?: boolean }): string {
    const required = field.required ? 'required' : '';
    
    switch (field.type) {
      case 'textarea':
        return `
<div class="form-group">
  <label for="${field.name}">${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
  <textarea name="${field.name}" id="${field.name}" rows="4" ${required} class="form-control"></textarea>
</div>`;
      
      case 'select':
        return `
<div class="form-group">
  <label for="${field.name}">${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
  <select name="${field.name}" id="${field.name}" ${required} class="form-control">
    <option value="">Select ${field.label}</option>
  </select>
</div>`;
      
      case 'file':
        return `
<div class="form-group">
  <label for="${field.name}">${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
  <input type="file" name="${field.name}" id="${field.name}" ${required} class="form-control" />
</div>`;
      
      default:
        return `
<div class="form-group">
  <label for="${field.name}">${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
  <input type="${field.type}" name="${field.name}" id="${field.name}" ${required} class="form-control" />
</div>`;
    }
  }

  /**
   * Log component usage for analytics
   */
  private logComponentUsage(components: LoadedComponents, workflowDescription: string): void {
    const timestamp = new Date();
    
    // Log each suggested component
    Object.entries(components).forEach(([step, stepComponents]) => {
      stepComponents.forEach(component => {
        this.usageLogs.push({
          componentId: component.id,
          componentName: component.name,
          workflowDescription,
          usageContext: step as 'capture' | 'review' | 'approval' | 'update',
          confidence: component.confidence,
          timestamp
        });
      });
    });
    
    console.log(`📊 COMPONENT LOADER: Logged ${this.usageLogs.length} component suggestions`);
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics(): {
    totalSuggestions: number;
    byStep: Record<string, number>;
    topComponents: Array<{ name: string; count: number }>;
  } {
    const byStep: Record<string, number> = {
      capture: 0,
      review: 0,
      approval: 0,
      update: 0
    };
    
    const componentCounts: Record<string, number> = {};
    
    this.usageLogs.forEach(log => {
      byStep[log.usageContext]++;
      componentCounts[log.componentName] = (componentCounts[log.componentName] || 0) + 1;
    });
    
    const topComponents = Object.entries(componentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalSuggestions: this.usageLogs.length,
      byStep,
      topComponents
    };
  }
}