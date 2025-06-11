# Component Library Architecture

## 🎯 Overview

WorkflowHub combines **Bolt.new's real-time coding capabilities** with **enterprise-grade component standardization**. This hybrid approach provides both developer flexibility and organizational consistency.

## 🏗️ Architecture Components

### **1. Three-Tier Component System**

```
Component Libraries (Shared)
       ↓
Component Definitions (Templates) 
       ↓
Component Instances (Per-Workflow)
```

#### **Component Libraries** (`component_libraries`)
- Organization-level component collections
- Versioned for change management
- Can have multiple libraries per organization
- Admin-managed

#### **Component Definitions** (`component_definitions`)  
- Actual reusable component templates
- Contains HTML templates, CSS classes, AI keywords
- Shared across workflows within organization
- Read-only for regular users

#### **Component Instances** (`component_instances`)
- Configured components within specific workflows
- User-customizable (labels, validation, styling)
- Links workflow ↔ component definition
- Per-workflow isolated

### **2. Database Schema**

```sql
-- Organization's component library
component_libraries:
  - id, organization_id, name, version, is_default

-- Shared component templates  
component_definitions:
  - id, library_id, name, component_type
  - ai_keywords (for AI mapping)
  - html_template (standardized output)
  - compatible_steps (capture/review/approval/update)

-- Workflow-specific configurations
component_instances:
  - id, workflow_id, component_id  
  - label, required, config, validation
  - position, data_mapping
```

## 🤖 AI Integration & Component Selection

### **How AI Selects Components**

1. **User Input**: "Create expense approval workflow with receipt upload"

2. **AI Analysis**: Extracts keywords: `["expense", "approval", "receipt", "upload"]`

3. **Component Matching**: Queries `component_definitions` using `ai_keywords`:
   ```sql
   SELECT * FROM component_definitions 
   WHERE ai_keywords @> '[{"keyword": "upload"}]'
   AND compatible_steps @> ARRAY['capture']
   ```

4. **Component Selection**: Returns ranked components:
   - File Upload (score: 9) - matches "upload", "receipt"
   - Number Input (score: 8) - matches "expense" 
   - Approval Buttons (score: 9) - matches "approval"

### **AI Keywords System**

Each component has weighted keywords for intelligent matching:

```json
{
  "ai_keywords": [
    {"keyword": "upload", "weight": 9},
    {"keyword": "file", "weight": 8}, 
    {"keyword": "document", "weight": 7},
    {"keyword": "receipt", "weight": 6}
  ]
}
```

## 🔧 Hybrid Code Generation

### **Two-Level Modification System**

WorkflowHub handles modifications at two levels:

#### **Level 1: Component-Level Changes** 
Uses Component Library system:

```
User: "Add phone number field"
     ↓
AI: Detects component request
     ↓  
Component System: Selects "Short Text Box" template
     ↓
Template Engine: Generates standardized HTML
     ↓
Bolt.new: Shows file updates in real-time
```

**Example Output:**
```html
<!-- Standardized component template -->
<div class="form-group">
  <label for="phone" class="form-label">Phone Number</label>
  <input type="tel" id="phone" name="phone" class="form-control" required />
</div>
```

#### **Level 2: Styling/Logic Changes**
Uses Bolt.new direct modification:

```
User: "Make the submit button red"
     ↓
Bolt.new AI: Generates CSS modification  
     ↓
Direct File Update: Modifies CSS without component system
```

**Example Output:**
```css
.btn-primary { background-color: #dc3545; }
```

### **Detection Logic**

```typescript
function detectModificationType(userInput: string): 'component' | 'styling' | 'logic' {
  const componentKeywords = ['add field', 'new input', 'upload', 'dropdown'];
  const stylingKeywords = ['color', 'bigger', 'font', 'style'];
  const logicKeywords = ['when', 'if', 'condition', 'validation'];
  
  if (componentKeywords.some(k => userInput.includes(k))) return 'component';
  if (stylingKeywords.some(k => userInput.includes(k))) return 'styling';
  return 'logic';
}
```

## 🔐 Permission Model

