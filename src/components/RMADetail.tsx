import React, { useState, useEffect } from 'react';
import { X, Edit, Check, Package, Truck, History, Mail } from 'lucide-react';
import { RMACase, useUsersAPI } from '../hooks/useAPI';
import rmaService from '../services/rma.service';

interface RMADetailProps {
  rma: RMACase;
  currentUser: any;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<RMACase>, user: string, action: string, details: string) => void;
}

export function RMADetail({ rma, currentUser, onClose, onUpdate }: RMADetailProps) {
  const { getEngineersList, users } = useUsersAPI();
  const engineers = getEngineersList();
  
  // Helper function to safely get audi number
  const getAudiNo = (data: any): string => {
    if (data.audi && data.audi.audiNo) return data.audi.audiNo;
    if (data.audiNo) return data.audiNo;
    return '';
  };

  // Helper function to get user email from ID or return email if already email
  const getUserEmail = (userOrId: string | null | undefined): string => {
    if (!userOrId) return '';
    // If it's already an email, return it
    if (userOrId.includes('@')) return userOrId;
    // If it's a UUID, find the user and return their email
    const user = users.find((u: any) => u.id === userOrId);
    if (user) return user.email || userOrId;
    return userOrId;
  };
  
  // Helper function to format date for HTML date input (yyyy-MM-dd)
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      // If it's already in yyyy-MM-dd format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // Otherwise parse and format
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [sendingClientEmail, setSendingClientEmail] = useState(false);
  // Track original DNR value to detect changes
  const originalDNRValue = rma.isDefectivePartDNR === true || false;
  
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
  
  // Track original assignment value - convert UUID to email if needed
  const originalAssignedTo = (rma as any).assignee?.email || getAssignedToEmail(rma.assignedTo) || '';
  
  const [formData, setFormData] = useState({
    ...rma,
    // Ensure siteId and audiId are extracted from nested objects
    siteId: rma.siteId || ((rma as any).site && typeof (rma as any).site === 'object' ? (rma as any).site.id : ''),
    audiId: rma.audiId || ((rma as any).audi && typeof (rma as any).audi === 'object' ? (rma as any).audi.id : undefined),
    // Ensure siteName is populated from nested site object when not provided
    siteName:
      (rma as any).siteName ||
      ((rma as any).site && typeof (rma as any).site === 'object' && (rma as any).site.siteName
        ? (rma as any).site.siteName
        : ''),
    rmaRaisedDate: formatDateForInput(rma.rmaRaisedDate),
    customerErrorDate: formatDateForInput(rma.customerErrorDate),
    shippedDate: formatDateForInput(rma.shippedDate),
    returnShippedDate: formatDateForInput(rma.returnShippedDate),
    // Ensure isDefectivePartDNR is explicitly set as boolean
    isDefectivePartDNR: originalDNRValue,
    // Ensure assignedTo is set from nested assignee object if needed, and convert UUID to email
    assignedTo: originalAssignedTo,
  });
  
  // Check if DNR value has changed from original
  const originalDNRReason = rma.defectivePartDNRReason || '';
  const currentDNRReason = formData.defectivePartDNRReason || '';
  const dnrHasChanged = formData.isDefectivePartDNR !== originalDNRValue || 
    (formData.isDefectivePartDNR && currentDNRReason !== originalDNRReason);
  
  // Check if assignment has changed from original
  const currentAssignedTo = formData.assignedTo || '';
  const assignmentHasChanged = currentAssignedTo !== originalAssignedTo;

  // Update assignedTo when users load (in case users weren't loaded when formData was initialized)
  useEffect(() => {
    if (users.length > 0 && formData.assignedTo && !formData.assignedTo.includes('@')) {
      const email = getAssignedToEmail(formData.assignedTo);
      if (email !== formData.assignedTo && email) {
        setFormData(prev => ({ ...prev, assignedTo: email }));
      }
    }
  }, [users, rma.assignedTo, (rma as any).assignee]);

  // Quick save function for DNR status only
  const handleSaveDNR = async () => {
    // Validate: if DNR is checked, reason is required
    if (formData.isDefectivePartDNR && !formData.defectivePartDNRReason?.trim()) {
      alert('Please provide a DNR reason before saving.');
      return;
    }
    
    const dnrUpdate: any = {
      isDefectivePartDNR: formData.isDefectivePartDNR === true,
    };
    
    // If DNR is checked, include the reason
    if (formData.isDefectivePartDNR) {
      dnrUpdate.defectivePartDNRReason = formData.defectivePartDNRReason?.trim() || null;
    } else {
      // If DNR is unchecked, clear the reason
      dnrUpdate.defectivePartDNRReason = null;
    }
    
    onUpdate(rma.id, dnrUpdate, currentUser.email, 'DNR Status Updated', 
      `DNR status changed to ${formData.isDefectivePartDNR ? 'enabled' : 'disabled'}`);
  };

  // Quick save function for assignment only
  const handleSaveAssignment = async () => {
    const assignmentUpdate: any = {
      assignedTo: formData.assignedTo || null,
    };
    
    const assignedToName = engineers.find(e => e.email === formData.assignedTo)?.name || formData.assignedTo || 'Unassigned';
    
    onUpdate(rma.id, assignmentUpdate, currentUser.email, 'Assignment Updated', 
      `Case assigned to ${assignedToName}`);
  };

  const handleUpdate = () => {
    // Clean up formData before sending - remove nested objects
    const cleanData = { ...formData };
    
    // Remove nested objects that shouldn't be sent
    delete cleanData.site;
    delete cleanData.audi;
    delete cleanData.creator;
    delete cleanData.assignee;
    delete cleanData.auditLog;
    delete cleanData.id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;
    
    // Ensure siteId and audiId are set (extract from nested if needed)
    if (!cleanData.siteId && formData.site && typeof formData.site === 'object') {
      cleanData.siteId = formData.site.id;
    }
    if (!cleanData.audiId && formData.audi && typeof formData.audi === 'object') {
      cleanData.audiId = formData.audi.id;
    }

    // Explicitly ensure isDefectivePartDNR is a boolean (not undefined)
    cleanData.isDefectivePartDNR = formData.isDefectivePartDNR === true || formData.isDefectivePartDNR === 'true' || false;
    
    // If DNR is unchecked, clear the DNR reason
    if (!cleanData.isDefectivePartDNR) {
      cleanData.defectivePartDNRReason = null;
    }

    onUpdate(rma.id, cleanData, currentUser.email, 'Updated', 'RMA case details updated');
    setIsEditing(false);
  };

  const handleStatusChange = (status: RMACase['status']) => {
    const confirmMessage = 
      status === 'open' ? 'Mark as Open? Observation is going on.' :
      status === 'rma_raised_yet_to_deliver' ? 'Mark as RMA Raised - Yet to Deliver? Replacement part ordered but not delivered yet.' :
      status === 'faulty_in_transit_to_cds' ? 'Mark as Faulty in Transit to CDS? Defective part is being returned.' :
      status === 'closed' ? 'Close this RMA case? Defective part has been shipped to OEM.' :
      status === 'cancelled' ? 'Cancel this RMA case? This action should be carefully considered.' :
      'Change status?';
    
    if (confirm(confirmMessage)) {
      onUpdate(rma.id, { status }, currentUser.email, 'Status Changed', `Status changed to ${status}`);
    }
  };

  const handleSendClientEmail = async () => {
    if (!clientEmail || !clientEmail.includes('@')) {
      alert('Please enter a valid client email address.');
      return;
    }
    try {
      setSendingClientEmail(true);
      await rmaService.emailClient(rma.id, { email: clientEmail });
      alert('Email sent to client successfully.');
      setClientEmail('');
    } catch (error: any) {
      console.error('Failed to send client email:', error);
      alert('Failed to send email to client. Please try again.');
    } finally {
      setSendingClientEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-gray-900">RMA: {rma.rmaNumber || 'No PO'}</h2>
              <span className={`px-3 py-1 rounded text-sm ${
                rma.status === 'closed' ? 'bg-green-100 text-green-700' :
                rma.status === 'faulty_in_transit_to_cds' ? 'bg-purple-100 text-purple-700' :
                rma.status === 'rma_raised_yet_to_deliver' ? 'bg-yellow-100 text-yellow-700' :
                rma.status === 'open' ? 'bg-blue-100 text-blue-700' :
                rma.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {rma.status === 'open' ? 'Open' :
                 rma.status === 'rma_raised_yet_to_deliver' ? 'RMA Raised - Yet to Deliver' :
                 rma.status === 'faulty_in_transit_to_cds' ? 'Faulty in Transit to CDS' :
                 rma.status === 'closed' ? 'Closed' :
                 rma.status === 'cancelled' ? 'Cancelled' :
                 rma.status}
              </span>
              <span className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-700 capitalize">
                {rma.rmaType}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Order: {rma.rmaOrderNumber} | Created by {rma.createdBy}
            </p>
            {rma.callLogNumber && (
              <p className="text-sm text-gray-600">Linked to DTR: {rma.callLogNumber}</p>
            )}
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
            {/* Email client button */}
            <button
              onClick={handleSendClientEmail}
              disabled={sendingClientEmail || !clientEmail}
              className="hidden md:inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="w-4 h-4" />
              {sendingClientEmail ? 'Sending…' : 'Email Client'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Actions - Sequential Workflow */}
        {rma.status !== 'closed' && rma.status !== 'cancelled' && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">Next Action:</p>
            <div className="flex flex-wrap gap-2">
              {/* Step 1: Open → RMA Raised - Yet to Deliver */}
              {rma.status === 'open' && (
                <>
                  <button
                    onClick={() => handleStatusChange('rma_raised_yet_to_deliver')}
                    className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors font-medium"
                  >
                    ✓ RMA Raised - Yet to Deliver
                  </button>
                  <span className="text-sm text-gray-500 self-center">
                    (Mark when replacement part is ordered)
                  </span>
                </>
              )}
              
              {/* Step 2: RMA Raised → Faulty in Transit OR Close (if DNR) */}
              {rma.status === 'rma_raised_yet_to_deliver' && (
                <>
                  {!rma.isDefectivePartDNR ? (
                    <>
                      <button
                        onClick={() => handleStatusChange('faulty_in_transit_to_cds')}
                        className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          ✓ Faulty in Transit to CDS
                        </div>
                      </button>
                      <span className="text-sm text-gray-500 self-center">
                        (Mark when defective part is shipped back)
                      </span>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStatusChange('closed')}
                        className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          ✓ Close RMA (DNR)
                        </div>
                      </button>
                      <span className="text-sm text-gray-500 self-center">
                        (Part will not be returned - DNR)
                      </span>
                    </>
                  )}
                </>
              )}
              
              {/* Step 3: Faulty in Transit → Closed */}
              {rma.status === 'faulty_in_transit_to_cds' && (
                <>
                  <button
                    onClick={() => handleStatusChange('closed')}
                    className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      ✓ Close RMA
                    </div>
                  </button>
                  <span className="text-sm text-gray-500 self-center">
                    (Mark when defective part delivered to OEM)
                  </span>
                </>
              )}
              
              {/* Cancel option - always available */}
              <div className="ml-auto">
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Cancel RMA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log */}
      {showAudit && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Audit Log</h3>
          <div className="space-y-3">
            {rma.auditLog && Array.isArray(rma.auditLog) && rma.auditLog.length > 0 ? (
              rma.auditLog.map((entry) => (
                <div key={entry.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full mt-1.5"></div>
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

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">RMA Type</label>
            <select
              value={formData.rmaType}
              onChange={(e) => setFormData({ ...formData, rmaType: e.target.value as any })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="RMA">RMA</option>
              <option value="CI RMA">CI RMA</option>
              <option value="Lamps">Lamps</option>
            </select>
          </div>

          {/* Client email for notifications */}
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Client Email for RMA Updates</label>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="customer@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSendClientEmail}
                disabled={sendingClientEmail || !clientEmail}
                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mail className="w-4 h-4" />
                {sendingClientEmail ? 'Sending…' : 'Send Email to Client'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Email will include this RMA&apos;s shipment/docket details (carrier and tracking numbers) from the fields below.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Call Log # (DTR)</label>
            <input
              type="text"
              value={formData.callLogNumber || ''}
              onChange={(e) => setFormData({ ...formData, callLogNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Not linked"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">RMA Number</label>
            <input
              type="text"
              value={formData.rmaNumber || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">RMA Order Number</label>
            <input
              type="text"
              value={formData.rmaOrderNumber || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">RMA Raised Date</label>
            <input
              type="date"
              value={formData.rmaRaisedDate}
              onChange={(e) => setFormData({ ...formData, rmaRaisedDate: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Customer Error Date</label>
            <input
              type="date"
              value={formData.customerErrorDate}
              onChange={(e) => setFormData({ ...formData, customerErrorDate: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Assigned To Engineer</label>
            <div className="space-y-2">
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
                {formData.assignedTo && !formData.assignedTo.includes('@') && !engineers.find(e => e.id === formData.assignedTo || e.email === formData.assignedTo) && (
                  <option value={formData.assignedTo} disabled>
                    {getUserEmail(formData.assignedTo) || formData.assignedTo} (UUID - Select valid engineer)
                  </option>
                )}
              </select>
              {/* Save button appears when assignment changes */}
              {assignmentHasChanged && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAssignment}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Save Assignment
                  </button>
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        assignedTo: originalAssignedTo,
                      });
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Site and Product Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Site & Product Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Site Name</label>
            <input
              type="text"
              value={formData.siteName || ''}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
            <label className="block text-sm text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              value={formData.productName || ''}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Product Part Number</label>
            <input
              type="text"
              value={formData.productPartNumber || ''}
              onChange={(e) => setFormData({ ...formData, productPartNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Serial Number</label>
            <input
              type="text"
              value={formData.serialNumber || ''}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Symptoms</label>
            <textarea
              value={formData.symptoms || ''}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Part Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Defect Information</h3>
        
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Defect Details</label>
            <textarea
              value={formData.defectDetails || ''}
              onChange={(e) => setFormData({ ...formData, defectDetails: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              rows={3}
              placeholder="Describe the defect or issue in detail..."
            />
          </div>
        </div>

        <h3 className="text-gray-900 mb-6 mt-6">Defective Part Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Defective Part Name</label>
            <input
              type="text"
              value={formData.defectivePartName || ''}
              onChange={(e) => setFormData({ ...formData, defectivePartName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Defective Part Number</label>
            <input
              type="text"
              value={formData.defectivePartNumber || ''}
              onChange={(e) => setFormData({ ...formData, defectivePartNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Defective Part Serial</label>
            <input
              type="text"
              value={formData.defectivePartSerial || ''}
              onChange={(e) => setFormData({ ...formData, defectivePartSerial: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* DNR Section */}
          <div className="md:col-span-2">
            <div className={`flex items-start space-x-3 p-4 rounded-lg border ${formData.isDefectivePartDNR ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
              <input
                type="checkbox"
                id="isDefectivePartDNR"
                checked={formData.isDefectivePartDNR === true}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setFormData({ 
                    ...formData, 
                    isDefectivePartDNR: newValue,
                    // Clear DNR reason if unchecking
                    defectivePartDNRReason: newValue ? formData.defectivePartDNRReason : ''
                  });
                }}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="isDefectivePartDNR" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  DNR - Do Not Return (Defective part will NOT be returned to OEM)
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Check this if the defective part is damaged beyond repair, disposed at site, or should not be returned to the manufacturer.
                </p>
                {/* Save button appears when DNR value changes */}
                {dnrHasChanged && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleSaveDNR}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Save DNR Status
                    </button>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          isDefectivePartDNR: originalDNRValue,
                          defectivePartDNRReason: originalDNRReason,
                        });
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {formData.isDefectivePartDNR && (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                DNR Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.defectivePartDNRReason || ''}
                onChange={(e) => setFormData({ ...formData, defectivePartDNRReason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Explain why the defective part will not be returned (e.g., Part damaged beyond repair and disposed at site per safety protocol)..."
                required
              />
            </div>
          )}
        </div>

        <h3 className="text-gray-900 mb-6 mt-6">Replacement Part Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <label className="block text-sm text-gray-700 mb-2">Replaced Part Number</label>
            <input
              type="text"
              value={formData.replacedPartNumber || ''}
              onChange={(e) => setFormData({ ...formData, replacedPartNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Replaced Part Serial</label>
            <input
              type="text"
              value={formData.replacedPartSerial || ''}
              onChange={(e) => setFormData({ ...formData, replacedPartSerial: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Replacement Part Tracking (Outbound) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Replacement Part Tracking (Outbound)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Shipping Carrier</label>
            <input
              type="text"
              value={formData.shippingCarrier || ''}
              onChange={(e) => setFormData({ ...formData, shippingCarrier: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="e.g., FedEx, UPS, DHL"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Shipped Date</label>
            <input
              type="date"
              value={formData.shippedDate || ''}
              onChange={(e) => setFormData({ ...formData, shippedDate: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Tracking Number (Outbound)</label>
            <input
              type="text"
              value={formData.trackingNumberOut || ''}
              onChange={(e) => setFormData({ ...formData, trackingNumberOut: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Replacement part shipment tracking number"
            />
          </div>
        </div>
      </div>

      {/* Defective Part Return Tracking (Inbound) - Hidden if DNR */}
      {!formData.isDefectivePartDNR ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-gray-900">Defective Part Return Tracking (Inbound)</h3>
            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
              Return to CDS
            </span>
          </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Return Shipped Through</label>
            <input
              type="text"
              value={formData.returnShippedThrough || ''}
              onChange={(e) => setFormData({ ...formData, returnShippedThrough: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="e.g., FedEx, UPS, DHL"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Return Shipped Date</label>
            <input
              type="date"
              value={formData.returnShippedDate || ''}
              onChange={(e) => setFormData({ ...formData, returnShippedDate: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Return Tracking Number (Inbound)</label>
            <input
              type="text"
              value={formData.returnTrackingNumber || ''}
              onChange={(e) => setFormData({ ...formData, returnTrackingNumber: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="Defective part return tracking number"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              rows={3}
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setFormData(rma);
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
      ) : (
        // DNR Notice - Shown when defective part will not be returned
        <div className="bg-white rounded-lg border-2 border-yellow-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
                DNR - Do Not Return to OEM
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded font-normal">
                  No Return Tracking
                </span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This defective part will <strong>NOT</strong> be returned to the OEM. Defective part return tracking is not applicable for this RMA case.
              </p>
              {formData.defectivePartDNRReason && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">DNR Reason:</p>
                  <p className="text-sm text-gray-800">{formData.defectivePartDNRReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
