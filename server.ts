import { createRequestHandler } from '@remix-run/cloudflare';
import * as build from './build/server';

const handleRequest = createRequestHandler(build, process.env.NODE_ENV);

export default {
  async fetch(request: Request, env: any, ctx: any) {
    return handleRequest(request, {
      cloudflare: {
        env,
        ctx,
      },
    });
  },
};