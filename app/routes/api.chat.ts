import { type ActionFunctionArgs } from '@remix-run/node';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, organizationId } = await request.json<{ messages: Messages; organizationId?: string }>();
  
  // Check if this is a workflow request
  const lastMessage = messages[messages.length - 1];
  const isWorkflowRequest = lastMessage?.content?.includes('[WORKFLOW REQUEST]') || 
                           (lastMessage?.content?.toLowerCase().includes('workflow') && 
                            (lastMessage?.content?.toLowerCase().includes('create') || 
                             lastMessage?.content?.toLowerCase().includes('build') ||
                             lastMessage?.content?.toLowerCase().includes('generate')));

  if (isWorkflowRequest) {
    console.log('🚀 Chat API: Workflow request detected, delegating to workflow API');
    console.log('🏢 Organization ID:', organizationId);
    
    // Clean the message content
    const cleanedContent = lastMessage.content.replace('[WORKFLOW REQUEST]', '').trim();
    const workflowMessages = [...messages.slice(0, -1), { ...lastMessage, content: cleanedContent }];
    
    // Import and call the workflow API action directly
    try {
      const { action: workflowAction } = await import('./api.workflow-chat-v2');
      const workflowRequest = new Request(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: workflowMessages,
          organizationId 
        })
      });
      
      return await workflowAction({ context, request: workflowRequest });
    } catch (error) {
      console.error('Failed to delegate to workflow API:', error);
      // Fall back to regular chat
    }
  }

  const stream = new SwitchableStream();

  try {
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

        console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        const result = await streamText(messages, process.env, options);

        return stream.switchSource(result.toAIStream());
      },
    };

    const result = await streamText(messages, process.env, options);

    stream.switchSource(result.toAIStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
