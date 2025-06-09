/**
 * Multi-Agent Workflow Builder Route
 * Provides the complete multi-agent workflow building experience
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, useActionData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { MultiAgentWorkflowBuilder } from '~/components/workflows/builder/MultiAgentWorkflowBuilder';
import { useAuth } from '~/components/auth/AuthProvider';
import { supabase } from '~/lib/supabase';

export async function loader() {
  // Return minimal data, authentication will be handled client-side
  return json({});
}

export default function MultiAgentWorkflowBuilderPage() {
  const { user, profile, loading } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  // Load initial workflow if ID provided in URL
  useEffect(() => {
    const loadWorkflow = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const workflowId = urlParams.get('id');
      
      if (workflowId && user && profile) {
        setLoadingWorkflow(true);
        try {
          const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .eq('organization_id', profile.organization_id)
            .single();

          if (!error && data) {
            setWorkflow(data);
          }
        } catch (err) {
          console.error('Error loading workflow:', err);
        } finally {
          setLoadingWorkflow(false);
        }
      }
    };

    loadWorkflow();
  }, [user, profile]);

  const handleSave = async (workflowData: any) => {
    if (!user || !profile) return;

    setIsSaving(true);
    
    try {
      let result;
      
      if (workflowData.id) {
        // Update existing workflow
        const { data, error } = await supabase
          .from('workflows')
          .update({
            name: workflowData.name,
            description: workflowData.description,
            config: workflowData,
            updated_at: new Date().toISOString()
          })
          .eq('id', workflowData.id)
          .eq('organization_id', profile.organization_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            name: workflowData.name,
            description: workflowData.description,
            config: workflowData,
            organization_id: profile.organization_id,
            created_by: user.id,
            status: 'draft'
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setWorkflow(result);
    } catch (error) {
      console.error('Save failed:', error);
    }
    
    setIsSaving(false);
  };

  const handlePublish = async (workflowData: any) => {
    if (!user || !profile) return;

    setIsPublishing(true);
    
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          config: workflowData
        })
        .eq('id', workflowData.id)
        .eq('organization_id', profile.organization_id)
        .select()
        .single();

      if (error) throw error;
      setWorkflow(data);
    } catch (error) {
      console.error('Publish failed:', error);
    }
    
    setIsPublishing(false);
  };

  if (loading || loadingWorkflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be logged in to access the workflow builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <MultiAgentWorkflowBuilder
        initialWorkflow={workflow}
        onSave={handleSave}
        onPublish={handlePublish}
        organizationId={profile.organization_id}
        userId={user.id}
        userRole={profile.role}
        permissions={profile.permissions || []}
      />
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            We encountered an error while loading the workflow builder. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}