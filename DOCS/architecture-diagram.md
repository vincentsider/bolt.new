# WorkflowHub Architecture Diagram

## System Overview

```mermaid
graph TB
    %% User Layer
    User[👤 Business User]
    Admin[👨‍💼 Admin]
    
    %% Frontend Layer
    subgraph "Frontend (Remix React)"
        WB[🎨 Workflow Builder<br/>Visual Canvas + Chat]
        WL[📋 Workflow List<br/>Management UI]
        EM[📊 Execution Monitor<br/>Real-time Dashboard]
        Auth[🔐 Auth Provider<br/>Multi-tenant]
    end
    
    %% API Layer
    subgraph "API Routes (Remix)"
        ChatAPI[💬 /api/workflow-chat]
        DeployAPI[🚀 /api/deploy-workflow]
        AuthAPI[🔑 /api/auth/*]
    end
    
    %% Core Logic Layer
    subgraph "Core Engine"
        WE[⚙️ Workflow Execution Engine<br/>Step Orchestration]
        MP[🧠 Message Parser<br/>NL → Code Actions]
        AR[🏃 Action Runner<br/>Code Generation]
        SS[💾 State Manager<br/>Workflow State]
    end
    
    %% Integration Layer
    subgraph "Integration Services"
        WC[🖥️ WebContainer<br/>Browser Runtime]
        AD[🏢 Arcade.dev Client<br/>External Integrations]
        FS[📁 File System<br/>Generated Code]
    end
    
    %% Data Layer
    subgraph "Database (Supabase)"
        OrgT[(👥 Organizations)]
        UserT[(👤 Users)]
        WfT[(📋 Workflows)]
        ExecT[(▶️ Executions)]
        StepT[(📝 Step Executions)]
        AuditT[(📊 Audit Logs)]
    end
    
    %% External Services
    AzureAD[🔷 Azure AD<br/>Enterprise SSO]
    Anthropic[🤖 Claude API<br/>AI Generation]
    ArcadeAPI[🔌 Arcade Engine<br/>100+ Integrations]
    
    %% User Interactions
    User --> WB
    User --> WL
    User --> EM
    Admin --> Auth
    
    %% Frontend to API
    WB --> ChatAPI
    WB --> DeployAPI
    WL --> AuthAPI
    EM --> AuthAPI
    Auth --> AuthAPI
    
    %% API to Core
    ChatAPI --> MP
    ChatAPI --> AR
    DeployAPI --> WE
    AuthAPI --> SS
    
    %% Core Interactions
    MP --> AR
    AR --> WC
    AR --> FS
    WE --> SS
    WE --> StepT
    
    %% Integration Flows
    WC --> FS
    AR --> AD
    AD --> ArcadeAPI
    
    %% Database Connections
    Auth --> UserT
    Auth --> OrgT
    WE --> WfT
    WE --> ExecT
    WE --> StepT
    SS --> AuditT
    
    %% External Connections
    Auth --> AzureAD
    MP --> Anthropic
    AR --> Anthropic
    AD --> ArcadeAPI
    
    %% Styling
    classDef userLayer fill:#e1f5fe
    classDef frontend fill:#f3e5f5
    classDef api fill:#fff3e0
    classDef core fill:#e8f5e8
    classDef integration fill:#fce4ec
    classDef database fill:#f1f8e9
    classDef external fill:#fff8e1
    
    class User,Admin userLayer
    class WB,WL,EM,Auth frontend
    class ChatAPI,DeployAPI,AuthAPI api
    class WE,MP,AR,SS core
    class WC,AD,FS integration
    class OrgT,UserT,WfT,ExecT,StepT,AuditT database
    class AzureAD,Anthropic,ArcadeAPI external
```

