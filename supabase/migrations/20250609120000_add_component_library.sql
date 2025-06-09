-- Component Library Tables
-- Adds support for admin-managed workflow components with AI mapping

-- Component Libraries (organizations can have multiple libraries)
CREATE TABLE component_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Component Definitions (the actual components)
CREATE TABLE component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES component_libraries(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  component_group TEXT NOT NULL CHECK (component_group IN (
    'basic_inputs',
    'document_handling', 
    'lookups_status',
    'financial_specific',
    'layout_helpers',
    'approval_signoff',
    'automation_hooks'
  )),
  component_type TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  
  -- AI Mapping Data
  ai_keywords JSONB DEFAULT '[]'::jsonb,
  typical_examples TEXT[] DEFAULT '{}',
  
  -- Component Properties
  properties JSONB DEFAULT '[]'::jsonb,
  
  -- Visual Properties
  icon TEXT DEFAULT '📝',
  color TEXT DEFAULT '#3B82F6',
  
  -- Step Compatibility
  compatible_steps TEXT[] DEFAULT '{capture}' CHECK (
    compatible_steps <@ ARRAY['capture', 'review', 'approval', 'update']
  ),
  
  -- Rendering Information
  html_template TEXT NOT NULL,
  css_classes TEXT[] DEFAULT '{}',
  js_validation TEXT,
  
  -- Integration Properties
  api_endpoint TEXT,
  data_mapping JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Component Instances (components used in specific workflows)
CREATE TABLE component_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  component_id UUID REFERENCES component_definitions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  validation JSONB DEFAULT '{}'::jsonb,
  position JSONB DEFAULT '{}'::jsonb, -- {step: 'capture', order: 0}
  data_mapping JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_component_libraries_org ON component_libraries(organization_id);
CREATE INDEX idx_component_definitions_library ON component_definitions(library_id);
CREATE INDEX idx_component_definitions_org ON component_definitions(organization_id);
CREATE INDEX idx_component_definitions_type ON component_definitions(component_type);
CREATE INDEX idx_component_definitions_group ON component_definitions(component_group);
CREATE INDEX idx_component_definitions_active ON component_definitions(active);
CREATE INDEX idx_component_instances_workflow ON component_instances(workflow_id);
CREATE INDEX idx_component_instances_component ON component_instances(component_id);

-- RLS Policies
ALTER TABLE component_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_instances ENABLE ROW LEVEL SECURITY;

-- Component Libraries Policies
CREATE POLICY "Users can view their organization's component libraries"
  ON component_libraries FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage component libraries"
  ON component_libraries FOR ALL
  USING (organization_id = get_user_organization_id() AND 
         get_user_role() IN ('sysadmin', 'admin'));

-- Component Definitions Policies  
CREATE POLICY "Users can view their organization's components"
  ON component_definitions FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage component definitions"
  ON component_definitions FOR ALL
  USING (organization_id = get_user_organization_id() AND 
         get_user_role() IN ('sysadmin', 'admin'));

-- Component Instances Policies
CREATE POLICY "Users can view component instances for accessible workflows"
  ON component_instances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = component_instances.workflow_id 
    AND w.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Builders can manage component instances"
  ON component_instances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = component_instances.workflow_id 
    AND w.organization_id = get_user_organization_id()
    AND get_user_role() IN ('builder', 'sysadmin')
  ));

-- Insert default component library for each organization
INSERT INTO component_libraries (organization_id, name, description, is_default, created_by)
SELECT 
  id,
  'Default Component Library',
  'Pre-built workflow components for common business processes',
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@workflowhub.com' LIMIT 1)
FROM organizations;

-- Insert default components (based on PRD)
WITH default_library AS (
  SELECT id as library_id, organization_id 
  FROM component_libraries 
  WHERE is_default = true
)
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
  comp.ai_keywords,
  comp.typical_examples,
  comp.compatible_steps,
  comp.html_template,
  comp.css_classes,
  (SELECT id FROM auth.users WHERE email = 'admin@workflowhub.com' LIMIT 1)
