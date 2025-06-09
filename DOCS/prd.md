WorkflowHub – Product Requirements Document
1. Executive Summary
WorkflowHub is an enterprise‑grade, no‑code workflow and automation platform built for regulated financial‑services firms. Using a Lovable.dev‑style natural‑language builder, WorkflowHub lets non‑technical staff create, test, and deploy fully‑functioning, system‑integrated workflows in hours, not months. The platform delivers rapid cost savings, operational agility, and real‑time management information (MI) while meeting stringent security and compliance requirements.
“No code natural language workflow / automation tool enabling businesses to automate business processes in hours not months. “
2. Vision & Mission
Mission: Digitise and automate 80 % of manual processes for financial‑services businesses without writing code.


Vision: Become the default interoperability layer and workflow engine for offshore and mid‑market financial institutions globally.
3. Problem Statement
Financial‑services firms rely on fragmented, manual workflows that are:
Slow & Expensive – external dev cycles take months and cost six figures.


Rigid – hard‑coded processes cannot keep pace with regulatory change.


Siloed – core systems (CRM, entity management, screening, M365, finance) do not share data, forcing re‑keying.


Opaque – leadership lacks MI on status, bottlenecks, and resource load.


4. Objectives & Success Metrics
Objective
KPI / Target
Reduce build time
< 30 min simple WF; < 4 h complex WF
Increase automation coverage
50 % of manual processes in 6 mo
User adoption
≥ 80 % of target users active in 90 days
Live preview accuracy
≥ 95 % match builder vs prod
Platform availability
≥ 99.5 % uptime
User satisfaction
≥ 4.5 / 5 CSAT

5. Core Design Principles
No‑Code First: Natural‑language builder + guided WF specification forms.
Feels Like Magic: Every touch‑point feels “magic” (instant previews, one‑click deploy). Our job is to create those “wow” moments.
Self‑Sufficient: Firms operate without in‑house devs; minimal external developer costs. 
Modular & Reusable: Library of Steps, Components, Triggers, Actions, Functions to ensure consistent high quality results. 
Enterprise‑Grade: Security, compliance, audit, version control from day 0.


6. How It Works - Workflow Builder (End‑to‑End Flow)
Stage
User Experience
Behind the Scenes
a. Describe
Upload / type plain‑language spec in chat interface similar to lovable or bolt.new
AI parses intent, maps to workflow blocks
b. Confirm Structure
UI shows proposed Capture → Review → Approve → Update flow
Pulls from Step Library
c. Configure
Guided prompts for fields, approvers, triggers
Builder draws from Component / Trigger / Action libs
d. Draft UI
Real‑time split‑screen preview
Generates forms, logic, integrations
e. Test & QA
One‑click simulation + AI QA agents
Auto‑gen test data, security lint, performance checks
f. Publish
Approvals & version stamp
Deploys to prod tenant; audit trail logged

7. Key Features & Functionality
8.1 Workflow Builder
Split‑screen prompt‑and‑preview (Lovable pattern)
Multi‑turn chat refinement; instant visual updates
Library search & drag‑drop for advanced users 
Automatic version control & diff viewer

7.2 Modular Workflow Steps
Capture – data, docs, checklist with OCR (claude vision) & validation
Review – configurable 4‑eyes, inline comments, routing
Approval – single / multi‑level, conditional rules, e‑sign
Update – read/write to systems via API / automation


7.3 Component & Trigger Libraries
30+ data‑capture components (text, dropdown, currency, file‑upload…)
Triggers: manual start, scheduled, API event, system webhook, conditional logic
Actions: create record, update record, send notification, generate doc, start child WF
Functions: loops, branching, calculations, lookups

7.4 Testing & Quality Assurance
AI test‑agent executes all paths, validates data rules
Security agent scans for PII exposure, RBAC lapses (based on openai agents sdk)
Performance agent load‑tests ↔ scalability baseline


7.5 Reporting & MI
Real‑time dashboards (status, SLA breaches, workload, cycle‑time)
Export to BI tools (Power BI, Tableau)
API for embedding MI in portals


8. System Integrations
it integrate with core systems via arcade.dev sdk
9. User Interface
Builder UI – left prompt panel, right live preview; publish / save / share.
Execution UI – responsive task inbox, guided forms, document viewer, audit pane, activity timeline.
Admin Console – integrations, RBAC, environment mgmt, usage analytics.


