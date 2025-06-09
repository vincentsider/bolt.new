# Trigger Library Documentation

## Overview

The Trigger Library is an enterprise-grade workflow automation system that enables workflows to start automatically based on various events. It combines administrative control, AI-powered natural language understanding, and robust execution engines to make workflow automation accessible and reliable.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Trigger Library System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐          │
│  │   Admin     │    │ AI Trigger   │    │   Workflow    │          │
│  │   Panel     │───▶│   Mapper     │───▶│   Builder     │          │
│  └─────────────┘    └──────────────┘    └───────────────┘          │
│         │                   │                     │                   │
│         ▼                   ▼                     ▼                   │
│  ┌───────────────────────────────────────────────────────┐          │
│  │                  Trigger Configuration                 │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │          │
│  │  │ Templates  │  │ Instances  │  │ Conversations  │ │          │
│  │  └────────────┘  └────────────┘  └────────────────┘ │          │
│  └───────────────────────────────────────────────────────┘          │
│         │                                                             │
│         ▼                                                             │
│  ┌───────────────────────────────────────────────────────┐          │
│  │                  Trigger Execution Engine              │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │          │
│  │  │ Scheduler  │  │  Monitor   │  │ Event Handler  │ │          │
│  │  └────────────┘  └────────────┘  └────────────────┘ │          │
│  └───────────────────────────────────────────────────────┘          │
│         │                                                             │
│         ▼                                                             │
│  ┌───────────────────────────────────────────────────────┐          │
│  │              External Systems & Events                 │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │          │
│  │  │  Email  │  │  Files  │  │ Webhooks│  │Database│ │          │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘ │          │
│  └───────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### trigger_templates
```sql
- id: UUID (Primary Key)
- organization_id: UUID (Foreign Key)
- name: TEXT
- description: TEXT
- type: TEXT (Enum: manual, scheduled, email_received, etc.)
- category: TEXT (Enum: user_initiated, time_based, etc.)
- active: BOOLEAN
- ai_keywords: JSONB
- typical_use_cases: TEXT[]
- config_schema: JSONB
- icon: TEXT
- color: TEXT
- setup_questions: JSONB
- required_integrations: TEXT[]
- supported_systems: TEXT[]
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- created_by: UUID
```

#### workflow_triggers
```sql
- id: UUID (Primary Key)
- workflow_id: UUID (Foreign Key)
- template_id: UUID (Foreign Key)
- organization_id: UUID (Foreign Key)
- name: TEXT
- description: TEXT
- active: BOOLEAN
- config: JSONB
- data_mapping: JSONB
- last_triggered: TIMESTAMPTZ
- trigger_count: INTEGER
- error_count: INTEGER
```

#### trigger_events
```sql
- id: UUID (Primary Key)
- trigger_id: UUID (Foreign Key)
- event_type: TEXT
- event_data: JSONB
- timestamp: TIMESTAMPTZ
- processed: BOOLEAN
- workflow_instance_id: UUID
- error: TEXT
- processing_time_ms: INTEGER
```

#### trigger_monitors
```sql
- id: UUID (Primary Key)
- trigger_id: UUID (Foreign Key)
- active: BOOLEAN
- last_check: TIMESTAMPTZ
- next_check: TIMESTAMPTZ
- status: TEXT (healthy, warning, error, disabled)
- error_message: TEXT
- check_interval: INTEGER
```

### Trigger Types

#### 1. Manual Triggers (`manual`)
- **Category**: User Initiated
- **Description**: User manually starts workflow with button/form
- **Configuration**:
  ```typescript
  {
    allowedRoles: string[]
    confirmationRequired: boolean
    confirmationMessage?: string
  }
  ```

#### 2. Scheduled Triggers (`scheduled`)
- **Category**: Time Based
- **Description**: Runs automatically on a schedule
- **Configuration**:
  ```typescript
  {
    type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_cron'
    timezone: string
    time?: string // HH:MM format
    dayOfWeek?: number // 0-6 (Sunday=0)
    dayOfMonth?: number // 1-31
    cronExpression?: string
    startDate?: string
    endDate?: string
    excludeHolidays?: boolean
    excludeWeekends?: boolean
  }
  ```

#### 3. Email Received Triggers (`email_received`)
- **Category**: Event Based
- **Description**: Triggers when email arrives in monitored mailbox
- **Configuration**:
  ```typescript
  {
    mailbox: string
    provider: 'exchange' | 'gmail' | 'imap' | 'outlook'
    fromFilter?: string
    subjectFilter?: string
    bodyFilter?: string
    authentication: {
      type: 'oauth' | 'password' | 'app_password'
      credentials?: Record<string, string>
    }
    markAsRead?: boolean
    moveToFolder?: string
    extractAttachments?: boolean
  }
  ```

