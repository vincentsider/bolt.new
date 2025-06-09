-- Trigger Library Tables
-- Adds support for admin-managed workflow triggers with AI mapping

-- Trigger Templates (admin-defined trigger types)
CREATE TABLE trigger_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'manual',
    'scheduled', 
    'email_received',
    'file_added',
    'record_created',
    'record_updated',
    'webhook',
    'condition_met'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'user_initiated',
    'time_based',
    'event_based', 
    'system_based'
  )),
  active BOOLEAN DEFAULT true,
  
  -- AI Mapping Data
  ai_keywords JSONB DEFAULT '[]'::jsonb,
  typical_use_cases TEXT[] DEFAULT '{}',
  
  -- Configuration Schema
  config_schema JSONB DEFAULT '{}'::jsonb,
  
  -- Visual Properties
  icon TEXT DEFAULT '⚡',
  color TEXT DEFAULT '#3B82F6',
  
  -- Setup Questions for AI
  setup_questions JSONB DEFAULT '[]'::jsonb,
  
  -- Integration Requirements
  required_integrations TEXT[] DEFAULT '{}',
  supported_systems TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Workflow Triggers (actual triggers configured for workflows)
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  template_id UUID REFERENCES trigger_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Trigger Configuration
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Data Mapping
  data_mapping JSONB DEFAULT '{}'::jsonb,
  
  -- Monitoring
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Trigger Events (log of trigger executions)
CREATE TABLE trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  workflow_instance_id UUID,
  error TEXT,
  processing_time_ms INTEGER
);

-- Trigger Monitors (status monitoring for triggers)
CREATE TABLE trigger_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  last_check TIMESTAMPTZ,
  next_check TIMESTAMPTZ,
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'error', 'disabled')),
  error_message TEXT,
  check_interval INTEGER DEFAULT 5, -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trigger_templates_org ON trigger_templates(organization_id);
CREATE INDEX idx_trigger_templates_type ON trigger_templates(type);
CREATE INDEX idx_trigger_templates_category ON trigger_templates(category);
CREATE INDEX idx_trigger_templates_active ON trigger_templates(active);

CREATE INDEX idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_triggers_template ON workflow_triggers(template_id);
CREATE INDEX idx_workflow_triggers_org ON workflow_triggers(organization_id);
CREATE INDEX idx_workflow_triggers_active ON workflow_triggers(active);

CREATE INDEX idx_trigger_events_trigger ON trigger_events(trigger_id);
CREATE INDEX idx_trigger_events_timestamp ON trigger_events(timestamp);
CREATE INDEX idx_trigger_events_processed ON trigger_events(processed);

CREATE INDEX idx_trigger_monitors_trigger ON trigger_monitors(trigger_id);
CREATE INDEX idx_trigger_monitors_status ON trigger_monitors(status);
CREATE INDEX idx_trigger_monitors_next_check ON trigger_monitors(next_check);

-- RLS Policies
ALTER TABLE trigger_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_monitors ENABLE ROW LEVEL SECURITY;

-- Trigger Templates Policies
CREATE POLICY "Users can view their organization's trigger templates"
  ON trigger_templates FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage trigger templates"
  ON trigger_templates FOR ALL
  USING (organization_id = get_user_organization_id() AND 
         get_user_role() IN ('sysadmin', 'admin'));

-- Workflow Triggers Policies  
CREATE POLICY "Users can view triggers for accessible workflows"
  ON workflow_triggers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_triggers.workflow_id 
    AND w.organization_id = get_user_organization_id()
  ));

CREATE POLICY "Builders can manage workflow triggers"
  ON workflow_triggers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_triggers.workflow_id 
    AND w.organization_id = get_user_organization_id()
    AND get_user_role() IN ('builder', 'sysadmin')
  ));

-- Trigger Events Policies
CREATE POLICY "Users can view trigger events for accessible workflows"
  ON trigger_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_triggers wt
    JOIN workflows w ON w.id = wt.workflow_id
    WHERE wt.id = trigger_events.trigger_id 
    AND w.organization_id = get_user_organization_id()
  ));

CREATE POLICY "System can manage trigger events"
  ON trigger_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_triggers wt
    JOIN workflows w ON w.id = wt.workflow_id
    WHERE wt.id = trigger_events.trigger_id 
    AND w.organization_id = get_user_organization_id()
  ));

