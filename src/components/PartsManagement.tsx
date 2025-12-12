import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Save } from 'lucide-react';
import partsService, { Part } from '../services/parts.service';
import masterDataService from '../services/masterData.service';

interface ProjectorModel {
  id: string;
  modelNo: string;
  manufacturer?: string;
}

export function PartsManagement() {
  const [parts, setParts] = useState<Part[]>([]);
  const [projectorModels, setProjectorModels] = useState<ProjectorModel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    projectorModelId: '',
    category: '',
    description: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [partsRes, modelsRes, categoriesRes] = await Promise.all([
        partsService.getAllParts(),
        masterDataService.getProjectorModels(),
        partsService.getPartCategories(),
      ]);

      if (partsRes.success && partsRes.data) {
        setParts(partsRes.data.parts || []);
      } else {
        setParts([]);
      }

      if (modelsRes.success && modelsRes.data) {
        setProjectorModels(
          // Backend may return { models: [] } or { projectorModels: [] }
          (modelsRes.data as any).models ||
          (modelsRes.data as any).projectorModels ||
          []
        );
      } else {
        setProjectorModels([]);
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data.categories || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = () => {
    setEditingPart(null);
    setFormData({
      partName: '',
      partNumber: '',
      projectorModelId: '',
      category: '',
      description: '',
    });
    setShowForm(true);
  };

  const handleEditPart = (part: Part) => {
    setEditingPart(part);
    setFormData({
      partName: part.partName,
      partNumber: part.partNumber,
      projectorModelId: part.projectorModelId,
      category: part.category || '',
      description: part.description || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partName || !formData.partNumber || !formData.projectorModelId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingPart) {
        const result = await partsService.updatePart(editingPart.id, formData);
        if (result.success) {
          await loadData();
          setShowForm(false);
          alert('Part updated successfully');
        } else {
          alert(result.message || 'Failed to update part');
        }
      } else {
        const result = await partsService.createPart(formData);
        if (result.success) {
          await loadData();
          setShowForm(false);
          alert('Part created successfully');
        } else {
          alert(result.message || 'Failed to create part');
        }
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    }
  };

  const handleDeletePart = async (partId: string, partName: string) => {
    if (confirm(`Delete part "${partName}"? This action cannot be undone.`)) {
      try {
        const result = await partsService.deletePart(partId);
        if (result.success) {
          await loadData();
          alert('Part deleted successfully');
        } else {
          alert(result.message || 'Failed to delete part');
        }
      } catch (error: any) {
        alert(error.message || 'An error occurred');
      }
    }
  };

  // Filter parts
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel =
      selectedModel === 'all' || part.projectorModelId === selectedModel;
    return matchesSearch && matchesModel;
  });

  // Group parts by projector model
  const groupedParts = filteredParts.reduce((acc, part) => {
    const modelNo = part.projectorModel?.modelNo || 'Unknown';
    if (!acc[modelNo]) {
      acc[modelNo] = [];
    }
    acc[modelNo].push(part);
    return acc;
  }, {} as Record<string, Part[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parts...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        {/* Form Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900">
            {editingPart ? 'Edit Part' : 'Add New Part'}
          </h2>
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projector Model */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                Projector Model <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.projectorModelId}
                onChange={(e) => setFormData({ ...formData, projectorModelId: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Projector Model</option>
                {projectorModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.modelNo} {model.manufacturer && `(${model.manufacturer})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Part Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Part Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.partName}
                onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                required
                placeholder="e.g., Lamp Module"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Part Number */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Part Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                required
                placeholder="e.g., LMP-001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="Lamp">Lamp</option>
                <option value="Lens">Lens</option>
                <option value="Filter">Filter</option>
                <option value="Board">Board</option>
                <option value="Color Wheel">Color Wheel</option>
                <option value="DMD">DMD</option>
                <option value="Other">Other</option>
                {categories.map((cat) => (
                  !['Lamp', 'Lens', 'Filter', 'Board', 'Color Wheel', 'DMD', 'Other'].includes(cat) && (
                    <option key={cat} value={cat}>{cat}</option>
                  )
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Optional description or notes"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingPart ? 'Update Part' : 'Create Part'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Parts Management</h2>
          <p className="text-sm text-gray-600">Manage projector parts and components</p>
        </div>
        <button
          onClick={handleAddPart}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Part
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by part name or number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projector Models</option>
            {projectorModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.modelNo}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredParts.length} of {parts.length} parts
          </p>
        </div>
      </div>

      {/* Parts List - Grouped by Model */}
      <div className="space-y-4">
        {Object.keys(groupedParts).length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No parts found. Add your first part to get started.</p>
          </div>
        ) : (
          Object.entries(groupedParts).map(([modelNo, modelParts]) => (
            <div key={modelNo} className="bg-white rounded-lg border border-gray-200">
              {/* Model Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-gray-900 font-medium">
                  {modelNo} <span className="text-gray-500 font-normal">({modelParts.length} parts)</span>
                </h3>
              </div>

              {/* Parts Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Part Name</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Part Number</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {modelParts.map((part) => (
                      <tr key={part.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{part.partName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{part.partNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          {part.category ? (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {part.category}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {part.description || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditPart(part)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePart(part.id, part.partName)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

