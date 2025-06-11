import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { useAuth } from '~/components/auth/AuthProvider';
import { supabase } from '~/lib/supabase';
import { IconButton } from '~/components/ui/IconButton';
import * as RadixDialog from '@radix-ui/react-dialog';

interface ComponentDefinition {
  id: string;
  library_id: string;
  organization_id: string;
  name: string;
  description: string;
  component_group: string;
  component_type: string;
  ai_keywords: any | null;
  typical_examples: string[] | null;
  properties: Record<string, any> | null;
  icon: string | null;
  color: string | null;
  compatible_steps: string[] | null;
  html_template: string;
  css_classes: string[] | null;
  js_validation: string | null;
  api_endpoint: string | null;
  data_mapping: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export default function ComponentsAdmin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get('org');
  
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [editingComponent, setEditingComponent] = useState<ComponentDefinition | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth and redirect if needed
  useEffect(() => {
    if (!user || !profile) {
      navigate('/dashboard');
      return;
    }
    
    if (profile.role !== 'builder' && profile.role !== 'sysadmin') {
      navigate('/dashboard');
      return;
    }
    
    if (!organizationId) {
      navigate('/dashboard');
      return;
    }
    
    loadComponents();
  }, [user, profile, organizationId, navigate]);

  async function loadComponents() {
    if (!organizationId || !user) return;
    
    try {
      console.log('Loading components for user:', user.id);
      
      // Get default library for organization - include more fields to debug
      let { data: libraries, error: libFetchError } = await supabase
        .from('component_libraries')
        .select('*')
        .eq('organization_id', organizationId);
      
      console.log('All libraries for org:', libraries);
      
      // Find the default one
      let library = libraries?.find(lib => lib.is_default === true) || libraries?.[0];

      console.log('Library fetch:', {
        organizationId,
        userId: user.id,
        libraryId: library?.id,
        librariesFound: libraries?.length || 0,
        error: libFetchError
      });

      if (!library && user) {
        console.log('No library found, creating one...');
        // Create default library if it doesn't exist
        const { data: newLibrary, error: libError } = await supabase
          .from('component_libraries')
          .insert({
            organization_id: organizationId,
            name: 'WorkflowHub Standard Library',
            description: 'Standard business workflow components',
            is_default: true,
            created_by: user.id
          })
          .select()
          .single();

        console.log('Library creation result:', {
          newLibrary,
          error: libError
        });

        if (!libError && newLibrary) {
          library = newLibrary;
        }
      }

      if (library) {
        setLibraryId(library.id);
        console.log('Library ID set:', library.id);
      } else {
        console.log('No library ID available');
      }

      // Load all component definitions for this organization
      const { data: componentsData, error } = await supabase
        .from('component_definitions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('component_group', { ascending: true })
        .order('name', { ascending: true });

      console.log('Component definitions query:', {
        organizationId,
        error,
        componentsCount: componentsData?.length || 0
      });

      if (!error && componentsData) {
        setComponents(componentsData);
      } else if (error) {
        console.error('Error loading components:', error);
      }
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(formData: FormData) {
    if (!user || !organizationId || !libraryId) return;
    
    setIsSubmitting(true);
    try {
      const componentData = {
        library_id: libraryId,
        organization_id: organizationId,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        component_group: formData.get('component_group') as string,
        component_type: formData.get('component_type') as string || 'custom',
        ai_keywords: formData.get('ai_keywords') 
          ? JSON.parse(`[${(formData.get('ai_keywords') as string).split(',').map(k => `{"keyword": "${k.trim()}", "weight": 5}`).join(',')}]`)
          : [],
        typical_examples: formData.get('typical_examples')
          ? (formData.get('typical_examples') as string).split(',').map(s => s.trim()).filter(s => s)
          : [],
        icon: formData.get('icon') as string || '📝',
        color: formData.get('color') as string || '#3B82F6',
        properties: formData.get('properties') 
          ? JSON.parse(formData.get('properties') as string)
          : {},
        compatible_steps: formData.get('compatible_steps')
          ? (formData.get('compatible_steps') as string).split(',').map(s => s.trim()).filter(s => s)
          : ['capture'],
        html_template: formData.get('html_template') as string || '<div></div>',
        css_classes: formData.get('css_classes')
          ? (formData.get('css_classes') as string).split(',').map(s => s.trim()).filter(s => s)
          : [],
        js_validation: formData.get('js_validation') as string || null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('component_definitions')
        .insert(componentData);

      if (!error) {
        await loadComponents();
        setShowCreateDialog(false);
        setEditingComponent(null);
      }
    } catch (error) {
      console.error('Error creating component:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setIsSubmitting(true);
    try {
      const updateData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        component_group: formData.get('component_group') as string,
        component_type: formData.get('component_type') as string,
        ai_keywords: formData.get('ai_keywords') 
          ? JSON.parse(`[${(formData.get('ai_keywords') as string).split(',').map(k => `{"keyword": "${k.trim()}", "weight": 5}`).join(',')}]`)
          : [],
        typical_examples: formData.get('typical_examples')
          ? (formData.get('typical_examples') as string).split(',').map(s => s.trim()).filter(s => s)
          : [],
        icon: formData.get('icon') as string || '📝',
        color: formData.get('color') as string || '#3B82F6',
        properties: formData.get('properties') 
          ? JSON.parse(formData.get('properties') as string)
          : {},
        compatible_steps: formData.get('compatible_steps')
          ? (formData.get('compatible_steps') as string).split(',').map(s => s.trim()).filter(s => s)
          : ['capture'],
        html_template: formData.get('html_template') as string,
        css_classes: formData.get('css_classes')
          ? (formData.get('css_classes') as string).split(',').map(s => s.trim()).filter(s => s)
          : [],
        js_validation: formData.get('js_validation') as string || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('component_definitions')
        .update(updateData)
        .eq('id', id);

      if (!error) {
        await loadComponents();
        setShowCreateDialog(false);
        setEditingComponent(null);
      }
    } catch (error) {
      console.error('Error updating component:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('component_definitions')
        .delete()
        .eq('id', id);

      if (!error) {
        await loadComponents();
        setShowDeleteDialog(null);
      }
    } catch (error) {
      console.error('Error deleting component:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const intent = formData.get('intent');
    
    if (intent === 'create') {
      await handleCreate(formData);
    } else if (intent === 'update' && editingComponent) {
      await handleUpdate(editingComponent.id, formData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading components...</p>
        </div>
      </div>
    );
  }

  // Get unique component groups
  const groups = Array.from(new Set(components.map(c => c.component_group))).sort();

  // Filter components by selected group
  const filteredComponents = selectedGroup === 'all' 
    ? components 
    : components.filter(c => c.component_group === selectedGroup);

  // Format AI keywords for display
  const formatAiKeywords = (keywords: any): string => {
    if (!keywords) return '';
    if (Array.isArray(keywords)) {
      return keywords.map(k => k.keyword || k).join(', ');
    }
    return '';
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Component Library Admin</h1>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">
              Organization ID: {organizationId}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => {
                setEditingComponent(null);
                setShowCreateDialog(true);
              }}
              className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
              disabled={isSubmitting}
            >
              Add Component
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters */}
        <div className="w-64 border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4">
          <h2 className="text-sm font-semibold mb-4">Filter by Group</h2>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`w-full text-left px-3 py-2 rounded ${
                selectedGroup === 'all' 
                  ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text' 
                  : 'hover:bg-bolt-elements-background-depth-3'
              }`}
            >
              All Components ({components.length})
            </button>
            {groups.map(group => {
              const count = components.filter(c => c.component_group === group).length;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedGroup === group 
                      ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text' 
                      : 'hover:bg-bolt-elements-background-depth-3'
                  }`}
                >
                  {group.replace('_', ' ')} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Component grid */}
        <div className="flex-1 overflow-auto p-6">
          {components.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No components found. Run the SQL script to populate the library.</p>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm">
                /DOCS/standard-business-components.sql
              </code>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComponents.map(component => (
                <div
                  key={component.id}
                  className="bg-bolt-elements-background-depth-2 rounded-lg p-4 border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {component.icon && (
                        <span className="text-2xl">{component.icon}</span>
                      )}
                      <h3 className="font-semibold">{component.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <IconButton
                        icon="i-ph:pencil"
                        onClick={() => {
                          setEditingComponent(component);
                          setShowCreateDialog(true);
                        }}
                        title="Edit component"
                        size="sm"
                      />
                      <IconButton
                        icon="i-ph:trash"
                        onClick={() => setShowDeleteDialog(component.id)}
                        title="Delete component"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-bolt-elements-textSecondary mb-3">
                    {component.description}
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold">Type:</span>{' '}
                      <span className="bg-bolt-elements-background-depth-3 px-2 py-1 rounded">
                        {component.component_type}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-semibold">Group:</span>{' '}
                      <span className="bg-bolt-elements-background-depth-3 px-2 py-1 rounded">
                        {component.component_group.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {component.ai_keywords && (
                      <div>
                        <span className="font-semibold">AI Keywords:</span>{' '}
                        <span className="text-bolt-elements-textTertiary">
                          {formatAiKeywords(component.ai_keywords)}
                        </span>
                      </div>
                    )}
                    
                    {component.compatible_steps && component.compatible_steps.length > 0 && (
                      <div>
                        <span className="font-semibold">Compatible Steps:</span>{' '}
                        <span className="text-bolt-elements-textTertiary">
                          {component.compatible_steps.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <RadixDialog.Root open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingComponent(null);
        }
      }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-2 shadow-lg focus:outline-none overflow-hidden">
            <div className="p-6">
              <RadixDialog.Title className="text-lg font-semibold mb-4">
                {editingComponent ? 'Edit Component' : 'Create Component'}
              </RadixDialog.Title>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <input type="hidden" name="intent" value={editingComponent ? 'update' : 'create'} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingComponent?.name}
                      required
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Component Type</label>
                    <input
                      type="text"
                      name="component_type"
                      defaultValue={editingComponent?.component_type || 'custom'}
                      required
                      placeholder="e.g., text_input, file_upload"
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingComponent?.description}
                    required
                    rows={2}
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Component Group</label>
                    <select
                      name="component_group"
                      defaultValue={editingComponent?.component_group || 'basic_inputs'}
                      required
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    >
                      <option value="basic_inputs">Basic Inputs</option>
                      <option value="document_handling">Document Handling</option>
                      <option value="lookups_status">Lookups & Status</option>
                      <option value="financial_specific">Financial Specific</option>
                      <option value="layout_helpers">Layout Helpers</option>
                      <option value="approval_signoff">Approval & Signoff</option>
                      <option value="automation_hooks">Automation Hooks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Compatible Steps</label>
                    <input
                      type="text"
                      name="compatible_steps"
                      defaultValue={editingComponent?.compatible_steps?.join(', ') || 'capture'}
                      placeholder="capture, review, approval, update"
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Icon (Emoji)</label>
                    <input
                      type="text"
                      name="icon"
                      defaultValue={editingComponent?.icon || '📝'}
                      placeholder="📝"
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <input
                      type="color"
                      name="color"
                      defaultValue={editingComponent?.color || '#3B82F6'}
                      className="w-full h-[42px] px-1 py-1 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">CSS Classes</label>
                    <input
                      type="text"
                      name="css_classes"
                      defaultValue={editingComponent?.css_classes?.join(', ') || ''}
                      placeholder="form-control, required"
                      className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">AI Keywords (comma-separated)</label>
                  <input
                    type="text"
                    name="ai_keywords"
                    defaultValue={formatAiKeywords(editingComponent?.ai_keywords)}
                    placeholder="form, input, capture, data"
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Typical Examples (comma-separated)</label>
                  <input
                    type="text"
                    name="typical_examples"
                    defaultValue={editingComponent?.typical_examples?.join(', ') || ''}
                    placeholder="Employee name, Customer email"
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">HTML Template</label>
                  <textarea
                    name="html_template"
                    defaultValue={editingComponent?.html_template || '<div class="form-group">\n  <label for="{{name}}">{{label}}</label>\n  <input type="text" id="{{name}}" name="{{name}}" />\n</div>'}
                    required
                    rows={5}
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Properties (JSON)</label>
                  <textarea
                    name="properties"
                    defaultValue={editingComponent?.properties ? JSON.stringify(editingComponent.properties, null, 2) : '{}'}
                    rows={3}
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus font-mono text-sm"
                    placeholder='{"required": true, "maxLength": 50}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">JS Validation (optional)</label>
                  <textarea
                    name="js_validation"
                    defaultValue={editingComponent?.js_validation || ''}
                    rows={3}
                    className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus font-mono text-sm"
                    placeholder="function validate(value) { return value.length > 0; }"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingComponent(null);
                    }}
                    className="px-4 py-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg hover:bg-bolt-elements-button-primary-backgroundHover transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (editingComponent ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {/* Delete Confirmation Dialog */}
      <RadixDialog.Root open={!!showDeleteDialog} onOpenChange={(open) => {
        if (!open) setShowDeleteDialog(null);
      }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed top-[50%] left-[50%] z-50 w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-2 shadow-lg focus:outline-none">
            <div className="p-6">
              <RadixDialog.Title className="text-lg font-semibold mb-4">
                Delete Component
              </RadixDialog.Title>
              <p className="mb-6">
                Are you sure you want to delete this component? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteDialog(null)}
                  className="px-4 py-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showDeleteDialog) {
                      handleDelete(showDeleteDialog);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </div>
  );
}