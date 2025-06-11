#!/bin/sh
# Fix ESM/CJS import issues

echo "Fixing ESM/CJS imports..."

# Create a patched entry.server.tsx
cat > app/entry.server.tsx << 'EOF'
import type { AppLoadContext, EntryContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

// Fix for ESM/CJS compatibility
const ReactDOMServer = require('react-dom/server');
const { renderToReadableStream } = ReactDOMServer;

let encoder: TextEncoder;
function getEncoder() {
  if (!encoder) {
    encoder = new TextEncoder();
  }
  return encoder;
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  try {
    const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    });

    const theme = themeStore.get();
    const isBot = isbot(request.headers.get('user-agent'));

    responseHeaders.set('Content-Type', 'text/html');
    responseHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
    responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return new Response(readable, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } catch (error) {
    console.error('SSR Error:', error);
    // Fallback response
    return new Response('Internal Server Error', {
      status: 500,
      headers: responseHeaders,
    });
  }
}
EOF

echo "Import fixes applied!"