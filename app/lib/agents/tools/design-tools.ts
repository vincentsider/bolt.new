/**
 * Design Agent Tools
 */

import type { Tool, ToolResult, AgentContext, DesignValidation } from '../types';
import { z } from 'zod';

// Mock design system configuration
const BRAND_GUIDELINES = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40'
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    headingSizes: ['2.5rem', '2rem', '1.75rem', '1.5rem', '1.25rem', '1rem'],
    bodySize: '1rem',
    lineHeight: 1.5
  },
  spacing: {
    unit: '0.25rem',
    scales: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]
  },
  components: {
    button: {
      borderRadius: '0.375rem',
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      variants: ['primary', 'secondary', 'outline', 'ghost']
    },
    card: {
      borderRadius: '0.5rem',
      padding: '1.5rem',
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    form: {
      inputBorderRadius: '0.375rem',
      inputPadding: '0.5rem 0.75rem',
      labelMarginBottom: '0.5rem'
    }
  }
};

const UI_PATTERNS = {
  forms: {
    standard: 'Label above input with consistent spacing',
    validation: 'Inline error messages with red color',
    layout: 'Single column for mobile, multi-column for desktop'
  },
  navigation: {
    primary: 'Top navigation bar with logo and main sections',
    secondary: 'Sidebar navigation for sub-sections',
    breadcrumbs: 'Show hierarchy for deep navigation'
  },
  data: {
    tables: 'Striped rows with hover effects',
    cards: 'Consistent padding and shadow',
    lists: 'Clear item separation and hierarchy'
  }
};

export const validateBrandComplianceTool: Tool = {
  name: 'validate_brand_compliance',
  description: 'Check UI components against brand guidelines for color, typography, and spacing',
  parameters: [
    {
      name: 'uiComponents',
      type: 'array',
      description: 'Array of UI components to validate',
      required: true,
      schema: z.array(z.object({
        type: z.string(),
        styles: z.record(z.string()),
        id: z.string().optional()
      }))
    }
  ],
  execute: async (input: { uiComponents: Array<{ type: string; styles: Record<string, string>; id?: string }> }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const violations = [];
      let totalChecks = 0;
      let passedChecks = 0;

      for (const component of input.uiComponents) {
        // Check colors
        const colorViolations = checkColorCompliance(component);
        violations.push(...colorViolations);
        totalChecks += 3; // primary, secondary, accent colors
        passedChecks += 3 - colorViolations.length;

        // Check typography
        const typographyViolations = checkTypographyCompliance(component);
        violations.push(...typographyViolations);
        totalChecks += 2; // font family, font size
        passedChecks += 2 - typographyViolations.length;

        // Check spacing
        const spacingViolations = checkSpacingCompliance(component);
        violations.push(...spacingViolations);
        totalChecks += 2; // margin, padding
        passedChecks += 2 - spacingViolations.length;
      }

      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

      const result: DesignValidation['brandCompliance'] = {
        score,
        violations
      };

      return {
        success: violations.length === 0,
        data: result,
        warnings: violations.length > 0 ? [`Found ${violations.length} brand compliance violations`] : undefined,
        suggestions: violations.length > 0 ? [
          'Update component styles to match brand guidelines',
          'Use design system variables instead of hardcoded values',
          'Consult brand guidelines documentation'
        ] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to validate brand compliance: ${errorMessage}`
      };
    }
  }
};

export const checkUIConsistencyTool: Tool = {
  name: 'check_ui_consistency',
  description: 'Validate UI components follow established design patterns and consistency rules',
  parameters: [
    {
      name: 'workflowUI',
      type: 'object',
      description: 'The workflow UI structure to validate',
      required: true,
      schema: z.object({
        components: z.array(z.object({
          type: z.string(),
          props: z.record(z.any()),
          children: z.array(z.any()).optional()
        })),
        layout: z.string()
      })
    }
  ],
  execute: async (input: { workflowUI: { components: any[]; layout: string } }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const componentChecks = [];
      const patternChecks = [];

      // Check component consistency
      for (const component of input.workflowUI.components) {
        const componentCheck = validateComponentStandards(component);
        componentChecks.push(componentCheck);
      }

      // Check pattern usage
      const layoutPattern = validateLayoutPattern(input.workflowUI);
      patternChecks.push(layoutPattern);

      const result: DesignValidation['uiConsistency'] = {
        components: componentChecks,
        patterns: patternChecks
      };

      const failedChecks = [...componentChecks, ...patternChecks].filter(check => 
        'compliant' in check ? !check.compliant : !check.correct
      );

      return {
        success: failedChecks.length === 0,
        data: result,
        warnings: failedChecks.length > 0 ? [`${failedChecks.length} UI consistency issues found`] : undefined,
        suggestions: failedChecks.flatMap(check => 
          ('suggestions' in check && check.suggestions) ? check.suggestions : 
          ('recommendation' in check && check.recommendation) ? [check.recommendation] : []
        )
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to check UI consistency: ${errorMessage}`
      };
    }
  }
};

