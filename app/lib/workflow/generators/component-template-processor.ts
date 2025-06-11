import type { ComponentSuggestion } from '~/lib/.server/component-mapper';

export interface ProcessedComponent {
  html: string;
  css: string;
  fieldName: string;
  componentName: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export class ComponentTemplateProcessor {
  /**
   * Process a component template by replacing placeholders with actual values
   */
  static processTemplate(
    component: ComponentSuggestion,
    fieldConfig: FieldConfig
  ): ProcessedComponent {
    console.log(`🔧 Processing template for component: ${component.name}`);
    
    let html = component.html_template || this.getDefaultTemplate(component.component_type);
    
    // Replace all placeholders
    html = this.replacePlaceholders(html, fieldConfig);
    
    // Extract and process CSS if embedded
    const { html: cleanHtml, css } = this.extractCss(html);
    
    return {
      html: cleanHtml,
      css,
      fieldName: fieldConfig.name,
      componentName: component.name
    };
  }

  /**
   * Replace template placeholders with actual values
   */
  private static replacePlaceholders(template: string, config: FieldConfig): string {
    let processed = template;
    
    // Basic replacements
    processed = processed.replace(/\{\{name\}\}/g, config.name);
    processed = processed.replace(/\{\{label\}\}/g, config.label);
    processed = processed.replace(/\{\{type\}\}/g, config.type || 'text');
    processed = processed.replace(/\{\{placeholder\}\}/g, config.placeholder || '');
    processed = processed.replace(/\{\{required\}\}/g, config.required ? 'required' : '');
    processed = processed.replace(/\{\{helpText\}\}/g, config.helpText || '');
    
    // Handle required indicator
    const requiredSpan = config.required ? ' <span class="required">*</span>' : '';
    processed = processed.replace(/\{\{requiredIndicator\}\}/g, requiredSpan);
    
    // Handle validation attributes
    if (config.validation) {
      const validationAttrs = this.buildValidationAttributes(config.validation);
      processed = processed.replace(/\{\{validation\}\}/g, validationAttrs);
    } else {
      processed = processed.replace(/\{\{validation\}\}/g, '');
    }
    
    // Handle options for select/radio/checkbox
    if (config.options) {
      const optionsHtml = this.buildOptionsHtml(config.options, config.type);
      processed = processed.replace(/\{\{options\}\}/g, optionsHtml);
    }
    
    return processed;
  }

  /**
   * Build validation attributes string
   */
  private static buildValidationAttributes(validation: FieldConfig['validation']): string {
    const attrs: string[] = [];
    
    if (validation?.min !== undefined) attrs.push(`min="${validation.min}"`);
    if (validation?.max !== undefined) attrs.push(`max="${validation.max}"`);
    if (validation?.pattern) attrs.push(`pattern="${validation.pattern}"`);
    if (validation?.minLength) attrs.push(`minlength="${validation.minLength}"`);
    if (validation?.maxLength) attrs.push(`maxlength="${validation.maxLength}"`);
    
    return attrs.join(' ');
  }

  /**
   * Build options HTML for select/radio/checkbox
   */
  private static buildOptionsHtml(
    options: Array<{ value: string; label: string }>,
    type?: string
  ): string {
    if (type === 'select' || type === 'dropdown') {
      return options
        .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
        .join('\n              ');
    }
    
    // For radio/checkbox groups
    return options
      .map(opt => `
        <label class="option-label">
          <input type="${type || 'radio'}" name="{{name}}" value="${opt.value}" />
          ${opt.label}
        </label>`)
      .join('\n');
  }

  /**
   * Extract CSS from HTML template if embedded
   */
  private static extractCss(html: string): { html: string; css: string } {
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    
    if (styleMatch) {
      const css = styleMatch[1].trim();
      const cleanHtml = html.replace(/<style>[\s\S]*?<\/style>/, '').trim();
      return { html: cleanHtml, css };
    }
    
    return { html, css: '' };
  }

  /**
   * Get default template for component type
   */
  private static getDefaultTemplate(componentType: string): string {
    const templates: Record<string, string> = {
      'short-text-box': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <input 
            type="text" 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            placeholder="{{placeholder}}"
            class="form-control"
            {{validation}}
          />
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'long-text-box': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <textarea 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            placeholder="{{placeholder}}"
            class="form-control"
            rows="4"
            {{validation}}
          >{{defaultValue}}</textarea>
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'email-input': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <input 
            type="email" 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            placeholder="{{placeholder}}"
            class="form-control"
            {{validation}}
          />
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'number-input': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <input 
            type="number" 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            placeholder="{{placeholder}}"
            class="form-control"
            {{validation}}
          />
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'file-upload': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <input 
            type="file" 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            class="form-control-file"
            accept="{{accept}}"
            {{multiple}}
          />
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'dropdown-select': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <select 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            class="form-control"
          >
            <option value="">-- Select --</option>
            {{options}}
          </select>
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'checkbox': `
        <div class="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              id="{{name}}" 
              name="{{name}}"
              {{required}}
              value="true"
            />
            {{label}}{{requiredIndicator}}
          </label>
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`,
      
      'date-picker': `
        <div class="form-group">
          <label for="{{name}}">{{label}}{{requiredIndicator}}</label>
          <input 
            type="date" 
            id="{{name}}" 
            name="{{name}}"
            {{required}}
            class="form-control"
            {{validation}}
          />
          {{#if helpText}}<small class="help-text">{{helpText}}</small>{{/if}}
        </div>`
    };
    
    return templates[componentType] || templates['short-text-box'];
  }

  /**
   * Process multiple components and combine their output
   */
  static processMultipleComponents(
    components: ComponentSuggestion[],
    fieldConfigs: FieldConfig[]
  ): { html: string; css: string } {
    const processedComponents: ProcessedComponent[] = [];
    const usedFields = new Set<string>();
    
    // Process each component with matching field config
    for (const component of components) {
      const matchingField = fieldConfigs.find(field => 
        !usedFields.has(field.name) && (
          field.name.toLowerCase().includes(component.name.toLowerCase().replace(/\s+/g, '_')) ||
          field.type === this.mapComponentTypeToFieldType(component.component_type)
        )
      );
      
      if (matchingField) {
        const processed = this.processTemplate(component, matchingField);
        processedComponents.push(processed);
        usedFields.add(matchingField.name);
      }
    }
    
    // Combine all HTML and CSS
    const html = processedComponents.map(pc => pc.html).join('\n\n');
    const css = processedComponents
      .map(pc => pc.css)
      .filter(Boolean)
      .join('\n\n');
    
    return { html, css };
  }

  /**
   * Map component type to field type
   */
  private static mapComponentTypeToFieldType(componentType: string): string {
    const mapping: Record<string, string> = {
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
    
    return mapping[componentType] || 'text';
  }
}