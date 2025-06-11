import type { Workflow } from '~/types/database';

export function generatePackageJson(workflow: Workflow): string {
  const name = workflow.name?.toLowerCase().replace(/\s+/g, '-') || 'workflow-app';
  
  return JSON.stringify({
    name,
    version: '1.0.0',
    description: workflow.description || `${workflow.name} - Generated workflow application`,
    type: 'module',
    main: 'server.js',
    scripts: {
      'dev': 'node server.js',
      'start': 'NODE_ENV=production node server.js',
      'test': 'echo "No tests configured" && exit 0'
    },
    dependencies: {
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'multer': '^1.4.5-lts.1',
      'nodemailer': '^6.9.8',
      'dotenv': '^16.3.1'
    },
    engines: {
      'node': '>=16.0.0'
    },
    author: 'WorkflowHub',
    license: 'MIT'
  }, null, 2);
}