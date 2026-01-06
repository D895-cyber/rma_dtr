import React, { useState, useEffect } from 'react';
import { Search, Star, Trash2, Loader2, Save } from 'lucide-react';
import { searchService, SavedSearch } from '../services/search.service';

interface SavedSearchesProps {
  caseType: 'DTR' | 'RMA';
  currentFilters: any;
  onApplySearch: (filters: any) => void;
  onSaveSearch?: () => void;
}

export function SavedSearches({ caseType, currentFilters, onApplySearch, onSaveSearch }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadSearches();
  }, [caseType]);

  const loadSearches = async () => {
    try {
      setLoading(true);
      const response = await searchService.getSavedSearches(caseType);
      if (response.success) {
        setSearches(response.data.searches);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (search: SavedSearch) => {
    await searchService.useSavedSearch(search.id);
    onApplySearch(search.filters);
  };

  const handleSave = async () => {
    if (!searchName.trim()) {
      alert('Please enter a name for this search');
      return;
    }

    try {
      await searchService.createSavedSearch({
        name: searchName,
        caseType,
        filters: currentFilters,
        isPublic: false,
      });
      setShowSaveDialog(false);
      setSearchName('');
      await loadSearches();
      onSaveSearch?.();
    } catch (error) {
      console.error('Failed to save search:', error);
      alert('Failed to save search');
    }
  };

  const handleDelete = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return;
    }

    try {
      await searchService.deleteSavedSearch(searchId);
      await loadSearches();
    } catch (error) {
      console.error('Failed to delete search:', error);
      alert('Failed to delete search');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading saved searches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Saved Searches</span>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Save className="w-3 h-3" />
          <span>Save Current</span>
        </button>
      </div>

      {showSaveDialog && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Enter search name..."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {searches.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-2">No saved searches</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {searches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors group"
            >
              <button
                onClick={() => handleApply(search)}
                className="flex-1 text-left text-sm text-gray-700 hover:text-blue-600"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="font-medium">{search.name}</span>
                  {search.isPublic && (
                    <span className="text-xs text-gray-500">(Public)</span>
                  )}
                </div>
                {search.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{search.description}</p>
                )}
              </button>
              <button
                onClick={() => handleDelete(search.id)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