#### 4. File Added Triggers (`file_added`)
- **Category**: Event Based
- **Description**: Triggers when file is added to monitored folder
- **Configuration**:
  ```typescript
  {
    platform: 'sharepoint' | 'google_drive' | 'dropbox' | 'onedrive' | 'ftp'
    folder: string
    filePattern?: string // regex or glob
    fileTypes?: string[] // ['pdf', 'docx']
    minFileSize?: number
    maxFileSize?: number
    moveAfterProcessing?: boolean
    destinationFolder?: string
  }
  ```

#### 5. Record Created/Updated Triggers (`record_created`, `record_updated`)
- **Category**: Event Based
- **Description**: Triggers when database record changes
- **Configuration**:
  ```typescript
  {
    system: string // 'salesforce', 'hubspot', etc.
    entity: string // table/object name
    operation: 'created' | 'updated' | 'deleted'
    fieldFilters?: Array<{
      field: string
      operator: ConditionOperator
      value: any
    }>
    apiEndpoint?: string
    authentication?: AuthConfig
    pollingInterval?: number // minutes
  }
  ```

#### 6. Webhook Triggers (`webhook`)
- **Category**: System Based
- **Description**: External systems call webhook URL
- **Configuration**:
  ```typescript
  {
    url: string
    method: 'POST' | 'GET' | 'PUT'
    authentication?: {
      type: 'none' | 'bearer' | 'basic' | 'api_key' | 'signature'
      secret?: string
      allowedIPs?: string[]
    }
    expectedHeaders?: Record<string, string>
    payloadValidation?: string // JSON schema
  }
  ```

#### 7. Condition Met Triggers (`condition_met`)
- **Category**: System Based
- **Description**: Monitors data conditions
- **Configuration**:
  ```typescript
  {
    checkInterval: number // minutes
    conditions: Array<{
      field: string
      operator: ConditionOperator
      value: any
      source?: string
    }>
    logic: 'AND' | 'OR'
    cooldownMinutes?: number
  }
  ```

## User Experience

### Natural Language Trigger Configuration

Users can describe triggers in plain language:

```
User: "run this daily at 9am"
System: Creates scheduled trigger with:
- Type: daily
- Time: 09:00
- AI asks: "What timezone should I use?"

User: "when we receive an email from customers"
System: Creates email trigger with:
- Type: email_received
- AI asks: "Which email address should I monitor?"
- AI asks: "Should I only process emails with 'customer' in the from address?"

User: "when a new contract is uploaded to SharePoint"
System: Creates file trigger with:
- Type: file_added
- Platform: sharepoint
- AI asks: "Which SharePoint folder should I monitor?"
- AI asks: "Should I only look for specific file types like PDF or Word documents?"
```

### Workflow Builder Integration

1. **Trigger Button**: Purple button shows trigger count
2. **Configuration Modal**: User-friendly interface for setup
3. **Multiple Triggers**: Workflows can have multiple start conditions
4. **Visual Feedback**: Active/inactive status indicators

### Proactive AI Questions

The AI proactively asks configuration questions:

```
AI: "I see you want to create an expense approval workflow. How would you like this workflow to be triggered?"

User: "When someone submits the form"
AI: "Got it! I'll set up a manual trigger. Which user roles should be allowed to start this workflow?"

User: "Anyone in the finance team"
AI: "Perfect! Should I require confirmation before starting the workflow?"

User: "Yes, show them the total amount"
AI: "Understood. I'll add a confirmation dialog that displays the expense amount before submission."
```

## Admin Experience

### Trigger Library Manager (`/admin/triggers`)

#### Dashboard Features

1. **Statistics Cards**
   - Total Triggers
   - Active Triggers
   - Total Events Processed
   - Average Processing Time

2. **Trigger Management**
   - Create/Edit/Delete trigger templates
   - Activate/Deactivate triggers
   - Filter by type and category
   - Search functionality

3. **AI Configuration**
   - Keyword management with weights (1-10)
   - Context words for better matching
   - Typical use case examples
   - Test matching algorithm

4. **Setup Questions**
   - Question builder interface
   - Conditional questions support
   - Multiple question types
   - Configuration mapping

### Creating a Trigger Template

1. **Basic Information**
   ```typescript
   {
     name: "Daily Report Trigger",
     description: "Runs reports every morning",
     type: "scheduled",
     category: "time_based",
     icon: "⏰",
     color: "#10B981"
   }
   ```

2. **AI Keywords**
   ```typescript
   [
     { keyword: "daily", weight: 10, triggerType: "scheduled" },
     { keyword: "morning", weight: 8, triggerType: "scheduled" },
     { keyword: "report", weight: 7, triggerType: "scheduled" },
     { keyword: "every day", weight: 9, triggerType: "scheduled" }
   ]
   ```

