-- Simple Component Population Script
-- Uses your organization ID directly: 6d508492-0e67-4d5a-aa81-ddbe83eee4db

-- Step 1: Check if library exists
SELECT id, name FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- Step 2: Create library if needed (run this only if step 1 returns no rows)
INSERT INTO component_libraries (organization_id, name, description, is_default, created_by)
SELECT 
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'WorkflowHub Standard Library',
  'Standard business workflow components',
  true,
  id
FROM auth.users 
LIMIT 1;

-- Step 3: Get the library ID (run this after step 2)
SELECT id FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db' 
AND is_default = true;

-- Step 4: Insert components (replace LIBRARY_ID with the ID from step 3)
-- You'll need to manually replace LIBRARY_ID with the actual UUID from step 3

-- Example: If step 3 returns id = '123e4567-e89b-12d3-a456-426614174000'
-- Then replace all instances of LIBRARY_ID below with that value

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
) VALUES (
  'LIBRARY_ID', -- REPLACE THIS
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
);

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
) VALUES (
  'LIBRARY_ID', -- REPLACE THIS
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Business Email Input',
  'Email input with validation',
  'basic_inputs',
  'email_input',
  '[{"keyword": "email", "weight": 10}, {"keyword": "business", "weight": 8}]'::jsonb,
  ARRAY['capture'],
  '<div class="form-group"><label>{{label}}</label><input type="email" name="{{name}}" required /></div>',
  ARRAY['form-group'],
  (SELECT id FROM auth.users LIMIT 1)
);

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
) VALUES (
  'LIBRARY_ID', -- REPLACE THIS
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Currency Amount Input',
  'Input for monetary amounts',
  'financial_specific',
  'currency_input',
  '[{"keyword": "amount", "weight": 9}, {"keyword": "money", "weight": 9}, {"keyword": "currency", "weight": 8}]'::jsonb,
  ARRAY['capture'],
  '<div class="form-group"><label>{{label}}</label><div class="input-group"><span>$</span><input type="number" name="{{name}}" step="0.01" min="0" /></div></div>',
  ARRAY['form-group', 'input-group'],
  (SELECT id FROM auth.users LIMIT 1)
);

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
) VALUES (
  'LIBRARY_ID', -- REPLACE THIS
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Manager Approval Buttons',
  'Approve/Reject buttons for managers',
  'approval_signoff',
  'approval_buttons',
  '[{"keyword": "approve", "weight": 10}, {"keyword": "reject", "weight": 10}, {"keyword": "approval", "weight": 9}]'::jsonb,
  ARRAY['approval'],
  '<div class="approval-section"><button type="button" class="btn btn-success">Approve</button><button type="button" class="btn btn-danger">Reject</button></div>',
  ARRAY['approval-section', 'btn'],
  (SELECT id FROM auth.users LIMIT 1)
);

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
) VALUES (
  'LIBRARY_ID', -- REPLACE THIS
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Receipt Upload',
  'File upload for receipts and documents',
  'document_handling',
  'file_upload',
  '[{"keyword": "receipt", "weight": 10}, {"keyword": "upload", "weight": 9}, {"keyword": "file", "weight": 8}]'::jsonb,
  ARRAY['capture'],
  '<div class="form-group"><label>{{label}}</label><input type="file" name="{{name}}" accept="image/*,.pdf" /></div>',
  ARRAY['form-group'],
  (SELECT id FROM auth.users LIMIT 1)
);

-- Step 5: Verify components were inserted
SELECT 
  cl.name as library_name,
  cl.id as library_id,
  COUNT(cd.id) as component_count
FROM component_libraries cl
LEFT JOIN component_definitions cd ON cd.library_id = cl.id
WHERE cl.organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
GROUP BY cl.id, cl.name;