## Detailed Component Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant WB as Workflow Builder
    participant Chat as Chat API
    participant MP as Message Parser
    participant AR as Action Runner
    participant WC as WebContainer
    participant WE as Execution Engine
    participant DB as Supabase DB
    participant Claude as Anthropic Claude
    
    %% Workflow Creation Flow
    Note over User,Claude: 1. Workflow Creation Process
    User->>WB: "Create expense approval workflow"
    WB->>Chat: POST /api/workflow-chat
    Chat->>MP: Parse natural language request
    MP->>Claude: Generate workflow actions
    Claude-->>MP: Return code generation plan
    MP->>AR: Execute code generation actions
    AR->>WC: Create workflow files
    WC-->>AR: File system updated
    AR->>DB: Save workflow metadata
    DB-->>AR: Workflow saved
    AR-->>WB: Generated workflow preview
    WB-->>User: Live preview in browser
    
    %% Workflow Deployment Flow
    Note over User,DB: 2. Workflow Deployment Process
    User->>WB: Deploy workflow
    WB->>Chat: POST /api/deploy-workflow
    Chat->>WE: Start workflow instance
    WE->>DB: Create execution record
    DB-->>WE: Execution ID
    WE->>WC: Launch workflow server
    WC-->>WE: Server running
    WE-->>WB: Deployment URL
    WB-->>User: "Workflow live at URL"
    
    %% Workflow Execution Flow
    Note over User,DB: 3. Workflow Execution Process
    User->>WC: Submit form data
    WC->>WE: Process workflow step
    WE->>DB: Update step execution
    WE->>WE: Apply business logic
    WE->>DB: Log step completion
    WE->>User: Send notifications
    WE-->>WC: Return result
    WC-->>User: Show confirmation
```

## Data Flow Architecture

```mermaid
flowchart LR
    %% Input Sources
    NL[📝 Natural Language<br/>Requirements]
    UI[🖱️ Visual Builder<br/>Drag & Drop]
    
    %% Processing Pipeline
    subgraph "Generation Pipeline"
        Parse[🧠 Parse Intent]
        Generate[⚡ Generate Code]
        Execute[🏃 Execute Actions]
        Deploy[🚀 Deploy Files]
    end
    
    %% Runtime Environment
    subgraph "Runtime Environment"
        WCR[🖥️ WebContainer Runtime]
        Node[📦 Node.js Server]
        Express[🌐 Express.js API]
        Forms[📋 HTML Forms]
    end
    
    %% Data Storage
    subgraph "Data Layer"
        Meta[📊 Workflow Metadata]
        Code[💻 Generated Code]
        State[🔄 Execution State]
        Files[📁 User Files]
    end
    
    %% External Integrations
    subgraph "Integrations"
        Email[📧 SMTP Email]
        DB[🗃️ Database Ops]
        API[🔌 External APIs]
        Arcade[🎮 Arcade Tools]
    end
    
    %% Flow Connections
    NL --> Parse
    UI --> Parse
    Parse --> Generate
    Generate --> Execute
    Execute --> Deploy
    
    Deploy --> WCR
    WCR --> Node
    Node --> Express
    Node --> Forms
    
    Execute --> Meta
    Deploy --> Code
    WCR --> State
    Forms --> Files
    
    Express --> Email
    Express --> DB
    Express --> API
    Node --> Arcade
    
    %% Feedback Loops
    State -.-> Parse
    Meta -.-> Generate
    Code -.-> Execute
```

## Security & Authentication Flow

```mermaid
graph TD
    %% Entry Points
    Browser[🌐 Browser]
    
    %% Authentication Layer
    subgraph "Authentication"
        Login[🔐 Login Form]
        Azure[🔷 Azure AD SSO]
        JWT[🎫 JWT Tokens]
    end
    
    %% Authorization Layer
    subgraph "Authorization (RLS)"
        OrgCheck[🏢 Organization Check]
        RoleCheck[👤 Role Validation]
        FieldSec[🔒 Field-Level Security]
    end
    
    %% Data Classification
    subgraph "Data Access"
        Public[🌍 Public Data]
        Internal[🏢 Internal Data]
        Confidential[🔐 Confidential Data]
        Restricted[🚫 Restricted Data]
    end
    
    %% Audit & Compliance
    subgraph "Compliance"
        Audit[📋 Audit Logging]
        Encrypt[🔐 Encryption at Rest]
        Monitor[👁️ Access Monitoring]
    end
    
    %% Flow
    Browser --> Login
    Login --> Azure
    Azure --> JWT
    JWT --> OrgCheck
    OrgCheck --> RoleCheck
    RoleCheck --> FieldSec
    
    FieldSec --> Public
    FieldSec --> Internal
    FieldSec --> Confidential
    FieldSec --> Restricted
    
    Public --> Audit
    Internal --> Audit
    Confidential --> Audit
    Restricted --> Audit
    
    Audit --> Encrypt
    Audit --> Monitor
