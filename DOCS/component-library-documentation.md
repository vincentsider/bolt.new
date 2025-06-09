# Component Library Documentation

## Overview

The Component Library is a centralized system for managing reusable UI components in WorkflowHub. It enables administrators to create, manage, and maintain a library of standardized workflow components that are automatically mapped to user requirements through AI-powered natural language processing.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Component Library System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │   Admin Panel   │    │   AI Mapper     │    │   Workflow   ││
│  │   Management    │───▶│  Intelligence   │───▶│   Builder    ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
│           │                      │                       │        │
│           ▼                      ▼                       ▼        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Supabase Database                         ││
│  │  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐ ││
│  │  │ Libraries   │  │   Definitions    │  │   Instances    │ ││
│  │  └─────────────┘  └──────────────────┘  └────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### component_libraries
```sql
- id: UUID (Primary Key)
- organization_id: UUID (Foreign Key)
- name: TEXT
- description: TEXT
- version: TEXT
- is_default: BOOLEAN
- active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- created_by: UUID
```

#### component_definitions
```sql
- id: UUID (Primary Key)
- library_id: UUID (Foreign Key)
- organization_id: UUID (Foreign Key)
- name: TEXT
- description: TEXT
- component_group: TEXT (Enum)
- component_type: TEXT
- active: BOOLEAN
- ai_keywords: JSONB
- typical_examples: TEXT[]
- properties: JSONB
- icon: TEXT
- color: TEXT
- compatible_steps: TEXT[]
- html_template: TEXT
- css_classes: TEXT[]
- js_validation: TEXT
- api_endpoint: TEXT
- data_mapping: JSONB
```

#### component_instances
```sql
- id: UUID (Primary Key)
- workflow_id: UUID (Foreign Key)
- component_id: UUID (Foreign Key)
- label: TEXT
- required: BOOLEAN
- config: JSONB
- validation: JSONB
- position: JSONB
- data_mapping: JSONB
```

### Component Groups

1. **Basic Inputs** (`basic_inputs`)
   - Short Text Box
   - Long Text Box
   - Number Field
   - Date Picker
   - Drop-down List
   - Multi-Select List
   - Yes/No Buttons
   - Checkbox
   - Checklist

2. **Document Handling** (`document_handling`)
   - File Upload
   - SharePoint Link
   - Document Viewer

3. **Look-ups & Status** (`lookups_status`)
   - Record Search
   - Status Badge

4. **Financial-Specific** (`financial_specific`)
   - Currency & Amount
   - Risk Score Meter

5. **Layout Helpers** (`layout_helpers`)
   - Section Accordion
   - Step Progress Bar
   - Review Table

6. **Approval & Sign-off** (`approval_signoff`)
   - Approve/Reject Buttons
   - Digital Signature Box
   - Confirmation Tick

7. **Automation Hooks** (`automation_hooks`)
   - Hidden API Push
   - OCR Extractor
   - Audit Logger

## User Experience

### For Workflow Builders

1. **Natural Language Component Selection**
   - Users describe what they need in plain language
   - AI automatically suggests appropriate components
   - Example: "I need to collect employee names" → Short Text Box

2. **Automatic Configuration**
   - AI extracts configuration from user input
   - Sets labels, validation rules, and requirements
   - Example: "required email address" → Email field with validation

3. **Smart Placement**
   - Components automatically placed in correct workflow steps
   - Capture components → Step 1
   - Review components → Step 2
   - Approval components → Step 3
   - Integration components → Step 4

### For End Users

1. **Consistent UI Experience**
   - All components follow standardized design patterns
   - Predictable behavior across workflows
   - Professional appearance with proper styling

2. **Built-in Validation**
   - Client-side validation for immediate feedback
   - Server-side validation for security
   - Clear error messages and guidance

3. **Responsive Design**
   - Components adapt to different screen sizes
   - Mobile-friendly interfaces
   - Accessibility features included

## Admin Experience

### Component Library Manager Interface

Located at `/admin/components`, the admin interface provides:

1. **Dashboard View**
   - Total components count
   - Active components count
   - Components by group breakdown
   - AI keyword statistics

2. **Component Management**
   - Create new components
   - Edit existing components
   - Activate/deactivate components
   - Delete unused components

3. **AI Keyword Configuration**
   - Add keywords with weights (1-10)
   - Define context words for better matching
   - Set typical use case examples
   - Test keyword matching

4. **Property Management**
   - Define component properties
   - Set default values
   - Configure validation rules
   - Map to external systems

### Creating a New Component

1. **Basic Information**
   ```typescript
   {
     name: "Customer Feedback Rating",
     description: "5-star rating component for feedback",
     group: "basic_inputs",
     type: "rating_stars",
     icon: "⭐",
     color: "#FFD700"
   }
   ```

2. **AI Keywords**
   ```typescript
   [
     { keyword: "rating", weight: 10 },
     { keyword: "feedback", weight: 8 },
     { keyword: "stars", weight: 9 },
     { keyword: "satisfaction", weight: 7 }
   ]
   ```

3. **HTML Template**
   ```html
   <div class="rating-component">
     <label>{{label}}</label>
     <div class="stars" data-name="{{name}}">
       <!-- Star rating HTML -->
     </div>
   </div>
   ```

4. **Validation Rules**
   ```typescript
   {
     required: true,
     min: 1,
     max: 5,
     errorMessage: "Please select a rating"
   }
   ```

## AI Intelligence

### Component Mapper (`component-mapper.ts`)

The AI component mapper uses a sophisticated scoring algorithm:

1. **Keyword Matching**
   - Direct keyword matches: Full weight
   - Word matches: 50% bonus weight
   - Context word matches: 30% bonus weight

