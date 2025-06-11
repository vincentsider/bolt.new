-- Standard Business Components Population Script
-- Run this after the fixed_component_library.sql script

-- First, ensure we have a default library for all organizations
INSERT INTO component_libraries (organization_id, name, description, is_default, created_by)
SELECT 
  o.id,
  'WorkflowHub Standard Library',
  'Standard business workflow components curated by WorkflowHub',
  true,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM component_libraries 
  WHERE organization_id = o.id AND is_default = true
)
ON CONFLICT DO NOTHING;

-- Get the default library ID for component insertion
WITH default_libs AS (
  SELECT cl.id as library_id, cl.organization_id, u.id as user_id
  FROM component_libraries cl
  JOIN organizations o ON cl.organization_id = o.id
  LEFT JOIN auth.users u ON u.id = cl.created_by
  WHERE cl.is_default = true
)

-- Insert comprehensive business components
INSERT INTO component_definitions (
  library_id, organization_id, name, description, component_group, component_type,
  ai_keywords, typical_examples, compatible_steps, html_template, css_classes, created_by
)
SELECT 
  dl.library_id,
  dl.organization_id,
  comp.name,
  comp.description,
  comp.component_group,
  comp.component_type,
  comp.ai_keywords::jsonb,
  comp.typical_examples,
  comp.compatible_steps,
  comp.html_template,
  comp.css_classes,
  dl.user_id