```

## Workflow Execution State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Workflow
    
    Draft --> Published: Publish
    Draft --> Archived: Archive
    Published --> Archived: Archive
    
    Published --> Running: Start Execution
    Running --> Paused: Pause
    Running --> Completed: All Steps Complete
    Running --> Failed: Step Error
    Running --> Cancelled: User Cancel
    
    Paused --> Running: Resume
    Paused --> Cancelled: Cancel
    
    Failed --> Running: Retry
    Cancelled --> [*]
    Completed --> [*]
    
    state Running {
        [*] --> StepPending
        StepPending --> StepInProgress: Begin
        StepInProgress --> StepCompleted: Success
        StepInProgress --> StepFailed: Error
        StepCompleted --> NextStep: Has Next
        StepCompleted --> [*]: No Next
        StepFailed --> [*]: Stop on Error
    }
```

## Component Library Structure

```mermaid
mindmap
  root((Workflow Components))
    Input & Data
      Form Capture
      File Upload
      Database Query
      API Request
      CSV Import
    Logic & Flow
      Condition Check
      Data Transform
      Parallel Tasks
      Delay Timer
      Loop Iterator
    Human Tasks
      Approval Step
      Review Task
      Manual Input
      Signature Capture
      Assignment
    Communication
      Email Send
      Slack Message
      SMS Alert
      Webhook Call
      Push Notification
    Integrations
      Salesforce
      Google Sheets
      Stripe Payment
      DocuSign
      Custom API
    Analytics
      Data Export
      Report Generate
      Metrics Capture
      Dashboard Update
      Audit Trail
```

## Technology Stack Integration

```mermaid
graph TB
    %% Presentation Layer
    subgraph "Frontend Stack"
        Remix[⚛️ Remix Framework]
        React[⚛️ React Components]
        ReactFlow[🌊 React Flow Canvas]
        UnoCSS[🎨 UnoCSS Styling]
    end
    
    %% API Layer
    subgraph "API & Routing"
        RemixAPI[🛤️ Remix API Routes]
        CloudflareWorkers[☁️ Cloudflare Workers]
        Pages[📄 Cloudflare Pages]
    end
    
    %% AI & Generation
    subgraph "AI Services"
        Claude[🤖 Anthropic Claude]
        AiSDK[@ai-sdk/anthropic]
        StreamText[📡 Streaming Responses]
    end
    
    %% Runtime
    subgraph "Code Execution"
        WebContainer[🖥️ WebContainer API]
        NodeJS[📦 Node.js Runtime]
        ExpressJS[🌐 Express.js Server]
    end
    
    %% Database & Auth
    subgraph "Backend Services"
        Supabase[🗄️ Supabase PostgreSQL]
        SupaAuth[🔐 Supabase Auth]
        RLS[🛡️ Row Level Security]
    end
    
    %% External Integrations
    subgraph "External APIs"
        ArcadeEngine[🎮 Arcade.dev Engine]
        AzureAD[🔷 Azure Active Directory]
        SMTP[📧 Email Services]
    end
    
    %% Connections
    React --> ReactFlow
    React --> UnoCSS
    Remix --> React
    Remix --> RemixAPI
    
    RemixAPI --> CloudflareWorkers
    CloudflareWorkers --> Pages
    
    RemixAPI --> Claude
    Claude --> AiSDK
    AiSDK --> StreamText
    
    RemixAPI --> WebContainer
    WebContainer --> NodeJS
    NodeJS --> ExpressJS
    
    RemixAPI --> Supabase
    Supabase --> SupaAuth
    Supabase --> RLS
    
    RemixAPI --> ArcadeEngine
    SupaAuth --> AzureAD
    ExpressJS --> SMTP
```

This comprehensive architecture diagram shows how WorkflowHub's components interact across multiple layers, from user interface to data storage, including the AI-powered code generation pipeline and real-time execution environment.