3. **Setup Questions**
   ```typescript
   [
     {
       id: "q1",
       question: "What time should the report run?",
       type: "text",
       required: true,
       helpText: "Enter time in 24-hour format (e.g., 09:00)",
       configMapping: "scheduled.time"
     },
     {
       id: "q2",
       question: "Which timezone?",
       type: "select",
       required: true,
       options: ["UTC", "America/New_York", "Europe/London"],
       configMapping: "scheduled.timezone"
     }
   ]
   ```

## Trigger Execution Engine

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Trigger Monitor Service                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐    Per Organization:             │
│  │   Service    │    ┌─────────────────────────┐   │
│  │   Manager    │───▶│   Trigger Engine        │   │
│  └──────────────┘    │  ┌────────────────┐    │   │
│                      │  │ Active Monitors │    │   │
│                      │  └────────────────┘    │   │
│                      │  ┌────────────────┐    │   │
│                      │  │ Event Processor │    │   │
│                      │  └────────────────┘    │   │
│                      └─────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Monitoring Process

1. **Startup**
   - Service queries all active triggers
   - Groups by organization
   - Creates engine per organization
   - Starts appropriate monitors

2. **Scheduled Triggers**
   - Checks schedule every minute
   - Compares current time with schedule
   - Handles timezone conversions
   - Respects exclusion rules

3. **Email Monitoring**
   - Polls inbox every minute
   - Applies filters (from, subject, body)
   - Processes attachments if configured
   - Marks/moves emails as configured

4. **File Monitoring**
   - Scans folder every 2 minutes
   - Matches file patterns
   - Checks file size constraints
   - Moves/processes files

5. **Webhook Processing**
   - Receives HTTP requests
   - Validates authentication
   - Checks headers and payload
   - Executes workflow

6. **Condition Monitoring**
   - Evaluates conditions at intervals
   - Applies AND/OR logic
   - Respects cooldown periods
   - Queries data sources

### Event Processing

```typescript
// Event lifecycle
1. Trigger fires → Create TriggerEvent
2. Start workflow → Create WorkflowInstance
3. Map trigger data → Apply DataMapping
4. Execute workflow → Track progress
5. Complete → Update statistics
```

### Error Handling

1. **Retry Logic**
   - Automatic retry for transient failures
   - Exponential backoff
   - Maximum retry limits

2. **Error Tracking**
   - Detailed error messages
   - Stack traces for debugging
   - Error count per trigger

3. **Monitor Health**
   - Status indicators (healthy/warning/error)
   - Last check timestamps
   - Next scheduled check

## Security

### Authentication

1. **Webhook Security**
   ```typescript
   // Bearer token
   Authorization: Bearer <secret>
   
   // API Key
   X-API-Key: <secret>
   
   // HMAC Signature
   X-Signature: sha256=<hmac>
   ```

2. **IP Whitelisting**
   - Configure allowed IPs
   - Automatic blocking
   - Logging of attempts

3. **Payload Validation**
   - JSON schema validation
   - Size limits
   - Content type checking

### Access Control

1. **Role-Based Permissions**
   - Admin: Full trigger management
   - Builder: Configure workflow triggers
   - User: Execute manual triggers only

2. **Organization Isolation**
   - Triggers scoped to organization
   - No cross-tenant access
   - Separate execution engines

3. **Audit Trail**
   - All trigger events logged
   - Configuration changes tracked
   - Execution history maintained

## Performance

### Optimization Strategies

1. **Efficient Polling**
   - Intelligent check intervals
   - Skip checks when not needed
   - Batch processing

2. **Resource Management**
   - Per-organization engines
   - Automatic cleanup
   - Memory limits

3. **Database Performance**
   - Indexed queries
   - Efficient event storage
   - Archival strategy

### Scalability

1. **Horizontal Scaling**
   - Multiple monitor services
   - Load distribution
   - Shared state via database

2. **Rate Limiting**
   - Per-trigger limits
   - Organization quotas
   - Webhook throttling

## Integration

### Workflow Builder

```typescript
// In WorkflowChat.tsx
const triggerMapper = new TriggerMapper(organizationId)
const suggestion = await triggerMapper.suggestTriggers(userInput)

// Proactive questions
const questions = triggerMapper.generateProactiveQuestions(
  userInput, 
  selectedTrigger
)
```

### External Systems

1. **Email Providers**
   - Exchange/Office 365
   - Gmail (OAuth2)
   - IMAP servers
   - Custom SMTP

2. **File Storage**
   - SharePoint
   - Google Drive
   - Dropbox
   - OneDrive
   - FTP/SFTP

3. **Databases**
   - Salesforce
   - HubSpot
   - Custom APIs
   - Internal systems

## Monitoring & Debugging

### Logs

