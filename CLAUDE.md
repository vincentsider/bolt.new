# WorkflowHub - Claude Context

## Project Overview
WorkflowHub is an enterprise workflow automation platform that enables business users to create, manage, and execute complex workflows using natural language. Built on the Bolt.new codebase, it transforms the AI chat interface into a powerful workflow generator.

## Business Model
- **Target Market**: Enterprise workflow automation
- **Key Value**: Natural language → executable workflows
- **Integration Strategy**: 100+ pre-built integrations via Arcade.dev
- **Pricing**: £2k/month (Builders), £10/month (Users/Approvers)

## Tech Stack
- **Framework**: Remix (React)
- **Build Tool**: Vite
- **Deployment**: Cloudflare Pages with Workers
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (JWT-based, multi-tenant)
- **Styling**: UnoCSS with custom design system
- **Language**: TypeScript
- **AI Integration**: Anthropic Claude via @ai-sdk/anthropic
- **External Integrations**: Arcade.dev Engine API
- **State Management**: Nanostores (existing)
- **Code Editor**: CodeMirror
- **Runtime**: WebContainers (Node.js in browser)

## Development Commands
```bash
# Development
pnpm run dev          # Start development server
pnpm run start        # Production server with Wrangler

# Building & Testing
pnpm run build        # Build for production
pnpm run typecheck    # TypeScript check
pnpm run lint         # ESLint check
pnpm run lint:fix     # Fix ESLint issues
pnpm run test         # Run tests with Vitest

# Deployment
pnpm run deploy       # Deploy to Cloudflare Pages
```

## Implementation Priority (Critical Path)

### 🔴 Must Do First (Foundation)
1. **Database & Auth Setup** - Blocking dependency for all features
   - Set up Supabase project with multi-tenant architecture
   - Implement Row Level Security (RLS) for data isolation
   - Create organizations, users, workflows tables
   - Build JWT-based auth with role-based permissions

2. **Workflow Data Models** - Core domain model everything references
   - Define TypeScript interfaces for Workflow, WorkflowStep, WorkflowExecution
   - Implement CRUD operations with proper tenant isolation
   - Add workflow state management and validation

### 🟡 Core Features (Can Parallelize)
3. **Modular Component Builder**
   - Create pre-built component library (input, logic, integration, notification)
   - Implement UI guidelines system for consistency
   - Build natural language → component suggestion engine
   - Create visual assembly interface with drag-drop
   - Add smart component configuration panels
   - Implement live preview and testing capabilities

4. **Workflow Execution Engine**
   - Implement component-based step orchestration
   - Handle modular component execution
   - Add error handling, retry logic, and event emission
   - Create execution monitoring and visualization UI

### 🟢 Integration Layer
5. **Arcade.dev Integration**
   - Set up Arcade client with proper authentication
   - Build tool registry and mapping layer
   - Implement OAuth2 authorization flow
   - Create tool selector UI for workflow builder

## Key Directories
- `app/` - Main application code (Remix app)
- `app/components/` - React components
  - `chat/` - Existing chat components (reuse for workflow generation)
  - `workbench/` - File management components
  - `workflow/` - NEW: Modular workflow builder components
    - `builder/` - Component library and visual assembly
    - `components/` - Pre-built workflow components
    - `canvas/` - Drag-drop workflow canvas
    - `config/` - Component configuration panels
- `app/lib/` - Shared utilities and libraries
  - `workflow/` - NEW: Workflow engine, data models, validation
  - `components/` - NEW: Component library system and registry
  - `ui-guidelines/` - NEW: UI consistency and design system
  - `integrations/` - NEW: Arcade.dev client and tool management
- `app/routes/` - Remix routes
  - `workflow/` - NEW: Workflow management routes
  - `api/` - API endpoints for workflows and integrations
- `app/stores/` - State management (using existing nanostores)
  - `workflow.ts` - NEW: Workflow builder and execution state
  - `components.ts` - NEW: Component library and selection state
  - `builder.ts` - NEW: Visual builder canvas and configuration state
- `functions/` - Cloudflare Workers functions
- `DOCS/` - Project documentation

## Core Data Models

### User & Organization
```typescript
interface Organization {
  id: string
  name: string
  plan: 'starter' | 'professional' | 'enterprise'
  settings: { ssoEnabled: boolean, allowedDomains: string[] }
}

interface User {
  id: string
  email: string
  organizationId: string
  role: 'admin' | 'builder' | 'user' | 'approver'
  permissions: Permission[]
}
```

