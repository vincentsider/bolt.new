// Component Selection Testing & Validation System
import { ComponentMapper, type ComponentSuggestion } from './component-mapper';

interface TestCase {
  name: string;
  userInput: string;
  expectedComponents: string[];
  expectedSteps: ('capture' | 'review' | 'approval' | 'update')[];
  minConfidence: number;
}

// Test cases for different business scenarios
const COMPONENT_SELECTION_TEST_CASES: TestCase[] = [
  {
    name: 'Expense Approval Workflow',
    userInput: 'Create an expense approval workflow for employees to submit receipts with amounts and get manager approval',
    expectedComponents: ['Currency Amount Input', 'Receipt Upload Component', 'Manager Approval Buttons'],
    expectedSteps: ['capture', 'approval'],
    minConfidence: 7
  },
  {
    name: 'Employee Onboarding Process',
    userInput: 'Build an employee onboarding workflow with personal details, document upload, and HR review',
    expectedComponents: ['Employee Name Field', 'Business Email Input', 'PDF Document Viewer'],
    expectedSteps: ['capture', 'review'],
    minConfidence: 6
  },
  {
    name: 'Purchase Request Approval',
    userInput: 'Create a purchase request workflow with item details, cost amount, department approval, and notification',
    expectedComponents: ['Currency Amount Input', 'Department Dropdown', 'Email Notification Trigger'],
    expectedSteps: ['capture', 'approval', 'update'],
    minConfidence: 6
  },
  {
    name: 'Document Review Workflow',
    userInput: 'Design a document review process with PDF upload, reviewer assignment, approval, and Slack notification',
    expectedComponents: ['Receipt Upload Component', 'Manager Approval Buttons', 'Slack Integration Hook'],
    expectedSteps: ['capture', 'review', 'approval', 'update'],
    minConfidence: 5
  },
  {
    name: 'Priority Support Ticket',
    userInput: 'Create a support ticket system with employee name, email, priority level, and escalation',
    expectedComponents: ['Employee Name Field', 'Business Email Input', 'Priority Level Selector'],
    expectedSteps: ['capture'],
    minConfidence: 7
  }
];

export class ComponentSelectionTester {
  private componentMapper: ComponentMapper;
  private testResults: TestResult[] = [];

  constructor(organizationId: string) {
    this.componentMapper = new ComponentMapper(organizationId);
  }

  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 COMPONENT SELECTION TESTS');
    console.log('============================');
    
    this.testResults = [];
    
