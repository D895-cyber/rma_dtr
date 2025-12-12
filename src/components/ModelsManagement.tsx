import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Save, Package } from 'lucide-react';
import masterDataService, { ProjectorModel } from '../services/masterData.service';

export function ModelsManagement() {
  const [models, setModels] = useState<ProjectorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<ProjectorModel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    modelNo: '',
    manufacturer: '',
    specifications: '',
  });

  // Load models
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const result = await masterDataService.getProjectorModels();
      if (result.success && result.data) {
        setModels(result.data.models || result.data.projectorModels || []);
      }
    } catch (error) {
      console.error('Load models error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = () => {
    setEditingModel(null);
    setFormData({
      modelNo: '',
      manufacturer: '',
      specifications: '',
    });
    setShowForm(true);
  };

  const handleEditModel = (model: ProjectorModel) => {
    setEditingModel(model);
    setFormData({
      modelNo: model.modelNo,
      manufacturer: model.manufacturer || '',
      specifications: model.specifications || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.modelNo) {
      alert('Please enter a model number');
      return;
    }

    try {
      if (editingModel) {
        const result = await masterDataService.updateProjectorModel(editingModel.id, formData);
        if (result.success) {
          await loadModels();
          setShowForm(false);
          alert('Model updated successfully');
        } else {
          alert(result.message || 'Failed to update model');
        }
      } else {
        const result = await masterDataService.createProjectorModel(formData);
        if (result.success) {
          await loadModels();
          setShowForm(false);
          alert('Model created successfully');
        } else {
          alert(result.message || 'Failed to create model');
        }
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    }
  };

  const handleDeleteModel = async (modelId: string, modelNo: string) => {
    if (confirm(`Delete model "${modelNo}"? This will also delete all associated parts and projectors.`)) {
      try {
        const result = await masterDataService.deleteProjectorModel(modelId);
        if (result.success) {
          await loadModels();
          alert('Model deleted successfully');
        } else {
          alert(result.message || 'Failed to delete model');
        }
      } catch (error: any) {
        alert(error.message || 'An error occurred');
      }
    }
  };

  // Filter models
  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.modelNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (model.manufacturer?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projector models...</p>
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
            {editingModel ? 'Edit Projector Model' : 'Add New Projector Model'}
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
            {/* Model Number */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Model Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.modelNo}
                onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                required
                placeholder="e.g., CP2220, CP2230"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier for this projector model</p>
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Christie, Barco, Sony"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">
                Specifications / Description
              </label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                rows={4}
                placeholder="e.g., 4K resolution, 22,000 lumens, 3-chip DLP..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Technical specifications, features, or notes about this model</p>
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
              {editingModel ? 'Update Model' : 'Create Model'}
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
          <h2 className="text-gray-900 mb-1">Projector Models</h2>
          <p className="text-sm text-gray-600">Manage projector model catalog</p>
        </div>
        <button
          onClick={handleAddModel}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by model number or manufacturer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredModels.length} of {models.length} models
          </p>
        </div>
      </div>

      {/* Models List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredModels.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No projector models found</p>
            <p className="text-sm text-gray-500">Add your first projector model to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Model Number</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Manufacturer</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Specifications</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredModels.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{model.modelNo}</span>
                    </td>
                    <td className="px-6 py-4">
                      {model.manufacturer ? (
                        <span className="text-sm text-gray-600">{model.manufacturer}</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      {model.specifications ? (
                        <span className="text-sm text-gray-600 line-clamp-2">{model.specifications}</span>
                      ) : (
                        <span className="text-xs text-gray-400">No specifications</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {model.createdAt ? (
                        <span className="text-sm text-gray-600">
                          {new Date(model.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditModel(model)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModel(model.id, model.modelNo)}
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
        )}
      </div>

      {/* Info Box */}
      {models.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">About Projector Models</h4>
              <p className="text-sm text-blue-700">
                Projector models are the catalog entries (e.g., CP2220, CP2230). After creating models here, 
                you can add specific parts for each model in the <strong>Parts</strong> page, and track 
                individual physical units with serial numbers in <strong>Master Data</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

