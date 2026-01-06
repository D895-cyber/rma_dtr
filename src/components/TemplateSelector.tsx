import React, { useState, useEffect } from 'react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { templateService, CaseTemplate } from '../services/template.service';

interface TemplateSelectorProps {
  caseType: 'DTR' | 'RMA';
  onSelectTemplate: (template: CaseTemplate) => void;
  onCreateTemplate?: () => void;
  showManageLink?: boolean;
}

export function TemplateSelector({ caseType, onSelectTemplate, onCreateTemplate, showManageLink = true }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

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

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Use template (increment usage count)
        templateService.useTemplate(templateId).catch(console.error);
        onSelectTemplate(template);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-gray-400" />
      <select
        value={selectedId}
        onChange={handleSelect}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Template...</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.isPublic && ' (Public)'}
            {template.usageCount > 0 && ` (${template.usageCount} uses)`}
          </option>
        ))}
      </select>
      {onCreateTemplate && (
        <button
          onClick={onCreateTemplate}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Create New Template"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      )}
      {showManageLink && (
        <a
          href="#templates"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = 'templates';
          }}
          className="px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Manage Templates"
        >
          Manage
        </a>
      )}
    </div>
  );
}

