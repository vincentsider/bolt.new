// Script to populate component library for your organization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyjhpaaumnvwwlwrotgg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5amhwYWF1bW52d3dsd3JvdGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzY3NzYsImV4cCI6MjA2NDg1Mjc3Nn0.dwCixK3vhobT9SkzV-lVjHSla_6yZFcdQPkuXswBais';

const supabase = createClient(supabaseUrl, supabaseKey);
const organizationId = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

async function populateComponents() {
  console.log('🚀 Starting component population for organization:', organizationId);
  
  try {
    // Step 1: Check if library exists
    const { data: existingLib, error: checkError } = await supabase
      .from('component_libraries')
      .select('id, name')
      .eq('organization_id', organizationId)
      .single();
    
    let libraryId;
    
    if (!existingLib) {
      console.log('📚 Creating component library...');
      
      // Get a user ID from the users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
      
      const userId = userData?.id || null;
      
      // Create library
      const { data: newLib, error: createError } = await supabase
        .from('component_libraries')
        .insert({
          organization_id: organizationId,
          name: 'WorkflowHub Standard Library',
          description: 'Standard business workflow components',
          is_default: true,
          created_by: userId
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating library:', createError);
        return;
      }
      
      libraryId = newLib.id;
      console.log('✅ Library created with ID:', libraryId);
    } else {
      libraryId = existingLib.id;
      console.log('✅ Using existing library:', libraryId);
    }
    
    // Step 2: Insert components
    console.log('🔧 Inserting components...');
    
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
          {keyword: 'suggestion', weight: 7},
          {keyword: 'text', weight: 6},
          {keyword: 'input', weight: 5}
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
          {keyword: 'contact', weight: 7},
          {keyword: 'address', weight: 6}
        ],
        typical_examples: ['Email address', 'Contact email', 'User email'],
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
          {keyword: 'person', weight: 7},
          {keyword: 'user', weight: 6}
        ],
        typical_examples: ['Full name', 'First name', 'Last name'],
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
        name: 'Rating Stars',
        description: 'Star rating input component',
        component_group: 'basic_inputs',
        component_type: 'rating',
        active: true,
        ai_keywords: [
          {keyword: 'rating', weight: 10},
          {keyword: 'stars', weight: 9},
          {keyword: 'score', weight: 7},
          {keyword: 'feedback', weight: 6}
        ],
        typical_examples: ['Customer rating', 'Satisfaction score', 'Product rating'],
        compatible_steps: ['capture'],
        html_template: `<div class="form-group">
          <label class="form-label">{{label}}</label>
          <div class="star-rating" data-name="{{name}}">
            <span class="star" data-value="1">⭐</span>
            <span class="star" data-value="2">⭐</span>
            <span class="star" data-value="3">⭐</span>
            <span class="star" data-value="4">⭐</span>
            <span class="star" data-value="5">⭐</span>
          </div>
          <input type="hidden" name="{{name}}" id="{{name}}" {{required}} />
        </div>`,
        css_classes: ['form-group', 'form-label', 'star-rating']
      },
      {
        library_id: libraryId,
        organization_id: organizationId,
        name: 'Submit Button',
        description: 'Form submission button',
        component_group: 'basic_inputs',
        component_type: 'submit_button',
        active: true,
        ai_keywords: [
          {keyword: 'submit', weight: 10},
          {keyword: 'button', weight: 8},
          {keyword: 'send', weight: 7},
          {keyword: 'form', weight: 6}
        ],
        typical_examples: ['Submit form', 'Send feedback', 'Complete'],
        compatible_steps: ['capture'],
        html_template: `<div class="form-group">
          <button type="submit" class="btn btn-primary">
            {{label}}
          </button>
        </div>`,
        css_classes: ['form-group', 'btn', 'btn-primary']
      }
    ];
    
    // Insert components one by one to handle errors better
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
    
    // Verify components were created
    const { data: verifyData, error: verifyError } = await supabase
      .from('component_definitions')
      .select('id, name, component_type')
      .eq('organization_id', organizationId);
    
    if (verifyError) {
      console.error('❌ Error verifying components:', verifyError);
    } else {
      console.log(`\n✅ Success! Created ${verifyData.length} components:`);
      verifyData.forEach(comp => {
        console.log(`   - ${comp.name} (${comp.component_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

populateComponents();