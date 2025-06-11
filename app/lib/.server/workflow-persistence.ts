import { getSupabaseServer } from './supabase';
import type { Database } from '~/types/database';

interface WorkflowPersistenceData {
  organizationId: string;
  name: string;
  description: string;
  webcontainerId?: string;
  generatedFiles?: Record<string, string>;
  componentUsage?: any;
  userId?: string;
}

export async function persistWorkflow(data: WorkflowPersistenceData, context?: any) {
  try {
    const supabase = getSupabaseServer(context);
    
    // Create workflow config from component usage
    const workflowConfig = {
      triggers: [],
      steps: createStepsFromComponents(data.componentUsage),
      settings: {
        notifications: true,
        requireApproval: hasApprovalComponents(data.componentUsage)
      }
    };
    
    // Insert workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        organization_id: data.organizationId,
        name: data.name,
        description: data.description,
        status: 'draft',
        webcontainer_id: data.webcontainerId,
        generated_files: data.generatedFiles,
        component_usage: data.componentUsage,
        created_by: data.userId,
        prompt: data.description,
        config: workflowConfig
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error persisting workflow:', error);
      return null;
    }
    
    console.log(`✅ Workflow persisted with ID: ${workflow.id}`);
    
    // Create component instances for the workflow
    if (data.componentUsage && workflow) {
      await createComponentInstances(workflow.id, data.componentUsage, data.organizationId, context);
    }
    
    return workflow;
  } catch (error) {
    console.error('Failed to persist workflow:', error);
    return null;
  }
}

function createStepsFromComponents(componentUsage: any): any[] {
  if (!componentUsage) return [];
  
  const steps = [];
  
  // Create capture step if there are capture components
  if (componentUsage.capture?.length > 0) {
    steps.push({
      id: 'capture-1',
      type: 'capture',
      name: 'Data Collection',
      config: {
        fields: componentUsage.capture.map((comp: any) => ({
          name: comp.name.toLowerCase().replace(/\s+/g, '_'),
          label: comp.name,
          type: mapComponentTypeToFieldType(comp.component_type),
          required: true
        }))
      }
    });
  }
  
  // Add review step
  if (componentUsage.review?.length > 0) {
    steps.push({
      id: 'review-1',
      type: 'review',
      name: 'Review Submission',
      config: {
        displayFields: ['all']
      }
    });
  }
  
  // Add approval step
  if (componentUsage.approval?.length > 0) {
    steps.push({
      id: 'approval-1',
      type: 'approval',
      name: 'Approval Decision',
      config: {
        approvers: ['manager'],
        requireComment: false
      }
    });
  }
  
  // Add update/notification step
  if (componentUsage.update?.length > 0) {
    steps.push({
      id: 'update-1',
      type: 'update',
      name: 'Process Updates',
      config: {
        actions: ['notify', 'log']
      }
    });
  }
  
  return steps;
}

function mapComponentTypeToFieldType(componentType: string): string {
  const typeMap: Record<string, string> = {
    'text_input': 'text',
    'textarea': 'textarea',
    'email': 'email',
    'number': 'number',
    'select': 'select',
    'checkbox': 'checkbox',
    'file_upload': 'file',
    'date_picker': 'date'
  };
  
  return typeMap[componentType] || 'text';
}

function hasApprovalComponents(componentUsage: any): boolean {
  return componentUsage?.approval?.length > 0;
}

async function createComponentInstances(
  workflowId: string,
  componentUsage: any,
  organizationId: string,
  context?: any
) {
  try {
    const supabase = getSupabaseServer(context);
    const instances = [];
    
    console.log('📊 Creating component instances for workflow:', workflowId);
    console.log('Component usage:', componentUsage);
    
    // First, let's get all component IDs from the component_libraries table
    const { data: componentLibrary, error: libError } = await supabase
      .from('component_libraries')
      .select('id, name, component_type')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    
    if (libError) {
      console.error('Error fetching component library:', libError);
      // Continue anyway - we'll create instances without validation
    }
    
    const validComponentIds = new Set(componentLibrary?.map(c => c.id) || []);
    console.log(`Found ${validComponentIds.size} components in library`);
    
    // Create instances for all components in the usage data
    for (const [stepType, components] of Object.entries(componentUsage)) {
      let order = 0;
      for (const component of components as any[]) {
        // Check if this component exists in the library
        if (validComponentIds.size > 0 && !validComponentIds.has(component.id)) {
          console.warn(`Component ${component.id} not found in library - creating anyway`);
        }
        
        instances.push({
          workflow_id: workflowId,
          component_id: component.id,
          organization_id: organizationId,
          label: component.name,
          required: true,
          position: {
            step: stepType,
            order: order++
          },
          validation_rules: {},
          styling: {}
        });
      }
    }
    
    if (instances.length > 0) {
      const { error } = await supabase
        .from('component_instances')
        .insert(instances);
      
      if (error) {
        console.error('Error creating component instances:', error);
        // Log more details about the error
        console.error('Failed instances:', instances);
      } else {
        console.log(`✅ Created ${instances.length} component instances`);
      }
    } else {
      console.log('⚠️ No valid component instances to create - components may not exist in library');
    }
  } catch (error) {
    console.error('Failed to create component instances:', error);
  }
}