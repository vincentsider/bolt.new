-- Fix RLS policies for component tables

-- 1. Check current user's organization
SELECT u.id, u.organization_id, u.role, o.name as org_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.id = auth.uid();

-- 2. Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('component_libraries', 'component_definitions')
ORDER BY tablename, policyname;

-- 3. Create or replace RLS policies to allow users to see their organization's components

-- Drop existing policies if needed
DROP POLICY IF EXISTS "Users can view their organization's component libraries" ON component_libraries;
DROP POLICY IF EXISTS "Users can view their organization's components" ON component_definitions;

-- Create new policies that allow users to see their org's components
CREATE POLICY "Users can view their organization's component libraries" 
ON component_libraries FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view their organization's components" 
ON component_definitions FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Also allow builders/sysadmins to manage components
CREATE POLICY "Builders can manage component libraries" 
ON component_libraries FOR ALL 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid() 
    AND role IN ('builder', 'sysadmin')
  )
);

CREATE POLICY "Builders can manage components" 
ON component_definitions FOR ALL 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid() 
    AND role IN ('builder', 'sysadmin')
  )
);

-- 4. Test the policies - this should now return your library
SELECT * FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';