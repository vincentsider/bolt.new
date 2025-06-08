# Authentication Gap Analysis vs PRD Requirements

## PRD Requirements Analysis

### 1. Primary Identity Provider (IdP)
**PRD Requirement**: Microsoft Entra ID (Azure AD) via OIDC/SAML
**Current Implementation**: ❌ Supabase Auth with basic email/password
**Gap**: Major - Need to implement Azure AD integration

### 2. Alternative IdPs
**PRD Requirement**: Okta, ADFS supported through OIDC flow
**Current Implementation**: ❌ None
**Gap**: Need OIDC provider abstraction layer

### 3. RBAC Model
**PRD Requirement**: Roles - Builder, Reviewer, Approver, Auditor, SysAdmin
**Current Implementation**: ✅ Partial - We have: admin, builder, user, approver
**Gap**: Missing 'Reviewer' and 'Auditor' roles

### 4. Field-level Security
**PRD Requirement**: PostgreSQL row/column policies + React front-end guards
**Current Implementation**: ✅ Have RLS policies, ❌ Missing field-level controls
**Gap**: Need column-level RLS and UI guards

## Detailed Assessment

### ✅ What We Have Right

1. **Multi-tenant Foundation**
   - Organization-based data isolation ✅
   - Row Level Security (RLS) policies ✅
   - User role system ✅

2. **Database Security**
   - PostgreSQL with RLS ✅
   - Encrypted connections ✅
   - UUID-based keys ✅

3. **Basic RBAC**
   - Role-based permissions framework ✅
   - Organization isolation ✅
   - User profiles ✅

### ❌ Critical Missing Components

1. **Enterprise SSO Integration**
   ```typescript
   // MISSING: Azure AD OIDC provider
   // MISSING: SAML support
   // MISSING: Okta/ADFS connectors
   ```

2. **Complete Role Model**
   ```typescript
   // CURRENT: 'admin' | 'builder' | 'user' | 'approver'
   // NEEDED: 'builder' | 'reviewer' | 'approver' | 'auditor' | 'sysadmin'
   ```

3. **Field-level Security**
   ```sql
   -- MISSING: Column-level RLS policies
   -- MISSING: Dynamic field visibility
   ```

4. **MFA & Conditional Access**
   ```typescript
   // MISSING: Multi-factor authentication
   // MISSING: Conditional access policies
   ```

## Implementation Roadmap

### Phase 1: Fix Role Model (Week 1)
```typescript
// Update role enum to match PRD
type UserRole = 'builder' | 'reviewer' | 'approver' | 'auditor' | 'sysadmin'

// Update permissions matrix
const ROLE_PERMISSIONS = {
  builder: ['workflow:create', 'workflow:edit', 'workflow:delete'],
  reviewer: ['workflow:review', 'workflow:comment'],
  approver: ['workflow:approve', 'workflow:reject'],
  auditor: ['audit:read', 'workflow:read'],
  sysadmin: ['*'] // All permissions
}
```

### Phase 2: Azure AD Integration (Week 2)
```typescript
// Add Azure AD OIDC provider
const azureProvider = {
  name: 'azure',
  type: 'oidc',
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  wellKnown: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid_configuration`
}

// Configure Supabase to use external providers
```

### Phase 3: Field-level Security (Week 3)
```sql
-- Add column-level RLS policies
CREATE POLICY "users_can_view_own_profile_fields"
  ON users FOR SELECT
  USING (
    id = auth.uid() OR 
    (organization_id = (auth.jwt() ->> 'organization_id')::uuid AND 
     auth.jwt() ->> 'role' IN ('sysadmin', 'auditor'))
  );

-- Create field visibility functions
CREATE OR REPLACE FUNCTION can_view_field(
  field_name text,
  user_role text,
  data_classification text
) RETURNS boolean AS $$
BEGIN
  -- Implement field-level access logic
  RETURN CASE 
    WHEN user_role = 'sysadmin' THEN true
    WHEN data_classification = 'public' THEN true
    WHEN data_classification = 'internal' AND user_role IN ('auditor', 'builder') THEN true
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 4: React Guards (Week 4)
```typescript
// Field-level UI guards
function ProtectedField({ 
  field, 
  classification = 'internal',
  children 
}: ProtectedFieldProps) {
  const { profile } = useAuth()
  const canView = checkFieldPermission(profile.role, field, classification)
  
  if (!canView) {
    return <span className="text-gray-400">***</span>
  }
  
  return children
}

// Usage in forms
<ProtectedField field="salary" classification="confidential">
  <input {...salaryField} />
</ProtectedField>
```

## Immediate Actions Required

### 1. Update User Role Schema
```sql
-- Update role constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('builder', 'reviewer', 'approver', 'auditor', 'sysadmin'));
```

### 2. Configure Azure AD in Supabase
```bash
# In Supabase Dashboard > Authentication > Providers
# Enable Azure and configure:
# - Client ID
# - Client Secret  
# - Tenant ID
# - Redirect URL
```

### 3. Add Missing Environment Variables
```env
# .env additions needed
AZURE_CLIENT_ID=your_azure_app_id
AZURE_CLIENT_SECRET=your_azure_secret
AZURE_TENANT_ID=your_tenant_id
```

## Risk Assessment

### 🔴 High Risk
- **No enterprise SSO**: Blocks enterprise adoption
- **Incomplete RBAC**: Security vulnerability 
- **No field-level security**: Compliance risk

### 🟡 Medium Risk  
- **No MFA**: Authentication weakness
- **No audit trails**: Compliance gap

### 🟢 Low Risk
- **Basic multi-tenancy works**: Foundation solid
- **Database security good**: RLS implemented

## Recommendation

**Immediate Priority**: Fix role model and add Azure AD integration before any pilot deployment. The current auth system will not meet enterprise requirements.

**Timeline**: 2-3 weeks to achieve PRD compliance for authentication.

---

*Status: Action Required - Current auth not enterprise-ready*