-- Quick component population for organization 6d508492-0e67-4d5a-aa81-ddbe83eee4db
-- This bypasses the library requirement temporarily

-- Insert basic feedback form components directly
INSERT INTO component_definitions (
  organization_id, 
  name, 
  description, 
  component_group, 
  component_type,
  ai_keywords, 
  typical_examples,
  compatible_steps, 
  html_template,
  active
) VALUES 
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Feedback Text Area',
  'Multi-line text input for collecting feedback',
  'basic_inputs',
  'textarea',
  '[{"keyword": "feedback", "weight": 10}, {"keyword": "comment", "weight": 8}, {"keyword": "text", "weight": 7}, {"keyword": "form", "weight": 6}]'::jsonb,
  ARRAY['Customer feedback', 'User comments', 'Suggestions'],
  ARRAY['capture'],
  '<div class="form-group">
    <label for="{{name}}" class="form-label">{{label}}</label>
    <textarea 
      id="{{name}}" 
      name="{{name}}"
      class="form-control"
      rows="5"
      placeholder="Enter your feedback here..."
      {{required}}
    ></textarea>
  </div>',
  true
),
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Email Input Field',
  'Email address input with validation',
  'basic_inputs',
  'email',
  '[{"keyword": "email", "weight": 10}, {"keyword": "contact", "weight": 7}, {"keyword": "address", "weight": 6}]'::jsonb,
  ARRAY['Email address', 'Contact email'],
  ARRAY['capture'],
  '<div class="form-group">
    <label for="{{name}}" class="form-label">{{label}}</label>
    <input 
      type="email" 
      id="{{name}}" 
      name="{{name}}"
      class="form-control"
      placeholder="user@example.com"
      {{required}}
    />
  </div>',
  true
),
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Name Input Field',
  'Text input for names',
  'basic_inputs',
  'text',
  '[{"keyword": "name", "weight": 10}, {"keyword": "person", "weight": 7}, {"keyword": "user", "weight": 6}]'::jsonb,
  ARRAY['Full name', 'First name', 'Last name'],
  ARRAY['capture'],
  '<div class="form-group">
    <label for="{{name}}" class="form-label">{{label}}</label>
    <input 
      type="text" 
      id="{{name}}" 
      name="{{name}}"
      class="form-control"
      placeholder="Enter name"
      {{required}}
    />
  </div>',
  true
),
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Rating Stars',
  'Star rating selection component',
  'basic_inputs',
  'rating',
  '[{"keyword": "rating", "weight": 10}, {"keyword": "stars", "weight": 9}, {"keyword": "score", "weight": 7}]'::jsonb,
  ARRAY['Customer rating', 'Satisfaction score'],
  ARRAY['capture'],
  '<div class="form-group">
    <label class="form-label">{{label}}</label>
    <div class="star-rating" data-name="{{name}}">
      <span class="star" data-value="1">⭐</span>
      <span class="star" data-value="2">⭐</span>
      <span class="star" data-value="3">⭐</span>
      <span class="star" data-value="4">⭐</span>
      <span class="star" data-value="5">⭐</span>
    </div>
    <input type="hidden" name="{{name}}" id="{{name}}" {{required}} />
  </div>',
  true
),
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Category Dropdown',
  'Dropdown for selecting feedback category',
  'basic_inputs',
  'select',
  '[{"keyword": "category", "weight": 10}, {"keyword": "type", "weight": 8}, {"keyword": "dropdown", "weight": 7}, {"keyword": "select", "weight": 7}]'::jsonb,
  ARRAY['Feedback category', 'Issue type', 'Department'],
  ARRAY['capture'],
  '<div class="form-group">
    <label for="{{name}}" class="form-label">{{label}}</label>
    <select id="{{name}}" name="{{name}}" class="form-control" {{required}}>
      <option value="">-- Select Category --</option>
      <option value="product">Product Feedback</option>
      <option value="service">Service Feedback</option>
      <option value="support">Support Feedback</option>
      <option value="other">Other</option>
    </select>
  </div>',
  true
),
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Submit Button',
  'Form submission button',
  'basic_inputs',
  'submit',
  '[{"keyword": "submit", "weight": 10}, {"keyword": "button", "weight": 8}, {"keyword": "send", "weight": 7}]'::jsonb,
  ARRAY['Submit form', 'Send feedback'],
  ARRAY['capture'],
  '<div class="form-group">
    <button type="submit" class="btn btn-primary">{{label}}</button>
  </div>',
  true
),
-- Review components
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Feedback Summary Display',
  'Display submitted feedback for review',
  'review_display',
  'summary',
  '[{"keyword": "review", "weight": 10}, {"keyword": "summary", "weight": 8}, {"keyword": "display", "weight": 7}]'::jsonb,
  ARRAY['Review submission', 'Display data'],
  ARRAY['review'],
  '<div class="review-section">
    <h4>{{label}}</h4>
    <div class="review-content">{{value}}</div>
  </div>',
  true
),
-- Approval components
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Approval Buttons',
  'Approve or reject buttons',
  'approval_signoff',
  'approval_buttons',
  '[{"keyword": "approve", "weight": 10}, {"keyword": "reject", "weight": 9}, {"keyword": "decision", "weight": 8}]'::jsonb,
  ARRAY['Approval decision', 'Manager approval'],
  ARRAY['approval'],
  '<div class="approval-section">
    <button type="button" class="btn btn-success" onclick="handleApproval(''approve'')">✅ Approve</button>
    <button type="button" class="btn btn-danger" onclick="handleApproval(''reject'')">❌ Reject</button>
  </div>',
  true
),
-- Update components
(
  '6d508492-0e67-4d5a-aa81-ddbe83eee4db',
  'Email Notification',
  'Send email notification',
  'automation_hooks',
  'email_notification',
  '[{"keyword": "email", "weight": 10}, {"keyword": "notification", "weight": 9}, {"keyword": "send", "weight": 8}]'::jsonb,
  ARRAY['Send notification', 'Email alert'],
  ARRAY['update'],
  '<div class="notification-config">
    <h4>Email Notification</h4>
    <p>Notification will be sent to configured recipients</p>
  </div>',
  true
);

-- Verify insertion
SELECT COUNT(*) as component_count 
FROM component_definitions 
WHERE organization_id = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';