2. **Example Matching**
   - Typical use case matches: Fixed 3 points
   - Helps with specific scenarios

3. **Name Similarity**
   - Component name word matches: 2 points per word
   - Catches direct references

4. **Confidence Scoring**
   - Normalized score (0-1)
   - Auto-selection threshold: 0.7
   - Multiple matches returned for manual selection

### Natural Language Processing

Examples of AI understanding:

```
User: "I need to collect employee email addresses"
AI Detection:
- Keywords: "collect" (data_collection intent)
- Component: Short Text Box
- Configuration: type="email", required=true, label="Employee Email Address"

User: "upload passport and visa documents"
AI Detection:
- Keywords: "upload", "documents" (file_upload intent)
- Component: File Upload (x2)
- Configuration: 
  - File 1: label="Passport", accept="image/*,.pdf", required=true
  - File 2: label="Visa", accept="image/*,.pdf", required=true

User: "manager needs to approve or reject with comments"
AI Detection:
- Keywords: "approve", "reject" (approval intent)
- Components: 
  - Approve/Reject Buttons
  - Long Text Box (for comments)
```

## Integration Points

### 1. Workflow Chat Interface
```typescript
// WorkflowChat component integration
const componentMapper = new ComponentMapper(organizationId)
const suggestion = await componentMapper.mapComponents(userInput, targetStep)
```

### 2. Visual Workflow Builder
```typescript
// Direct component selection from palette
const component = componentLibrary.find(c => c.id === selectedId)
const instance = createComponentInstance(component, workflow)
```

### 3. Workflow Execution
```typescript
// Runtime rendering of components
const html = renderComponent(instance.component.htmlTemplate, instance.config)
const validation = applyValidation(instance.validation, formData)
```

## Best Practices

### For Administrators

1. **Keyword Management**
   - Use high weights (8-10) for primary keywords
   - Add context words for disambiguation
   - Include common misspellings

2. **Component Design**
   - Keep components focused and single-purpose
   - Provide clear, helpful descriptions
   - Use consistent naming conventions

3. **Template Creation**
   - Use semantic HTML for accessibility
   - Include proper ARIA labels
   - Make templates responsive by default

### For Developers

1. **Extending Components**
   ```typescript
   // Custom component type
   interface CustomComponent extends ComponentDefinition {
     customProperty: string
     customBehavior: () => void
   }
   ```

2. **Validation Patterns**
   ```typescript
   // Email validation
   validation: {
     pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
     message: "Please enter a valid email"
   }
   ```

3. **Integration Mapping**
   ```typescript
   // Map to external system
   dataMapping: {
     source: "component_value",
     destination: "crm.contact.email",
     transform: "toLowerCase"
   }
   ```

## Security Considerations

1. **Template Sanitization**
   - HTML templates are sanitized before storage
   - No script tags or inline JavaScript allowed
   - CSS classes are whitelisted

2. **Validation Security**
   - Server-side validation always enforced
   - Input sanitization for all user data
   - SQL injection prevention via parameterized queries

3. **Access Control**
   - Component library management requires admin role
   - Component usage follows workflow permissions
   - Organization-level data isolation

## Performance Optimization

1. **Caching**
   - Component definitions cached in memory
   - AI keyword mappings pre-computed
   - Template compilation cached

2. **Lazy Loading**
   - Components loaded on-demand
   - Large templates chunked
   - Validation scripts deferred

3. **Database Optimization**
   - Indexed on frequently queried fields
   - JSONB indexes for keyword searches
   - Materialized views for statistics

## Troubleshooting

### Common Issues

1. **Component Not Suggested**
   - Check keyword weights
   - Verify component is active
   - Ensure compatible steps are set

2. **Validation Not Working**
   - Verify validation rules syntax
   - Check client and server validation
   - Test with different inputs

3. **Template Rendering Issues**
   - Validate HTML syntax
   - Check template variables
   - Verify CSS class availability

### Debug Mode

Enable debug logging:
```typescript
const mapper = new ComponentMapper(orgId)
mapper.enableDebug = true
```

## Future Enhancements

1. **Component Marketplace**
   - Share components across organizations
   - Community-contributed components
   - Certified component library

2. **Advanced AI Features**
   - Multi-language support
   - Industry-specific understanding
   - Learning from usage patterns

3. **Visual Component Builder**
   - Drag-drop template creation
   - Live preview
   - Code generation

## API Reference

### Component Library API

```typescript
// Get all components
GET /api/component-library?organization_id={orgId}

// Get single component
GET /api/component-library/{componentId}

// Create component
POST /api/component-library
Body: CreateComponentDefinitionRequest

// Update component
PUT /api/component-library/{componentId}
Body: UpdateComponentDefinitionRequest

// Delete component
DELETE /api/component-library/{componentId}

// Get component statistics
GET /api/component-library/stats?organization_id={orgId}
```

### Component Mapper API

```typescript
class ComponentMapper {
  constructor(organizationId: string)
  
  async mapComponents(
    userInput: string, 
    targetStep: WorkflowStepType
  ): Promise<ComponentSuggestion>
  
  async createComponentInstances(
    userInput: string,
    targetStep: WorkflowStepType,
    workflowId: string
  ): Promise<ComponentInstance[]>
  
  async refresh(): Promise<void>
}
```

## Conclusion

The Component Library system provides a powerful, flexible foundation for standardizing workflow creation across the organization. By combining administrative control with AI intelligence, it enables both consistency and ease of use, making workflow automation accessible to non-technical users while maintaining the flexibility needed for complex business processes.