```typescript
// Enable debug logging
const mapper = new TriggerMapper(orgId)
mapper.debug = true

// Engine logs
TriggerEngine: Starting monitoring for trigger-123
TriggerEngine: Email check - found 3 new messages
TriggerEngine: Executing trigger for workflow-456
```

### Monitoring Dashboard

1. **Real-time Status**
   - Active monitors
   - Recent events
   - Error alerts

2. **Performance Metrics**
   - Processing times
   - Success rates
   - Queue depths

3. **Health Checks**
   - Service status
   - Integration health
   - Resource usage

## Troubleshooting

### Common Issues

1. **Trigger Not Firing**
   - Check trigger is active
   - Verify configuration
   - Review monitor logs
   - Check error count

2. **Authentication Failures**
   - Validate credentials
   - Check OAuth tokens
   - Verify API keys
   - Review IP whitelist

3. **Performance Issues**
   - Check polling intervals
   - Review event volume
   - Optimize conditions
   - Scale monitors

### Debug Tools

1. **Test Execution**
   ```typescript
   // Manual trigger test
   await triggerEngine.executeTrigger(triggerId, testData)
   ```

2. **Configuration Validation**
   ```typescript
   // Validate trigger config
   const isValid = validateTriggerConfig(trigger.config)
   ```

3. **Event Inspection**
   ```sql
   -- Recent events for trigger
   SELECT * FROM trigger_events 
   WHERE trigger_id = ? 
   ORDER BY timestamp DESC 
   LIMIT 10
   ```

## Best Practices

### For Administrators

1. **Trigger Design**
   - Clear, descriptive names
   - Comprehensive descriptions
   - Appropriate icons/colors
   - Well-defined use cases

2. **Keyword Strategy**
   - Primary keywords: weight 8-10
   - Secondary keywords: weight 5-7
   - Context keywords: weight 3-5
   - Include variations

3. **Question Design**
   - Clear, concise questions
   - Helpful descriptions
   - Sensible defaults
   - Progressive disclosure

### For Users

1. **Trigger Selection**
   - Consider frequency
   - Think about timing
   - Plan for failures
   - Test thoroughly

2. **Configuration**
   - Use specific filters
   - Set reasonable intervals
   - Configure notifications
   - Monitor performance

### For Developers

1. **Custom Triggers**
   ```typescript
   class CustomTrigger extends BaseTrigger {
     async monitor(): Promise<void> {
       // Custom monitoring logic
     }
   }
   ```

2. **Integration Points**
   ```typescript
   // Add custom data source
   triggerEngine.addDataSource('custom', {
     check: async () => { /* ... */ },
     fetch: async () => { /* ... */ }
   })
   ```

## API Reference

### Trigger Library API

```typescript
// Templates
GET /api/trigger-library?organization_id={orgId}
POST /api/trigger-library
PUT /api/trigger-library/{id}
DELETE /api/trigger-library/{id}
PATCH /api/trigger-library/{id}/toggle

// Statistics
GET /api/trigger-library/stats?organization_id={orgId}

// Webhook endpoint
POST /api/webhook/{triggerId}
GET /api/webhook/{triggerId}
```

### Trigger Mapper API

```typescript
class TriggerMapper {
  async suggestTriggers(userInput: string): Promise<TriggerSuggestion>
  
  async startTriggerConversation(
    workflowId: string,
    template: TriggerTemplate,
    userInput: string
  ): Promise<TriggerConversation>
  
  answerQuestion(
    conversation: TriggerConversation,
    questionId: string,
    answer: any
  ): TriggerConversation
  
  generateProactiveQuestions(
    userInput: string,
    template: TriggerTemplate
  ): string[]
}
```

### Trigger Engine API

```typescript
class TriggerEngine {
  async startMonitoring(trigger: WorkflowTrigger): Promise<void>
  async stopMonitoring(triggerId: string): Promise<void>
  async executeTrigger(trigger: WorkflowTrigger, eventData: any): Promise<void>
  async processWebhook(
    triggerId: string,
    method: string,
    headers: Record<string, string>,
    body: any
  ): Promise<{ success: boolean; message: string }>
}
```

## Future Enhancements

1. **Advanced Triggers**
   - Geolocation triggers
   - IoT device triggers
   - Social media triggers
   - Weather-based triggers

2. **AI Improvements**
   - Pattern learning
   - Predictive triggering
   - Anomaly detection
   - Smart scheduling

3. **Enterprise Features**
   - Trigger marketplace
   - Custom trigger SDK
   - Advanced analytics
   - Compliance reporting

## Conclusion

The Trigger Library provides a comprehensive, enterprise-ready solution for workflow automation. By combining intuitive natural language configuration with robust execution engines, it enables organizations to automate complex business processes reliably and efficiently. The system's flexibility allows for simple manual triggers to complex event-driven automation, all managed through a unified, user-friendly interface.