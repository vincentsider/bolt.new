-- Direct Component Population for Organization
-- Replace ORG_ID with your actual organization ID: 6d508492-0e67-4d5a-aa81-ddbe83eee4db

-- First, create a default library if it doesn't exist
INSERT INTO component_libraries (organization_id, name, description, is_default, created_by)
VALUES (
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'WorkflowHub Standard Library',
  'Standard business workflow components',
  true,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (organization_id, is_default) WHERE is_default = true
DO UPDATE SET updated_at = NOW();

-- Get the library ID we just created/updated
WITH lib AS (
  SELECT id FROM component_libraries 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db' 
  AND is_default = true
  LIMIT 1
)
-- Insert a few test components
INSERT INTO component_definitions (
  library_id, 
  organization_id, 
  name, 
  description, 
  component_group, 
  component_type,
  ai_keywords, 
  compatible_steps, 
  html_template, 
  css_classes, 
  created_by
)
SELECT 
  lib.id,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Employee Name Field',
  'Text input for employee full name',
  'basic_inputs',
  'text_input',
  '[{"keyword": "employee", "weight": 9}, {"keyword": "name", "weight": 9}]'::jsonb,
  ARRAY['capture'],
  '<div class="form-group"><label>{{label}}</label><input type="text" name="{{name}}" /></div>',
  ARRAY['form-group'],
  (SELECT id FROM auth.users LIMIT 1)
FROM lib
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
  AND name = 'Employee Name Field'
);

-- Add more components
INSERT INTO component_definitions (
  library_id, 
  organization_id, 
  name, 
  description, 
  component_group, 
  component_type,
  ai_keywords, 
  compatible_steps, 
  html_template, 
  css_classes, 
  created_by
)
SELECT 
  lib.id,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Currency Amount Input',
  'Input for monetary amounts',
  'financial_specific',
  'number_input',
  '[{"keyword": "amount", "weight": 9}, {"keyword": "money", "weight": 9}]'::jsonb,
  ARRAY['capture'],
  '<div class="form-group"><label>{{label}}</label><input type="number" name="{{name}}" step="0.01" /></div>',
  ARRAY['form-group'],
  (SELECT id FROM auth.users LIMIT 1)
FROM lib
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
  AND name = 'Currency Amount Input'
);

-- Add approval buttons
INSERT INTO component_definitions (
  library_id, 
  organization_id, 
  name, 
  description, 
  component_group, 
  component_type,
  ai_keywords, 
  compatible_steps, 
  html_template, 
  css_classes, 
  created_by
)
SELECT 
  lib.id,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Manager Approval Buttons',
  'Approve/Reject buttons for managers',
  'approval_signoff',
  'approval_buttons',
  '[{"keyword": "approve", "weight": 10}, {"keyword": "reject", "weight": 10}]'::jsonb,
  ARRAY['approval'],
  '<div class="approval-buttons"><button type="button" class="btn-approve">Approve</button><button type="button" class="btn-reject">Reject</button></div>',
  ARRAY['approval-buttons'],
  (SELECT id FROM auth.users LIMIT 1)
FROM lib
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
  AND name = 'Manager Approval Buttons'
);

-- Verify what we inserted
SELECT 
  cl.name as library_name,
  COUNT(cd.id) as component_count
FROM component_libraries cl
LEFT JOIN component_definitions cd ON cd.library_id = cl.id
WHERE cl.organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
GROUP BY cl.id, cl.name;