# Arcade.dev Integration Architecture

## Overview

This document outlines how WorkflowHub will integrate with Arcade.dev to provide 100+ pre-built integrations for workflow automation.

## Architecture Principles

1. **Abstraction Layer**: Arcade is an implementation detail; workflows shouldn't depend on it directly
2. **Graceful Degradation**: Workflows continue functioning if Arcade is unavailable
3. **Security First**: All credentials managed through Arcade's secure vault
4. **Performance**: Cache tool schemas and minimize API calls

## Integration Architecture

### 1. High-Level Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Workflow Builder  │────▶│ Integration      │────▶│   Arcade.dev    │
│   (UI/Chat)         │     │ Service          │     │   Engine        │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
                                    │                          │
                            ┌───────▼────────┐         ┌──────▼──────┐
                            │ Tool Registry  │         │  External   │
                            │ (Cache)        │         │  Systems    │
                            └────────────────┘         └─────────────┘
```

### 2. Core Components

#### Integration Service

```typescript
// Main service for all Arcade interactions
export class ArcadeIntegrationService {
  private client: ArcadeClient
  private cache: ToolCache
  private authManager: ArcadeAuthManager
  
  constructor(
    private config: ArcadeConfig,
    private logger: Logger
  ) {
    this.client = new ArcadeClient(config.apiKey, config.endpoint)
    this.cache = new ToolCache()
    this.authManager = new ArcadeAuthManager(this.client)
  }
  
  // Get available tools for workflow builder
  async getAvailableTools(organizationId: string): Promise<WorkflowTool[]> {
    const cached = await this.cache.getTools()
    if (cached) return this.mapToWorkflowTools(cached)
    
    const tools = await this.client.listTools()
    await this.cache.setTools(tools, 3600) // 1 hour cache
    
    return this.mapToWorkflowTools(tools)
  }
  
  // Execute a tool within a workflow step
  async executeTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
    try {
      // Ensure user is authorized for this tool
      const auth = await this.authManager.ensureAuthorized(
        params.userId,
        params.toolName
      )
      
      // Map workflow data to tool inputs
      const toolInput = this.mapWorkflowToToolInput(
        params.stepConfig,
        params.workflowContext
      )
      
      // Execute via Arcade
      const result = await this.client.executeToolAsync({
        toolName: params.toolName,
        input: toolInput,
        userId: params.userId
      })
      
      // Map tool output back to workflow
      return this.mapToolToWorkflowOutput(result, params.stepConfig)
      
    } catch (error) {
      return this.handleToolError(error, params)
    }
  }
}
```

#### Tool Registry & Mapping

```typescript
// Tool definition in WorkflowHub
interface WorkflowTool {
  id: string
  name: string
  category: 'crm' | 'finance' | 'communication' | 'data' | 'other'
  description: string
  icon: string
  
  // Integration details
  provider: 'arcade' | 'internal'
  arcadeToolName?: string
  
  // Tool interface
  inputs: ToolParameter[]
  outputs: ToolParameter[]
  
  // Requirements
  requiresAuth: boolean
  authType?: 'oauth2' | 'apikey' | 'basic'
}

// Mapping between Arcade tools and WorkflowHub tools
export class ToolMapper {
  // Convert Arcade tool schema to WorkflowHub format
  mapArcadeToWorkflow(arcadeTool: ArcadeTool): WorkflowTool {
    return {
      id: `arcade_${arcadeTool.name}`,
      name: this.humanizeName(arcadeTool.name),
      category: this.categorize(arcadeTool.toolkit),
      description: arcadeTool.description,
      icon: this.getIcon(arcadeTool.toolkit),
      provider: 'arcade',
      arcadeToolName: arcadeTool.fully_qualified_name,
      inputs: this.mapParameters(arcadeTool.input.parameters),
      outputs: this.mapOutputs(arcadeTool.output),
      requiresAuth: !!arcadeTool.requirements?.authorization,
      authType: this.getAuthType(arcadeTool.requirements)
    }
  }
  
  // Map workflow step config to Arcade tool input
  mapStepToToolInput(
    step: UpdateStep,
    context: WorkflowContext
  ): Record<string, any> {
    const input: Record<string, any> = {}
    
    for (const [toolParam, workflowPath] of Object.entries(step.arcadeTool!.inputMapping)) {
      input[toolParam] = this.resolveValue(workflowPath, context)
    }
    
    return input
  }
}
```

#### Authorization Management

```typescript
export class ArcadeAuthManager {
  constructor(private arcade: ArcadeClient) {}
  
