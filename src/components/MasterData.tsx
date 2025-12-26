import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, ChevronDown, ChevronRight, Save, X, ArrowRightLeft } from 'lucide-react';
import { useMasterDataAPI, Site, Audi, Projector } from '../hooks/useAPI';

interface MasterDataProps {
  currentUser: any;
}

export function MasterData({ currentUser }: MasterDataProps) {
  const { 
    sites,
    projectors,
    projectorModels,
    loading,
    loadSites,
    loadProjectors,
    loadProjectorModels,
    createSite, 
    updateSite, 
    deleteSite, 
    createAudi, 
    updateAudi, 
    deleteAudi,
    createProjector,
    createProjectorModel,
    transferProjector,
  } = useMasterDataAPI();
  
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [showAudiForm, setShowAudiForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingAudi, setEditingAudi] = useState<{ siteId: string; audi: Audi } | null>(null);
  const [selectedSiteForAudi, setSelectedSiteForAudi] = useState<string>('');

  const [siteFormData, setSiteFormData] = useState({ siteName: '' });
  const [audiFormData, setAudiFormData] = useState({
    audiNo: '',
    modelNo: '',
    serialNumber: '',
  });

  // Transfer dialog state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferSourceAudi, setTransferSourceAudi] = useState<{ siteId: string; audi: Audi } | null>(null);
  const [transferTargetSiteId, setTransferTargetSiteId] = useState<string>('');
  const [transferTargetAudiId, setTransferTargetAudiId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  const handleAddSite = async () => {
    if (siteFormData.siteName.trim()) {
      const result = await createSite({ siteName: siteFormData.siteName });
      if (result.success) {
        setSiteFormData({ siteName: '' });
        setShowSiteForm(false);
        await loadSites();
      } else {
        alert(result.message || 'Failed to create site');
      }
    }
  };

  const handleUpdateSite = async () => {
    if (editingSite && siteFormData.siteName.trim()) {
      const result = await updateSite(editingSite.id, { siteName: siteFormData.siteName });
      if (result.success) {
        setSiteFormData({ siteName: '' });
        setEditingSite(null);
        await loadSites();
      } else {
        alert(result.message || 'Failed to update site');
      }
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (confirm(`Delete site "${siteName}" and all its audis?`)) {
      const result = await deleteSite(siteId);
      if (result.success) {
        await loadSites();
      } else {
        alert(result.message || 'Failed to delete site');
      }
    }
  };

  const handleAddAudi = async () => {
    if (selectedSiteForAudi && audiFormData.audiNo.trim()) {
      let projectorId = null;

      // If modelNo and serialNumber provided, create/link projector
      if (audiFormData.modelNo.trim() && audiFormData.serialNumber.trim()) {
        try {
          // 1. Find or create projector model
          let projectorModel = projectorModels.find(pm => pm.modelNo === audiFormData.modelNo);
          
          if (!projectorModel) {
            // Create new projector model
            const modelResult = await createProjectorModel({
              modelNo: audiFormData.modelNo,
            });
            if (modelResult.success && modelResult.data?.model) {
              projectorModel = modelResult.data.model;
              await loadProjectorModels();
            } else {
              alert(modelResult.message || 'Failed to create projector model');
              return;
            }
          }

          // 2. Check if projector with this serial number exists
          let projector = projectors.find(p => p.serialNumber === audiFormData.serialNumber);
          
          if (!projector) {
            // Create new projector
            const projectorResult = await createProjector({
              serialNumber: audiFormData.serialNumber,
              projectorModelId: projectorModel.id,
              status: 'active',
            });
            if (projectorResult.success && projectorResult.data?.projector) {
              projector = projectorResult.data.projector;
              await loadProjectors();
            } else {
              alert(projectorResult.message || 'Failed to create projector');
              return;
            }
          }

          projectorId = projector.id;
        } catch (error: any) {
          alert('Error setting up projector: ' + error.message);
          return;
        }
      }

      // 3. Create audi with projector link
      const result = await createAudi({
        siteId: selectedSiteForAudi,
        audiNo: audiFormData.audiNo,
        projectorId: projectorId || undefined,
      });
      
      if (result.success) {
        setAudiFormData({ audiNo: '', modelNo: '', serialNumber: '' });
        setShowAudiForm(false);
        setSelectedSiteForAudi('');
        await loadSites();
      } else {
        alert(result.message || 'Failed to create audi');
      }
    }
  };

  const handleUpdateAudi = async () => {
    if (editingAudi && audiFormData.audiNo.trim()) {
      let projectorId = editingAudi.audi.projectorId || null;

      // If modelNo and serialNumber provided, create/link projector
      if (audiFormData.modelNo.trim() && audiFormData.serialNumber.trim()) {
        try {
          // 1. Find or create projector model
          let projectorModel = projectorModels.find(pm => pm.modelNo === audiFormData.modelNo);
          
          if (!projectorModel) {
            // Create new projector model
            const modelResult = await createProjectorModel({
              modelNo: audiFormData.modelNo,
            });
            if (modelResult.success && modelResult.data?.model) {
              projectorModel = modelResult.data.model;
              await loadProjectorModels();
            } else {
              alert(modelResult.message || 'Failed to create projector model');
              return;
            }
          }

          // 2. Check if projector with this serial number exists
          let projector = projectors.find(p => p.serialNumber === audiFormData.serialNumber);
          
          if (!projector) {
            // Create new projector
            const projectorResult = await createProjector({
              serialNumber: audiFormData.serialNumber,
              projectorModelId: projectorModel.id,
              status: 'active',
            });
            if (projectorResult.success && projectorResult.data?.projector) {
              projector = projectorResult.data.projector;
              await loadProjectors();
            } else {
              alert(projectorResult.message || 'Failed to create projector');
              return;
            }
          }

          projectorId = projector.id;
        } catch (error: any) {
          alert('Error setting up projector: ' + error.message);
          return;
        }
      }

      // 3. Update audi with projector link
      const result = await updateAudi(editingAudi.audi.id, {
        audiNo: audiFormData.audiNo,
        projectorId: projectorId || undefined,
      });
      
      if (result.success) {
        setAudiFormData({ audiNo: '', modelNo: '', serialNumber: '' });
        setEditingAudi(null);
        await loadSites();
      } else {
        alert(result.message || 'Failed to update audi');
      }
    }
  };

  const handleDeleteAudi = async (siteId: string, audiId: string, audiNo: string) => {
    if (confirm(`Delete audi "${audiNo}"?`)) {
      const result = await deleteAudi(audiId);
      if (result.success) {
        await loadSites();
      } else {
        alert(result.message || 'Failed to delete audi');
      }
    }
  };

  const openAddSiteForm = () => {
    setSiteFormData({ siteName: '' });
    setEditingSite(null);
    setShowSiteForm(true);
  };

  const openEditSiteForm = (site: Site) => {
    setSiteFormData({ siteName: site.siteName });
    setEditingSite(site);
    setShowSiteForm(true);
  };

  const openAddAudiForm = (siteId: string) => {
    setAudiFormData({ audiNo: '', modelNo: '', serialNumber: '' });
    setEditingAudi(null);
    setSelectedSiteForAudi(siteId);
    setShowAudiForm(true);
  };

  const openEditAudiForm = (siteId: string, audi: Audi) => {
    setAudiFormData({
      audiNo: audi.audiNo,
      modelNo: audi.projector?.projectorModel?.modelNo || '',
      serialNumber: audi.projector?.serialNumber || '',
    });
    setEditingAudi({ siteId, audi });
    setShowAudiForm(true);
  };

  const openTransferDialog = (siteId: string, audi: Audi) => {
    console.log('openTransferDialog clicked for audi:', { siteId, audiId: audi.id, projectorId: audi.projectorId });
    if (!audi.projectorId) {
      alert('This audi does not have a projector assigned to transfer.');
      return;
    }
    
    // Find the site to get site name
    const site = sites.find(s => s.id === siteId);
    
    // Create audi object with site information
    const audiWithSite = {
      ...audi,
      site: site || undefined,
    };
    
    console.log('Setting transfer dialog state...', { site, audiWithSite });
    setTransferSourceAudi({ siteId, audi: audiWithSite });
    setTransferTargetSiteId(siteId);
    setTransferTargetAudiId('');
    setTransferReason('');
    setShowTransferDialog(true);
    console.log('Transfer dialog state set. showTransferDialog should be true now.');
  };

  // Debug effect to track dialog state
  useEffect(() => {
    console.log('Transfer dialog state changed:', {
      showTransferDialog,
      hasSourceAudi: !!transferSourceAudi,
      sourceAudi: transferSourceAudi,
    });
  }, [showTransferDialog, transferSourceAudi]);

  const handleTransferProjector = async () => {
    if (!transferSourceAudi || !transferSourceAudi.audi.projectorId) {
      alert('No source projector selected.');
      return;
    }
    if (!transferTargetSiteId || !transferTargetAudiId) {
      alert('Please select target site and audi.');
      return;
    }
    if (transferTargetAudiId === transferSourceAudi.audi.id) {
      alert('Source and target audi are the same.');
      return;
    }
    try {
      console.log('Transferring projector:', {
        projectorId: transferSourceAudi.audi.projectorId,
        toSiteId: transferTargetSiteId,
        toAudiId: transferTargetAudiId,
        reason: transferReason,
      });
      
      const result = await transferProjector(transferSourceAudi.audi.projectorId, {
        toSiteId: transferTargetSiteId,
        toAudiId: transferTargetAudiId,
        reason: transferReason || undefined,
      });
      
      console.log('Transfer result:', result);
      
      if (result.success) {
        alert('Projector transferred successfully.');
        setShowTransferDialog(false);
        setTransferSourceAudi(null);
        setTransferTargetSiteId('');
        setTransferTargetAudiId('');
        setTransferReason('');
        await loadSites();
      } else {
        console.error('Transfer failed:', result);
        alert(result.message || result.error || 'Failed to transfer projector');
      }
    } catch (error: any) {
      console.error('Transfer projector error:', error);
      alert(error.message || 'Failed to transfer projector. Please check the console for details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Master Data Management</h2>
          <p className="text-sm text-gray-600">Manage Sites, Audis, and Projector Information</p>
        </div>
        <button
          onClick={openAddSiteForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </button>
      </div>

      {/* Site Form Dialog */}
      {showSiteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">{editingSite ? 'Edit Site' : 'Add New Site'}</h3>
              <button onClick={() => setShowSiteForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={siteFormData.siteName}
                  onChange={(e) => setSiteFormData({ siteName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ABC Conference Center"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSiteForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingSite ? handleUpdateSite : handleAddSite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSite ? 'Update' : 'Add'} Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audi Form Dialog */}
      {showAudiForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">{editingAudi ? 'Edit Audi' : 'Add New Audi'}</h3>
              <button onClick={() => setShowAudiForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Audi No</label>
                <input
                  type="text"
                  value={audiFormData.audiNo}
                  onChange={(e) => setAudiFormData({ ...audiFormData, audiNo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Audi 1, Main Hall"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Projector Model No</label>
                <input
                  type="text"
                  value={audiFormData.modelNo}
                  onChange={(e) => setAudiFormData({ ...audiFormData, modelNo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Epson EB-L1500U"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Serial Number</label>
                <input
                  type="text"
                  value={audiFormData.serialNumber}
                  onChange={(e) => setAudiFormData({ ...audiFormData, serialNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., EPL1500-2023-001"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAudiForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingAudi ? handleUpdateAudi : handleAddAudi}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAudi ? 'Update' : 'Add'} Audi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sites List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-gray-900">Sites & Audis</h3>
          <p className="text-sm text-gray-600 mt-1">Total: {sites.length} sites</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sites.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No sites added yet</p>
              <button
                onClick={openAddSiteForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Site
              </button>
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => setExpandedSiteId(expandedSiteId === site.id ? null : site.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {expandedSiteId === site.id ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-gray-900">{site.siteName}</h4>
                      <p className="text-xs text-gray-500">{site.audis.length} audi(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddAudiForm(site.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Add Audi"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditSiteForm(site)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit Site"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSite(site.id, site.siteName)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Audis */}
                {expandedSiteId === site.id && (
                  <div className="ml-11 mt-3 space-y-2">
                    {site.audis.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-2">No audis added yet</p>
                        <button
                          onClick={() => openAddAudiForm(site.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          + Add First Audi
                        </button>
                      </div>
                    ) : (
                      site.audis.map((audi) => (
                        <div key={audi.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {audi.audiNo}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Model:</span>
                                  <span className="text-gray-900 ml-2">
                                    {audi.projector?.projectorModel?.modelNo || audi.projector?.modelNo || 'Not assigned'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Serial:</span>
                                  <span className="text-gray-900 ml-2">
                                    {audi.projector?.serialNumber || 'Not assigned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openTransferDialog(site.id, audi)}
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                title="Transfer projector to another audi/site"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditAudiForm(site.id, audi)}
                                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                title="Edit Audi"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAudi(site.id, audi.id, audi.audiNo)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Delete Audi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Projector Transfer Dialog */}
      {showTransferDialog && transferSourceAudi && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransferDialog(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto', zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-xl font-semibold">Transfer Projector</h3>
              <button
                onClick={() => setShowTransferDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <p className="mb-1">
                  <span className="font-medium">Projector Serial:</span>{' '}
                  <span className="font-mono">{transferSourceAudi.audi.projector?.serialNumber || 'Unknown'}</span>
                </p>
                <p>
                  <span className="font-medium">Current Location:</span>{' '}
                  {(() => {
                    const currentSite = sites.find(s => s.id === transferSourceAudi.siteId);
                    return currentSite ? `${currentSite.siteName} / ${transferSourceAudi.audi.audiNo}` : `Unknown site / ${transferSourceAudi.audi.audiNo}`;
                  })()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Site *</label>
                <select
                  value={transferTargetSiteId}
                  onChange={(e) => {
                    setTransferTargetSiteId(e.target.value);
                    setTransferTargetAudiId('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audi *</label>
                <select
                  value={transferTargetAudiId}
                  onChange={(e) => setTransferTargetAudiId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!transferTargetSiteId}
                >
                  <option value="">Select Audi</option>
                  {transferTargetSiteId &&
                    sites
                      .find((s) => s.id === transferTargetSiteId)
                      ?.audis.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.audiNo} {a.projector?.serialNumber ? `- [Current: ${a.projector.serialNumber}]` : ''}
                        </option>
                      ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Target audi must belong to the selected site. If it already has a different projector, transfer
                  will be blocked.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g., Projector moved from Audi 1 to Audi 3 due to seating reconfiguration"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowTransferDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferProjector}
                disabled={!transferTargetSiteId || !transferTargetAudiId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Transfer Projector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

