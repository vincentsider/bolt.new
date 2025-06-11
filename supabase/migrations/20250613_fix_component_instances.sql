-- Fix component_instances table to add organization_id field
-- This is required for proper multi-tenant isolation and persistence

-- Add organization_id column to component_instances
ALTER TABLE component_instances 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Update existing records to set organization_id from workflow
UPDATE component_instances ci
SET organization_id = w.organization_id
FROM workflows w
WHERE ci.workflow_id = w.id
AND ci.organization_id IS NULL;

-- Make organization_id NOT NULL after populating
ALTER TABLE component_instances 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_component_instances_org 
ON component_instances(organization_id);

-- Update RLS policies to include organization check
DROP POLICY IF EXISTS "Users can manage component instances for their workflows" ON component_instances;

CREATE POLICY "Users can manage component instances for their workflows"
  ON component_instances FOR ALL
  USING (
    organization_id = get_user_organization_id() AND
    workflow_id IN (
      SELECT id FROM workflows 
      WHERE organization_id = get_user_organization_id()
    )
  );

-- Create a simplified view that maps to component_library for easier access
CREATE OR REPLACE VIEW component_library AS
SELECT 
  cd.id,
  cd.organization_id,
  cd.name,
  cd.description,
  cd.component_type,
  cd.component_group,
  cd.ai_keywords,
  cd.typical_examples,
  cd.properties,
  cd.icon,
  cd.color,
  cd.compatible_steps,
  cd.html_template,
  cd.css_classes,
  cd.js_validation,
  cd.active,
  cd.created_at,
  cd.updated_at
FROM component_definitions cd
INNER JOIN component_libraries cl ON cd.library_id = cl.id
WHERE cl.is_default = true
  AND cd.active = true
  AND cl.active = true;

-- Grant access to the view
GRANT SELECT ON component_library TO authenticated, anon;

-- Add comment to explain the view
COMMENT ON VIEW component_library IS 'Simplified view of active components from the default library for each organization';