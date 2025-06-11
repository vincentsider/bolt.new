-- Migration: Cleanup unused tables and add workflow persistence
-- Date: 2025-06-12

-- 1. Drop unused workflow_components table
DROP TABLE IF EXISTS workflow_components CASCADE;

-- 2. Add missing fields to workflows table for WebContainer integration
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webcontainer_id TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS generated_files JSONB;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS component_usage JSONB;

-- 3. Create component_usage_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS component_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workflow_id UUID REFERENCES workflows(id),
  component_id UUID NOT NULL REFERENCES component_definitions(id),
  workflow_description TEXT,
  usage_context TEXT CHECK (usage_context IN ('capture', 'review', 'approval', 'update')),
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_usage_logs_org ON component_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_component_usage_logs_workflow ON component_usage_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_component_usage_logs_component ON component_usage_logs(component_id);

-- 5. Create RLS policies for component_usage_logs
ALTER TABLE component_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's usage logs" ON component_usage_logs
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert usage logs" ON component_usage_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 6. Add workflow persistence function
CREATE OR REPLACE FUNCTION create_workflow_from_generation(
  p_organization_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_webcontainer_id TEXT,
  p_generated_files JSONB,
  p_component_usage JSONB,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Insert workflow
  INSERT INTO workflows (
    organization_id,
    name,
    description,
    status,
    webcontainer_id,
    generated_files,
    component_usage,
    created_by,
    prompt
  ) VALUES (
    p_organization_id,
    p_name,
    p_description,
    'draft',
    p_webcontainer_id,
    p_generated_files,
    p_component_usage,
    p_created_by,
    p_description -- Use description as prompt for now
  ) RETURNING id INTO v_workflow_id;
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_workflow_from_generation TO authenticated, anon;