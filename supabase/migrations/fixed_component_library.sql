-- Fixed Component Library Tables Script
-- Compatible with your existing database schema

-- Component Libraries (organizations can have multiple libraries)
CREATE TABLE IF NOT EXISTS component_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS component_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  
  -- AI Keywords for intelligent mapping
  ai_keywords JSONB DEFAULT '[]'::jsonb,
  typical_examples TEXT[] DEFAULT '{}',
  
  -- Component Properties
  properties JSONB DEFAULT '{}'::jsonb,
  
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
CREATE TABLE IF NOT EXISTS component_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  component_id UUID REFERENCES component_definitions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Instance Configuration
  label TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  validation JSONB DEFAULT '{}'::jsonb,
  position JSONB DEFAULT '{}'::jsonb,
  data_mapping JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE component_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_instances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's component libraries" ON component_libraries;
DROP POLICY IF EXISTS "Admins can manage component libraries" ON component_libraries;
DROP POLICY IF EXISTS "Users can view their organization's components" ON component_definitions;
DROP POLICY IF EXISTS "Admins can manage components" ON component_definitions;
DROP POLICY IF EXISTS "Users can view workflow component instances" ON component_instances;
DROP POLICY IF EXISTS "Builders can manage component instances" ON component_instances;

-- Component Libraries Policies (Fixed to use existing schema)
CREATE POLICY "Users can view their organization's component libraries"
  ON component_libraries FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Admins can manage component libraries"
  ON component_libraries FOR ALL
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'builder')
  );

-- Component Definitions Policies  
CREATE POLICY "Users can view their organization's components"
  ON component_definitions FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Admins can manage components"
  ON component_definitions FOR ALL
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'builder')
  );

-- Component Instances Policies
CREATE POLICY "Users can view workflow component instances"
  ON component_instances FOR SELECT
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Builders can manage component instances"
  ON component_instances FOR ALL
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'builder')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_libraries_org ON component_libraries(organization_id);
CREATE INDEX IF NOT EXISTS idx_component_definitions_org ON component_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_component_definitions_library ON component_definitions(library_id);
CREATE INDEX IF NOT EXISTS idx_component_definitions_group ON component_definitions(component_group);
CREATE INDEX IF NOT EXISTS idx_component_definitions_active ON component_definitions(active);
CREATE INDEX IF NOT EXISTS idx_component_instances_workflow ON component_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_component_instances_component ON component_instances(component_id);

-- Add triggers for auto-updating timestamps
CREATE TRIGGER update_component_libraries_updated_at 
  BEFORE UPDATE ON component_libraries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_component_definitions_updated_at 
  BEFORE UPDATE ON component_definitions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_component_instances_updated_at 
  BEFORE UPDATE ON component_instances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
-- First, create a default library for any existing organizations
INSERT INTO component_libraries (organization_id, name, description, is_default, created_by)
SELECT 
  id,
  'Default Component Library',
  'Pre-built workflow components for common business processes',
  true,
  (SELECT id FROM auth.users LIMIT 1)
FROM organizations
ON CONFLICT DO NOTHING;

-- Insert some basic components for testing
WITH default_library AS (
  SELECT id as library_id, organization_id 
  FROM component_libraries 
  WHERE is_default = true
  LIMIT 1
)
INSERT INTO component_definitions (
  library_id, organization_id, name, description, component_group, component_type,
  ai_keywords, typical_examples, compatible_steps, html_template, css_classes, created_by
)
SELECT 
  dl.library_id,
  dl.organization_id,
  'Short Text Box',
  'Single-line text input for names, emails, and short responses',
  'basic_inputs',
  'short_text_box',
  '[
    {"keyword": "name", "weight": 8}, 
    {"keyword": "text", "weight": 7}, 
    {"keyword": "input", "weight": 6},
    {"keyword": "email", "weight": 9},
    {"keyword": "field", "weight": 5}
  ]'::jsonb,
  ARRAY['First name', 'Email address', 'Phone number', 'Title'],
  ARRAY['capture'],
  '<div class="form-group">
    <label for="{{id}}" class="form-label">{{label}}</label>
    <input 
      type="{{type}}" 
      id="{{id}}" 
      name="{{name}}"
      class="form-control"
      placeholder="{{placeholder}}"
      {{#if required}}required{{/if}}
    />
  </div>',
  ARRAY['form-group', 'form-label', 'form-control'],
  (SELECT id FROM auth.users LIMIT 1)
FROM default_library dl
WHERE NOT EXISTS (
  SELECT 1 FROM component_definitions 
  WHERE name = 'Short Text Box' AND organization_id = dl.organization_id
);

-- Insert more sample components
WITH default_library AS (
  SELECT id as library_id, organization_id 
  FROM component_libraries 
  WHERE is_default = true
  LIMIT 1
)
INSERT INTO component_definitions (
  library_id, organization_id, name, description, component_group, component_type,
  ai_keywords, typical_examples, compatible_steps, html_template, css_classes, created_by
)
VALUES 
  -- File Upload Component
  (
    (SELECT library_id FROM default_library LIMIT 1),
    (SELECT organization_id FROM default_library LIMIT 1),
    'File Upload',
    'Drag-and-drop or browse to attach files',
    'document_handling',
    'file_upload',
    '[
      {"keyword": "upload", "weight": 9}, 
      {"keyword": "file", "weight": 8}, 
      {"keyword": "document", "weight": 7}, 
      {"keyword": "attach", "weight": 6}
    ]'::jsonb,
    ARRAY['Receipt upload', 'Document attachment', 'Image upload'],
    ARRAY['capture'],
    '<div class="form-group">
      <label for="{{id}}" class="form-label">{{label}}</label>
      <input 
        type="file" 
        id="{{id}}" 
        name="{{name}}"
        class="form-file"
        {{#if accept}}accept="{{accept}}"{{/if}}
        {{#if multiple}}multiple{{/if}}
        {{#if required}}required{{/if}}
      />
    </div>',
    ARRAY['form-group', 'form-label', 'form-file'],
    (SELECT id FROM auth.users LIMIT 1)
  ),
  
  -- Approval Buttons Component
  (
    (SELECT library_id FROM default_library LIMIT 1),
    (SELECT organization_id FROM default_library LIMIT 1),
    'Approve/Reject Buttons',
    'One-click decision making with optional comments',
    'approval_signoff',
    'approve_reject_buttons',
    '[
      {"keyword": "approve", "weight": 9}, 
      {"keyword": "reject", "weight": 9}, 
      {"keyword": "decision", "weight": 7}
    ]'::jsonb,
    ARRAY['Manager approval', 'Final sign-off', 'Review decision'],
    ARRAY['approval'],
    '<div class="approval-buttons">
      <button type="button" class="btn-approve" data-action="approve">
        Approve
      </button>
      <button type="button" class="btn-reject" data-action="reject">
        Reject
      </button>
      <textarea class="approval-comment" placeholder="Add comment (optional)"></textarea>
    </div>',
    ARRAY['approval-buttons', 'btn-approve', 'btn-reject'],
    (SELECT id FROM auth.users LIMIT 1)
  )
ON CONFLICT DO NOTHING;