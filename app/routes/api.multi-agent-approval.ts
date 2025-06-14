/**
 * Multi-Agent Approval API Route
 * Handles approval/denial of agent execution steps
 */

import pkg from '@remix-run/node';
const { json } = pkg;
import type { ActionFunctionArgs } from '@remix-run/node';

// Simple in-memory store for pending approvals (in production, use Redis or database)
const pendingApprovals = new Map<string, {
  step: any;
  sessionId: string;
  timestamp: number;
  resolved?: boolean;
  approved?: boolean;
}>();

export async function action({ context, request }: ActionFunctionArgs) {
  try {
    const { action: actionType, sessionId, stepId, approved, step } = await request.json();

    switch (actionType) {
      case 'submit_approval':
        // Store the approval step for user review
        pendingApprovals.set(stepId, {
          step,
          sessionId,
          timestamp: Date.now(),
          resolved: false
        });
        
        return json({ 
          success: true, 
          stepId,
          message: 'Approval step submitted for review'
        });

      case 'respond_approval':
        // User responds to approval request
        const approval = pendingApprovals.get(stepId);
        if (!approval) {
          return json({ error: 'Approval not found' }, { status: 404 });
        }
        
        approval.resolved = true;
        approval.approved = approved;
        
        return json({
          success: true,
          approved,
          message: approved ? 'Step approved' : 'Step denied'
        });

      case 'check_approval':
        // Check if approval has been resolved
        const checkApproval = pendingApprovals.get(stepId);
        if (!checkApproval) {
          return json({ error: 'Approval not found' }, { status: 404 });
        }
        
        if (checkApproval.resolved) {
          // Clean up after returning result
          setTimeout(() => pendingApprovals.delete(stepId), 1000);
          
          return json({
            resolved: true,
            approved: checkApproval.approved,
            step: checkApproval.step
          });
        }
        
        return json({
          resolved: false,
          step: checkApproval.step
        });

      case 'get_pending':
        // Get pending approvals for a session
        const pending = Array.from(pendingApprovals.entries())
          .filter(([_, approval]) => 
            approval.sessionId === sessionId && 
            !approval.resolved &&
            Date.now() - approval.timestamp < 300000 // 5 minute timeout
          )
          .map(([stepId, approval]) => ({
            stepId,
            step: approval.step,
            timestamp: approval.timestamp
          }));
        
        return json({ pending });

      default:
        return json({ error: 'Unknown action type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Multi-agent approval error:', error);
    return json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// Cleanup old approvals periodically
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 300000; // 5 minutes
  
  for (const [stepId, approval] of pendingApprovals.entries()) {
    if (approval.timestamp < fiveMinutesAgo) {
      pendingApprovals.delete(stepId);
    }
  }
}, 60000); // Clean up every minute