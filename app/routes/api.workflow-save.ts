import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { persistWorkflow } from '~/lib/.server/workflow-persistence';

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const data = await request.json();
    const {
      organizationId,
      name,
      description,
      webcontainerId,
      generatedFiles,
      componentUsage,
      userId
    } = data;
    
    if (!organizationId || !name) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const workflow = await persistWorkflow({
      organizationId,
      name,
      description,
      webcontainerId,
      generatedFiles,
      componentUsage,
      userId
    }, context);
    
    if (!workflow) {
      return json({ error: 'Failed to save workflow' }, { status: 500 });
    }
    
    return json({ 
      success: true, 
      workflowId: workflow.id,
      message: 'Workflow saved successfully'
    });
  } catch (error) {
    console.error('Error in workflow save API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}