import React, { useState, useEffect } from 'react';
import { X, Edit, Check, AlertCircle, ArrowRight, History } from 'lucide-react';
import { DTRCase, useUsersAPI, useRMACases, useDTRCases } from '../hooks/useAPI';
import { dtrService } from '../services/dtr.service';

interface DTRDetailProps {
  dtr: DTRCase;
  currentUser: any;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DTRCase>, user: string, action: string, details: string) => void;
}

export function DTRDetail({ dtr, currentUser, onClose, onUpdate }: DTRDetailProps) {
  const { getEngineersList, users } = useUsersAPI();
  const { createCase: createRMACase } = useRMACases();
  const { loadCases } = useDTRCases();
  const engineers = getEngineersList();
  
  // Helper function to safely get site name
  const getSiteName = (site: string | { siteName: string } | any): string => {
    if (typeof site === 'string') return site;
    if (site && typeof site === 'object' && site.siteName) return site.siteName;
    return '';
  };

  // Helper function to get user name from ID or email
  const getUserName = (userOrId: string | null | undefined): string => {
    if (!userOrId) return 'Unassigned';
    // If it's an email, return it
    if (userOrId.includes('@')) return userOrId;
    // If it's a UUID, find the user
    const user = users.find((u: any) => u.id === userOrId);
    if (user) return user.name || user.email || userOrId;
    return userOrId;
  };

  // Helper function to safely get audi number
  const getAudiNo = (data: any): string => {
    if (data.audi && data.audi.audiNo) return data.audi.audiNo;
    if (data.audiNo) return data.audiNo;
    return '';
  };

  // Helper function to format date for input
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  
  // Helper to get assignedTo email from UUID or email
  const getAssignedToEmail = (assignedTo: string | null | undefined): string => {
    if (!assignedTo) return '';
    // If it's already an email, return it
    if (assignedTo.includes('@')) return assignedTo;
    // If it's a UUID, find the user and return their email
    const user = users.find((u: any) => u.id === assignedTo);
    if (user) return user.email || assignedTo;
    return assignedTo;
  };
  
  const [formData, setFormData] = useState({
    ...dtr,
    errorDate: formatDateForInput(dtr.errorDate),
    // Convert assignedTo UUID to email if needed
    assignedTo: getAssignedToEmail(dtr.assignee?.email || dtr.assignedTo) || '',
  });

  // Update assignedTo when users load (in case users weren't loaded when formData was initialized)
  useEffect(() => {
    if (users.length > 0 && formData.assignedTo && !formData.assignedTo.includes('@')) {
      const email = getAssignedToEmail(formData.assignedTo);
      if (email !== formData.assignedTo) {
        setFormData(prev => ({ ...prev, assignedTo: email }));
      }
    }
  }, [users, dtr.assignedTo, dtr.assignee]);

  const handleUpdate = () => {
    onUpdate(dtr.id, formData, currentUser.email, 'Updated', 'Case details updated');
    setIsEditing(false);
  };

  const handleAssign = async (email: string) => {
    try {
      const response = await dtrService.assignDTRCase(dtr.id, email);
      if (response.success) {
        // Refresh the cases list to show updated assignment
        await loadCases();
        alert(`Case assigned to ${email} successfully!`);
      } else {
        alert(response.message || 'Failed to assign case');
      }
    } catch (error: any) {
      console.error('Assign error:', error);
      alert('Failed to assign case: ' + (error.message || 'Unknown error'));
    }
  };

  const handleStatusChange = (status: DTRCase['callStatus']) => {
    if (status === 'closed') {
      const finalRemarks = prompt('Enter final remarks for closing this case:');
      if (finalRemarks) {
        onUpdate(
          dtr.id,
          { callStatus: status, closedBy: currentUser.email, closedDate: new Date().toISOString(), finalRemarks },
          currentUser.email,
          'Closed',
          `Case closed: ${finalRemarks}`
        );
      }
    } else {
      onUpdate(dtr.id, { callStatus: status }, currentUser.email, 'Status Changed', `Status changed to ${status}`);
    }
  };

  const handleEscalateToRMA = async () => {
    if (confirm('Escalate this case to RMA? This will create a new RMA case.')) {
      try {
        // Get site and audi IDs from the DTR case (use direct fields, not nested objects)
        const siteId = dtr.siteId || (typeof dtr.site === 'object' ? dtr.site.id : '');
        const audiId = dtr.audiId || (dtr.audi?.id || '');
        
        if (!siteId) {
          alert('Cannot escalate: Missing site information');
          return;
        }
        
        // Create RMA case with data from DTR
        const rmaData = {
          rmaType: 'RMA' as const,
          rmaRaisedDate: new Date().toISOString().split('T')[0],
          customerErrorDate: dtr.errorDate,
          siteId: siteId,
          audiId: audiId || undefined, // Make it optional
          productName: dtr.unitModel,
          productPartNumber: dtr.unitModel,
          serialNumber: dtr.unitSerial,
          symptoms: `Escalated from DTR ${dtr.caseNumber}: ${dtr.natureOfProblem}`,
          status: 'open' as const,
        };
        
        console.log('Creating RMA with data:', rmaData); // Debug log
        
        const result = await createRMACase(rmaData);
        
        if (result.success) {
          // Update DTR status to escalated
          onUpdate(dtr.id, { callStatus: 'escalated' }, currentUser.email, 'Escalated', `Case escalated to RMA. RMA case created.`);
          alert('RMA case created successfully! The case has been escalated.');
          onClose(); // Close the detail view
        } else {
          alert(result.message || 'Failed to create RMA case');
          console.error('RMA creation failed:', result);
        }
      } catch (error: any) {
        console.error('Escalation error:', error);
        alert('Failed to escalate to RMA: ' + error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-gray-900">DTR Case: {dtr.caseNumber}</h2>
              <span className={`px-3 py-1 rounded text-sm ${
                dtr.callStatus === 'closed' ? 'bg-green-100 text-green-700' :
                dtr.callStatus === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                dtr.callStatus === 'escalated' ? 'bg-purple-100 text-purple-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {dtr.callStatus}
              </span>
              <span className={`px-3 py-1 rounded text-sm ${
                dtr.caseSeverity === 'critical' ? 'bg-red-100 text-red-700' :
                dtr.caseSeverity === 'high' ? 'bg-orange-100 text-orange-700' :
                dtr.caseSeverity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {dtr.caseSeverity} severity
              </span>
            </div>
            <p className="text-sm text-gray-600">Created by {dtr.createdBy} on {new Date(dtr.createdDate).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <History className="w-5 h-5" />
            </button>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          {dtr.callStatus !== 'closed' && (
            <>
              <button
                onClick={() => handleStatusChange('in-progress')}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                disabled={dtr.callStatus === 'in-progress'}
              >
                Start Work
              </button>
              <button
                onClick={() => handleStatusChange('closed')}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Close Case
              </button>
              <button
                onClick={handleEscalateToRMA}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                disabled={dtr.callStatus === 'escalated'}
              >
                <div className="flex items-center gap-1">
                  Escalate to RMA
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audit Log */}
      {showAudit && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Audit Log</h3>
          <div className="space-y-3">
            {dtr.auditLog && Array.isArray(dtr.auditLog) && dtr.auditLog.length > 0 ? (
              dtr.auditLog.map((entry) => (
                <div key={entry.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-900">{entry.action}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-600">{entry.details}</p>
                    <p className="text-xs text-gray-500 mt-1">by {entry.user}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No audit log entries yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Case Details</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Error Date</label>
              <input
                type="date"
                value={formData.errorDate}
                onChange={(e) => setFormData({ ...formData, errorDate: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Case Number</label>
              <input
                type="text"
                value={formData.caseNumber}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Site Name</label>
              <input
                type="text"
                value={getSiteName(formData.site)}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Audi No</label>
              <input
                type="text"
                value={getAudiNo(formData)}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Unit Model #</label>
              <input
                type="text"
                value={formData.unitModel}
                onChange={(e) => setFormData({ ...formData, unitModel: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Unit Serial #</label>
              <input
                type="text"
                value={formData.unitSerial}
                onChange={(e) => setFormData({ ...formData, unitSerial: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Case Severity</label>
              <select
                value={formData.caseSeverity}
                onChange={(e) => setFormData({ ...formData, caseSeverity: e.target.value as any })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Assigned To Engineer</label>
              {isEditing ? (
                <select
                  value={formData.assignedTo || ''}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {engineers.map(engineer => (
                    <option key={engineer.id} value={engineer.email}>
                      {engineer.name} ({engineer.email})
                    </option>
                  ))}
                  {/* Fallback: if assignedTo is a UUID that doesn't match any engineer, show it as an option */}
                  {formData.assignedTo && !formData.assignedTo.includes('@') && !engineers.find(e => e.id === formData.assignedTo) && (
                    <option value={formData.assignedTo} disabled>
                      {getUserName(formData.assignedTo)} (UUID - Select valid engineer)
                    </option>
                  )}
                </select>
              ) : (
                <p className="text-gray-900 px-4 py-2 bg-gray-50 rounded-lg">
                  {getUserName(formData.assignee || formData.assignedTo)}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">Nature of Problem</label>
              <textarea
                value={formData.natureOfProblem}
                onChange={(e) => setFormData({ ...formData, natureOfProblem: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">Action Taken</label>
              <textarea
                value={formData.actionTaken}
                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                rows={2}
              />
            </div>

            {dtr.closedBy && (
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-2">Final Remarks</label>
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-900 mb-2">{dtr.finalRemarks}</p>
                  <p className="text-xs text-gray-600">
                    Closed by {dtr.closedBy} on {dtr.closedDate ? new Date(dtr.closedDate).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setFormData(dtr);
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