-- Trigger Monitors Policies
CREATE POLICY "Users can view trigger monitors for accessible workflows"
  ON trigger_monitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_triggers wt
    JOIN workflows w ON w.id = wt.workflow_id
    WHERE wt.id = trigger_monitors.trigger_id 
    AND w.organization_id = get_user_organization_id()
  ));

CREATE POLICY "System can manage trigger monitors"
  ON trigger_monitors FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_triggers wt
    JOIN workflows w ON w.id = wt.workflow_id
    WHERE wt.id = trigger_monitors.trigger_id 
    AND w.organization_id = get_user_organization_id()
  ));

-- Insert default trigger templates for each organization
INSERT INTO trigger_templates (organization_id, name, description, type, category, ai_keywords, typical_use_cases, icon, created_by)
SELECT 
  id,
  trig.name,
  trig.description,
  trig.type,
  trig.category,
  trig.ai_keywords,
  trig.typical_use_cases,
  trig.icon,
  (SELECT id FROM auth.users WHERE email = 'admin@workflowhub.com' LIMIT 1)
FROM organizations
CROSS JOIN (
  VALUES 
    -- User Initiated Triggers
    ('Manual Start', 'User manually starts the workflow with a button or form submission', 'manual', 'user_initiated',
     '[{"keyword": "button", "weight": 8, "triggerType": "manual"}, {"keyword": "click", "weight": 7, "triggerType": "manual"}, {"keyword": "submit", "weight": 9, "triggerType": "manual"}]'::jsonb,
     ARRAY['Start onboarding process', 'Submit expense report', 'Request approval'],
     '👤'),
     
    -- Time Based Triggers  
    ('Scheduled Trigger', 'Automatically runs the workflow on a schedule (daily, weekly, monthly)', 'scheduled', 'time_based',
     '[{"keyword": "daily", "weight": 9, "triggerType": "scheduled"}, {"keyword": "weekly", "weight": 9, "triggerType": "scheduled"}, {"keyword": "schedule", "weight": 8, "triggerType": "scheduled"}]'::jsonb,
     ARRAY['Daily compliance check', 'Weekly status report', 'Monthly review cycle'],
     '⏰'),
     
    -- Event Based Triggers
    ('Email Received', 'Triggers when an email is received in a monitored mailbox', 'email_received', 'event_based',
     '[{"keyword": "email", "weight": 10, "triggerType": "email_received"}, {"keyword": "received", "weight": 8, "triggerType": "email_received"}, {"keyword": "inbox", "weight": 7, "triggerType": "email_received"}]'::jsonb,
     ARRAY['Process support tickets', 'Handle invoice emails', 'Customer inquiry routing'],
     '📧'),
     
    ('File Added', 'Triggers when a file is added to a monitored folder', 'file_added', 'event_based',
     '[{"keyword": "file", "weight": 9, "triggerType": "file_added"}, {"keyword": "upload", "weight": 8, "triggerType": "file_added"}, {"keyword": "document", "weight": 7, "triggerType": "file_added"}]'::jsonb,
     ARRAY['Process uploaded documents', 'Handle contract uploads', 'Scan new invoices'],
     '📁'),
     
    ('Record Created', 'Triggers when a new record is created in an external system', 'record_created', 'event_based',
     '[{"keyword": "created", "weight": 9, "triggerType": "record_created"}, {"keyword": "new", "weight": 7, "triggerType": "record_created"}, {"keyword": "added", "weight": 6, "triggerType": "record_created"}]'::jsonb,
     ARRAY['New customer onboarding', 'New employee setup', 'New project initialization'],
     '✨'),
     
    ('Webhook', 'Triggers when an external system sends a webhook notification', 'webhook', 'system_based',
     '[{"keyword": "webhook", "weight": 10, "triggerType": "webhook"}, {"keyword": "api", "weight": 7, "triggerType": "webhook"}, {"keyword": "notification", "weight": 6, "triggerType": "webhook"}]'::jsonb,
     ARRAY['Payment notifications', 'System alerts', 'External integrations'],
     '🔗')
) AS trig(name, description, type, category, ai_keywords, typical_use_cases, icon);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_trigger_templates_updated_at
  BEFORE UPDATE ON trigger_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_updated_at();

CREATE TRIGGER update_workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_updated_at();

CREATE TRIGGER update_trigger_monitors_updated_at
  BEFORE UPDATE ON trigger_monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_updated_at();