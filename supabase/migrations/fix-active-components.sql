-- Fix: Mark all components as active for organization 6d508492-0e67-4d5a-aa81-ddbe83eee4db
UPDATE component_definitions 
SET active = true 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- Verify the update
SELECT id, name, active, compatible_steps 
FROM component_definitions 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
LIMIT 10;