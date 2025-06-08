-- Fix field-level security migration issues
-- Remove problematic default inserts and fix the initialization function

-- Step 1: Drop the problematic default field policies that cause constraint violations
DELETE FROM field_access_policies 
WHERE organization_id IS NULL 
   OR organization_id NOT IN (SELECT id FROM organizations);

-- Step 2: Fix the initialization function to be more robust
CREATE OR REPLACE FUNCTION initialize_field_policies_for_org(p_organization_id UUID) RETURNS VOID AS $$
BEGIN
  -- Validate that the organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization % does not exist', p_organization_id;
  END IF;

  -- Insert field access policies with proper organization_id
  INSERT INTO field_access_policies (organization_id, table_name, column_name, classification_level, allowed_roles) VALUES
    (p_organization_id, 'workflow_executions', 'context', 'confidential', ARRAY['sysadmin', 'auditor', 'approver']),
    (p_organization_id, 'step_executions', 'input', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
    (p_organization_id, 'step_executions', 'output', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
    (p_organization_id, 'workflows', 'config', 'internal', ARRAY['sysadmin', 'builder']),
    (p_organization_id, 'workflows', 'permissions', 'confidential', ARRAY['sysadmin', 'auditor'])
  ON CONFLICT (organization_id, table_name, column_name) DO NOTHING;
  
  -- Log the initialization
  INSERT INTO audit_logs (
    organization_id,
    action,
    resource,
    resource_id,
    metadata,
    timestamp
  ) VALUES (
    p_organization_id,
    'INITIALIZE',
    'field_access_policies',
    p_organization_id::text,
    jsonb_build_object('message', 'Field-level security policies initialized for organization'),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Remove the broken field-level security policy that conflicts
DROP POLICY IF EXISTS "Field-level security for workflow data" ON workflows;

-- Step 4: Fix audit trigger to handle cases where organization_id might be null
CREATE OR REPLACE FUNCTION audit_field_access() RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  user_id UUID;
BEGIN
  -- Get organization_id from the record being modified
  org_id := COALESCE(
    (auth.jwt() ->> 'organization_id')::uuid, 
    NEW.organization_id,
    OLD.organization_id
  );
  
  -- Get user_id from JWT
  user_id := (auth.jwt() ->> 'sub')::uuid;
  
  -- Only log if we have a valid organization_id
  IF org_id IS NOT NULL THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      resource,
      resource_id,
      metadata,
      timestamp
    ) VALUES (
      org_id,
      user_id,
      TG_OP,
      'field_access_policy',
      COALESCE(NEW.id, OLD.id)::text,
      jsonb_build_object(
        'table_name', COALESCE(NEW.table_name, OLD.table_name),
        'column_name', COALESCE(NEW.column_name, OLD.column_name),
        'classification_level', COALESCE(NEW.classification_level, OLD.classification_level),
        'allowed_roles', COALESCE(NEW.allowed_roles, OLD.allowed_roles)
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS field_access_audit_trigger ON field_access_policies;
CREATE TRIGGER field_access_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON field_access_policies
  FOR EACH ROW EXECUTE FUNCTION audit_field_access();