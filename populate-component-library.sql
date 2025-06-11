-- Populate Component Library for your organization
-- Organization ID: 6d508492-0e67-4d5a-aa81-ddbe83eee4db

-- Step 1: Check if a library exists for your organization
SELECT id, name, is_default, active 
FROM component_libraries 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

-- Step 2: If no library exists, create one
-- Only run this if Step 1 returns no rows
INSERT INTO component_libraries (
  organization_id, 
  name, 
  description, 
  is_default,
  active,
  created_by
)
SELECT 
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'WorkflowHub Standard Library',
  'Pre-built workflow components for common business processes',
  true,
  true,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db' -- Using your user ID
WHERE NOT EXISTS (
  SELECT 1 FROM component_libraries 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
);

-- Step 3: Get the library ID and insert components
WITH library AS (
  SELECT id as library_id
  FROM component_libraries 
  WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
  AND is_default = true
  LIMIT 1
)
INSERT INTO component_definitions (
  library_id,
  organization_id,
  name,
  description,
  component_group,
  component_type,
  ai_keywords,
  typical_examples,
  compatible_steps,
  html_template,
  css_classes,
  icon,
  color,
  active,
  created_by
)
SELECT 
  library.library_id,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  comp.name,
  comp.description,
  comp.component_group,
  comp.component_type,
  comp.ai_keywords::jsonb,
  comp.typical_examples,
  comp.compatible_steps,
  comp.html_template,
  comp.css_classes,
  comp.icon,
  comp.color,
  true,
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
FROM library
CROSS JOIN (
  VALUES 
    -- Basic Input Components
    (
      'Employee Name Input',
      'Text input for employee full name',
      'basic_inputs',
      'short_text_box',
      '[{"keyword": "employee", "weight": 10}, {"keyword": "name", "weight": 9}, {"keyword": "person", "weight": 7}]',
      ARRAY['Employee name', 'Full name', 'Staff member'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><input type="text" id="{{name}}" name="{{name}}" class="form-input" placeholder="Enter employee name" {{#if required}}required{{/if}} /></div>',
      ARRAY['form-group', 'text-input'],
      '👤',
      '#3B82F6'
    ),
    (
      'Business Email Address',
      'Email input with business validation',
      'basic_inputs',
      'short_text_box',
      '[{"keyword": "email", "weight": 10}, {"keyword": "business", "weight": 8}, {"keyword": "contact", "weight": 7}]',
      ARRAY['Business email', 'Work email', 'Contact email'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><input type="email" id="{{name}}" name="{{name}}" class="form-input" placeholder="name@company.com" {{#if required}}required{{/if}} /></div>',
      ARRAY['form-group', 'email-input'],
      '✉️',
      '#3B82F6'
    ),
    (
      'Expense Amount',
      'Currency input for expense amounts',
      'financial_specific',
      'currency_amount',
      '[{"keyword": "expense", "weight": 10}, {"keyword": "amount", "weight": 9}, {"keyword": "cost", "weight": 8}, {"keyword": "money", "weight": 8}]',
      ARRAY['Expense amount', 'Total cost', 'Amount'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><div class="input-group"><span class="currency-symbol">$</span><input type="number" id="{{name}}" name="{{name}}" class="form-input currency-input" step="0.01" min="0" placeholder="0.00" {{#if required}}required{{/if}} /></div></div>',
      ARRAY['form-group', 'input-group', 'currency-input'],
      '💰',
      '#10B981'
    ),
    (
      'Expense Date',
      'Date picker for expense dates',
      'basic_inputs',
      'date_picker',
      '[{"keyword": "date", "weight": 10}, {"keyword": "expense", "weight": 8}, {"keyword": "when", "weight": 7}]',
      ARRAY['Expense date', 'Purchase date', 'Transaction date'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><input type="date" id="{{name}}" name="{{name}}" class="form-input date-picker" {{#if required}}required{{/if}} /></div>',
      ARRAY['form-group', 'date-picker'],
      '📅',
      '#3B82F6'
    ),
    (
      'Receipt Upload',
      'File upload for expense receipts',
      'document_handling',
      'file_upload',
      '[{"keyword": "receipt", "weight": 10}, {"keyword": "upload", "weight": 9}, {"keyword": "file", "weight": 8}, {"keyword": "document", "weight": 7}]',
      ARRAY['Receipt upload', 'Document upload', 'Attachment'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><input type="file" id="{{name}}" name="{{name}}" class="form-input file-upload" accept="image/*,.pdf" {{#if required}}required{{/if}} /><p class="help-text">Accepts images and PDF files</p></div>',
      ARRAY['form-group', 'file-upload'],
      '📎',
      '#6366F1'
    ),
    (
      'Expense Category',
      'Dropdown for expense categories',
      'basic_inputs',
      'dropdown_list',
      '[{"keyword": "category", "weight": 10}, {"keyword": "type", "weight": 8}, {"keyword": "expense", "weight": 7}]',
      ARRAY['Expense category', 'Category', 'Type'],
      ARRAY['capture'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><select id="{{name}}" name="{{name}}" class="form-select" {{#if required}}required{{/if}}><option value="">Select category</option><option value="travel">Travel</option><option value="meals">Meals & Entertainment</option><option value="supplies">Office Supplies</option><option value="equipment">Equipment</option><option value="other">Other</option></select></div>',
      ARRAY['form-group', 'form-select'],
      '📊',
      '#3B82F6'
    ),
    (
      'Expense Description',
      'Text area for expense details',
      'basic_inputs',
      'long_text_box',
      '[{"keyword": "description", "weight": 9}, {"keyword": "details", "weight": 8}, {"keyword": "notes", "weight": 7}, {"keyword": "expense", "weight": 7}]',
      ARRAY['Description', 'Details', 'Notes'],
      ARRAY['capture', 'review'],
      '<div class="form-group"><label for="{{name}}">{{label}}</label><textarea id="{{name}}" name="{{name}}" class="form-textarea" rows="3" placeholder="Provide details about this expense" {{#if required}}required{{/if}}></textarea></div>',
      ARRAY['form-group', 'form-textarea'],
      '📝',
      '#3B82F6'
    ),
    (
      'Manager Approval',
      'Approve/Reject buttons for managers',
      'approval_signoff',
      'approve_reject_buttons',
      '[{"keyword": "approve", "weight": 10}, {"keyword": "reject", "weight": 10}, {"keyword": "approval", "weight": 9}, {"keyword": "decision", "weight": 8}]',
      ARRAY['Approval decision', 'Manager approval', 'Sign-off'],
      ARRAY['approval'],
      '<div class="approval-section"><h3>Approval Decision</h3><div class="approval-buttons"><button type="button" class="btn btn-success" data-action="approve">Approve</button><button type="button" class="btn btn-danger" data-action="reject">Reject</button></div><div class="form-group mt-3"><label for="approval-comments">Comments (optional)</label><textarea id="approval-comments" name="approval_comments" class="form-textarea" rows="2" placeholder="Add any comments about your decision"></textarea></div></div>',
      ARRAY['approval-section', 'approval-buttons'],
      '✅',
      '#10B981'
    ),
    (
      'Status Display',
      'Shows current workflow status',
      'lookups_status',
      'status_badge',
      '[{"keyword": "status", "weight": 10}, {"keyword": "state", "weight": 8}, {"keyword": "progress", "weight": 7}]',
      ARRAY['Status', 'Current status', 'Workflow status'],
      ARRAY['review'],
      '<div class="status-display"><label>{{label}}</label><span class="status-badge status-{{value}}">{{value}}</span></div>',
      ARRAY['status-display', 'status-badge'],
      '🔖',
      '#F59E0B'
    ),
    (
      'Review Summary Table',
      'Table to display submitted data for review',
      'layout_helpers',
      'review_table',
      '[{"keyword": "review", "weight": 10}, {"keyword": "summary", "weight": 9}, {"keyword": "table", "weight": 8}]',
      ARRAY['Review summary', 'Data review', 'Submission review'],
      ARRAY['review'],
      '<div class="review-section"><h3>{{label}}</h3><table class="review-table"><tbody><!-- Data rows will be inserted here dynamically --></tbody></table></div>',
      ARRAY['review-section', 'review-table'],
      '📋',
      '#6366F1'
    )
) AS comp(name, description, component_group, component_type, ai_keywords, typical_examples, compatible_steps, html_template, css_classes, icon, color);

-- Step 4: Verify the components were inserted
SELECT 
  cl.name as library_name,
  COUNT(cd.id) as component_count,
  array_agg(DISTINCT cd.component_group) as groups
FROM component_libraries cl
LEFT JOIN component_definitions cd ON cd.library_id = cl.id
WHERE cl.organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
GROUP BY cl.id, cl.name;

-- Step 5: Show a sample of the inserted components
SELECT 
  name,
  component_group,
  component_type,
  compatible_steps,
  active
FROM component_definitions
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db'
ORDER BY component_group, name
LIMIT 20;