### **Component Library Permissions**

#### **Component Definitions** (Shared, Read-Only)
- **Admin/Builder**: Can create, edit, delete shared components
- **Users**: Can view and use components, cannot modify
- **Isolation**: Per-organization via RLS policies

#### **Component Instances** (Per-Workflow, Editable) 
- **Workflow Owner**: Full control over their workflow's component instances
- **Organization Members**: Can view based on workflow permissions
- **Customization**: Can modify labels, validation, config per workflow

### **Example Permission Flow**

```
Organization: "Acme Corp"
├── Component Library (Admin-managed)
│   ├── "Expense Amount" component (shared template)
│   └── "Receipt Upload" component (shared template)
├── Workflow A: "Travel Expenses" 
│   ├── Instance: "Expense Amount" → label="Travel Cost", required=true
│   └── Instance: "Receipt Upload" → accept="image/*,application/pdf"
└── Workflow B: "Office Supplies"
    ├── Instance: "Expense Amount" → label="Supply Cost", max=500
    └── Instance: "Receipt Upload" → multiple=true
```

## 🔄 Workflow Generation Process

### **Complete Generation Flow**

1. **User Request**: "Create expense approval workflow"

2. **Component Analysis**: 
   ```typescript
   const componentMapper = new ComponentMapper(organizationId);
   const suggestions = await componentMapper.suggestComponentsForWorkflow(userInput);
   ```

3. **Component Selection**:
   ```typescript
   const selectedComponents = {
     capture: ['expense-amount', 'receipt-upload', 'business-purpose'],
     approval: ['approve-reject-buttons'],
     update: ['email-notification']
   };
   ```

4. **Template Generation**:
   ```typescript
   const formHTML = await generateFormFromComponents(
     selectedComponents.capture, 
     extractedFields
   );
   ```

5. **File Generation**: 
   ```typescript
   const files = await generateWorkflowApplication(workflow, organizationId);
   ```

6. **WebContainer Mounting**: Files appear in Bolt.new workbench

7. **Real-time Preview**: User sees running application

## 📊 Benefits Summary

### **Enterprise Benefits**
- ✅ **Standardization**: All workflows use consistent components
- ✅ **Quality Control**: Pre-tested, enterprise-grade components  
- ✅ **Governance**: Admin control over available components
- ✅ **Consistency**: Same look/feel across organization
- ✅ **Maintenance**: Update shared components affects all workflows

### **Developer Benefits**  
- ✅ **Flexibility**: Can still modify code directly via Bolt.new
- ✅ **Real-time Updates**: See changes immediately
- ✅ **Debugging**: Full access to generated code
- ✅ **Customization**: Style and logic modifications unrestricted
- ✅ **Speed**: Pre-built components accelerate development

### **User Benefits**
- ✅ **Familiarity**: Consistent UI across all workflows
- ✅ **Reliability**: Tested components reduce errors
- ✅ **Accessibility**: Components follow accessibility standards
- ✅ **Mobile**: Responsive components work on all devices

## 🚀 Implementation Status

### **✅ Completed**
- Database schema design (`fixed_component_library.sql`)
- AI component mapping system (`ComponentMapper`)  
- Template generation system (`generateFormFromComponents`)
- Hybrid modification detection
- Permission model design

### **🔄 In Progress** 
- Component library population with real components
- Bolt.new integration for hybrid modifications
- Visual builder ↔ generated code synchronization

### **📋 Next Steps**
1. Execute `fixed_component_library.sql` in Supabase dashboard
2. Populate component library with standard business components
3. Test AI component selection with real workflows
4. Implement visual builder synchronization
5. Add component marketplace features

## 🔗 Related Documentation

- [Workflow Data Models](./workflow-data-models.md) - Core workflow structure
- [Auth Architecture](./auth-architecture.md) - Permission and security model  
- [WebContainer Integration](./webcontainer-integration-solution.md) - Code generation system
- [Multi-Agent Architecture](./multi-agent-architecture.md) - AI system design

---

*This document describes the hybrid component library system that combines enterprise standardization with developer flexibility.*