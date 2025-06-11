-- DEBUG: Check what exists for your organization

-- 1. Check if you have any component libraries
SELECT * FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- 2. Check if you have any components
SELECT * FROM component_definitions 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- 3. Check if the tables exist at all
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('component_libraries', 'component_definitions');