import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Globe, Lock, Loader2, X } from 'lucide-react';
import { templateService, CaseTemplate } from '../services/template.service';
import { useAuth } from '../contexts/AuthContext';

export function TemplateManagement() {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CaseTemplate | null>(null);
  const [caseType, setCaseType] = useState<'DTR' | 'RMA'>('DTR');

  useEffect(() => {
    loadTemplates();
  }, [caseType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplates(caseType);
      if (response.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await templateService.deleteTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const myTemplates = templates.filter(t => t.createdBy === currentUser?.id);
  const publicTemplates = templates.filter(t => t.isPublic && t.createdBy !== currentUser?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Case Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage templates for faster case creation</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as 'DTR' | 'RMA')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="DTR">DTR Templates</option>
            <option value="RMA">RMA Templates</option>
          </select>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* My Templates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Templates</h3>
            {myTemplates.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">No templates created yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first template to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => {
                      setEditingTemplate(template);
                      setShowCreateModal(true);
                    }}
                    onDelete={() => handleDelete(template.id)}
                    onUpdate={loadTemplates}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Public Templates */}
          {publicTemplates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Public Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    readOnly={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          caseType={caseType}
          template={editingTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: CaseTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  readOnly?: boolean;
}

function TemplateCard({ template, onEdit, onDelete, onUpdate, readOnly }: TemplateCardProps) {
  const [updating, setUpdating] = useState(false);

  const handleTogglePublic = async () => {
    try {
      setUpdating(true);
      await templateService.updateTemplate(template.id, {
        isPublic: !template.isPublic,
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">{template.name}</h4>
            {template.isPublic ? (
              <Globe className="w-4 h-4 text-green-600" title="Public" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" title="Private" />
            )}
          </div>
          {template.description && (
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{template.usageCount} uses</span>
        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          >
            <Edit className="w-3 h-3 inline mr-1" />
            Edit
          </button>
          <button
            onClick={handleTogglePublic}
            disabled={updating}
            className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            title={template.isPublic ? 'Make Private' : 'Make Public'}
          >
            {template.isPublic ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Globe className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface TemplateFormModalProps {
  caseType: 'DTR' | 'RMA';
  template?: CaseTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

function TemplateFormModal({ caseType, template, onClose, onSave }: TemplateFormModalProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [isPublic, setIsPublic] = useState(template?.isPublic || false);
  const [templateData, setTemplateData] = useState<any>(template?.templateData || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      setSaving(true);
      if (template) {
        await templateService.updateTemplate(template.id, {
          name,
          description,
          isPublic,
          templateData,
        });
      } else {
        await templateService.createTemplate({
          name,
          description,
          caseType,
          templateData,
          isPublic,
        });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Helper to add field to template data
  const addField = (key: string, value: string) => {
    setTemplateData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Helper to remove field from template data
  const removeField = (key: string) => {
    setTemplateData((prev: any) => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
  };

  // Common fields for DTR
  const dtrFields = [
    'natureOfProblem',
    'actionTaken',
    'remarks',
    'callStatus',
    'caseSeverity',
  ];

  // Common fields for RMA
  const rmaFields = [
    'defectDetails',
    'symptoms',
    'defectivePartName',
    'defectivePartNumber',
    'replacedPartNumber',
    'notes',
    'status',
  ];

  const fields = caseType === 'DTR' ? dtrFields : rmaFields;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Common Issue Template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe when to use this template..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Make this template public</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Public templates can be used by all users
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Template Fields (Pre-filled values)
              </label>
            </div>

            <div className="space-y-3">
              {fields.map((field) => {
                const value = templateData[field] || '';
                return (
                  <div key={field} className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => addField(field, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter default value for ${field}...`}
                      />
                    </div>
                    {value && (
                      <button
                        onClick={() => removeField(field)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove field"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              💡 Tip: Leave fields empty if you don't want to pre-fill them. Only filled fields will be applied when using the template.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Template</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

