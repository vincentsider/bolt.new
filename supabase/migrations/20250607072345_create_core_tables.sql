-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table (multi-tenancy)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  settings JSONB DEFAULT '{
    "ssoEnabled": false,
    "allowedDomains": []
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'builder', 'user', 'approver')),
  profile JSONB DEFAULT '{
    "name": "",
    "avatar": null
  }'::jsonb,
  permissions JSONB DEFAULT '[]'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, email)
);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  prompt TEXT, -- Natural language spec that generated this workflow
  config JSONB NOT NULL DEFAULT '{
    "triggers": [],
    "steps": [],
    "settings": {
      "notificationChannels": [],
      "errorHandling": "stop",
      "maxRetries": 3,
      "timeoutMinutes": 60
    }
  }'::jsonb,
  permissions JSONB DEFAULT '{
    "executors": [],
    "editors": [],
    "viewers": []
  }'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused')),
  current_steps TEXT[] DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{
    "initiator": {},
    "data": {},
    "files": []
  }'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step executions table
CREATE TABLE step_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id VARCHAR(255) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  actor JSONB,
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  arcade_execution JSONB, -- Arcade integration details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration INTEGER, -- milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step actions table (audit trail)
CREATE TABLE step_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_execution_id UUID NOT NULL REFERENCES step_executions(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('submit', 'approve', 'reject', 'delegate', 'comment', 'save')),
  actor_id UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb,
  comment TEXT
);

-- Workflow component library
CREATE TABLE workflow_components (
  id VARCHAR(255) PRIMARY KEY,
  category VARCHAR(50) NOT NULL CHECK (category IN ('input', 'logic', 'integration', 'notification')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  template JSONB NOT NULL,
  config_schema JSONB NOT NULL,
  ui_guidelines JSONB NOT NULL DEFAULT '{
    "layout": {},
    "styling": {},
    "interaction": {},
    "accessibility": {}
  }'::jsonb,
  tags TEXT[] DEFAULT '{}',
  author VARCHAR(255),
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component usage tracking
CREATE TABLE component_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id VARCHAR(255) NOT NULL REFERENCES workflow_components(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- Workflow templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('finance', 'hr', 'operations', 'compliance', 'custom')),
  description TEXT,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for external access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE, -- bcrypt hash
  permissions JSONB DEFAULT '[]'::jsonb,
  last_used TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  api_key_id UUID REFERENCES api_keys(id),
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);
CREATE INDEX idx_step_executions_status ON step_executions(status);
CREATE INDEX idx_component_usage_organization_id ON component_usage(organization_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation

-- Organizations: users can only see their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id = (auth.jwt() ->> 'organization_id')::uuid);

-- Users: can view users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Workflows: organization isolation
CREATE POLICY "Users can view workflows in their organization"
  ON workflows FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Builders and admins can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('admin', 'builder')
  );

CREATE POLICY "Builders and admins can update workflows"
  ON workflows FOR UPDATE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('admin', 'builder')
  );

-- Workflow executions: organization isolation
CREATE POLICY "Users can view executions in their organization"
  ON workflow_executions FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Users can create executions in their organization"
  ON workflow_executions FOR INSERT
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Step executions: inherit from workflow executions
CREATE POLICY "Users can view step executions in their organization"
  ON step_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_executions we 
      WHERE we.id = execution_id 
      AND we.organization_id = (auth.jwt() ->> 'organization_id')::uuid
    )
  );

-- Component usage: organization isolation
CREATE POLICY "Users can track component usage in their organization"
  ON component_usage FOR ALL
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- API keys: organization isolation
CREATE POLICY "Users can manage API keys in their organization"
  ON api_keys FOR ALL
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Audit logs: organization isolation
CREATE POLICY "Users can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_step_executions_updated_at BEFORE UPDATE ON step_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_components_updated_at BEFORE UPDATE ON workflow_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();