10. Security & Compliance
Role‑based access (AD / Azure AD sync)
Encryption at rest (AES‑256) & in transit (TLS 1.3)
Full audit log & immutable version history
SOC 2 Type II & ISO 27001 roadmap
Data‑residency options: single‑tenant cloud, private cloud, on‑prem


11. Technical Architecture
Frontend: React + TypeScript, Tailwind, PWAs
Backend: Node.js/TypeScript micro‑services; PostgreSQL (Supabase) for data; Redis for queues
AI Services: OpenAI GPT‑4 for NL parsing; Claude Vision for OCR; internal RAG for library mapping
Execution Sandbox: webcontainer
Event Bus: NATS or Kafka for real‑time events
Deployment: Kubernetes‑based SaaS cluster + customer‑isolated namespaces


12. Roles & Licensing
Role
Capability
Licence
Builder
Design/edit workflows
Builder Licence (£2k / month)
Business User
Run tasks
£10 / user / month
Approver
Approve only
£10 / user / month
Admin
Security, integrations
Included with Builder

13. Risk & Mitigation
AI parsing errors → Manual override & guided form mode.
Integration downtime → Retry queues + circuit breakers.
Data‑privacy concerns → Private‑cloud & on‑prem options.





'''
DETAILS>
-Authentication & Authorisation
Layer
v1 Plan
Why
Primary IdP
Microsoft Entra ID (Azure AD) via OIDC/SAML
Most clients already use it; supports MFA/Conditional Access.
Alternatives
Okta, ADFS supported through same OIDC flow
Keeps doors open for non-MS tenants.
RBAC model
Roles: Builder, Reviewer, Approver, Auditor, SysAdmin
Mirrors personas in deck.
Field-level security
PG row/column policies + React front-end guards
Covers “need-to-know” data controls.

-Compliance Must-Haves (Jersey / Offshore FS)
Requirement
Source
Implementation Note
Data Protection (Jersey) Law 2018 (DPJL) — GDPR-equivalent
dlapiperdataprotection.comjerseyoic.org
• Pseudonymise PII in lower environments • Right-to-erasure API hooks
JFSC Outsourcing Policy (cloud & SaaS)
jerseyfsc.orgogier.comcomsuregroup.com
• Maintain outsourcing register • Provide clients a due-diligence pack (SOC 2, penetration-test reports, BCP) • Notification template for client submissions to JFSC
ISO 27001 alignment (road-map to certification)
Industry norm
• Stage-1 readiness by Q4; certification target Q2 next year
SOC 2 Type II report (12-month window)
Enterprise buyer prerequisite
• Logging, change-control, incident-response run-books mapped to SOC trust principles
Minimum-cyber controls (NCSC cloud security principles)
Jersey OIC guidance
• Encryption in transit + at rest • 30-day vulnerability patch SLA
Audit log immutability (JFSC record-keeping)
OSP & AML guidance
• audit_entries table append-only + WORM blob archive after 90 days




-Core Functionality Lock-In for v1 (MVP)
Area
Included
Natural-language builder (text prompt → wireframe)
✔
Component library (30 core + SharePointLink)
✔
Trigger library (manual, schedule, vPoint create)
✔
Action library (create/update record, file upload, notify)
✔
Single workflow engine with retry + timeout
✔
Audit log + basic MI dashboard
✔
Integrations: vPoint (R/W), SharePoint (R/W), Email (SMTP), Azure AD
✔
OCR via Azure Cognitive Vision (PDF/JPG)
✔

(Anything not on this list goes to Backlog v1.1.)
9 Workflow Engine (BPM Core)
The back‑end state machine that executes and tracks every run.
Capability
Implementation
State Persistence
Event Bus
Azure Service Bus topics for triggers & actions (idempotent, ordered)
Parallel & SLA Timers
Worker checks due timers every 30 s; supports parallel sub‑tasks
Retry & Circuit‑Breaker
Exponential back‑off, max 3 attempts, moves to FAILED with alert
Version Pinning
In‑flight runs retain original schema; new runs use latest revision
Metrics
Prometheus counters: cycle‑time, step failure %, SLA breaches
Scalability
Horizontally scale workers via AKS HPA (CPU+queue depth)
DR
Queue replay + DB PITR; RPO 15 min


'''
MVP>

WorkflowHub v1 – Screen‑by‑Screen MVP Spec
All functionality below is IN‑SCOPE for version 1 (private‑beta launch).


Roles referenced: Builder, Reviewer, Approver, Auditor, SysAdmin.
Business User View
Dashboard 
Workflow Library
List view or card view