### Workflow Definition
```typescript
interface Workflow {
  id: string
  organizationId: string
  name: string
  prompt?: string // Natural language spec
  config: {
    triggers: WorkflowTrigger[]
    steps: WorkflowStep[]
    settings: WorkflowSettings
  }
  status: 'draft' | 'published' | 'archived'
  permissions: { executors: string[], editors: string[] }
}

interface WorkflowStep {
  id: string
  type: 'capture' | 'review' | 'approve' | 'update' | 'condition'
  config: CaptureStep | ReviewStep | ApproveStep | UpdateStep | ConditionStep
  arcadeTool?: {
    name: string
    inputMapping: Record<string, string>
    outputMapping: Record<string, string>
  }
}
```

## Environment
- Environment variables in `.env.local`
- Anthropic API key configured
- **NEW**: Supabase configuration (URL, anon key, service key)
- **NEW**: Arcade API key for integrations
- Cloudflare configuration in `wrangler.toml`

## Arcade.dev Integration Architecture

### Core Components
1. **ArcadeIntegrationService** - Main service for tool execution
2. **ToolMapper** - Convert Arcade tools to WorkflowHub format
3. **ArcadeAuthManager** - Handle OAuth2 authorization flows
4. **ToolRegistry** - Cache and manage available tools

### Integration Flow
```
Workflow Builder → Integration Service → Arcade Engine → External Systems
       ↓                    ↓                   ↓
Tool Selection     Authorization Flow    100+ Integrations
```

### Available Tools (Examples)
- **CRM**: Salesforce, HubSpot, Pipedrive
- **Finance**: QuickBooks, Xero, Stripe
- **Communication**: Slack, Teams, Email
- **Data**: Google Sheets, Airtable, Notion


## Success Metrics
- **MVP Timeline**: 3-4 months (vs 8-10 without Arcade)
- **Cost Savings**: ~$200K in integration development
- **Time to First Workflow**: < 30 minutes for users
- **Feature Velocity**: 2x faster with pre-built integrations

## Security & Compliance
- **Multi-tenant**: Complete data isolation via RLS
- **Authentication**: JWT-based with role-based permissions
- **Integrations**: OAuth2 via Arcade (SOC2 compliant)
- **API Security**: Rate limiting, key rotation, audit logging
- **Data Privacy**: Minimal PII logging, encryption at rest

---

## 📊 CURRENT DEVELOPMENT STATUS
*Last Updated: June 7, 2025*

### 🎯 Current Sprint: Core Platform Complete
**Goal**: Enterprise-ready workflow automation platform
**Status**: Core platform fully implemented - Ready for visual builder

### ✅ Completed Tasks
- [x] **Project Analysis & Planning** *(June 7)*
  - Analyzed existing Bolt.new codebase
  - Defined WorkflowHub requirements and architecture
  - Created comprehensive documentation (auth, data models, Arcade integration)
  - Established critical path implementation order
  - Created CLAUDE.md with progress tracking system

- [x] **Database & Authentication Foundation** *(June 7)*
  - ✅ Supabase Cloud project setup and connection verified
  - ✅ Complete database schema deployed (10+ tables with RLS)
  - ✅ TypeScript interfaces for all data models
  - ✅ Basic authentication UI components (login/signup)
  - ✅ Multi-tenant architecture with organization isolation
  - ✅ Row Level Security policies implemented

- [x] **Authentication Gap Analysis** *(June 7)*
  - ✅ Identified critical gaps vs PRD requirements
  - ✅ Missing Azure AD integration (enterprise blocker)
  - ✅ Role model mismatch (missing reviewer, auditor)
  - ✅ No field-level security (compliance risk)
  - ✅ Created remediation roadmap

- [x] **Enterprise Compliance Implementation** *(June 7)*
  - ✅ Fixed role model to match PRD requirements (builder, reviewer, approver, auditor, sysadmin)
  - ✅ Updated database constraints and TypeScript interfaces
  - ✅ Applied migration successfully to Supabase cloud
  - ✅ Updated AuthProvider to use correct role mappings
  - ✅ Tested complete authentication flow end-to-end

- [x] **Basic Workflow CRUD Operations** *(June 7)*
  - ✅ Built WorkflowList component with create/delete functionality
  - ✅ Created WorkflowEditor for create/edit workflow forms with validation
  - ✅ Implemented workflows route with list and editor orchestration
  - ✅ Updated index route with authentication gate and login/signup forms
  - ✅ Connected to AuthProvider for proper multi-tenant workflow isolation

- [x] **Azure AD Enterprise SSO Integration** *(June 7)*
  - ✅ Built complete Azure AD provider class with OAuth2 flow
  - ✅ Implemented group-based role mapping for enterprise users
  - ✅ Created SSO callback handling with error management
  - ✅ Built admin setup interface for Azure AD configuration
  - ✅ Updated login form with organization selection and SSO button
  - ✅ Added API endpoint for Azure AD configuration retrieval
  - ✅ Documented role mapping groups (WorkflowHub-SystemAdmins, etc.)

