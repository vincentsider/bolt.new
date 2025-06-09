import { type ActionFunctionArgs } from '@remix-run/cloudflare';

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
  
  const { messages } = await request.json<{ messages: Messages }>();
  console.log('Received messages:', messages.length)

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