Settings 
Builder / SysManager View 
Dashboard 
Workflow Library 
Workflow Builder
Holding page / dashboard for draft workflows being developed 
Edit workflow 
Create New Workflow 
Workflow Builder Screen 
Trigger Library 
Component Library 
Action Library 
Deployment Que 
Live Workflow Library
System Settings 
Integrations
Screen for managing and setting up integrations 
Users 
List of users, profiles and activity 
User Permissions 
Configuration 






Legend
Symbol
Meaning
🔒
Visible to SysAdmin only
👁
View‑only for Reviewer / Auditor
✏️
Editable by Builder role
⚙️
Invokes an API / backend action


1 Global Navigation
Control
Location
Action
☰ Main menu
Top‑left
Dashboard / Library / Builder / QA Queue / Settings 🔒
🔍 Search box
Top bar
Find workflow, run, user, doc
🔔 Notifications
Top bar
My pending tasks & alerts
🖥️ Env switch
Top bar
Toggle Test / Prod test‑data sandbox
? Help
Top bar
Side‑panel docs & live chat
Avatar
Top‑right
Profile / Logout


2 Dashboard (Cockpit)
Widget
Purpose
Actions
My Tasks
List of runs awaiting my action
Open run
Team Backlog
Runs assigned to my team
Filter / sort
Overdue ×
Count of SLA‑breach tasks
Click → filtered list
Workflow KPIs
Cycle‑time & pass/fail charts
👁 export PNG
Start New Workflow
Quick‑launch picker
Opens Library modal


3 Workflow Library
3.1 Library Home
UI Element
Function
Department filter
Dropdown
Search bar
Live filter
Workflow card
Name • Desc • Last updated • Start
Start
Instantiates new run ⚙️
"Request New"
Opens short form; notifies Builder

3.2 Workflow Details Modal 👁
Section
Content
Overview
Steps • Systems touched • Owner
Change log
Last 10 changes
Docs
Open spec PDF


4 Workflow Builder
4.1 Builder Home
Element
Action
New Workflow
Opens Spec Wizard
Draft list
Open draft ✏️ / Delete

4.2 Spec Wizard
Step
What Happens
1 Upload / Paste
Accept .docx / .txt / paste box
2 Prompt Hints
Shows tips for better prompts
3 Parse
⚙️ AI extracts steps / fields
4 Preview
Presents editable wireframe

4.3 Wireframe Editor (Split‑screen)
Pane
Elements
Left
Prompt diff ✏️ • Step list (drag reorder)
Right
Live form preview
Toolbar
Validate ⚙️ • Regenerate ⚙️ • Create Workflow (Test)


5 Test Environment & QA Agent
5.1 Test Run View
Element
Function
Sandbox banner
Orange "TEST" ribbon
Form UI
Fully runnable with dummy data
Run QA Checks
Button → launches QA agent ⚙️

5.2 QA Agent Log
Column
Info
Check
Security • Integration • Performance
Status
Pass / Warn / Fail
Details
Expand row to view log 👁
Re‑run
Rerun failed checks
Send to Change Queue
On all‑green → submits version


6 Change‑Control Queue 🔒
Column
Info
Workflow
Name + version
Submitted by
User / date
QA Status
Pass / Fail
Approve / Reject
Buttons; Reject goes back to Builder
Promote to Prod
One‑click deploy ⚙️


7 Running Workflows
7.1 Capture Step
Element
Notes
Section accordion
Collapse/expand
Field components
Text, number, date, SharePointLink, file upload
Autosave
Every 30 s
Submit for Review
Locks fields ⚙️

7.2 Review Step
| Left | Data table 👁 |
 | Right | Document preview (multi‑doc scroll) |
 | Comment box | Required on reject |
 | Send to Approver | CTA ⚙️ |
7.3 Approval Step
Element
Action
Status picker
Final MF status / sub‑status
Signature pad
Draw / type
Approve / Reject
Approve pushes data; Reject → Builder

7.4 Update Step (System‑only)
| Monitor | Per‑system status; retry 🔒 |
 | Complete | End run ⚙️; triggers audit lock |
7.5 Audit & History
| Timeline | Event rows with user • TS |
 | Export | CSV / JSON |

8 System Settings 🔒
Page
Key Items
Tenant
Logo • Colours • Timezone • Data‑retention
Integrations
Add / edit • Secrets in Key Vault
Roles
CRUD matrix
API Keys
Gen / revoke
Environments
Toggle Test db connection







End of updated MVP screen spec – ready for workshop.