- [x] **Field-Level Security Implementation** *(June 7)*
  - ✅ Added comprehensive column-level RLS policies
  - ✅ Created data classification system (public, internal, confidential, restricted)
  - ✅ Implemented secure data retrieval functions (get_workflow_secure, get_execution_secure)
  - ✅ Built data masking functions for sensitive information
  - ✅ Added field access policy management table
  - ✅ Created TypeScript utilities for field-level security checks
  - ✅ Integrated field security hooks into workflow components
  - ✅ Added audit logging for field access policy changes

- [x] **Workflow Execution Engine Implementation** *(June 7)*
  - ✅ Built comprehensive step orchestration engine with async execution
  - ✅ Implemented conditional logic and branching with multiple operators
  - ✅ Added robust error handling with categorization and retry mechanisms
  - ✅ Created real-time execution monitoring with metrics and progress tracking
  - ✅ Added workflow pause/resume capabilities with proper state management
  - ✅ Built 6 default step executors (human task, transform, notification, parallel, delay, conditional)
  - ✅ Created execution controls UI with pause/resume/cancel functionality
  - ✅ Implemented execution detail page with comprehensive monitoring dashboard

- [x] **Visual Workflow Builder Core Implementation** *(June 7)*
  - ✅ Fixed React Flow import issues and integration
  - ✅ Built drag-and-drop workflow canvas with React Flow
  - ✅ Created comprehensive component palette with 30+ workflow components
  - ✅ Organized components in 6 categories (Input & Data, Logic & Flow, Human Tasks, Communication, Integrations, Analytics)
  - ✅ Built dynamic step configuration panels for all component types
  - ✅ Implemented CaptureStepConfig, ApprovalStepConfig, ConditionStepConfig, NotificationStepConfig, TransformStepConfig, DelayStepConfig, IntegrationStepConfig
  - ✅ Fixed database RLS policies and signup flow issues
  - 🔄 Issues identified: React Flow sizing, duplicate components, drag-drop flickering

### 🔄 Currently Working On
- **Visual Workflow Builder Implementation** - React Flow canvas with 30+ components
- **Chat-to-Build Feature Development** - AI-powered workflow generation from natural language

### 📋 Next Up (Immediate Backlog)
1. [x] **Visual Workflow Builder** *(User-facing workflow creation)*
   - [x] Create drag-and-drop workflow canvas with React Flow
   - [x] Build component library with 30+ pre-built workflow steps (6 categories)
   - [x] Implement step configuration panels with dynamic forms
   - [ ] Fix React Flow sizing and drag-drop issues
   - [ ] Add workflow validation and testing framework
   - [ ] Create workflow templates and sharing system

2. [ ] **Chat-to-Build Feature** *(Natural language workflow creation)*
   - [ ] Extend existing chat interface to understand workflow requests
   - [ ] Add workflow generation prompts to AI assistant
   - [ ] Create workflow parsing from chat responses  
   - [ ] Connect chat-generated workflows to visual builder
   - [ ] Add workflow refinement through conversation

2. [ ] **Arcade.dev Integration Layer** *(External system connectivity)*
   - Set up Arcade client with proper authentication
   - Build tool registry and mapping layer
   - Implement OAuth2 authorization flow for external tools
   - Create tool selector UI for workflow builder
   - Add execution result processing and error handling

3. [ ] **Advanced Workflow Features** *(Enhanced functionality)*
   - Add workflow scheduling and cron triggers
   - Implement approval workflows with human task UI
   - Create workflow analytics and performance reporting
   - Add collaborative workflow editing with real-time sync
   - Implement workflow marketplace and template sharing

### 🗓 Updated Development Timeline (Post-Foundation)

#### ✅ Week 1: Foundation Complete (June 7)
- [x] Project setup and comprehensive documentation
- [x] Supabase cloud database setup with complete schema  
- [x] Enterprise authentication with Azure AD SSO
- [x] Multi-tenant testing and role-based security
- [x] Field-level security implementation
- [x] Basic workflow CRUD operations

#### ✅ Week 2: Workflow Engine Complete (June 7)
- [x] Build step orchestration engine
- [x] Implement conditional logic and branching  
- [x] Add error handling and retry mechanisms
- [x] Create execution monitoring dashboard
- [x] Add workflow pause/resume capabilities

#### 📋 Week 3: Visual Builder (Target: June 21)
- [ ] Create drag-and-drop workflow canvas
- [ ] Build component library with 20+ pre-built steps
- [ ] Implement step configuration panels
- [ ] Add workflow validation and testing framework
- [ ] Create workflow templates and sharing

#### 📋 Week 4: Arcade Integration (Target: June 28)
- [ ] Set up Arcade client with authentication
- [ ] Build tool registry and mapping layer
- [ ] Implement OAuth2 flows for external tools
- [ ] Create tool selector UI
- [ ] Add execution result processing

