// Test script to verify component mapper functionality
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { ComponentMapper } from './app/lib/.server/component-mapper.js';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Your organization ID
const organizationId = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

async function testComponentMapper() {
  console.log('🧪 Testing Component Mapper\n');

  // First, check if we have components in the database
  console.log('📊 Checking component library...');
  const { data: libraries, error: libError } = await supabase
    .from('component_libraries')
    .select('id, name, is_default, active')
    .eq('organization_id', organizationId);

  if (libError) {
    console.error('❌ Error fetching libraries:', libError);
    return;
  }

  console.log(`✅ Found ${libraries?.length || 0} libraries`);
  libraries?.forEach(lib => {
    console.log(`   - ${lib.name} (default: ${lib.is_default}, active: ${lib.active})`);
  });

  // Check components
  const { data: components, error: compError } = await supabase
    .from('component_definitions')
    .select('id, name, component_group, component_type, compatible_steps, active')
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (compError) {
    console.error('❌ Error fetching components:', compError);
    return;
  }

  console.log(`\n✅ Found ${components?.length || 0} active components`);
  
  // Group by component_group
  const grouped = components?.reduce((acc, comp) => {
    const group = comp.component_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(comp);
    return acc;
  }, {});

  Object.entries(grouped || {}).forEach(([group, comps]) => {
    console.log(`\n   ${group}: ${comps.length} components`);
    comps.slice(0, 3).forEach(comp => {
      console.log(`      - ${comp.name} (${comp.compatible_steps.join(', ')})`);
    });
  });

  // Test the ComponentMapper
  console.log('\n\n🔍 Testing ComponentMapper with expense workflow...\n');
  
  // Create a mock context with Supabase
  const mockContext = {
    cloudflare: {
      env: {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
      }
    }
  };

  const mapper = new ComponentMapper(organizationId, mockContext);
  
  const testDescription = 'I need to create an expense reimbursement form where employees can submit their business expenses. They should enter their name, email, expense amount, date, category, and upload receipts. Then managers need to review and approve or reject the expenses.';

  console.log('📝 Test Description:', testDescription);
  console.log('\n');

  // Test mapping for each step
  const steps = ['capture', 'review', 'approval', 'update'];
  
  for (const step of steps) {
    console.log(`\n📌 Mapping components for step: ${step}`);
    const result = await mapper.mapComponents(testDescription, step);
    
    console.log(`   Total compatible components: ${result.totalComponents}`);
    console.log(`   Matched components: ${result.matches.length}`);
    
    result.matches.slice(0, 5).forEach((match, index) => {
      console.log(`\n   ${index + 1}. ${match.name}`);
      console.log(`      Type: ${match.component_type}`);
      console.log(`      Confidence: ${match.confidence}/10`);
      console.log(`      Matches: ${match.matches.join(', ')}`);
    });
  }

  // Test suggestComponentsForWorkflow
  console.log('\n\n🎯 Testing suggestComponentsForWorkflow...\n');
  const suggestions = await mapper.suggestComponentsForWorkflow(testDescription);
  
  console.log('📊 Suggestions by step:');
  Object.entries(suggestions).forEach(([step, components]) => {
    console.log(`\n   ${step}: ${components.length} components suggested`);
    components.slice(0, 3).forEach(comp => {
      console.log(`      - ${comp.name} (confidence: ${comp.confidence})`);
    });
  });
}

// Run the test
testComponentMapper().catch(console.error);