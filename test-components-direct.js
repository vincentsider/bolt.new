// Direct test of component library
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '6d508492-0e67-4d5a-aa81-ddbe83eee4db';

async function testComponents() {
  console.log('🧪 Testing Component Library\n');
  console.log('Organization ID:', organizationId);
  console.log('Supabase URL:', supabaseUrl);
  console.log('\n');

  // Test 1: Check libraries
  console.log('📚 Checking component_libraries table...');
  const { data: libraries, error: libError } = await supabase
    .from('component_libraries')
    .select('*')
    .eq('organization_id', organizationId);

  if (libError) {
    console.error('❌ Error:', libError);
  } else {
    console.log(`✅ Found ${libraries?.length || 0} libraries`);
    libraries?.forEach(lib => {
      console.log(`\n   Library: ${lib.name}`);
      console.log(`   ID: ${lib.id}`);
      console.log(`   Default: ${lib.is_default}`);
      console.log(`   Active: ${lib.active}`);
    });
  }

  // Test 2: Check components
  console.log('\n\n📦 Checking component_definitions table...');
  const { data: components, error: compError } = await supabase
    .from('component_definitions')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(5);

  if (compError) {
    console.error('❌ Error:', compError);
  } else {
    console.log(`✅ Found ${components?.length || 0} components (showing first 5)`);
    components?.forEach(comp => {
      console.log(`\n   Component: ${comp.name}`);
      console.log(`   Type: ${comp.component_type}`);
      console.log(`   Group: ${comp.component_group}`);
      console.log(`   Active: ${comp.active}`);
      console.log(`   Compatible Steps: ${comp.compatible_steps?.join(', ')}`);
    });
  }

  // Test 3: Count by group
  console.log('\n\n📊 Component counts by group...');
  const { data: allComponents, error: allError } = await supabase
    .from('component_definitions')
    .select('component_group')
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (!allError && allComponents) {
    const counts = allComponents.reduce((acc, comp) => {
      acc[comp.component_group] = (acc[comp.component_group] || 0) + 1;
      return acc;
    }, {});

    Object.entries(counts).forEach(([group, count]) => {
      console.log(`   ${group}: ${count} components`);
    });
    console.log(`   TOTAL: ${allComponents.length} active components`);
  }

  // Test 4: Check if components have required fields
  console.log('\n\n🔍 Checking component field completeness...');
  const { data: sampleComp, error: sampleError } = await supabase
    .from('component_definitions')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(1)
    .single();

  if (!sampleError && sampleComp) {
    console.log('\nSample component structure:');
    console.log(`   name: ${sampleComp.name ? '✅' : '❌'}`);
    console.log(`   description: ${sampleComp.description ? '✅' : '❌'}`);
    console.log(`   component_type: ${sampleComp.component_type ? '✅' : '❌'}`);
    console.log(`   component_group: ${sampleComp.component_group ? '✅' : '❌'}`);
    console.log(`   ai_keywords: ${sampleComp.ai_keywords ? '✅' : '❌'} (${Array.isArray(sampleComp.ai_keywords) ? sampleComp.ai_keywords.length + ' keywords' : 'not array'})`);
    console.log(`   compatible_steps: ${sampleComp.compatible_steps ? '✅' : '❌'} (${Array.isArray(sampleComp.compatible_steps) ? sampleComp.compatible_steps.join(', ') : 'not array'})`);
    console.log(`   html_template: ${sampleComp.html_template ? '✅' : '❌'}`);
    console.log(`   active: ${sampleComp.active ? '✅' : '❌'}`);
  }
}

testComponents().catch(console.error);