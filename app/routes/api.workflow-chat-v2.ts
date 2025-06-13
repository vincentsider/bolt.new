import { type ActionFunctionArgs } from '@remix-run/node';
import { generateWorkflowApplication } from '~/lib/workflow/generators';
import { ComponentLoader } from '~/lib/.server/component-loader';
import type { Workflow, WorkflowStep } from '~/types/database';

export async function action({ context, request }: ActionFunctionArgs) {
  // Local type definitions
  interface Message {
    role: 'user' | 'assistant';
    content: string;
    toolInvocations?: any[];
  }
  type Messages = Message[];
  interface StreamingOptions {
    toolChoice?: 'none' | 'auto';
    onFinish?: (result: { text: string; finishReason: string }) => Promise<void> | void;
  }

  console.log('Workflow chat API v2 called - WebContainer mode')
  
  const { messages, triggerContext, organizationId } = await request.json<{ 
    messages: Messages, 
    triggerContext?: any,
    organizationId?: string 
  }>();
  console.log('Received messages:', messages.length)
  console.log('Organization ID:', organizationId)

  // Load components if organizationId is provided
  let componentInfo = '';
  let loadedComponents: any = null;
  
  if (organizationId && messages.length > 0) {
    try {
      console.log('🎯 Loading component library for organization...');
      const componentLoader = new ComponentLoader(organizationId, context);
      const userRequest = messages[0].content;
      loadedComponents = await componentLoader.loadComponentsForWorkflow(userRequest);
      
      // Create component information for the prompt
      const componentList = [
        ...loadedComponents.capture.map((c: any) => `- ${c.name}: ${c.description} (confidence: ${c.confidence})`),
        ...loadedComponents.review.map((c: any) => `- ${c.name}: ${c.description} (confidence: ${c.confidence})`),
        ...loadedComponents.approval.map((c: any) => `- ${c.name}: ${c.description} (confidence: ${c.confidence})`),
        ...loadedComponents.update.map((c: any) => `- ${c.name}: ${c.description} (confidence: ${c.confidence})`)
      ];
      
      if (componentList.length > 0) {
        // Create detailed component templates for the AI to use
        const componentTemplates = [];
        
        // Add capture components with their actual HTML templates
        for (const component of loadedComponents.capture.slice(0, 5)) { // Top 5 most relevant
          if (component.html_template) {
            componentTemplates.push(`
<!-- Component: ${component.name} -->
<!-- Usage: ${component.description} -->
${component.html_template}
`);
          }
        }
        
        componentInfo = `
🎨 AVAILABLE COMPONENTS FROM ORGANIZATION'S LIBRARY:
The following pre-built, tested components are available for this workflow:

${componentList.join('\n')}

📋 COMPONENT TEMPLATES TO USE:
Here are the exact HTML templates you MUST use for these components:

${componentTemplates.join('\n')}

IMPORTANT: 
1. Use these EXACT component templates in your generated HTML forms
2. Replace placeholders like {{name}}, {{label}}, {{required}} with actual values
3. These components have standardized styling that users expect
4. DO NOT create custom form fields if a component exists for that purpose
`;
        console.log(`✅ Loaded ${componentList.length} components from library with ${componentTemplates.length} templates`);
      }
    } catch (error) {
      console.error('Failed to load components:', error);
    }
  }

  // Enhanced prompt for Node.js workflow generation with component library integration
  const workflowPrompt = `
You are an expert workflow automation engineer. Generate complete Node.js workflow applications using Express.js.

🎯 COMPONENT LIBRARY INTEGRATION:
- This organization has a component library with standardized, pre-tested workflow components
- Use professional, enterprise-grade components for forms, approvals, and integrations
${componentInfo}
- Generate workflows that will utilize these standardized components for consistency

IMPORTANT: You must generate a FULL Node.js application with:
1. Express.js server with API endpoints
2. JSON file-based database for data persistence (NO SQLite - use fs.writeFileSync/readFileSync)
3. Email notifications via nodemailer
4. File upload support via multer
5. Beautiful HTML/CSS/JS frontend that works with component library templates
6. Complete workflow execution engine
7. Professional styling that matches enterprise component standards

CRITICAL: Use only JSON files for data storage. Never use SQLite, better-sqlite3, or any binary dependencies.

When the user describes a workflow, create a complete, production-ready Node.js application that will integrate seamlessly with the component library system.

RESPONSE FORMAT:
You must respond with a boltArtifact containing all the necessary files for a complete Node.js workflow application.

Example structure:
<boltArtifact id="workflow-app" title="Expense Approval Workflow">
<boltAction type="file" filePath="package.json">
{
  "name": "expense-approval-workflow",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.8",
    "dotenv": "^16.3.1"
  }
}
</boltAction>
<boltAction type="file" filePath="server.js">
// Complete Express.js server code here
</boltAction>
<!-- Include all other necessary files -->
</boltArtifact>

The workflow should handle the 4-step pattern:
1. Capture - Data collection forms
2. Review - Review submitted data
3. Approval - Approve/reject decisions
4. Update - System integrations and notifications

Make the application fully functional with real database operations, email sending, and file handling.
`;

  // Analyze if this is a modification request
  const isModificationRequest = messages.length > 2 && messages.some(m => 
    m.role === 'assistant' && m.content.includes('boltArtifact')
  );

  try {
    // Dynamic imports
    const [
      { MAX_RESPONSE_SEGMENTS, MAX_WORKFLOW_TOKENS },
      { CONTINUE_PROMPT },
      { streamWorkflowText },
      SwitchableStreamModule
    ] = await Promise.all([
      import('~/lib/.server/llm/constants'),
      import('~/lib/.server/llm/workflow-prompts'),
      import('~/lib/.server/llm/stream-text'),
      import('~/lib/.server/llm/switchable-stream')
    ]);

    const SwitchableStream = SwitchableStreamModule.default;
    const stream = new SwitchableStream();

    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        if (finishReason !== 'length') {
          return stream.close();
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error('Cannot continue message: Maximum segments reached');
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
        console.log(`Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamWorkflowText(messages, context.cloudflare.env, options);
        return stream.switchSource(result.toAIStream());
      },
    };

    // Add workflow prompt to the conversation
    const enhancedMessages = [...messages];
    if (!isModificationRequest && enhancedMessages.length > 0) {
      enhancedMessages[0] = {
        ...enhancedMessages[0],
        content: workflowPrompt + '\n\nUser request: ' + enhancedMessages[0].content
      };
    }

    console.log('Streaming workflow response with WebContainer context...')
    const result = await streamWorkflowText(enhancedMessages, context.cloudflare.env, options);
    
    stream.switchSource(result.toAIStream());
    
    // Log component usage analytics
    if (loadedComponents && organizationId) {
      // This runs async in the background, doesn't block the response
      logComponentGeneration(organizationId, messages[0].content, loadedComponents).catch(err => {
        console.error('Failed to log component usage:', err);
      });
    }

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Workflow chat API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Helper function to log component usage for analytics
async function logComponentGeneration(
  organizationId: string,
  workflowDescription: string,
  loadedComponents: any
) {
  try {
    console.log('📊 Logging component generation analytics...');
    
    // Get Supabase client
    const { getSupabaseServer } = await import('~/lib/.server/supabase');
    const supabase = getSupabaseServer();
    
    // Log each component suggestion to database
    const logs = [];
    for (const [context, components] of Object.entries(loadedComponents)) {
      for (const component of components as any[]) {
        logs.push({
          organization_id: organizationId,
          component_id: component.id,
          workflow_description: workflowDescription,
          usage_context: context,
          confidence: component.confidence || 1
        });
      }
    }
    
    if (logs.length > 0) {
      const { error } = await supabase
        .from('component_usage_logs')
        .insert(logs);
      
      if (error) {
        console.error('Error logging component usage:', error);
      } else {
        console.log(`✅ Logged ${logs.length} component usage records`);
      }
    }
    
    // Count total components suggested
    const totalComponents = 
      loadedComponents.capture.length +
      loadedComponents.review.length +
      loadedComponents.approval.length +
      loadedComponents.update.length;
    
    console.log(`📈 Analytics: ${totalComponents} components suggested for workflow generation`);
    
    // Here we could save to database if needed
    // For now, just log the summary
    console.log('Component breakdown:');
    console.log(`- Capture: ${loadedComponents.capture.length} components`);
    console.log(`- Review: ${loadedComponents.review.length} components`);
    console.log(`- Approval: ${loadedComponents.approval.length} components`);
    console.log(`- Update: ${loadedComponents.update.length} components`);
    
  } catch (error) {
    console.error('Error logging component generation:', error);
  }
}