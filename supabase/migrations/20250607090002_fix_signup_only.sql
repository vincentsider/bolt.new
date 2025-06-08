-- Fix signup issues and RLS policies (simplified version)
-- This fixes only the immediate signup problems without touching field-level security

-- Step 1: Drop the problematic organizations RLS policy that prevents signup
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Step 2: Create a more permissive organization policy for signup
CREATE POLICY "Users can create and view their organization"
  ON organizations FOR ALL
  USING (
    -- Allow if user belongs to this org (from JWT)
    id = (auth.jwt() ->> 'organization_id')::uuid
    OR 
    -- Allow during signup when no organization_id in JWT yet
    (auth.jwt() ->> 'organization_id') IS NULL
  )
  WITH CHECK (
    -- Same conditions for INSERT/UPDATE
    id = (auth.jwt() ->> 'organization_id')::uuid
    OR 
    (auth.jwt() ->> 'organization_id') IS NULL
  );

-- Step 3: Fix users table RLS policy to allow user creation during signup
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

CREATE POLICY "Users can manage their profile and view org users"
  ON users FOR ALL
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Same organization
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    OR
    -- During signup when no org in JWT yet
    (auth.jwt() ->> 'organization_id') IS NULL
  )
  WITH CHECK (
    -- Can create/update own profile
    id = auth.uid()
    OR
    -- Can create users in same org
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    OR
    -- During signup
    (auth.jwt() ->> 'organization_id') IS NULL
  );

-- Step 4: Create a simple signup helper function (without field-level security)
CREATE OR REPLACE FUNCTION handle_new_user_signup(
  p_email TEXT,
  p_name TEXT,
  p_organization_name TEXT
) RETURNS JSONB AS $$
DECLARE
  new_org_id UUID;
  new_user_id UUID;
  org_slug TEXT;
  result JSONB;
BEGIN
  -- Get the user ID from auth context
  new_user_id := auth.uid();
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to sign up';
  END IF;

  -- Generate organization slug from name
  org_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := regexp_replace(org_slug, '^-+|-+$', '', 'g');
  
  -- Make sure slug is unique
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    org_slug := org_slug || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Create organization
  INSERT INTO organizations (name, slug, plan)
  VALUES (p_organization_name, org_slug, 'starter')
  RETURNING id INTO new_org_id;

  -- Create user profile with sysadmin role (first user is admin)
  INSERT INTO users (id, organization_id, email, role, profile)
  VALUES (
    new_user_id,
    new_org_id,
    p_email,
    'sysadmin',
    jsonb_build_object('name', p_name)
  );

  -- Return success with org info
  result := jsonb_build_object(
    'success', true,
    'organization_id', new_org_id,
    'organization_slug', org_slug,
    'user_role', 'sysadmin'
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 6: Add policy for workflow templates (public read access)
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured templates"
  ON workflow_templates FOR SELECT
  USING (featured = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create templates"
  ON workflow_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 7: Fix API access for the application
-- Create policy to allow users to insert workflow executions
CREATE POLICY "Users can create workflow executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    AND EXISTS (
      SELECT 1 FROM workflows w 
      WHERE w.id = workflow_id 
      AND w.organization_id = organization_id
    )
  );

-- Allow users to update workflow executions they can see
CREATE POLICY "Users can update workflow executions in their org"
  ON workflow_executions FOR UPDATE
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Allow users to insert step executions for their org's workflow executions
CREATE POLICY "Users can create step executions"
  ON step_executions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_executions we 
      WHERE we.id = execution_id 
      AND we.organization_id = (auth.jwt() ->> 'organization_id')::uuid
    )
  );

-- Allow users to update step executions
CREATE POLICY "Users can update step executions"
  ON step_executions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflow_executions we 
      WHERE we.id = execution_id 
      AND we.organization_id = (auth.jwt() ->> 'organization_id')::uuid
    )
  );