  // Ensure user is authorized for a specific tool
  async ensureAuthorized(
    userId: string,
    toolName: string
  ): Promise<AuthorizationResult> {
    // Check if we have valid auth
    const existing = await this.getExistingAuth(userId, toolName)
    if (existing?.status === 'completed') {
      return existing
    }
    
    // Need new authorization
    const authResponse = await this.arcade.initiate_authorization({
      user_id: userId,
      auth_requirement: {
        provider_type: this.getProviderType(toolName)
      }
    })
    
    if (authResponse.status === 'pending') {
      // Store auth request for user to complete
      await this.storeAuthRequest(userId, authResponse)
      throw new AuthorizationRequiredError({
        authUrl: authResponse.url,
        authId: authResponse.id
      })
    }
    
    return authResponse
  }
  
  // Handle OAuth callback
  async handleAuthCallback(
    authId: string,
    userId: string
  ): Promise<void> {
    const status = await this.arcade.auth_status({ id: authId })
    
    if (status.status === 'completed') {
      await this.storeUserAuth(userId, status)
      // Notify workflow engine to retry
      await this.notifyAuthComplete(userId, authId)
    }
  }
}
```

### 3. Workflow Step Integration

```typescript
// How workflow steps use Arcade tools
interface ArcadeUpdateStep extends UpdateStep {
  type: 'update'
  system: 'arcade'
  
  arcadeTool: {
    name: string // Arcade tool name
    version?: string
    
    // Field mapping configuration
    inputMapping: Record<string, string> // tool input -> workflow field
    outputMapping: Record<string, string> // tool output -> workflow field
    
    // Error handling
    retryConfig?: {
      maxAttempts: number
      backoffMs: number
    }
  }
}

// Example workflow step using Salesforce via Arcade
const salesforceStep: ArcadeUpdateStep = {
  id: 'create_lead',
  type: 'update',
  name: 'Create Salesforce Lead',
  system: 'arcade',
  
  arcadeTool: {
    name: 'Salesforce.CreateLead',
    inputMapping: {
      'FirstName': '$.form.firstName',
      'LastName': '$.form.lastName',
      'Email': '$.form.email',
      'Company': '$.form.company',
      'LeadSource': '"WorkflowHub"'
    },
    outputMapping: {
      '$.salesforce.leadId': 'id',
      '$.salesforce.createdAt': 'created_date'
    }
  },
  
  nextSteps: [{
    stepId: 'send_welcome_email',
    condition: { field: '$.salesforce.leadId', operator: 'exists' }
  }]
}
```

### 4. Execution Flow

```sequenceDiagram
    participant WF as Workflow Engine
    participant IS as Integration Service
    participant AC as Arcade Client
    participant ES as External System
    
    WF->>IS: Execute Step (Arcade Tool)
    IS->>IS: Check Authorization
    
    alt Not Authorized
        IS->>AC: Request Authorization
        AC-->>IS: Auth URL
        IS-->>WF: Pause (Auth Required)
        Note over WF: User completes OAuth
        WF->>IS: Resume Execution
    end
    
    IS->>AC: Execute Tool
    AC->>ES: API Call
    ES-->>AC: Response
    AC-->>IS: Tool Result
    IS->>IS: Map Output
    IS-->>WF: Step Result
```

### 5. Error Handling

```typescript
export class ArcadeErrorHandler {
  async handleToolError(
    error: any,
    params: ToolExecutionParams
  ): Promise<ToolExecutionResult> {
    // Categorize error
    const errorType = this.categorizeError(error)
    
    switch (errorType) {
      case 'AUTH_REQUIRED':
        return {
          success: false,
          error: {
            type: 'authorization_required',
            message: 'Tool requires authorization',
            authUrl: error.authUrl,
            recoverable: true
          }
        }
        
      case 'RATE_LIMIT':
        // Queue for retry
        await this.queueForRetry(params, error.retryAfterMs)
        return {
          success: false,
          error: {
            type: 'rate_limit',
            message: 'Rate limit exceeded, will retry',
            retryAfterMs: error.retryAfterMs,
            recoverable: true
          }
        }
        
      case 'INVALID_INPUT':
        return {
          success: false,
          error: {
            type: 'validation_error',
            message: error.message,
            fields: error.fields,
            recoverable: false
          }
        }
        
      default:
        // Log for investigation
        await this.logger.error('Arcade tool error', {
          ...params,
          error: error.message,
          stack: error.stack
        })
        
        return {
          success: false,
          error: {
            type: 'system_error',
            message: 'Tool execution failed',
            recoverable: params.stepConfig.errorHandling !== 'fail'
          }
        }
    }
  }
}
```

### 6. Tool Discovery UI

```typescript
// Component for tool selection in workflow builder
export function ToolSelector({ 
  onSelect,
  category,
  search 
}: ToolSelectorProps) {
  const tools = useArcadeTools(category, search)
  const [selectedTool, setSelectedTool] = useState<WorkflowTool>()
  
  return (
    <div className="tool-selector">
      <SearchInput 
        placeholder="Search integrations..."
        onChange={setSearch}
      />
      
      <CategoryFilter
        categories={['all', 'crm', 'finance', 'communication']}
        selected={category}
        onChange={setCategory}
      />
      
      <div className="tool-grid">
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onClick={() => setSelectedTool(tool)}
            selected={selectedTool?.id === tool.id}
          />
        ))}
      </div>
      
      {selectedTool && (
        <ToolConfigPanel
          tool={selectedTool}
          onConfirm={(config) => onSelect(selectedTool, config)}
        />
      )}
    </div>
  )
}
```

### 7. Performance Optimization

```typescript
// Caching strategy for Arcade data
export class ArcadeCache {
  private redis: Redis
  
