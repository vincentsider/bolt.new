-- Fix RLS policies for workflows table to allow authenticated users to create workflows

-- Drop ALL existing policies on workflows table
DROP POLICY IF EXISTS "Builders and admins can create workflows" ON workflows;
DROP POLICY IF EXISTS "Builders and admins can update workflows" ON workflows;
DROP POLICY IF EXISTS "Builders and sysadmins can update workflows" ON workflows;
DROP POLICY IF EXISTS "Builders and sysadmins can delete workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view workflows in their organization" ON workflows;
DROP POLICY IF EXISTS "Authenticated users can create workflows" ON workflows;

-- Create more permissive policies that check role from users table
CREATE POLICY "Authenticated users can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IS NOT NULL
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
  );

CREATE POLICY "Users can view workflows in their organization"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.organization_id = workflows.organization_id
    )
  );

CREATE POLICY "Builders and sysadmins can update workflows"
  ON workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.organization_id = workflows.organization_id
      AND u.role IN ('builder', 'sysadmin')
    )
  );

CREATE POLICY "Builders and sysadmins can delete workflows"
  ON workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.organization_id = workflows.organization_id
      AND u.role IN ('builder', 'sysadmin')
    )
  );

-- Also ensure the updated_by field is properly set
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set updated_by
DROP TRIGGER IF EXISTS set_workflows_updated_by ON workflows;
CREATE TRIGGER set_workflows_updated_by
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();