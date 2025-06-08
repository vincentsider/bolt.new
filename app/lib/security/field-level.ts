import { supabase } from '~/lib/supabase'

export type DataClassificationLevel = 'public' | 'internal' | 'confidential' | 'restricted'
export type UserRole = 'builder' | 'reviewer' | 'approver' | 'auditor' | 'sysadmin'

export interface FieldAccessPolicy {
  id: string
  organizationId: string
  tableName: string
  columnName: string
  classificationLevel: DataClassificationLevel
  allowedRoles: UserRole[]
  conditions: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface DataClassification {
  [fieldName: string]: DataClassificationLevel
}

/**
 * Security context for field-level access control
 */
export interface SecurityContext {
  userId: string
  userRole: UserRole
  organizationId: string
  permissions: string[]
}

/**
 * Check if user has access to a specific field
 */
export async function checkFieldAccess(
  tableName: string,
  columnName: string,
  context: SecurityContext
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_field_access', {
      p_table_name: tableName,
      p_column_name: columnName,
      p_user_role: context.userRole,
      p_organization_id: context.organizationId
    })

    if (error) {
      console.error('Field access check failed:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Field access check error:', error)
    return false
  }
}

/**
 * Get workflow data with field-level security applied
 */
export async function getWorkflowSecure(
  workflowId: string,
  context: SecurityContext
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_workflow_secure', {
      p_workflow_id: workflowId,
      p_user_role: context.userRole,
      p_organization_id: context.organizationId
    })

    if (error) {
      throw new Error(`Failed to get secure workflow: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Secure workflow fetch error:', error)
    throw error
  }
}

/**
 * Get execution data with field-level security applied
 */
export async function getExecutionSecure(
  executionId: string,
  context: SecurityContext
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_execution_secure', {
      p_execution_id: executionId,
      p_user_role: context.userRole,
      p_organization_id: context.organizationId
    })

    if (error) {
      throw new Error(`Failed to get secure execution: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Secure execution fetch error:', error)
    throw error
  }
}

/**
 * Mask sensitive data based on user role and data classification
 */
export async function maskSensitiveData(
  data: Record<string, any>,
  userRole: UserRole,
  dataClassification: DataClassification = {}
): Promise<Record<string, any>> {
  try {
    const { data: maskedData, error } = await supabase.rpc('mask_sensitive_data', {
      p_data: data,
      p_user_role: userRole,
      p_data_classification: dataClassification
    })

    if (error) {
      throw new Error(`Failed to mask data: ${error.message}`)
    }

    return maskedData || data
  } catch (error) {
    console.error('Data masking error:', error)
    return data // Fallback to original data
  }
}

/**
 * Filter object properties based on field access permissions
 */
export function filterByFieldAccess<T extends Record<string, any>>(
  obj: T,
  tableName: string,
  userRole: UserRole,
  fieldPolicies: FieldAccessPolicy[]
): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    const policy = fieldPolicies.find(
      p => p.tableName === tableName && p.columnName === key
    )

    // If no policy exists, allow access (permissive default)
    if (!policy) {
      result[key as keyof T] = value
      continue
    }

    // Check if user role is allowed
    if (policy.allowedRoles.includes(userRole)) {
      result[key as keyof T] = value
    }
    // Field is restricted for this role - don't include it
  }

  return result
}

/**
 * Create or update field access policy
 */
export async function createFieldAccessPolicy(
  policy: Omit<FieldAccessPolicy, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FieldAccessPolicy> {
  try {
    const { data, error } = await supabase
      .from('field_access_policies')
      .upsert({
        organization_id: policy.organizationId,
        table_name: policy.tableName,
        column_name: policy.columnName,
        classification_level: policy.classificationLevel,
        allowed_roles: policy.allowedRoles,
        conditions: policy.conditions
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create field policy: ${error.message}`)
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      tableName: data.table_name,
      columnName: data.column_name,
      classificationLevel: data.classification_level,
      allowedRoles: data.allowed_roles,
      conditions: data.conditions,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Create field policy error:', error)
    throw error
  }
}

/**
 * Get all field access policies for an organization
 */
export async function getFieldAccessPolicies(
  organizationId: string
): Promise<FieldAccessPolicy[]> {
  try {
    const { data, error } = await supabase
      .from('field_access_policies')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to get field policies: ${error.message}`)
    }

    return data.map(item => ({
      id: item.id,
      organizationId: item.organization_id,
      tableName: item.table_name,
      columnName: item.column_name,
      classificationLevel: item.classification_level,
      allowedRoles: item.allowed_roles,
      conditions: item.conditions,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  } catch (error) {
    console.error('Get field policies error:', error)
    return []
  }
}

/**
 * Initialize default field policies for a new organization
 */
export async function initializeFieldPolicies(organizationId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('initialize_field_policies_for_org', {
      p_organization_id: organizationId
    })

    if (error) {
      throw new Error(`Failed to initialize field policies: ${error.message}`)
    }
  } catch (error) {
    console.error('Initialize field policies error:', error)
    throw error
  }
}

/**
 * React hook for field-level security context
 */
export function useFieldSecurity(userRole: UserRole, organizationId: string) {
  const checkAccess = (tableName: string, columnName: string) => {
    return checkFieldAccess(tableName, columnName, {
      userId: '', // Will be filled from auth context
      userRole,
      organizationId,
      permissions: []
    })
  }

  const secureWorkflow = (workflowId: string) => {
    return getWorkflowSecure(workflowId, {
      userId: '',
      userRole,
      organizationId,
      permissions: []
    })
  }

  const secureExecution = (executionId: string) => {
    return getExecutionSecure(executionId, {
      userId: '',
      userRole,
      organizationId,
      permissions: []
    })
  }

  return {
    checkAccess,
    secureWorkflow,
    secureExecution,
    maskData: (data: any, classification?: DataClassification) => 
      maskSensitiveData(data, userRole, classification)
  }
}

/**
 * Classification helpers for common data types
 */
export const DataClassifications = {
  // Public data - visible to all authenticated users
  PUBLIC: {
    id: 'public' as const,
    name: 'public' as const,
    status: 'public' as const,
    created_at: 'public' as const,
    updated_at: 'public' as const
  },

  // Internal data - visible to internal roles
  INTERNAL: {
    description: 'internal' as const,
    version: 'internal' as const,
    input: 'internal' as const,
    output: 'internal' as const
  },

  // Confidential data - restricted to approvers and above
  CONFIDENTIAL: {
    config: 'confidential' as const,
    permissions: 'confidential' as const,
    context: 'confidential' as const,
    prompt: 'confidential' as const
  },

  // Restricted data - sysadmin and auditor only
  RESTRICTED: {
    client_secret: 'restricted' as const,
    api_key: 'restricted' as const,
    private_key: 'restricted' as const
  }
} as const