export const validateAccessibilityTool: Tool = {
  name: 'validate_accessibility',
  description: 'Check UI components for accessibility compliance (WCAG guidelines)',
  parameters: [
    {
      name: 'uiComponents',
      type: 'array',
      description: 'Array of UI components to check for accessibility',
      required: true,
      schema: z.array(z.object({
        type: z.string(),
        props: z.record(z.any()),
        content: z.string().optional()
      }))
    }
  ],
  execute: async (input: { uiComponents: Array<{ type: string; props: Record<string, any>; content?: string }> }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const issues = [];
      let totalChecks = 0;
      let passedChecks = 0;

      for (const component of input.uiComponents) {
        // Check color contrast
        const contrastIssues = checkColorContrast(component);
        issues.push(...contrastIssues);
        totalChecks += 1;
        passedChecks += contrastIssues.length === 0 ? 1 : 0;

        // Check keyboard navigation
        const keyboardIssues = checkKeyboardNavigation(component);
        issues.push(...keyboardIssues);
        totalChecks += 1;
        passedChecks += keyboardIssues.length === 0 ? 1 : 0;

        // Check screen reader support
        const screenReaderIssues = checkScreenReaderSupport(component);
        issues.push(...screenReaderIssues);
        totalChecks += 1;
        passedChecks += screenReaderIssues.length === 0 ? 1 : 0;

        // Check focus management
        const focusIssues = checkFocusManagement(component);
        issues.push(...focusIssues);
        totalChecks += 1;
        passedChecks += focusIssues.length === 0 ? 1 : 0;
      }

      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

      const result: DesignValidation['accessibility'] = {
        score,
        issues
      };

      return {
        success: issues.length === 0,
        data: result,
        warnings: issues.length > 0 ? [`Found ${issues.length} accessibility issues`] : undefined,
        suggestions: issues.length > 0 ? [
          'Add proper ARIA labels and roles',
          'Ensure sufficient color contrast ratios',
          'Implement proper keyboard navigation',
          'Test with screen readers'
        ] : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to validate accessibility: ${errorMessage}`
      };
    }
  }
};

export const generateDesignRecommendationsTool: Tool = {
  name: 'generate_design_recommendations',
  description: 'Generate design improvement recommendations based on UI analysis',
  parameters: [
    {
      name: 'workflowType',
      type: 'string',
      description: 'Type of workflow (form, dashboard, report, etc.)',
      required: true,
      schema: z.string()
    },
    {
      name: 'currentIssues',
      type: 'array',
      description: 'Current design issues found',
      required: false,
      schema: z.array(z.string()).optional()
    }
  ],
  execute: async (input: { workflowType: string; currentIssues?: string[] }, context?: AgentContext): Promise<ToolResult> => {
    try {
      const recommendations = generateRecommendationsForWorkflowType(input.workflowType, input.currentIssues || []);

      return {
        success: true,
        data: { recommendations },
        suggestions: recommendations.map(rec => rec.description)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to generate design recommendations: ${errorMessage}`
      };
    }
  }
};

// Helper Functions

function checkColorCompliance(component: { type: string; styles: Record<string, string> }) {
  const violations = [];
  const { styles } = component;

  // Check if colors match brand guidelines
  if (styles.backgroundColor && !isValidBrandColor(styles.backgroundColor)) {
    violations.push({
      type: 'color' as const,
      component: component.type,
      expected: 'Brand guideline colors',
      actual: styles.backgroundColor,
      severity: 'major' as const
    });
  }

  if (styles.color && !isValidBrandColor(styles.color)) {
    violations.push({
      type: 'color' as const,
      component: component.type,
      expected: 'Brand guideline colors',
      actual: styles.color,
      severity: 'major' as const
    });
  }

  return violations;
}

function checkTypographyCompliance(component: { type: string; styles: Record<string, string> }) {
  const violations = [];
  const { styles } = component;

  if (styles.fontFamily && styles.fontFamily !== BRAND_GUIDELINES.typography.fontFamily) {
    violations.push({
      type: 'typography' as const,
      component: component.type,
      expected: BRAND_GUIDELINES.typography.fontFamily,
      actual: styles.fontFamily,
      severity: 'minor' as const
    });
  }

  return violations;
}

function checkSpacingCompliance(component: { type: string; styles: Record<string, string> }) {
  const violations = [];
  const { styles } = component;

  // Check if spacing follows 4px grid system
  if (styles.margin && !isValidSpacing(styles.margin)) {
    violations.push({
      type: 'spacing' as const,
      component: component.type,
      expected: '4px grid system',
      actual: styles.margin,
      severity: 'minor' as const
    });
  }

  if (styles.padding && !isValidSpacing(styles.padding)) {
    violations.push({
      type: 'spacing' as const,
      component: component.type,
      expected: '4px grid system',
      actual: styles.padding,
      severity: 'minor' as const
    });
  }

  return violations;
}