### 🚧 Blockers & Dependencies
- **None currently** - Core platform is complete and robust
- **Next phase ready**: Can proceed with visual workflow builder development
- **Backend complete**: All execution, monitoring, and state management implemented

### 📈 Updated Progress Metrics
- **Overall Completion**: 80% (Foundation and core execution engine fully implemented)
- **Foundation**: 100% ✅ (Database, auth, security, basic CRUD complete)
- **Core Engine**: 100% ✅ (Step orchestration, monitoring, controls complete)
- **Integration**: 20% (Architecture complete, Arcade client ready for implementation)
- **UI/UX**: 60% (Auth flows, workflow management, execution monitoring complete)

### 🎯 Core Platform Sprint - ALL SUCCESS CRITERIA MET ✅

**Foundation Criteria:**
- [x] User can sign up and log in with organization isolation
- [x] Database schema supports complete workflow lifecycle
- [x] Role model matches PRD requirements (builder, reviewer, approver, auditor, sysadmin)
- [x] Basic workflow CRUD interface working
- [x] Enterprise Azure AD integration implemented
- [x] Field-level security for compliance requirements
- [x] Audit logging and data classification system

**Execution Engine Criteria:**
- [x] Step orchestration engine with async processing
- [x] Conditional logic and branching with 8+ operators
- [x] Comprehensive error handling with retry mechanisms
- [x] Real-time execution monitoring with metrics
- [x] Workflow pause/resume/cancel capabilities
- [x] 6 built-in step executors ready for use
- [x] Execution dashboard with detailed progress tracking

### 🚨 Critical Issues - RESOLVED ✅
- ✅ **Authentication enterprise-ready**: Azure AD integrated, correct role model
- ✅ **Compliance implemented**: Field-level security with data classification
- ✅ **Timeline accelerated**: Foundation completed in 1 day vs planned 1 week

---

### Progress Update - June 7, 2025 (CRITICAL ARCHITECTURE DISCOVERY)
**Session Focus**: Visual workflow builder implementation + ARCHITECTURE REALIGNMENT

**Completed**:
- [x] Fixed visual workflow builder flickering issues (React Flow optimization)
- [x] Built chat-to-workflow creation feature (basic JSON metadata approach)
- [x] Connected chat-generated workflows to visual builder via URL parameters
- [x] Implemented workflow loading and saving in visual builder
- [x] Fixed React Flow import issues and database RLS policies

**CRITICAL DISCOVERY**:
- [x] **Architecture Misalignment Identified**: Built static JSON workflow system instead of executable code generation
- [x] **PRD Analysis**: Confirmed requirement for "Split-screen prompt-and-preview (Lovable pattern)"
- [x] **Real Requirements**: Must generate executable code (like Bolt.new) not just visual diagrams
- [x] **Missing Chat Integration**: Visual builder needs chat interface for real-time modifications

**Blockers Found**:
- 🚨 **CRITICAL**: Current approach stores workflows as database metadata instead of generating real executable code
- 🚨 **MISSING**: Chat interface in workflow builder (currently only has drag-drop)
- 🚨 **WRONG PREVIEW**: Shows visual flow diagrams instead of actual runnable workflow forms

**Next Session Priority** (ARCHITECTURE PIVOT):
1. **Transform Bolt.new Action System**: Modify to understand workflow requests instead of web dev
2. **Add Chat to Workflow Builder**: Split-screen with chat on left, visual builder on right
3. **Implement Code Generation**: Generate actual executable workflow code files
4. **Replace Preview System**: Show runnable workflow forms instead of websites

**Overall Status**: Foundation Complete (80%) - REQUIRES ARCHITECTURE PIVOT for Chat-to-Code Implementation
**Critical Need**: Leverage Bolt.new's code generation for workflows instead of building static visual builder

### 🔄 ARCHITECTURE PIVOT REQUIRED

**Current Approach** (WRONG):
- Chat creates JSON metadata → stores in database → visual builder shows diagrams
- No executable code generation
- No chat interface in builder

**Required Approach** (PER PRD):
- Chat generates executable workflow code → visual builder shows + code preview → can run actual workflows
- Split-screen chat interface in builder
- Real workflow forms, not just diagrams

**Key Insight**: We need to extend Bolt.new's strength (code generation) rather than replace it with a static visual builder

---

## 📝 Progress Update Template
*Copy this section when updating progress:*

```markdown
### Progress Update - [DATE]
**Session Focus**: [What we worked on]
**Completed**:
- [ ] Task 1
- [ ] Task 2

**Started**:
- [ ] Task 3 (X% complete)

**Blockers Found**:
- Issue description and resolution plan

**Next Session Priority**:
1. Most important next task
2. Secondary task

**Overall Status**: [Foundation/Core/Integration/Polish] - X% complete
```