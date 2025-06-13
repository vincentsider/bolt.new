import { type ActionFunctionArgs } from '@remix-run/node';

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

  console.log('Workflow chat API called')
  
  const { messages, triggerContext, organizationId } = await request.json<{ 
    messages: Messages, 
    triggerContext?: any,
    organizationId?: string 
  }>();
  console.log('Received messages:', messages.length)
  console.log('Trigger context:', triggerContext)
  console.log('Organization ID:', organizationId)
  
  // Fetch component library information for AI context
  let componentLibraryContext = ''
  if (organizationId) {
    try {
      // For now, we'll include basic component library info in the prompt
      // Later this should fetch from the actual database
      componentLibraryContext = `

COMPONENT LIBRARY CONTEXT:
Available components for this organization:
- Short Text Box (for names, emails, simple text)
- Long Text Box (for descriptions, comments)
- Number Field (for amounts, quantities)
- Date Picker (for dates, deadlines)
- Drop-down List (for categories, selections)
- File Upload (for documents, receipts)
- Approve/Reject Buttons (for approval decisions)
- Currency & Amount (for monetary values)
- Multi-Select List (for multiple choices)
- Yes/No Buttons (for binary decisions)

USE THESE COMPONENTS: When generating workflow code, you MUST use these pre-defined components rather than creating custom HTML forms. Map user requirements to appropriate components from this library.
`
    } catch (error) {
      console.log('Could not fetch component library context:', error)
    }
  }

  // Analyze the conversation to determine if this is a modification request
  const isModificationRequest = (() => {
    // If this is the first conversation (only welcome message), it's a new workflow
    if (messages.length <= 2) {
      return false;
    }

    // Look for file modifications tag in the latest user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return false;
    }

    // If the message contains file modifications, it's definitely a modification request
    if (lastUserMessage.content.includes('<workflowhub_file_modifications>')) {
      console.log('File modifications detected in message - treating as modification request');
      return true;
    }

    const content = lastUserMessage.content.toLowerCase();
    const modificationKeywords = [
      'fix', 'debug', 'error', 'bug', 'not working', 'broken', 'issue', 'problem',
      'update', 'modify', 'change', 'edit', 'improve', 'enhance', 'adjust',
      'add to', 'remove from', 'replace', 'correct', 'repair', 'submit'
    ];

    const hasModificationKeywords = modificationKeywords.some(keyword => content.includes(keyword));

    // Check if previous messages contain artifact generation (indicating existing workflow)
    const hasExistingWorkflow = messages.some(m => 
      m.role === 'assistant' && 
      (m.content.includes('boltArtifact') || m.content.includes('Workflow Generated Successfully'))
    );

    console.log('Modification detection:', {
      hasModificationKeywords,
      hasExistingWorkflow,
      lastUserMessage: content.substring(0, 100)
    });

    return hasModificationKeywords && hasExistingWorkflow;
  })();
  console.log('Is modification request:', isModificationRequest)

  try {
    // Dynamic imports to avoid server module issues during build
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

        console.log(`Reached max token limit (${MAX_WORKFLOW_TOKENS}): Continuing message (${switchesLeft} switches left)`);

        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: CONTINUE_PROMPT });

        // Always use workflow chat for continuation
        const result = await streamWorkflowText(messages, context.cloudflare.env, options);

        return stream.switchSource(result.toAIStream());
      },
    };

    console.log('Using workflow prompt for', isModificationRequest ? 'MODIFICATION request' : 'NEW workflow request', 'with', messages.length, 'messages')
    console.log('API key available:', !!context.cloudflare.env.ANTHROPIC_API_KEY)
    
    // Include component library context in the last user message
    if (componentLibraryContext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        lastMessage.content += componentLibraryContext
      }
    }
    
    // Always use workflow chat - it handles both new workflows and modifications
    const result = await streamWorkflowText(messages, context.cloudflare.env, options);
    
    console.log('Stream completed, switching stream source')

    stream.switchSource(result.toAIStream());

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