function validateComponentStandards(component: any) {
  const componentType = component.type as keyof typeof BRAND_GUIDELINES.components;
  const guidelines = BRAND_GUIDELINES.components[componentType];
  if (!guidelines) {
    return {
      component: component.type,
      standard: 'No specific guidelines',
      compliant: true
    };
  }

  const compliant = checkComponentCompliance(component, guidelines);
  return {
    component: component.type,
    standard: 'Brand guidelines',
    compliant,
    suggestions: compliant ? undefined : [`Follow ${component.type} component guidelines`]
  };
}

function validateLayoutPattern(workflowUI: { components: any[]; layout: string }) {
  const pattern = UI_PATTERNS.forms.standard; // Default pattern
  const correct = workflowUI.layout === 'standard' || workflowUI.components.length > 0;

  return {
    pattern: 'Standard layout',
    usage: workflowUI.layout,
    correct,
    recommendation: correct ? undefined : 'Use standard layout patterns for better UX'
  };
}

function checkColorContrast(component: { type: string; props: Record<string, any> }) {
  const issues = [];
  
  // Simplified contrast check
  if (component.props.className?.includes('text-gray-300') && component.props.className?.includes('bg-gray-200')) {
    issues.push({
      type: 'color-contrast' as const,
      severity: 'serious' as const,
      element: component.type,
      description: 'Insufficient color contrast between text and background',
      fix: 'Use darker text or lighter background to improve contrast ratio'
    });
  }

  return issues;
}

function checkKeyboardNavigation(component: { type: string; props: Record<string, any> }) {
  const issues = [];
  
  if ((component.type === 'button' || component.type === 'input') && !component.props.tabIndex) {
    issues.push({
      type: 'keyboard-navigation' as const,
      severity: 'moderate' as const,
      element: component.type,
      description: 'Component may not be keyboard accessible',
      fix: 'Ensure proper tab order and keyboard event handlers'
    });
  }

  return issues;
}

function checkScreenReaderSupport(component: { type: string; props: Record<string, any> }) {
  const issues = [];
  
  if ((component.type === 'button' || component.type === 'input') && !component.props['aria-label'] && !component.props.children) {
    issues.push({
      type: 'screen-reader' as const,
      severity: 'serious' as const,
      element: component.type,
      description: 'Missing accessible name for screen readers',
      fix: 'Add aria-label or descriptive text content'
    });
  }

  return issues;
}

function checkFocusManagement(component: { type: string; props: Record<string, any> }) {
  const issues = [];
  
  if (component.type === 'modal' && !component.props.autoFocus) {
    issues.push({
      type: 'focus-management' as const,
      severity: 'moderate' as const,
      element: component.type,
      description: 'Modal should manage focus properly',
      fix: 'Implement focus trapping and restoration'
    });
  }

  return issues;
}

function generateRecommendationsForWorkflowType(workflowType: string, currentIssues: string[]) {
  const baseRecommendations = [
    {
      category: 'Layout',
      description: 'Use consistent spacing and alignment throughout the workflow',
      priority: 'medium'
    },
    {
      category: 'Colors',
      description: 'Apply brand colors consistently for actions and states',
      priority: 'high'
    }
  ];

  const typeSpecificRecommendations: Record<string, Array<{
    category: string;
    description: string;
    priority: string;
  }>> = {
    'form': [
      {
        category: 'Form Design',
        description: 'Group related fields with clear labels and validation',
        priority: 'high'
      },
      {
        category: 'Progress',
        description: 'Show form progress and completion status',
        priority: 'medium'
      }
    ],
    'dashboard': [
      {
        category: 'Data Visualization',
        description: 'Use appropriate charts and clear data hierarchy',
        priority: 'high'
      },
      {
        category: 'Navigation',
        description: 'Implement clear navigation and filtering options',
        priority: 'medium'
      }
    ]
  };

  return [
    ...baseRecommendations,
    ...(typeSpecificRecommendations[workflowType] || [])
  ];
}

function isValidBrandColor(color: string): boolean {
  const brandColors = Object.values(BRAND_GUIDELINES.colors);
  return brandColors.includes(color) || color.startsWith('var(--') || color === 'transparent';
}

function isValidSpacing(spacing: string): boolean {
  // Check if spacing follows 4px grid (0.25rem increments)
  const remValue = parseFloat(spacing);
  return !isNaN(remValue) && (remValue * 16) % 4 === 0;
}

function checkComponentCompliance(component: any, guidelines: any): boolean {
  // Simplified compliance check
  return true; // In real implementation, check component props against guidelines
}

// Export all design tools
export const designTools: Tool[] = [
  validateBrandComplianceTool,
  checkUIConsistencyTool,
  validateAccessibilityTool,
  generateDesignRecommendationsTool
];