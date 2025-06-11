-- Create component usage logs table for analytics
CREATE TABLE IF NOT EXISTS component_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES component_definitions(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  workflow_description TEXT,
  usage_context TEXT CHECK (usage_context IN ('capture', 'review', 'approval', 'update')),
  confidence_score INTEGER DEFAULT 0,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_component_usage_org ON component_usage_logs(organization_id);
CREATE INDEX idx_component_usage_component ON component_usage_logs(component_id);
CREATE INDEX idx_component_usage_date ON component_usage_logs(used_at);
CREATE INDEX idx_component_usage_context ON component_usage_logs(usage_context);

-- Add RLS policies
ALTER TABLE component_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view usage logs for their organization
CREATE POLICY "Users can view their organization's component usage logs"
  ON component_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = component_usage_logs.organization_id
    )
  );

-- Policy: System can insert usage logs
CREATE POLICY "System can insert component usage logs"
  ON component_usage_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = component_usage_logs.organization_id
    )
  );