import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { DTRCase, useMasterDataAPI, useUsersAPI } from '../hooks/useAPI';
import { SearchableSelect } from './ui/SearchableSelect';
import { TemplateSelector } from './TemplateSelector';
import { FileUpload } from './FileUpload';
import { AttachmentList } from './AttachmentList';
import { templateService, CaseTemplate } from '../services/template.service';

interface DTRFormProps {
  currentUser: any;
  onClose: () => void;
  onSubmit: (data: Omit<DTRCase, 'id' | 'auditLog'>) => void;
  caseId?: string; // For editing existing cases
}

export function DTRForm({ currentUser, onClose, onSubmit, caseId }: DTRFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const { sites, loading: masterDataLoading, getAudisBySite, getProjectorByAudi } = useMasterDataAPI();
  const { users, loading: usersLoading, getEngineersList } = useUsersAPI();
  
  // Get engineers reactively (updates when users load)
  const engineers = useMemo(() => {
    return users.filter(u => u.role === 'engineer' && u.isActive);
  }, [users]);

  // Debug: Log sites and engineers when they change
  useEffect(() => {
    console.log('Sites loaded:', sites.length, sites);
  }, [sites]);

  useEffect(() => {
    console.log('Engineers loaded:', engineers.length, engineers);
  }, [engineers]);
  
  const [formData, setFormData] = useState({
    errorDate: today,
    caseNumber: generateCaseNumber(),
    site: '',
    siteId: '',
    audiNo: '',
    audiId: '',
    unitModel: '',
    unitSerial: '',
    natureOfProblem: '',
    actionTaken: '',
    remarks: '',
    callStatus: 'open' as const,
    caseSeverity: 'medium' as const,
    assignedTo: '',
  });

  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [availableAudis, setAvailableAudis] = useState<Array<{id: string; audiNo: string}>>([]);
  const [refreshAttachments, setRefreshAttachments] = useState(0);

  // Handle template selection
  const handleTemplateSelect = (template: CaseTemplate) => {
    const templateData = template.templateData as any;
    setFormData(prev => ({
      ...prev,
      ...templateData,
      // Don't override case number or dates
      caseNumber: prev.caseNumber,
      errorDate: prev.errorDate,
    }));
  };

  function generateCaseNumber() {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const count = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${yy}${mm}${count}`;
  }

  // Handle site selection - load audis
  useEffect(() => {
    if (selectedSite && selectedSiteId) {
      const audis = getAudisBySite(selectedSite);
      setAvailableAudis(audis);
      setFormData(prev => ({ 
        ...prev, 
        site: selectedSite, 
        siteId: selectedSiteId,
        audiNo: '', 
        audiId: '',
        unitModel: '', 
        unitSerial: '' 
      }));
    } else {
      setAvailableAudis([]);
      setFormData(prev => ({ ...prev, audiNo: '', audiId: '', unitModel: '', unitSerial: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedSiteId]);

  // Handle audi selection - auto-fill projector details
  const handleAudiChange = (audiId: string, audiNo: string) => {
    const projector = getProjectorByAudi(selectedSite, audiNo);
    if (projector) {
      setFormData(prev => ({
        ...prev,
        audiNo,
        audiId,
        unitModel: projector.modelNo,
        unitSerial: projector.serialNumber,
      }));
    } else {
      setFormData(prev => ({ ...prev, audiNo, audiId, unitModel: '', unitSerial: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.siteId) {
      alert('Please select a site');
      return;
    }
    
    if (!formData.audiId) {
      alert('Please select an audi');
      return;
    }
    
    if (!formData.unitModel || !formData.unitSerial) {
      alert('Unit Model and Serial Number are required. Please ensure the selected audi has a projector assigned.');
      return;
    }
    
    if (!formData.natureOfProblem.trim()) {
      alert('Nature of Problem is required');
      return;
    }
    
    const newCase = {
      ...formData,
      createdBy: currentUser.email,
      createdDate: new Date().toISOString(),
    };
    
    // Remove the 'site' field (we only need siteId)
    delete (newCase as any).site;
    
    onSubmit(newCase);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-gray-900">Create New DTR Case</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Error Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.errorDate}
              onChange={(e) => setFormData({ ...formData, errorDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Case Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.caseNumber}
              onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Template Selector */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Use Template (Optional)
            </label>
            <TemplateSelector
              caseType="DTR"
              onSelectTemplate={handleTemplateSelect}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Site Name <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={sites.map(site => ({
                value: site.siteName,
                label: site.siteName,
                id: site.id,
              }))}
              value={selectedSite}
              onChange={(siteName, option) => {
                const site = sites.find(s => s.siteName === siteName);
                setSelectedSite(siteName);
                setSelectedSiteId(site?.id || '');
              }}
              placeholder={masterDataLoading ? 'Loading sites...' : sites.length === 0 ? 'No sites available' : 'Select Site'}
              searchPlaceholder="Search sites..."
              emptyMessage="No sites found"
              disabled={masterDataLoading}
              required
            />
            {sites.length === 0 && !masterDataLoading && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ No sites found. Please add sites in Master Data first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Audi No <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.audiNo || ''}
              onChange={(e) => {
                const audiNo = e.target.value;
                if (!audiNo) return;
                const audi = availableAudis.find(a => a.audiNo === audiNo);
                if (audi) {
                  handleAudiChange(audi.id, audi.audiNo);
                } else {
                  console.log('Audi not found:', audiNo, 'Available:', availableAudis);
                }
              }}
              disabled={!selectedSite}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              required
            >
              <option value="">Select Audi</option>
              {availableAudis.length === 0 && selectedSite && (
                <option value="" disabled>No audis available for this site</option>
              )}
              {availableAudis.map((audi) => (
                <option key={audi.id} value={audi.audiNo}>
                  {audi.audiNo}
                </option>
              ))}
            </select>
            {selectedSite && availableAudis.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No audis found for this site. Please add audis in Master Data first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Unit Model # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unitModel}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Auto-filled from Audi selection"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Unit Serial # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unitSerial}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Auto-filled from Audi selection"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Case Severity <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.caseSeverity}
              onChange={(e) => setFormData({ ...formData, caseSeverity: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Call Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.callStatus}
              onChange={(e) => setFormData({ ...formData, callStatus: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Assign To Engineer
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={usersLoading}
            >
              <option value="">
                {usersLoading 
                  ? 'Loading engineers...' 
                  : engineers.length === 0 
                    ? 'No engineers available' 
                    : 'Unassigned'}
              </option>
              {engineers.map(engineer => (
                <option key={engineer.id} value={engineer.email}>
                  {engineer.name} ({engineer.email})
                </option>
              ))}
            </select>
            {engineers.length === 0 && !usersLoading && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ No active engineers found. Please add engineers in User Management first.
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Nature of Problem <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.natureOfProblem}
              onChange={(e) => setFormData({ ...formData, natureOfProblem: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the issue reported..."
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Action Taken
            </label>
            <textarea
              value={formData.actionTaken}
              onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe troubleshooting steps and actions taken..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Additional notes or comments..."
            />
          </div>
        </div>

        {/* File Attachments - Only show for existing cases */}
        {caseId && (
          <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              <FileUpload
                caseId={caseId}
                caseType="DTR"
                onUploadComplete={() => setRefreshAttachments(prev => prev + 1)}
              />
            </div>
            <div>
              <AttachmentList key={refreshAttachments} caseId={caseId} caseType="DTR" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create DTR Case
          </button>
        </div>
      </form>
    </div>
  );
}