FROM default_libs dl
CROSS JOIN (VALUES
  -- BASIC INPUTS GROUP
  (
    'Employee Name Field',
    'Text input for employee full name with validation',
    'basic_inputs',
    'employee_name_input',
    '[
      {"keyword": "employee", "weight": 9},
      {"keyword": "name", "weight": 9}, 
      {"keyword": "full name", "weight": 8},
      {"keyword": "staff", "weight": 7},
      {"keyword": "person", "weight": 6}
    ]',
    ARRAY['Employee full name', 'Staff member name', 'Personnel name'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <input 
        type="text" 
        id="{{name}}" 
        name="{{name}}"
        class="form-control"
        placeholder="Enter full name"
        required
        pattern="[A-Za-z\s]{2,50}"
        title="Please enter a valid full name (2-50 characters, letters and spaces only)"
      />
      <small class="form-text">Enter first and last name</small>
    </div>',
    ARRAY['form-group', 'form-label', 'form-control', 'required']
  ),
  
  (
    'Business Email Input',
    'Email input with business domain validation',
    'basic_inputs', 
    'business_email_input',
    '[
      {"keyword": "email", "weight": 10},
      {"keyword": "business email", "weight": 9},
      {"keyword": "work email", "weight": 8},
      {"keyword": "corporate email", "weight": 7},
      {"keyword": "contact", "weight": 6}
    ]',
    ARRAY['Work email address', 'Business email', 'Corporate email', 'Company email'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <input 
        type="email" 
        id="{{name}}" 
        name="{{name}}"
        class="form-control"
        placeholder="user@company.com"
        required
        pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
      />
      <small class="form-text">Business email address required</small>
    </div>',
    ARRAY['form-group', 'form-label', 'form-control', 'required']
  ),

  (
    'Currency Amount Input',
    'Formatted currency input with validation',
    'financial_specific',
    'currency_amount_input', 
    '[
      {"keyword": "amount", "weight": 9},
      {"keyword": "money", "weight": 9},
      {"keyword": "currency", "weight": 8},
      {"keyword": "price", "weight": 8},
      {"keyword": "cost", "weight": 8},
      {"keyword": "expense", "weight": 7},
      {"keyword": "dollar", "weight": 6}
    ]',
    ARRAY['Expense amount', 'Invoice total', 'Budget amount', 'Cost estimate'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <div class="input-group">
        <span class="input-group-text">$</span>
        <input 
          type="number" 
          id="{{name}}" 
          name="{{name}}"
          class="form-control"
          placeholder="0.00"
          step="0.01"
          min="0"
          max="999999.99"
          required
        />
      </div>
      <small class="form-text">Enter amount in USD</small>
    </div>',
    ARRAY['form-group', 'form-label', 'form-control', 'input-group', 'required']
  ),

  -- DOCUMENT HANDLING GROUP
  (
    'Receipt Upload Component', 
    'Drag-and-drop receipt upload with image preview',
    'document_handling',
    'receipt_upload',
    '[
      {"keyword": "receipt", "weight": 10},
      {"keyword": "upload", "weight": 9},
      {"keyword": "document", "weight": 8},
      {"keyword": "file", "weight": 7},
      {"keyword": "attach", "weight": 6},
      {"keyword": "proof", "weight": 6}
    ]',
    ARRAY['Receipt upload', 'Expense receipt', 'Invoice attachment', 'Document proof'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <div class="file-upload-area" ondrop="handleDrop(event)" ondragover="handleDragOver(event)">
        <input 
          type="file" 
          id="{{name}}" 
          name="{{name}}"
          class="form-control-file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
          required
        />
        <div class="upload-placeholder">
          <i class="upload-icon">📎</i>
          <p>Drag files here or click to browse</p>
          <small>Accepts images, PDF, Word documents (max 10MB each)</small>
        </div>
      </div>
    </div>',
    ARRAY['form-group', 'form-label', 'file-upload-area', 'form-control-file', 'required']
  ),

  (
    'PDF Document Viewer',
    'Embedded PDF viewer for document review',
    'document_handling',
    'pdf_document_viewer',
    '[
      {"keyword": "pdf", "weight": 9},
      {"keyword": "document", "weight": 8},
      {"keyword": "view", "weight": 7},
      {"keyword": "review", "weight": 7},
      {"keyword": "preview", "weight": 6}
    ]',
    ARRAY['PDF viewer', 'Document preview', 'File viewer'],
    ARRAY['review'],
    '<div class="document-viewer">
      <div class="document-header">
        <h4>{{label}}</h4>
        <div class="document-actions">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="downloadDocument()">
            📥 Download
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printDocument()">
            🖨️ Print
          </button>
        </div>
      </div>
      <iframe 
        src="{{document_url}}" 
        class="pdf-frame"
        width="100%" 
        height="400px"
        frameborder="0">
      </iframe>
    </div>',
    ARRAY['document-viewer', 'document-header', 'pdf-frame']
  ),

  -- APPROVAL & SIGNOFF GROUP
  (
    'Manager Approval Buttons',
    'Approve/reject buttons with comment field for managers',
    'approval_signoff',
    'manager_approval_buttons',
    '[
      {"keyword": "approve", "weight": 10},
      {"keyword": "reject", "weight": 10},
      {"keyword": "manager", "weight": 9},
      {"keyword": "approval", "weight": 9},
      {"keyword": "decision", "weight": 8},
      {"keyword": "signoff", "weight": 7}
    ]',
    ARRAY['Manager approval', 'Supervisor decision', 'Final approval', 'Sign-off'],
    ARRAY['approval'],
    '<div class="approval-section">
      <h4 class="approval-title">{{label}}</h4>
      <div class="approval-buttons">
        <button 
          type="button" 
          class="btn btn-success btn-approve" 
          data-action="approve"
          onclick="handleApproval(this)"
        >
          ✅ Approve
        </button>
        <button 
          type="button" 
          class="btn btn-danger btn-reject" 
          data-action="reject"
          onclick="handleApproval(this)"
        >
          ❌ Reject
        </button>
      </div>
      <div class="approval-comment mt-3">
        <label for="approval_comment" class="form-label">Comments (Optional)</label>
        <textarea 
          id="approval_comment" 
          name="approval_comment"
          class="form-control"
          rows="3"
          placeholder="Add any comments about your decision..."
        ></textarea>
      </div>
      <input type="hidden" name="approval_decision" id="approval_decision" />
    </div>',
    ARRAY['approval-section', 'approval-buttons', 'btn-approve', 'btn-reject']
  ),

  (
    'Digital Signature Pad',
    'Canvas-based digital signature capture',
    'approval_signoff', 
    'digital_signature_pad',
    '[
      {"keyword": "signature", "weight": 10},
      {"keyword": "sign", "weight": 9},
      {"keyword": "digital", "weight": 8},
      {"keyword": "electronic", "weight": 7},
      {"keyword": "authorize", "weight": 6}
    ]',
    ARRAY['Digital signature', 'Electronic signature', 'Sign document'],
    ARRAY['approval'],
    '<div class="signature-section">
      <label class="form-label required">{{label}}</label>
      <div class="signature-pad-container">
        <canvas 
          id="signature_canvas" 
          class="signature-canvas"
          width="400" 
          height="150"
          style="border: 2px dashed #ccc; border-radius: 4px;"
        ></canvas>
        <div class="signature-controls mt-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearSignature()">
            🗑️ Clear
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="saveSignature()">
            💾 Save Signature
          </button>
        </div>
      </div>
      <input type="hidden" name="signature_data" id="signature_data" />
      <small class="form-text">Please sign in the box above to authorize this action</small>
    </div>',
    ARRAY['signature-section', 'signature-canvas', 'signature-controls']
  ),

  -- LOOKUPS & STATUS GROUP
  (
    'Department Dropdown',
    'Dropdown for selecting company departments',
    'lookups_status',
    'department_dropdown',
    '[
      {"keyword": "department", "weight": 10},
      {"keyword": "division", "weight": 8},
      {"keyword": "team", "weight": 7},
      {"keyword": "unit", "weight": 6},
      {"keyword": "group", "weight": 5}
    ]',
    ARRAY['Department selection', 'Division choice', 'Team assignment'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <select 
        id="{{name}}" 
        name="{{name}}"
        class="form-control"
        required
      >
        <option value="">-- Select Department --</option>
        <option value="hr">Human Resources</option>
        <option value="finance">Finance & Accounting</option>
        <option value="it">Information Technology</option>
        <option value="sales">Sales & Marketing</option>
        <option value="operations">Operations</option>
        <option value="legal">Legal & Compliance</option>
        <option value="engineering">Engineering</option>
        <option value="customer_service">Customer Service</option>
      </select>
    </div>',
    ARRAY['form-group', 'form-label', 'form-control', 'required']
  ),

  (
    'Priority Level Selector',
    'Color-coded priority level selection',
    'lookups_status',
    'priority_level_selector',
    '[
      {"keyword": "priority", "weight": 10},
      {"keyword": "urgency", "weight": 9},
      {"keyword": "importance", "weight": 8},
      {"keyword": "level", "weight": 6}
    ]',
    ARRAY['Priority level', 'Urgency level', 'Importance rating'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{name}}" class="form-label required">{{label}}</label>
      <div class="priority-selector">
        <input type="radio" id="priority_low" name="{{name}}" value="low" required>
        <label for="priority_low" class="priority-option priority-low">
          🟢 Low Priority
        </label>
        
        <input type="radio" id="priority_medium" name="{{name}}" value="medium" required>
        <label for="priority_medium" class="priority-option priority-medium">
          🟡 Medium Priority  
        </label>
        
        <input type="radio" id="priority_high" name="{{name}}" value="high" required>
        <label for="priority_high" class="priority-option priority-high">
          🟠 High Priority
        </label>
        
        <input type="radio" id="priority_critical" name="{{name}}" value="critical" required>
        <label for="priority_critical" class="priority-option priority-critical">
          🔴 Critical Priority
        </label>
      </div>
    </div>',
    ARRAY['form-group', 'priority-selector', 'priority-option']
  ),

  -- AUTOMATION HOOKS GROUP
  (
    'Email Notification Trigger',
    'Configurable email notification system',
    'automation_hooks',
    'email_notification_trigger',
    '[
      {"keyword": "email", "weight": 9},
      {"keyword": "notification", "weight": 9},
      {"keyword": "alert", "weight": 8},
      {"keyword": "notify", "weight": 8},
      {"keyword": "send", "weight": 7}
    ]',
    ARRAY['Email notification', 'Alert system', 'Notification trigger'],
    ARRAY['update'],
    '<div class="notification-config">
      <h4>{{label}}</h4>
      <div class="notification-settings">
        <div class="form-check">
          <input type="checkbox" id="notify_submitter" name="notification_recipients" value="submitter" class="form-check-input">
          <label for="notify_submitter" class="form-check-label">Notify Submitter</label>
        </div>
        <div class="form-check">
          <input type="checkbox" id="notify_manager" name="notification_recipients" value="manager" class="form-check-input">
          <label for="notify_manager" class="form-check-label">Notify Manager</label>
        </div>
        <div class="form-check">
          <input type="checkbox" id="notify_hr" name="notification_recipients" value="hr" class="form-check-input">
          <label for="notify_hr" class="form-check-label">Notify HR Team</label>
        </div>
      </div>
      <div class="email-template mt-3">
        <label for="email_subject" class="form-label">Email Subject</label>
        <input type="text" id="email_subject" name="email_subject" class="form-control" placeholder="{{workflow_name}} - Status Update">
        
        <label for="email_message" class="form-label mt-2">Email Message</label>
        <textarea id="email_message" name="email_message" class="form-control" rows="4" placeholder="Your {{workflow_name}} submission has been processed..."></textarea>
      </div>
    </div>',
    ARRAY['notification-config', 'notification-settings', 'form-check']
  ),

  (
    'Slack Integration Hook',
    'Send workflow updates to Slack channels',
    'automation_hooks',
    'slack_integration_hook', 
    '[
      {"keyword": "slack", "weight": 10},
      {"keyword": "integration", "weight": 8},
      {"keyword": "webhook", "weight": 7},
      {"keyword": "channel", "weight": 6},
      {"keyword": "chat", "weight": 5}
    ]',
    ARRAY['Slack notification', 'Team chat update', 'Channel message'],
    ARRAY['update'],
    '<div class="slack-integration">
      <h4>{{label}}</h4>
      <div class="slack-config">
        <div class="form-group">
          <label for="slack_channel" class="form-label">Slack Channel</label>
          <select id="slack_channel" name="slack_channel" class="form-control">
            <option value="">-- Select Channel --</option>
            <option value="#general">#general</option>
            <option value="#notifications">#notifications</option>
            <option value="#workflows">#workflows</option>
            <option value="#approvals">#approvals</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="slack_message" class="form-label">Message Template</label>
          <textarea 
            id="slack_message" 
            name="slack_message" 
            class="form-control" 
            rows="3"
            placeholder="🔔 New {{workflow_name}} submission by {{submitter_name}} requires attention."
          ></textarea>
        </div>
        
        <div class="form-check">
          <input type="checkbox" id="slack_mention_channel" name="slack_mention_channel" class="form-check-input">
          <label for="slack_mention_channel" class="form-check-label">Mention @channel for urgent items</label>
        </div>
      </div>
    </div>',
    ARRAY['slack-integration', 'slack-config']
  )
) AS comp(name, description, component_group, component_type, ai_keywords, typical_examples, compatible_steps, html_template, css_classes)
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions cd 
  WHERE cd.organization_id = dl.organization_id 
  AND cd.name = comp.name
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance on AI keyword searches
CREATE INDEX IF NOT EXISTS idx_component_definitions_ai_keywords 
ON component_definitions USING GIN (ai_keywords);

CREATE INDEX IF NOT EXISTS idx_component_definitions_typical_examples 
ON component_definitions USING GIN (typical_examples);

-- Update component statistics
INSERT INTO component_definitions (
  library_id, organization_id, name, description, component_group, component_type,
  ai_keywords, typical_examples, compatible_steps, html_template, css_classes, created_by
)
SELECT 
  dl.library_id,
  dl.organization_id,
  'Component Usage Statistics',
  'Internal component for tracking which components are used most frequently',
  'automation_hooks',
  'usage_analytics',
  '[{"keyword": "analytics", "weight": 10}]'::jsonb,
  ARRAY['Usage tracking'],
  ARRAY['update'], 
  '<div class="usage-stats hidden" data-track="true"></div>',
  ARRAY['usage-stats', 'hidden'],
  dl.user_id
FROM (
  SELECT cl.id as library_id, cl.organization_id, cl.created_by as user_id
  FROM component_libraries cl
  WHERE cl.is_default = true
) dl
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions cd 
  WHERE cd.organization_id = dl.organization_id 
  AND cd.component_type = 'usage_analytics'
);

COMMIT;