FROM default_library dl
CROSS JOIN (
  VALUES 
    -- Basic Inputs
    ('Short Text Box', 'Lets a user type a small piece of information.', 'basic_inputs', 'short_text_box',
     '[{"keyword": "name", "weight": 8}, {"keyword": "text", "weight": 7}, {"keyword": "input", "weight": 6}]'::jsonb,
     ARRAY['First name', 'Passport number', 'Reference ID'],
     ARRAY['capture'],
     '<input type="text" class="form-input" name="{{name}}" placeholder="{{label}}" {{#if required}}required{{/if}} />',
     ARRAY['form-input', 'text-input']),
     
    ('Long Text Box', 'A larger area for paragraphs or notes.', 'basic_inputs', 'long_text_box',
     '[{"keyword": "comment", "weight": 8}, {"keyword": "note", "weight": 7}, {"keyword": "description", "weight": 6}]'::jsonb,
     ARRAY['Comments', 'Reason for exemption', 'Additional notes'],
     ARRAY['capture', 'review'],
     '<textarea class="form-textarea" name="{{name}}" placeholder="{{label}}" rows="3" {{#if required}}required{{/if}}></textarea>',
     ARRAY['form-textarea', 'text-area']),
     
    ('Number Field', 'Accepts only numbers; can be set to whole numbers or decimals.', 'basic_inputs', 'number_field',
     '[{"keyword": "amount", "weight": 8}, {"keyword": "number", "weight": 7}, {"keyword": "quantity", "weight": 6}]'::jsonb,
     ARRAY['Share quantity', 'Fee amount', 'Age'],
     ARRAY['capture'],
     '<input type="number" class="form-input" name="{{name}}" placeholder="{{label}}" {{#if min}}min="{{min}}"{{/if}} {{#if max}}max="{{max}}"{{/if}} {{#if step}}step="{{step}}"{{/if}} {{#if required}}required{{/if}} />',
     ARRAY['form-input', 'number-input']),
     
    ('Date Picker', 'Calendar pop-up to choose a date.', 'basic_inputs', 'date_picker',
     '[{"keyword": "date", "weight": 9}, {"keyword": "when", "weight": 5}, {"keyword": "calendar", "weight": 6}]'::jsonb,
     ARRAY['Date of birth', 'Document expiry', 'Start date'],
     ARRAY['capture'],
     '<input type="date" class="form-input" name="{{name}}" {{#if required}}required{{/if}} />',
     ARRAY['form-input', 'date-input']),
     
    ('Drop-down List', 'User picks one value from a list you provide.', 'basic_inputs', 'dropdown_list',
     '[{"keyword": "select", "weight": 8}, {"keyword": "choose", "weight": 7}, {"keyword": "dropdown", "weight": 8}]'::jsonb,
     ARRAY['Title (Mr, Mrs...)', 'Country', 'Department'],
     ARRAY['capture'],
     '<select class="form-select" name="{{name}}" {{#if required}}required{{/if}}><option value="">Choose {{label}}</option>{{#each options}}<option value="{{this}}">{{this}}</option>{{/each}}</select>',
     ARRAY['form-select', 'dropdown']),
     
    -- File Upload
    ('File Upload', 'Drag-and-drop or browse to attach files.', 'document_handling', 'file_upload',
     '[{"keyword": "upload", "weight": 9}, {"keyword": "file", "weight": 8}, {"keyword": "document", "weight": 7}, {"keyword": "attach", "weight": 6}]'::jsonb,
     ARRAY['Passport scan', 'Proof of address', 'Contract'],
     ARRAY['capture'],
     '<input type="file" class="form-file" name="{{name}}" {{#if accept}}accept="{{accept}}"{{/if}} {{#if multiple}}multiple{{/if}} {{#if required}}required{{/if}} />',
     ARRAY['form-file', 'file-upload']),
     
    -- Approval Buttons
    ('Approve / Reject Buttons', 'One-click decision with an optional comment box.', 'approval_signoff', 'approve_reject_buttons',
     '[{"keyword": "approve", "weight": 9}, {"keyword": "reject", "weight": 9}, {"keyword": "decision", "weight": 7}]'::jsonb,
     ARRAY['Manager sign-off', 'Final approval', 'Review decision'],
     ARRAY['approval'],
     '<div class="approval-buttons"><button type="button" class="btn-approve" data-action="approve">Approve</button><button type="button" class="btn-reject" data-action="reject">Reject</button></div>',
     ARRAY['approval-buttons', 'decision-buttons'])
) AS comp(name, description, component_group, component_type, ai_keywords, typical_examples, compatible_steps, html_template, css_classes);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_component_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_component_libraries_updated_at
  BEFORE UPDATE ON component_libraries
  FOR EACH ROW
  EXECUTE FUNCTION update_component_updated_at();

CREATE TRIGGER update_component_definitions_updated_at
  BEFORE UPDATE ON component_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_component_updated_at();

CREATE TRIGGER update_component_instances_updated_at
  BEFORE UPDATE ON component_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_component_updated_at();