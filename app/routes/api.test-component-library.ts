import { type ActionFunctionArgs } from '@remix-run/node';
import { ComponentLoader } from '~/lib/.server/component-loader';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { organizationId, workflowDescription } = await request.json<{
      organizationId: string;
      workflowDescription: string;
    }>();

    console.log('🧪 Testing component library integration...');
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Workflow Description: ${workflowDescription}`);

    // Test 1: Load components
    const componentLoader = new ComponentLoader(organizationId);
    const loadedComponents = await componentLoader.loadComponentsForWorkflow(workflowDescription);
    
    console.log('📦 Loaded Components:');
    console.log(`- Capture: ${loadedComponents.capture.length}`);
    console.log(`- Review: ${loadedComponents.review.length}`);
    console.log(`- Approval: ${loadedComponents.approval.length}`);
    console.log(`- Update: ${loadedComponents.update.length}`);

    // Test 2: Generate form HTML with components
    const testFields = [
      { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'amount', label: 'Expense Amount', type: 'number', required: true },
      { name: 'receipt', label: 'Receipt Upload', type: 'file', required: true },
      { name: 'description', label: 'Description', type: 'textarea' }
    ];

    const { html, css, usedComponents } = await componentLoader.generateFormHtml(
      loadedComponents.capture,
      testFields
    );

    // Test 3: Check if we have component templates
    let hasTemplates = false;
    if (loadedComponents.capture.length > 0) {
      const firstComponent = loadedComponents.capture[0];
      hasTemplates = !!firstComponent.html_template;
    }

    return new Response(JSON.stringify({
      success: true,
      test: 'Component Library Integration Test',
      results: {
        componentsLoaded: {
          total: loadedComponents.capture.length + loadedComponents.review.length + 
                 loadedComponents.approval.length + loadedComponents.update.length,
          byStep: {
            capture: loadedComponents.capture.length,
            review: loadedComponents.review.length,
            approval: loadedComponents.approval.length,
            update: loadedComponents.update.length
          }
        },
        formGeneration: {
          fieldsProvided: testFields.length,
          componentsUsed: usedComponents.length,
          htmlLength: html.length,
          cssLength: css.length,
          components: usedComponents
        },
        templateProcessing: {
          hasTemplates: hasTemplates,
          componentsWithTemplates: loadedComponents.capture.filter(c => !!c.html_template).length
        },
        topComponents: loadedComponents.capture.slice(0, 3).map((c: any) => ({
          name: c.name,
          type: c.component_type,
          confidence: c.confidence,
          hasTemplate: !!c.html_template
        }))
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Component library test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}