    for (const testCase of COMPONENT_SELECTION_TEST_CASES) {
      const result = await this.runSingleTest(testCase);
      this.testResults.push(result);
      
      console.log(`\n📋 Test: ${testCase.name}`);
      console.log(`🎯 Input: "${testCase.userInput}"`);
      console.log(`${result.passed ? '✅' : '❌'} Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (!result.passed) {
        console.log(`   Expected: ${testCase.expectedComponents.join(', ')}`);
        console.log(`   Found: ${result.foundComponents.map(c => c.name).join(', ')}`);
        console.log(`   Issues: ${result.issues.join(', ')}`);
      } else {
        console.log(`   ✅ Found ${result.foundComponents.length} matching components`);
        result.foundComponents.forEach(comp => {
          console.log(`      - ${comp.name} (confidence: ${comp.confidence})`);
        });
      }
    }

    const summary = this.generateSummary();
    this.logSummary(summary);
    
    return summary;
  }

  private async runSingleTest(testCase: TestCase): Promise<TestResult> {
    try {
      const suggestions = await this.componentMapper.suggestComponentsForWorkflow(testCase.userInput);
      
      // Combine all step suggestions
      const allFoundComponents = [
        ...suggestions.capture,
        ...suggestions.review, 
        ...suggestions.approval,
        ...suggestions.update
      ];

      const issues: string[] = [];
      let passed = true;

      // Check if expected components were found
      for (const expectedComp of testCase.expectedComponents) {
        const found = allFoundComponents.find(comp => 
          comp.name.toLowerCase().includes(expectedComp.toLowerCase()) ||
          expectedComp.toLowerCase().includes(comp.name.toLowerCase())
        );
        
        if (!found) {
          issues.push(`Missing component: ${expectedComp}`);
          passed = false;
        } else if (found.confidence < testCase.minConfidence) {
          issues.push(`Low confidence for ${expectedComp}: ${found.confidence}`);
          passed = false;
        }
      }

      // Check if we have components for expected steps
      for (const expectedStep of testCase.expectedSteps) {
        const stepComponents = suggestions[expectedStep];
        if (!stepComponents || stepComponents.length === 0) {
          issues.push(`No components found for step: ${expectedStep}`);
          passed = false;
        }
      }

      return {
        testCase,
        passed,
        foundComponents: allFoundComponents,
        suggestions,
        issues,
        executionTime: Date.now() // Would be calculated properly in real implementation
      };

    } catch (error) {
      console.error(`❌ Test failed with error: ${error}`);
      return {
        testCase,
        passed: false,
        foundComponents: [],
        suggestions: { capture: [], review: [], approval: [], update: [] },
        issues: [`Test execution error: ${error}`],
        executionTime: Date.now()
      };
    }
  }

  private generateSummary(): TestSummary {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    // Calculate component coverage
    const allExpectedComponents = new Set(
      COMPONENT_SELECTION_TEST_CASES.flatMap(tc => tc.expectedComponents)
    );
    
    const foundComponents = new Set(
      this.testResults.flatMap(r => r.foundComponents.map(c => c.name))
    );
    
    const componentCoverage = (foundComponents.size / allExpectedComponents.size) * 100;
    
    // Calculate average confidence
    const allFoundComponents = this.testResults.flatMap(r => r.foundComponents);
    const avgConfidence = allFoundComponents.length > 0 
      ? allFoundComponents.reduce((sum, comp) => sum + comp.confidence, 0) / allFoundComponents.length
      : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate: (passedTests / totalTests) * 100,
      componentCoverage,
      avgConfidence,
      issues: this.testResults.flatMap(r => r.issues),
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(r => !r.passed);
    
    // Analyze common failure patterns
    const missingComponents = new Set<string>();
    const lowConfidenceComponents = new Set<string>();
    
    failedTests.forEach(test => {
      test.issues.forEach(issue => {
        if (issue.includes('Missing component:')) {
          missingComponents.add(issue.replace('Missing component: ', ''));
        }
        if (issue.includes('Low confidence')) {
          lowConfidenceComponents.add(issue.split(':')[0].replace('Low confidence for ', ''));
        }
      });
    });

    if (missingComponents.size > 0) {
      recommendations.push(`Add missing components to library: ${Array.from(missingComponents).join(', ')}`);
    }
    
    if (lowConfidenceComponents.size > 0) {
      recommendations.push(`Improve AI keywords for: ${Array.from(lowConfidenceComponents).join(', ')}`);
    }
    
    if (failedTests.length > this.testResults.length * 0.3) {
      recommendations.push('Consider expanding component library with more business-specific components');
    }
    
    return recommendations;
  }

  private logSummary(summary: TestSummary): void {
    console.log('\n📊 COMPONENT SELECTION TEST SUMMARY');
    console.log('===================================');
    console.log(`🎯 Tests Run: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passedTests}`);
    console.log(`❌ Failed: ${summary.failedTests}`);
    console.log(`📈 Pass Rate: ${summary.passRate.toFixed(1)}%`);
    console.log(`📦 Component Coverage: ${summary.componentCoverage.toFixed(1)}%`);
    console.log(`🎯 Average Confidence: ${summary.avgConfidence.toFixed(1)}`);
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('===================================\n');
  }

  // Method to test a single workflow description
  async testWorkflowDescription(description: string): Promise<ComponentTestResult> {
    console.log(`🧪 Testing workflow: "${description}"`);
    
    try {
      const suggestions = await this.componentMapper.suggestComponentsForWorkflow(description);
      
      // Log results for each step
      const results: ComponentTestResult = {
        input: description,
        suggestions,
        totalComponents: 0,
        stepBreakdown: {}
      };

      for (const step of ['capture', 'review', 'approval', 'update'] as const) {
        const stepComponents = suggestions[step];
        results.stepBreakdown[step] = stepComponents.length;
        results.totalComponents += stepComponents.length;
        
        console.log(`\n📋 ${step.toUpperCase()} STEP (${stepComponents.length} components):`);
        stepComponents.forEach((comp, i) => {
          console.log(`   ${i + 1}. ✅ ${comp.name} (confidence: ${comp.confidence})`);
          console.log(`      Type: ${comp.component_type} | Group: ${comp.component_group}`);
          console.log(`      Matches: ${comp.matches.join(', ')}`);
        });
      }

      console.log(`\n🎯 Total Components Suggested: ${results.totalComponents}`);
      return results;

    } catch (error) {
      console.error(`❌ Error testing workflow: ${error}`);
      throw error;
    }
  }
}

// Type definitions
interface TestResult {
  testCase: TestCase;
  passed: boolean;
  foundComponents: ComponentSuggestion[];
  suggestions: {
    capture: ComponentSuggestion[];
    review: ComponentSuggestion[];
    approval: ComponentSuggestion[];
    update: ComponentSuggestion[];
  };
  issues: string[];
  executionTime: number;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  componentCoverage: number;
  avgConfidence: number;
  issues: string[];
  recommendations: string[];
}

interface ComponentTestResult {
  input: string;
  suggestions: {
    capture: ComponentSuggestion[];
    review: ComponentSuggestion[];
    approval: ComponentSuggestion[];
    update: ComponentSuggestion[];
  };
  totalComponents: number;
  stepBreakdown: {
    capture?: number;
    review?: number;
    approval?: number;
    update?: number;
  };
}

// Export for use in routes/API endpoints
export { COMPONENT_SELECTION_TEST_CASES, type TestCase, type TestSummary, type ComponentTestResult };