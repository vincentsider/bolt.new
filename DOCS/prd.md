# WorkflowHub – Enhanced Product Requirements Document (Developer-Ready)

## 1. Executive Summary

WorkflowHub is a no-code, AI-powered workflow automation platform tailored for regulated financial-services firms. It enables non-technical users to build, test, and deploy production-grade workflows through a Lovable.dev-style natural language interface. Unlike prototype-first tools, WorkflowHub generates secure, auditable, and system-integrated applications meeting strict compliance standards.

> **One-liner:** No-code, natural-language-powered workflow engine for regulated industries that deploys compliant, production-ready automation in hours, not months.

## 2. Vision & Mission

**Mission:** Digitise and automate 80% of manual workflows for financial firms without code.

**Vision:** Be the default workflow and integration layer for offshore and mid-market financial institutions.

## 3. Problem Statement

Financial firms rely on fragmented, manual workflows that are:

* **Slow & Costly:** Dev cycles can take months and cost six figures.
* **Rigid:** Hard-coded processes can't adapt to regulation changes.
* **Siloed:** Core systems don't integrate, causing re-keying.
* **Opaque:** Management lacks visibility into status and resource loads.

## 4. Objectives & Success Metrics

| Objective             | KPI / Target                        |
| --------------------- | ----------------------------------- |
| Reduce build time     | <30 min simple WF; <4 h complex WF  |
| Automation coverage   | 50% manual processes in 6 months    |
| User adoption         | ≥80% target users active in 90 days |
| Live preview accuracy | ≥95% builder vs prod match          |
| Platform availability | ≥99.5% uptime                       |
| User satisfaction     | ≥4.5 / 5 CSAT                       |

## 5. Core Design Principles

* **No-Code First:** Natural-language builder + spec-driven configuration.
* **Feels Like Magic:** Instant preview, deploy, test.
* **Self-Sufficient:** No need for in-house devs.
* **Modular & Reusable:** Drag-and-drop components, triggers, actions.
* **Enterprise-Grade:** Compliant by design (audit, RBAC, encryption, etc).
* **AI Agent Foundation:** Multi-agent architecture for build accuracy and QA.

## 6. System Architecture Overview

**Frontend:** React + TypeScript + Tailwind (PWA).

**Backend:** Node.js microservices, PostgreSQL (via Supabase), Redis queues.

**AI Services:**

* GPT-4 for natural-language parsing.
* Claude Vision for OCR.
* Internal RAG for component mapping.
* **Multi-agent layer**: Design, IT, Security, QA, and Engineering agents collaborate per task.

**Execution Layer:**

* Webcontainer sandbox enabling users to run workflows live within the web UI — each workflow executes in an isolated, browser-based container for real-time simulation and feedback.
* Azure Service Bus event-driven execution.
* Prometheus metrics, audit trail, version pinning.

## 7. How It Works: End-to-End Flow

| Stage             | User Experience                     | AI Agent Actions                           |
| ----------------- | ----------------------------------- | ------------------------------------------ |
| Describe          | Chat-style input                    | Intent parsing, step mapping               |
| Confirm Structure | Capture > Review > Approve > Update | Suggests standard templates                |
| Configure         | Guided prompts for fields, triggers | Auto-suggested configs + RBAC check        |
| Draft UI          | Split preview                       | Design Agent uses visual standard          |
| Test & QA         | Click to simulate                   | QA Agent: load test, RBAC scan, bug detect |
| Publish           | Approvals & stamp                   | Deployment + audit logging                 |

## 8. Key Features & Modules

### 8.1 AI Agent Framework

* **Design Agent:** UI creation via component library and design system.
* **IT Agent:** Enforces RBAC, data access policies, integration auth.
* **Engineering Agent:** Code synthesis, API integration, retry/circuit logic.
* **Security Agent:** Package allow-listing, PII scans, RBAC compliance.
* **QA Agent:** Automated multi-path test execution, load, bug detection.

### 8.2 Builder UI

* Chat-prompt to wireframe split view.
* Drag-and-drop step ordering.
* Realtime preview, validation, deploy.
* Live run and test in browser via Webcontainer sandbox.

### 8.3 Workflow Steps (Modular)

* **Capture:** OCR docs, data entry with validation.
* **Review:** Inline comments, role-based access.
* **Approval:** E-sign, multi-level conditions.
* **Update:** System integrations via API.

### 8.4 Testing & QA

* AI agents simulate flows.
* Security/Performance Lint.
* Role misconfigurations flagged.

### 8.5 Reporting & Dashboards

* Live metrics: SLA breaches, workloads.
* Embedded export to BI tools.
* Timeline + Audit trail.

### 8.6 Integration SDK (via arcade.dev)

* SharePoint R/W, vPoint R/W, SMTP, Azure AD.
* OAuth & key-based auth vault.

## 9. Security & Compliance

* **RBAC:** Role matrix (Builder, Reviewer, Approver, Auditor, SysAdmin).
* **Authentication:** OIDC/SAML via Microsoft Entra ID; supports Okta, ADFS.
* **Encryption:** TLS 1.3 + AES-256.
* **Audit:** WORM logs, append-only DB audit.
* **Compliance Roadmap:** ISO 27001 (Q2 next year), SOC 2 Type II.
* **Data Residency:** Single-tenant SaaS, Private Cloud, On-Prem.

## 10. Compliance Mapping (Jersey)

| Requirement      | Implementation                       |
| ---------------- | ------------------------------------ |
| DPJL / GDPR      | Pseudonymised test data, erasure API |
| JFSC Outsourcing | Register, BCP docs, report template  |
| ISO 27001        | Stage 1 by Q4; cert by Q2            |
| SOC 2 Type II    | Logging, change-control, IR runbooks |
| NCSC Controls    | 30-day patching, TLS + encryption    |
| JFSC Audit       | WORM log, append-only entries        |

## 11. MVP Scope (Private Beta)

### Must-Haves

* Natural-language builder
* Component / Trigger / Action libraries
* Single workflow engine w/ retry, timeout
* Basic dashboards & audit logs
* OCR via Azure Cognitive Vision
* Core integrations: SharePoint, vPoint, Email, Azure AD
* **Webcontainer-based live workflow testing in browser**

### Lock-In Features (Screen Spec Summary)

* Dashboard: tasks, backlogs, metrics
* Workflow Library & Detail Modal
* Builder: Spec wizard, preview editor
* QA: Sandbox test, agent report log
* Change Control Queue
* Running Workflows: Capture > Review > Approve > Update
* Audit & History: Timeline + Export
* Settings: Integrations, RBAC, API keys, Envs

## 12. Licensing Model

| Role          | Capability               | Licence     |
| ------------- | ------------------------ | ----------- |
| Builder       | Create/edit workflows    | £2k/mo      |
| Business User | Execute tasks            | £10/user/mo |
| Approver      | Approval-only            | £10/user/mo |
| Admin         | RBAC, integration config | Included    |

## 13. Risk & Mitigation

| Risk                 | Mitigation                                  |
| -------------------- | ------------------------------------------- |
| AI parse errors      | Manual override; guided spec wizard         |
| Integration downtime | Retry queues, circuit breakers              |
| Data privacy         | Private cloud/on-prem option; redacted logs |

---

This version of the PRD includes a multi-agent framework inspired by Clark, refined screen-level spec detail for MVP implementation, and developer-specific system architecture notes. You can now circulate it to your engineering team to scope sprints, allocate ownership across agents and modules, and produce an implementation timeline and milestone map.
