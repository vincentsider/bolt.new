import React, { useState, useEffect } from 'react'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/components/auth/AuthProvider'
import type { Workflow } from '~/types/database'

interface WorkflowEditorProps {
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void
  onCancel?: () => void
}

export function WorkflowEditor({ workflow, onSave, onCancel }: WorkflowEditorProps) {
  const { user, profile } = useAuth()
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    prompt: workflow?.prompt || '',
    status: workflow?.status || 'draft' as const
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!workflow

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profile) return

    setSaving(true)
    setError(null)

    try {
      const workflowData = {
        name: formData.name,
        description: formData.description || null,
        prompt: formData.prompt || null,
        status: formData.status,
        organization_id: profile.organization_id,
        config: {
          triggers: [],
          steps: [],
          settings: {
            notificationChannels: [],
            errorHandling: 'stop' as const,
            maxRetries: 3,
            timeoutMinutes: 60
          }
        },
        permissions: {
          executors: [user.id],
          editors: [user.id],
          viewers: [user.id]
        },
        ...(isEditing ? {
          updated_by: user.id,
          version: workflow.version + 1
        } : {
          version: 1,
          created_by: user.id,
          updated_by: user.id
        })
      }

      let result

      if (isEditing) {
        result = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflow.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('workflows')
          .insert(workflowData)
          .select()
          .single()
      }

      if (result.error) {
        setError('Failed to save workflow: ' + result.error.message)
        return
      }

      onSave?.(result.data)
    } catch (err) {
      setError('Error saving workflow')
      console.error('Error saving workflow:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Workflow' : 'Create New Workflow'}
          </h1>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Workflow Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Invoice Approval Process"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this workflow does..."
            />
          </div>

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
              AI Prompt (Optional)
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={4}
              value={formData.prompt}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe how you want the AI to help with this workflow..."
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}