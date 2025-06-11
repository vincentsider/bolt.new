// Script to populate components for existing library
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyjhpaaumnvwwlwrotgg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amhwYWF1bW52d3dsd3JvdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzY3NzYsImV4cCI6MjA2NDg1Mjc3Nn0.dwCixK3vhobT9SkzV-lVjHSla_6yZFcdQPkuXswBais';

const supabase = createClient(supabaseUrl, supabaseKey);
const organizationId = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';
const libraryId = '38ab8255-3be2-4bce-bad4-2bd6b6c066b5';

async function populateComponents() {
  console.log('🚀 Populating components for library:', libraryId);
  
  const components = [
    {
      library_id: libraryId,
      organization_id: organizationId,
      name: 'Feedback Text Area',
      description: 'Multi-line text input for feedback',
      component_group: 'basic_inputs',
      component_type: 'textarea',
      active: true,
      ai_keywords: [
        {keyword: 'feedback', weight: 10},
        {keyword: 'comment', weight: 8},
        {keyword: 'text', weight: 7},
        {keyword: 'form', weight: 6}
      ],
      typical_examples: ['Customer feedback', 'User comments', 'Suggestions'],
      compatible_steps: ['capture'],
      html_template: `<div class="form-group">
        <label for="{{name}}" class="form-label">{{label}}</label>
        <textarea 
          id="{{name}}" 
          name="{{name}}"
          class="form-control"
          rows="5"
          placeholder="Enter your feedback here..."
          {{required}}
        ></textarea>
      </div>`,
      css_classes: ['form-group', 'form-label', 'form-control']
    },
    {
      library_id: libraryId,
      organization_id: organizationId,
      name: 'Email Input',
      description: 'Email address input with validation',
      component_group: 'basic_inputs',
      component_type: 'email',
      active: true,
      ai_keywords: [
        {keyword: 'email', weight: 10},
        {keyword: 'contact', weight: 7}
      ],
      typical_examples: ['Email address', 'Contact email'],
      compatible_steps: ['capture'],
      html_template: `<div class="form-group">
        <label for="{{name}}" class="form-label">{{label}}</label>
        <input 
          type="email" 
          id="{{name}}" 
          name="{{name}}"
          class="form-control"
          placeholder="user@example.com"
          {{required}}
        />
      </div>`,
      css_classes: ['form-group', 'form-label', 'form-control']
    },
    {
      library_id: libraryId,
      organization_id: organizationId,
      name: 'Name Input',
      description: 'Text input for names',
      component_group: 'basic_inputs',
      component_type: 'text',
      active: true,
      ai_keywords: [
        {keyword: 'name', weight: 10},
        {keyword: 'user', weight: 7}
      ],
      typical_examples: ['Full name', 'User name'],
      compatible_steps: ['capture'],
      html_template: `<div class="form-group">
        <label for="{{name}}" class="form-label">{{label}}</label>
        <input 
          type="text" 
          id="{{name}}" 
          name="{{name}}"
          class="form-control"
          placeholder="Enter name"
          {{required}}
        />
      </div>`,
      css_classes: ['form-group', 'form-label', 'form-control']
    },
    {
      library_id: libraryId,
      organization_id: organizationId,
      name: 'Submit Button',
      description: 'Form submission button',
      component_group: 'basic_inputs',
      component_type: 'submit',
      active: true,
      ai_keywords: [
        {keyword: 'submit', weight: 10},
        {keyword: 'button', weight: 8}
      ],
      typical_examples: ['Submit form', 'Send'],
      compatible_steps: ['capture'],
      html_template: `<button type="submit" class="btn btn-primary">{{label}}</button>`,
      css_classes: ['btn', 'btn-primary']
    }
  ];
  
  // Insert components
  for (const component of components) {
    const { error } = await supabase
      .from('component_definitions')
      .insert(component);
    
    if (error) {
      console.error(`❌ Error inserting ${component.name}:`, error);
    } else {
      console.log(`✅ Inserted: ${component.name}`);
    }
  }
  
  // Verify
  const { data: verify } = await supabase
    .from('component_definitions')
    .select('id, name')
    .eq('library_id', libraryId);
  
  console.log(`\n✅ Total components in library: ${verify?.length || 0}`);
}

populateComponents();