import { ComponentLoader } from './component-loader';
import type { FieldConfig } from './component-template-processor';

export interface ProcessedWorkflow {
  files: Array<{
    path: string;
    content: string;
  }>;
  componentUsage: {
    total: number;
    fromLibrary: number;
    fallback: number;
    components: string[];
  };
}

export class WorkflowPostProcessor {
  private organizationId: string;
  private componentLoader: ComponentLoader;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.componentLoader = new ComponentLoader(organizationId);
  }

  /**
   * Process generated workflow files to inject component library templates
   */
  async processWorkflowFiles(
    files: Array<{ path: string; content: string }>,
    workflowDescription: string
  ): Promise<ProcessedWorkflow> {
    console.log('🔧 POST-PROCESSOR: Starting workflow post-processing');
    
    // Find HTML files that need component injection
    const htmlFiles = files.filter(f => f.path.endsWith('.html'));
    const processedFiles = [...files];
    let totalComponentsUsed = 0;
    let componentsFromLibrary = 0;
    let fallbackComponents = 0;
    const usedComponentNames: string[] = [];
    
    for (const htmlFile of htmlFiles) {
      try {
        // Extract form fields from the generated HTML
        const fields = this.extractFormFields(htmlFile.content);
        
        if (fields.length > 0) {
          console.log(`📋 Found ${fields.length} form fields in ${htmlFile.path}`);
          
          // Load components for this workflow
          const loadedComponents = await this.componentLoader.loadComponentsForWorkflow(workflowDescription);
          
          // Get capture components (most common for forms)
          const captureComponents = loadedComponents.capture;
          
          if (captureComponents.length > 0) {
            // Generate form HTML using component library
            const { html, css, usedComponents } = await this.componentLoader.generateFormHtml(
              captureComponents,
              fields
            );
            
            // Replace the form content in the HTML
            const updatedHtml = this.injectComponentHtml(htmlFile.content, html);
            
            // Update the file in the processed files array
            const fileIndex = processedFiles.findIndex(f => f.path === htmlFile.path);
            if (fileIndex !== -1) {
              processedFiles[fileIndex] = {
                path: htmlFile.path,
                content: updatedHtml
              };
            }
            
            // Update CSS if needed
            if (css) {
              const cssFile = processedFiles.find(f => f.path.endsWith('style.css') || f.path.endsWith('styles.css'));
              if (cssFile) {
                cssFile.content += '\n\n/* Component Library Styles */\n' + css;
              }
            }
            
            // Track usage statistics
            totalComponentsUsed += usedComponents.length;
            componentsFromLibrary += usedComponents.filter(c => !c.includes('fallback')).length;
            fallbackComponents += usedComponents.filter(c => c.includes('fallback')).length;
            usedComponentNames.push(...usedComponents);
            
            console.log(`✅ Injected ${usedComponents.length} components into ${htmlFile.path}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process ${htmlFile.path}:`, error);
      }
    }
    
    // Log final statistics
    console.log('');
    console.log('📊 WORKFLOW POST-PROCESSING COMPLETE:');
    console.log('=====================================');
    console.log(`📁 Files Processed: ${files.length}`);
    console.log(`🎨 Total Components Used: ${totalComponentsUsed}`);
    console.log(`📦 From Component Library: ${componentsFromLibrary}`);
    console.log(`⚠️ Fallback Components: ${fallbackComponents}`);
    console.log('=====================================');
    
    return {
      files: processedFiles,
      componentUsage: {
        total: totalComponentsUsed,
        fromLibrary: componentsFromLibrary,
        fallback: fallbackComponents,
        components: usedComponentNames
      }
    };
  }

  /**
   * Extract form fields from generated HTML
   */
  private extractFormFields(html: string): FieldConfig[] {
    const fields: FieldConfig[] = [];
    
    // Match input fields
    const inputMatches = html.matchAll(/<input[^>]*>/gi);
    for (const match of inputMatches) {
      const field = this.parseInputField(match[0]);
      if (field) fields.push(field);
    }
    
    // Match textarea fields
    const textareaMatches = html.matchAll(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi);
    for (const match of textareaMatches) {
      const field = this.parseTextareaField(match[0]);
      if (field) fields.push(field);
    }
    
    // Match select fields
    const selectMatches = html.matchAll(/<select[^>]*>[\s\S]*?<\/select>/gi);
    for (const match of selectMatches) {
      const field = this.parseSelectField(match[0]);
      if (field) fields.push(field);
    }
    
    return fields;
  }

  /**
   * Parse input field attributes
   */
  private parseInputField(inputHtml: string): FieldConfig | null {
    const type = this.extractAttribute(inputHtml, 'type') || 'text';
    const name = this.extractAttribute(inputHtml, 'name');
    const id = this.extractAttribute(inputHtml, 'id');
    
    if (!name && !id) return null;
    
    // Find associated label
    const label = this.findLabelForField(inputHtml, name || id || '');
    
    return {
      name: name || id || '',
      label: label || this.humanizeFieldName(name || id || ''),
      type,
      required: inputHtml.includes('required'),
      placeholder: this.extractAttribute(inputHtml, 'placeholder')
    };
  }

  /**
   * Parse textarea field
   */
  private parseTextareaField(textareaHtml: string): FieldConfig | null {
    const name = this.extractAttribute(textareaHtml, 'name');
    const id = this.extractAttribute(textareaHtml, 'id');
    
    if (!name && !id) return null;
    
    const label = this.findLabelForField(textareaHtml, name || id || '');
    
    return {
      name: name || id || '',
      label: label || this.humanizeFieldName(name || id || ''),
      type: 'textarea',
      required: textareaHtml.includes('required'),
      placeholder: this.extractAttribute(textareaHtml, 'placeholder')
    };
  }

  /**
   * Parse select field
   */
  private parseSelectField(selectHtml: string): FieldConfig | null {
    const name = this.extractAttribute(selectHtml, 'name');
    const id = this.extractAttribute(selectHtml, 'id');
    
    if (!name && !id) return null;
    
    const label = this.findLabelForField(selectHtml, name || id || '');
    
    // Extract options
    const options: Array<{ value: string; label: string }> = [];
    const optionMatches = selectHtml.matchAll(/<option[^>]*>([^<]*)<\/option>/gi);
    for (const match of optionMatches) {
      const value = this.extractAttribute(match[0], 'value') || match[1];
      if (value && !value.includes('Select')) {
        options.push({ value, label: match[1] });
      }
    }
    
    return {
      name: name || id || '',
      label: label || this.humanizeFieldName(name || id || ''),
      type: 'select',
      required: selectHtml.includes('required'),
      options
    };
  }

  /**
   * Extract attribute value from HTML element
   */
  private extractAttribute(html: string, attribute: string): string | undefined {
    const match = html.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'));
    return match ? match[1] : undefined;
  }

  /**
   * Find label text for a field
   */
  private findLabelForField(fieldHtml: string, fieldName: string): string | undefined {
    // This is a simplified version - in a real implementation, 
    // we'd need to parse the entire HTML to find associated labels
    const labelMatch = fieldHtml.match(/<label[^>]*>([^<]+)<\/label>/i);
    return labelMatch ? labelMatch[1].trim() : undefined;
  }

  /**
   * Convert field name to human-readable label
   */
  private humanizeFieldName(fieldName: string): string {
    return fieldName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Inject component HTML into the original HTML
   */
  private injectComponentHtml(originalHtml: string, componentHtml: string): string {
    // Find the form element
    const formMatch = originalHtml.match(/<form[^>]*>([\s\S]*?)<\/form>/i);
    
    if (formMatch) {
      // Extract form content
      const formContent = formMatch[1];
      
      // Find where the fields start (after any headings or descriptions)
      const fieldStartMatch = formContent.match(/<(input|textarea|select|div class="form-group")[^>]*>/i);
      
      if (fieldStartMatch) {
        const beforeFields = formContent.substring(0, fieldStartMatch.index || 0);
        
        // Find submit buttons or form actions
        const submitMatch = formContent.match(/<(button|input[^>]*type=["']submit["']|div[^>]*class=["'][^"']*form-actions[^"']*["'])[^>]*>[\s\S]*$/i);
        const afterFields = submitMatch ? formContent.substring(submitMatch.index || 0) : '</form>';
        
        // Reconstruct the form with component HTML
        const newFormContent = beforeFields + '\n' + componentHtml + '\n' + afterFields;
        
        // Replace in original HTML
        return originalHtml.replace(formMatch[0], `<form${this.extractFormAttributes(formMatch[0])}>${newFormContent}`);
      }
    }
    
    // Fallback: just return original if we can't parse it properly
    return originalHtml;
  }

  /**
   * Extract form attributes
   */
  private extractFormAttributes(formTag: string): string {
    const match = formTag.match(/<form([^>]*)>/i);
    return match ? match[1] : '';
  }
}