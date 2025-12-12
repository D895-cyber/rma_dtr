import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { RMACase, useMasterDataAPI, useUsersAPI } from '../hooks/useAPI';
import partsService, { Part } from '../services/parts.service';

interface RMAFormProps {
  currentUser: any;
  dtrCaseNumber?: string;
  onClose: () => void;
  onSubmit: (data: Omit<RMACase, 'id' | 'auditLog'>) => void;
}

export function RMAForm({ currentUser, dtrCaseNumber, onClose, onSubmit }: RMAFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const { sites, getAudisBySite, getProjectorByAudi } = useMasterDataAPI();
  const { users, loading: usersLoading } = useUsersAPI();
  
  // Get engineers reactively (updates when users load)
  const engineers = useMemo(() => {
    return users.filter(u => u.role === 'engineer' && u.isActive);
  }, [users]);
  
  const [formData, setFormData] = useState({
    rmaType: 'RMA' as 'RMA' | 'SRMA' | 'RMA_CL' | 'Lamps',
    callLogNumber: '',  // NOT linked to DTR
    rmaNumber: '',  // Now optional (PO number)
    rmaOrderNumber: '',  // Now optional
    rmaRaisedDate: today,
    customerErrorDate: today,
    siteName: '',
    siteId: '',
    audiNo: '',
    audiId: '',
    productName: '',
    productPartNumber: '',
    serialNumber: '',
    defectDetails: '',  // NEW: Dedicated defect details field
    defectivePartNumber: '',
    defectivePartName: '',
    defectivePartSerial: '',
    isDefectivePartDNR: false,  // NEW: Do Not Return flag
    defectivePartDNRReason: '',  // NEW: DNR reason
    replacedPartNumber: '',
    replacedPartSerial: '',
    symptoms: '',
    // Replacement Part Tracking (Outbound)
    shippingCarrier: '',
    trackingNumberOut: '',
    shippedDate: '',
    // Defective Part Return Tracking (Inbound)
    returnShippedDate: '',
    returnTrackingNumber: '',
    returnShippedThrough: '',
    status: 'open' as const,  // NEW: Updated default status
    assignedTo: '',
    notes: '',
  });

  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [availableAudis, setAvailableAudis] = useState<Array<{id: string; audiNo: string}>>([]);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [useCustomPart, setUseCustomPart] = useState(false);

  function generateRMANumber() {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RMA-${year}-${count}`;
  }

  function generateOrderNumber() {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-RMA-${year}-${count}`;
  }

  // Handle site selection - load audis
  useEffect(() => {
    if (selectedSite && selectedSiteId) {
      const audis = getAudisBySite(selectedSite);
      setAvailableAudis(audis);
      setFormData(prev => ({ 
        ...prev, 
        siteName: selectedSite, 
        siteId: selectedSiteId,
        audiNo: '', 
        audiId: '',
        productName: '', 
        serialNumber: '' 
      }));
    } else {
      setAvailableAudis([]);
      setFormData(prev => ({ ...prev, audiNo: '', audiId: '', productName: '', serialNumber: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedSiteId]);

  // Handle audi selection - auto-fill projector details and load parts
  const handleAudiChange = async (audiId: string, audiNo: string) => {
    const projector = getProjectorByAudi(selectedSite, audiNo);
    if (projector) {
      setFormData(prev => ({
        ...prev,
        audiNo,
        audiId,
        productName: projector.modelNo,
        serialNumber: projector.serialNumber,
      }));

      // Fetch parts for this projector model
      if (projector.modelNo) {
        await loadPartsForModel(projector.modelNo);
      }
    } else {
      setFormData(prev => ({ ...prev, audiNo, audiId, productName: '', serialNumber: '' }));
      setAvailableParts([]);
    }
  };

  // Load parts for a specific projector model
  const loadPartsForModel = async (modelNo: string) => {
    try {
      setLoadingParts(true);
      const result = await partsService.getPartsByProjectorModel(modelNo);
      if (result.success && result.data) {
        setAvailableParts(result.data.parts);
      } else {
        setAvailableParts([]);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
      setAvailableParts([]);
    } finally {
      setLoadingParts(false);
    }
  };

  // Handle part selection from dropdown
  const handlePartSelect = (partId: string) => {
    if (partId === 'custom') {
      setUseCustomPart(true);
      setFormData(prev => ({
        ...prev,
        defectivePartName: '',
        defectivePartNumber: '',
      }));
    } else {
      const selectedPart = availableParts.find(p => p.id === partId);
      if (selectedPart) {
        setUseCustomPart(false);
        setFormData(prev => ({
          ...prev,
          defectivePartName: selectedPart.partName,
          defectivePartNumber: selectedPart.partNumber,
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCase = {
      ...formData,
      createdBy: currentUser.email,
    };
    
    onSubmit(newCase);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-gray-900">Create New RMA Case</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4">Basic Information</h3>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              RMA Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.rmaType}
              onChange={(e) => setFormData({ ...formData, rmaType: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="RMA">RMA</option>
              <option value="SRMA">SRMA</option>
              <option value="RMA_CL">RMA CL</option>
              <option value="Lamps">Lamps</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Call Log # <span className="text-gray-400">(Numeric value, independent)</span>
            </label>
            <input
              type="text"
              value={formData.callLogNumber}
              onChange={(e) => setFormData({ ...formData, callLogNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CL-12345"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              RMA Number (PO) <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.rmaNumber}
              onChange={(e) => setFormData({ ...formData, rmaNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., PO-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              RMA Order Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.rmaOrderNumber}
              onChange={(e) => setFormData({ ...formData, rmaOrderNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ORD-RMA-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              RMA Raised Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.rmaRaisedDate}
              onChange={(e) => setFormData({ ...formData, rmaRaisedDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Customer Error Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.customerErrorDate}
              onChange={(e) => setFormData({ ...formData, customerErrorDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="open">Open - Observation is going on</option>
              <option value="rma_raised_yet_to_deliver">RMA Raised - Yet to Deliver</option>
              <option value="faulty_in_transit_to_cds">Faulty in Transit to CDS</option>
              <option value="closed">Closed - Complete</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Site and Product Information */}
          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4 mt-4">Site & Product Information</h3>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Site Name <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSite}
              onChange={(e) => {
                const siteName = e.target.value;
                const site = sites.find(s => s.siteName === siteName);
                setSelectedSite(siteName);
                setSelectedSiteId(site?.id || '');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Site</option>
              {sites.map(site => (
                <option key={site.id} value={site.siteName}>
                  {site.siteName}
                </option>
              ))}
            </select>
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
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.productName}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Auto-filled from Audi selection"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Product Part Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.productPartNumber}
              onChange={(e) => setFormData({ ...formData, productPartNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., EB-L1500U"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serialNumber}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Auto-filled from Audi selection"
              required
            />
          </div>

          {/* Defective and Replaced Parts */}
          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4 mt-4">Defect Information</h3>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Defect Details
            </label>
            <textarea
              value={formData.defectDetails}
              onChange={(e) => setFormData({ ...formData, defectDetails: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the defect or issue in detail..."
            />
          </div>

          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4 mt-4">Defective Part Details</h3>
          </div>

          {/* Defective Part Selection */}
          {availableParts.length > 0 && !useCustomPart ? (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                Select Defective Part {loadingParts && <span className="text-gray-400">(Loading...)</span>}
              </label>
              <select
                onChange={(e) => handlePartSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose from available parts...</option>
                {availableParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.partName} ({part.partNumber})
                    {part.category && ` - ${part.category}`}
                  </option>
                ))}
                <option value="custom">⚙️ Custom/Other (Enter manually)</option>
              </select>
              {formData.defectivePartName && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {formData.defectivePartName}
                  </p>
                  <p className="text-sm text-green-600">
                    <strong>Part Number:</strong> {formData.defectivePartNumber}
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseCustomPart(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Switch to custom entry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Defective Part Name
                  {availableParts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCustomPart(false)}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      (Select from list instead)
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.defectivePartName}
                  onChange={(e) => setFormData({ ...formData, defectivePartName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Power Supply Unit"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Defective Part Number
                </label>
                <input
                  type="text"
                  value={formData.defectivePartNumber}
                  onChange={(e) => setFormData({ ...formData, defectivePartNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., PSU-RZ990-01"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Defective Part Serial
            </label>
            <input
              type="text"
              value={formData.defectivePartSerial}
              onChange={(e) => setFormData({ ...formData, defectivePartSerial: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., PSU-2023-078-A"
            />
          </div>

          {/* DNR (Do Not Return) Section */}
          <div className="md:col-span-2">
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <input
                type="checkbox"
                id="isDefectivePartDNR"
                checked={formData.isDefectivePartDNR}
                onChange={(e) => setFormData({ ...formData, isDefectivePartDNR: e.target.checked, defectivePartDNRReason: e.target.checked ? formData.defectivePartDNRReason : '' })}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="isDefectivePartDNR" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  DNR - Do Not Return (Defective part will NOT be returned to OEM)
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Check this if the defective part is damaged beyond repair, disposed at site, or should not be returned to the manufacturer.
                </p>
              </div>
            </div>
          </div>

          {formData.isDefectivePartDNR && (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                DNR Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.defectivePartDNRReason}
                onChange={(e) => setFormData({ ...formData, defectivePartDNRReason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Explain why the defective part will not be returned (e.g., Part damaged beyond repair and disposed at site per safety protocol)"
                required
              />
            </div>
          )}

          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4 mt-4">Replacement Part Details</h3>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Replaced Part Number
            </label>
            <input
              type="text"
              value={formData.replacedPartNumber}
              onChange={(e) => setFormData({ ...formData, replacedPartNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., PSU-RZ990-01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Replaced Part Serial
            </label>
            <input
              type="text"
              value={formData.replacedPartSerial}
              onChange={(e) => setFormData({ ...formData, replacedPartSerial: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., PSU-2024-234-B"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Symptoms <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the defect and symptoms..."
              required
            />
          </div>

          {/* Replacement Part Tracking (Outbound) */}
          <div className="md:col-span-2">
            <h3 className="text-gray-900 mb-4 mt-4">Replacement Part Tracking (Outbound)</h3>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Shipping Carrier
            </label>
            <input
              type="text"
              value={formData.shippingCarrier}
              onChange={(e) => setFormData({ ...formData, shippingCarrier: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., FedEx, UPS, DHL"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Shipped Date
            </label>
            <input
              type="date"
              value={formData.shippedDate}
              onChange={(e) => setFormData({ ...formData, shippedDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-2">
              Tracking Number (Outbound)
            </label>
            <input
              type="text"
              value={formData.trackingNumberOut}
              onChange={(e) => setFormData({ ...formData, trackingNumberOut: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Replacement part shipment tracking number"
            />
          </div>

          {/* Defective Part Return Tracking (Inbound) - Hidden if DNR */}
          {!formData.isDefectivePartDNR && (
            <>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4 mt-4">
                  <h3 className="text-gray-900">Defective Part Return Tracking (Inbound)</h3>
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                    Return to CDS
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Return Shipped Through
                </label>
                <input
                  type="text"
                  value={formData.returnShippedThrough}
                  onChange={(e) => setFormData({ ...formData, returnShippedThrough: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., FedEx, UPS, DHL"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Return Shipped Date
                </label>
                <input
                  type="date"
                  value={formData.returnShippedDate}
                  onChange={(e) => setFormData({ ...formData, returnShippedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-2">
                  Return Tracking Number (Inbound)
                </label>
                <input
                  type="text"
                  value={formData.returnTrackingNumber}
                  onChange={(e) => setFormData({ ...formData, returnTrackingNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Defective part return tracking number"
                />
              </div>
            </>
          )}
          
          {/* DNR Notice - Shown in form when DNR is checked */}
          {formData.isDefectivePartDNR && (
            <div className="md:col-span-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Defective Part Return Tracking Not Required
                    </p>
                    <p className="text-xs text-gray-600">
                      Since this is a DNR (Do Not Return) case, the defective part will not be returned to the OEM. Return tracking fields are hidden.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
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
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes or comments..."
            />
          </div>
        </div>

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
            Create RMA Case
          </button>
        </div>
      </form>
    </div>
  );
}
