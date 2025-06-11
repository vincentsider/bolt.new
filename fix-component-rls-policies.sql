-- Fix RLS policies for component library to allow API access
-- This allows the workflow generation API to read components without user authentication

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Users can view their organization's components" ON component_definitions;
DROP POLICY IF EXISTS "Admins can manage component definitions" ON component_definitions;
DROP POLICY IF EXISTS "Users can view their organization's component libraries" ON component_libraries;
DROP POLICY IF EXISTS "Admins can manage component libraries" ON component_libraries;

-- Create new policies that allow both authenticated and anon access for reading
-- This is needed because the API might be called without user context

-- Component Libraries - Allow read access
CREATE POLICY "Allow read access to active component libraries"
  ON component_libraries FOR SELECT
  TO authenticated, anon
  USING (active = true);

-- Component Libraries - Allow authenticated users to view their org's libraries
CREATE POLICY "Users can view their organization's component libraries"
  ON component_libraries FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Component Libraries - Admin management
CREATE POLICY "Admins can manage component libraries"
  ON component_libraries FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('sysadmin', 'admin')
    )
  );

-- Component Definitions - Allow read access to active components
CREATE POLICY "Allow read access to active components"
  ON component_definitions FOR SELECT
  TO authenticated, anon
  USING (active = true);

-- Component Definitions - Allow authenticated users to view their org's components  
CREATE POLICY "Users can view their organization's components"
  ON component_definitions FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Component Definitions - Admin management
CREATE POLICY "Admins can manage component definitions"
  ON component_definitions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('sysadmin', 'admin')
    )
  );

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('component_libraries', 'component_definitions')
ORDER BY tablename, policyname;