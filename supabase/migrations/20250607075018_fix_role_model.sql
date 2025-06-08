-- Fix user role model to match PRD requirements
-- PRD requires: builder, reviewer, approver, auditor, sysadmin
-- Current: admin, builder, user, approver

-- Step 1: Update existing 'admin' roles to 'sysadmin'
UPDATE users SET role = 'sysadmin' WHERE role = 'admin';

-- Step 2: Update existing 'user' roles to 'reviewer' (most logical mapping)
UPDATE users SET role = 'reviewer' WHERE role = 'user';

-- Step 3: Drop old constraint and add new one
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('builder', 'reviewer', 'approver', 'auditor', 'sysadmin'));

-- Step 4: Update RLS policies to use new roles
DROP POLICY "Builders and admins can create workflows" ON workflows;
DROP POLICY "Builders and admins can update workflows" ON workflows;

CREATE POLICY "Builders and sysadmins can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('sysadmin', 'builder')
  );

CREATE POLICY "Builders and sysadmins can update workflows"
  ON workflows FOR UPDATE
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('sysadmin', 'builder')
  );

-- Step 5: Add role-specific permissions for new roles
CREATE POLICY "Reviewers can view workflows for review"
  ON workflows FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (
      (auth.jwt() ->> 'role') IN ('sysadmin', 'builder', 'reviewer', 'auditor') OR
      (auth.jwt() ->> 'role') = 'approver' AND status = 'published'
    )
  );

CREATE POLICY "Auditors can view all workflow data"
  ON workflow_executions FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('sysadmin', 'auditor')
  );

-- Step 6: Update audit logs policy for auditors
CREATE POLICY "Auditors can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid 
    AND (auth.jwt() ->> 'role') IN ('sysadmin', 'auditor')
  );