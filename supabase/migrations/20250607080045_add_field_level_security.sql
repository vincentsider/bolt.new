-- Add field-level security with column-level RLS policies
-- This implements data classification and column-level access control

-- Step 1: Add data classification columns to track sensitive fields
ALTER TABLE workflows ADD COLUMN data_classification JSONB DEFAULT '{}';
ALTER TABLE workflow_executions ADD COLUMN data_classification JSONB DEFAULT '{}';
ALTER TABLE step_executions ADD COLUMN data_classification JSONB DEFAULT '{}';

-- Step 2: Create data classification levels enum
CREATE TYPE data_classification_level AS ENUM ('public', 'internal', 'confidential', 'restricted');

-- Step 3: Create field access control table
CREATE TABLE field_access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  classification_level data_classification_level NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, table_name, column_name)
);

-- Step 4: Enable RLS on field access policies
ALTER TABLE field_access_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for field policies"
  ON field_access_policies FOR ALL
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Step 5: Create function to check field access
CREATE OR REPLACE FUNCTION check_field_access(
  p_table_name TEXT,
  p_column_name TEXT,
  p_user_role TEXT,
  p_organization_id UUID,
  p_context JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
  policy_record RECORD;
  condition_result BOOLEAN;
BEGIN
  -- Get the field access policy
  SELECT * INTO policy_record
  FROM field_access_policies
  WHERE organization_id = p_organization_id
    AND table_name = p_table_name
    AND column_name = p_column_name;

  -- If no policy exists, allow access (default permissive)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check if user role is allowed
  IF NOT (p_user_role = ANY(policy_record.allowed_roles)) THEN
    RETURN FALSE;
  END IF;

  -- TODO: Implement condition evaluation if needed
  -- For now, return true if role is allowed
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create secure view functions for sensitive data
CREATE OR REPLACE FUNCTION get_workflow_secure(
  p_workflow_id UUID,
  p_user_role TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  workflow_data JSONB;
  user_role TEXT;
  org_id UUID;
  result JSONB;
BEGIN
  -- Get user context from JWT if not provided
  user_role := COALESCE(p_user_role, auth.jwt() ->> 'role');
  org_id := COALESCE(p_organization_id, (auth.jwt() ->> 'organization_id')::uuid);

  -- Get base workflow data
  SELECT to_jsonb(w.*) INTO workflow_data
  FROM workflows w
  WHERE w.id = p_workflow_id
    AND w.organization_id = org_id;

  IF workflow_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Start with base data
  result := workflow_data;

  -- Apply field-level restrictions based on role
  CASE user_role
    WHEN 'auditor', 'sysadmin' THEN
      -- Auditors and sysadmins see everything
      NULL;
    WHEN 'approver' THEN
      -- Approvers don't see draft configurations
      IF (workflow_data->>'status') = 'draft' THEN
        result := result - 'config' - 'prompt';
      END IF;
    WHEN 'reviewer' THEN
      -- Reviewers see limited data
      result := result - 'permissions' - 'created_by' - 'updated_by';
    WHEN 'builder' THEN
      -- Builders see everything they create or have permission to edit
      IF NOT (
        workflow_data->>'created_by' = auth.uid()::text OR
        auth.uid()::text = ANY(
          SELECT jsonb_array_elements_text(workflow_data->'permissions'->'editors')
        )
      ) THEN
        result := result - 'config' - 'prompt';
      END IF;
    ELSE
      -- Unknown role, return minimal data
      result := jsonb_build_object(
        'id', workflow_data->>'id',
        'name', workflow_data->>'name',
        'status', workflow_data->>'status'
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create secure view function for execution data
CREATE OR REPLACE FUNCTION get_execution_secure(
  p_execution_id UUID,
  p_user_role TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  execution_data JSONB;
  user_role TEXT;
  org_id UUID;
  result JSONB;
BEGIN
  user_role := COALESCE(p_user_role, auth.jwt() ->> 'role');
  org_id := COALESCE(p_organization_id, (auth.jwt() ->> 'organization_id')::uuid);

  SELECT to_jsonb(e.*) INTO execution_data
  FROM workflow_executions e
  WHERE e.id = p_execution_id
    AND e.organization_id = org_id;

  IF execution_data IS NULL THEN
    RETURN NULL;
  END IF;

  result := execution_data;

  -- Apply role-based filtering
  CASE user_role
    WHEN 'auditor', 'sysadmin' THEN
      -- Full access
      NULL;
    WHEN 'approver' THEN
      -- Approvers see execution data but not raw context
      result := result || jsonb_build_object(
        'context', jsonb_build_object(
          'initiator', execution_data->'context'->'initiator'
          -- Hide raw data and files for privacy
        )
      );
    WHEN 'reviewer', 'builder' THEN
      -- Limited access to execution details
      result := result - 'context';
    ELSE
      -- Minimal data
      result := jsonb_build_object(
        'id', execution_data->>'id',
        'workflow_id', execution_data->>'workflow_id',
        'status', execution_data->>'status'
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create data masking function for PII
CREATE OR REPLACE FUNCTION mask_sensitive_data(
  p_data JSONB,
  p_user_role TEXT,
  p_data_classification JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  key TEXT;
  value JSONB;
  classification TEXT;
BEGIN
  result := '{}';

  -- Iterate through all keys in the data
  FOR key, value IN SELECT * FROM jsonb_each(p_data) LOOP
    -- Get classification for this field
    classification := COALESCE(p_data_classification->>key, 'internal');

    -- Apply masking based on role and classification
    CASE 
      WHEN p_user_role IN ('sysadmin', 'auditor') THEN
        -- Full access
        result := result || jsonb_build_object(key, value);
      WHEN classification = 'public' THEN
        -- Public data visible to all
        result := result || jsonb_build_object(key, value);
      WHEN classification = 'internal' AND p_user_role IN ('approver', 'reviewer', 'builder') THEN
        -- Internal data visible to internal roles
        result := result || jsonb_build_object(key, value);
      WHEN classification IN ('confidential', 'restricted') AND p_user_role IN ('approver') THEN
        -- Confidential data only for approvers+
        result := result || jsonb_build_object(key, value);
      ELSE
        -- Mask sensitive data
        IF jsonb_typeof(value) = 'string' THEN
          result := result || jsonb_build_object(key, '"[REDACTED]"');
        ELSE
          result := result || jsonb_build_object(key, 'null');
        END IF;
    END CASE;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Add common field access policies for financial services
INSERT INTO field_access_policies (organization_id, table_name, column_name, classification_level, allowed_roles) VALUES
  -- For all organizations (using a placeholder, should be set per org)
  ((SELECT id FROM organizations LIMIT 1), 'workflow_executions', 'context', 'confidential', ARRAY['sysadmin', 'auditor', 'approver']),
  ((SELECT id FROM organizations LIMIT 1), 'step_executions', 'input', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
  ((SELECT id FROM organizations LIMIT 1), 'step_executions', 'output', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
  ((SELECT id FROM organizations LIMIT 1), 'workflows', 'config', 'internal', ARRAY['sysadmin', 'builder']),
  ((SELECT id FROM organizations LIMIT 1), 'workflows', 'permissions', 'confidential', ARRAY['sysadmin', 'auditor']);

-- Step 10: Create audit trigger for field access
CREATE OR REPLACE FUNCTION audit_field_access() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource,
    resource_id,
    metadata,
    timestamp
  ) VALUES (
    COALESCE((auth.jwt() ->> 'organization_id')::uuid, NEW.organization_id),
    (auth.jwt() ->> 'sub')::uuid,
    TG_OP,
    'field_access_policy',
    NEW.id::text,
    jsonb_build_object(
      'table_name', NEW.table_name,
      'column_name', NEW.column_name,
      'classification_level', NEW.classification_level,
      'allowed_roles', NEW.allowed_roles
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER field_access_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON field_access_policies
  FOR EACH ROW EXECUTE FUNCTION audit_field_access();

-- Step 11: Update existing RLS policies to use field-level security
CREATE POLICY "Field-level security for workflow data"
  ON workflows FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    -- Additional field-level checks handled by secure functions
  );

-- Step 12: Create helper function to initialize field policies for new organizations
CREATE OR REPLACE FUNCTION initialize_field_policies_for_org(p_organization_id UUID) RETURNS VOID AS $$
BEGIN
  INSERT INTO field_access_policies (organization_id, table_name, column_name, classification_level, allowed_roles) VALUES
    (p_organization_id, 'workflow_executions', 'context', 'confidential', ARRAY['sysadmin', 'auditor', 'approver']),
    (p_organization_id, 'step_executions', 'input', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
    (p_organization_id, 'step_executions', 'output', 'internal', ARRAY['sysadmin', 'auditor', 'approver', 'builder']),
    (p_organization_id, 'workflows', 'config', 'internal', ARRAY['sysadmin', 'builder']),
    (p_organization_id, 'workflows', 'permissions', 'confidential', ARRAY['sysadmin', 'auditor'])
  ON CONFLICT (organization_id, table_name, column_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;