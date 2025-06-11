// Test script to verify component architecture
// This creates sample component instances to test the integration

const testComponentInstances = [
  {
    id: 'comp-1',
    workflowId: 'test-workflow-1',
    componentId: 'short-text-box',
    stepType: 'capture',
    label: 'Customer Name',
    required: true,
    config: {
      type: 'text',
      placeholder: 'Enter customer name'
    },
    validation: {
      minLength: 2,
      maxLength: 50
    },
    position: { step: 1, order: 1 },
    dataMapping: {
      source: 'customer_name',
      destination: 'crm.contact.name'
    }
  },
  {
    id: 'comp-2',
    workflowId: 'test-workflow-1',
    componentId: 'file-upload',
    stepType: 'capture',
    label: 'Receipt Upload',
    required: true,
    config: {
      accept: 'image/*,.pdf',
      maxSize: '10MB'
    },
    validation: {
      fileTypes: ['jpg', 'png', 'pdf']
    },
    position: { step: 1, order: 2 },
    dataMapping: {
      source: 'receipt_file',
      destination: 'storage.receipts'
    }
  },
  {
    id: 'comp-3',
    workflowId: 'test-workflow-1',
    componentId: 'approve-reject-buttons',
    stepType: 'approval',
    label: 'Manager Approval',
    required: true,
    config: {
      approver: 'manager',
      commentsRequired: false
    },
    validation: {},
    position: { step: 3, order: 1 },
    dataMapping: {
      source: 'approval_decision',
      destination: 'workflow.status'
    }
  }
];

console.log('✅ Test Component Instances Created:');
console.log('📋 Total components:', testComponentInstances.length);
console.log('📝 Capture components:', testComponentInstances.filter(c => c.stepType === 'capture').length);
console.log('✅ Approval components:', testComponentInstances.filter(c => c.stepType === 'approval').length);

console.log('\n🔧 Component Details:');
testComponentInstances.forEach(comp => {
  console.log(`- ${comp.label} (${comp.componentId}) - Step: ${comp.stepType}`);
});

console.log('\n🎯 Expected Behavior:');
console.log('1. Live Preview should show component-based tabs');
console.log('2. 4-Step Builder should display these components');
console.log('3. Both views should be synchronized');
console.log('4. Chat should be able to modify these components');

module.exports = testComponentInstances;