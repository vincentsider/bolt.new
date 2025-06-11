-- Fix the component library for your organization

-- 1. First, let's see what library you have
SELECT id, organization_id, name, is_default, active 
FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- 2. Update the library to be default and active
UPDATE component_libraries 
SET 
  is_default = true,
  active = true
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- 3. Verify the update
SELECT id, organization_id, name, is_default, active 
FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- 4. Check how many components are linked to this library
SELECT 
  cl.id as library_id,
  cl.name as library_name,
  cl.is_default,
  COUNT(cd.id) as component_count
FROM component_libraries cl
LEFT JOIN component_definitions cd ON cd.library_id = cl.id
WHERE cl.organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
GROUP BY cl.id, cl.name, cl.is_default;