  // Cache tool schemas (1 hour)
  async cacheToolSchemas(tools: ArcadeTool[]): Promise<void> {
    await this.redis.setex(
      'arcade:tools:all',
      3600,
      JSON.stringify(tools)
    )
  }
  
  // Cache user authorizations (check on each execution)
  async cacheUserAuth(
    userId: string,
    toolName: string,
    auth: AuthorizationResponse
  ): Promise<void> {
    const key = `arcade:auth:${userId}:${toolName}`
    await this.redis.setex(key, 86400, JSON.stringify(auth)) // 24 hours
  }
  
  // Batch tool executions where possible
  async batchExecute(
    executions: ToolExecutionParams[]
  ): Promise<ToolExecutionResult[]> {
    // Group by tool and similar inputs
    const batches = this.groupIntoBatches(executions)
    
    // Execute batches in parallel
    const results = await Promise.all(
      batches.map(batch => this.executeBatch(batch))
    )
    
    return results.flat()
  }
}
```

### 8. Monitoring & Analytics

```typescript
// Track Arcade usage for optimization
export class ArcadeAnalytics {
  async trackExecution(params: {
    toolName: string
    organizationId: string
    userId: string
    duration: number
    success: boolean
    error?: string
  }): Promise<void> {
    await this.db.arcade_executions.create({
      ...params,
      timestamp: new Date()
    })
    
    // Update tool popularity metrics
    await this.updateToolMetrics(params.toolName, params.success)
    
    // Alert on high failure rates
    if (!params.success) {
      await this.checkFailureThreshold(params.toolName)
    }
  }
  
  // Identify most used tools for optimization
  async getTopTools(organizationId: string): Promise<ToolUsage[]> {
    return this.db.query(`
      SELECT 
        tool_name,
        COUNT(*) as executions,
        AVG(duration) as avg_duration,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
      FROM arcade_executions
      WHERE organization_id = $1
        AND timestamp > NOW() - INTERVAL '30 days'
      GROUP BY tool_name
      ORDER BY executions DESC
      LIMIT 20
    `, [organizationId])
  }
}
```

## Implementation Plan

### Phase 1: Core Integration (Week 1)
- [ ] Set up Arcade client
- [ ] Implement tool discovery
- [ ] Create tool mapping layer
- [ ] Build basic execution flow

### Phase 2: Authorization (Week 2)
- [ ] Implement auth flow handling
- [ ] Create auth UI components
- [ ] Add credential management
- [ ] Test OAuth flows

### Phase 3: Builder Integration (Week 3)
- [ ] Add tool selector to builder
- [ ] Create field mapping UI
- [ ] Implement tool testing
- [ ] Add error previews

### Phase 4: Production Readiness (Week 4)
- [ ] Add comprehensive error handling
- [ ] Implement caching layer
- [ ] Set up monitoring
- [ ] Performance optimization

## Security Considerations

1. **API Key Management**
   - Store Arcade API key in secure vault
   - Rotate keys quarterly
   - Use separate keys for dev/staging/prod

2. **User Authorization**
   - Never store user credentials
   - Use Arcade's secure token storage
   - Implement auth expiry handling

3. **Data Privacy**
   - Log minimal PII
   - Encrypt sensitive workflow data
   - Implement data retention policies

4. **Rate Limiting**
   - Implement client-side rate limiting
   - Queue and batch where possible
   - Graceful degradation on limits

---

*Status: Ready for Implementation*
*Next: Build Workflow Execution Engine Prototype*