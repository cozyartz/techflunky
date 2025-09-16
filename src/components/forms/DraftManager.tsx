import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormPersistence, type FormDraft, formatLastSaved } from '../../lib/utils/form-persistence';

interface DraftManagerProps {
  onLoadDraft: (draft: FormDraft) => void;
  onClose: () => void;
  currentDraftId?: string;
}

export function DraftManager({ onLoadDraft, onClose, currentDraftId }: DraftManagerProps) {
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<FormDraft | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = () => {
    setDrafts(FormPersistence.getDraftsHistory());
  };

  const handleLoadDraft = (draft: FormDraft) => {
    onLoadDraft(draft);
    onClose();
  };

  const handleDeleteDraft = (id: string) => {
    FormPersistence.deleteDraft(id);
    loadDrafts();
    setShowConfirmDelete(null);
    if (selectedDraft?.id === id) {
      setSelectedDraft(null);
    }
  };

  const handleExportDraft = (draft: FormDraft) => {
    const jsonString = FormPersistence.exportDraft(draft.id);
    if (jsonString) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `techflunky-draft-${draft.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportDraft = () => {
    if (importText.trim()) {
      const success = FormPersistence.importDraft(importText.trim());
      if (success) {
        loadDrafts();
        setImportText('');
        setShowImport(false);
      } else {
        alert('Invalid draft format. Please check your file and try again.');
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all drafts? This cannot be undone.')) {
      FormPersistence.clearAllDrafts();
      loadDrafts();
      setSelectedDraft(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Manage Drafts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Drafts List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Saved Drafts ({drafts.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="text-xs px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                >
                  Import
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  disabled={drafts.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>

            {showImport && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-black/20 border border-blue-500/20 rounded-xl p-4">
                  <label className="block text-sm text-gray-300 mb-2">Import Draft JSON</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste your exported draft JSON here..."
                    className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleImportDraft}
                      disabled={!importText.trim()}
                      className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => setShowImport(false)}
                      className="px-3 py-1 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No saved drafts found</p>
                  <p className="text-sm mt-1">Your form auto-saves as you work</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedDraft?.id === draft.id
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                    } ${currentDraftId === draft.id ? 'ring-2 ring-yellow-400/50' : ''}`}
                    onClick={() => setSelectedDraft(draft)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {draft.data.step1?.platformName || 'Untitled Platform'}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {draft.data.step1?.elevatorPitch || 'No description available'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Step {draft.step} of 7</span>
                          <span>{draft.completion}% complete</span>
                          <span>Quality: {draft.qualityScore}%</span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-400">
                          {formatLastSaved(draft.lastSaved)}
                        </div>
                        {currentDraftId === draft.id && (
                          <div className="text-xs text-yellow-400 mt-1">
                            Current
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-1">
                      <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${(draft.step / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Draft Details & Actions */}
          <div className="space-y-4">
            {selectedDraft ? (
              <>
                <h3 className="text-sm font-medium text-gray-300">Draft Details</h3>

                <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                  <h4 className="font-medium text-white mb-2">
                    {selectedDraft.data.step1?.platformName || 'Untitled Platform'}
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Progress:</span>
                      <span className="text-white">{selectedDraft.completion}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span className="text-white">{selectedDraft.qualityScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Step:</span>
                      <span className="text-white">{selectedDraft.step} of 7</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last saved:</span>
                      <span className="text-white">{formatLastSaved(selectedDraft.lastSaved)}</span>
                    </div>
                  </div>

                  {selectedDraft.data.step1?.elevatorPitch && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Elevator Pitch:</p>
                      <p className="text-sm text-gray-300 line-clamp-3">
                        {selectedDraft.data.step1.elevatorPitch}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleLoadDraft(selectedDraft)}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                  >
                    Load This Draft
                  </button>

                  <button
                    onClick={() => handleExportDraft(selectedDraft)}
                    className="w-full px-4 py-2 rounded-xl bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
                  >
                    Export JSON
                  </button>

                  <button
                    onClick={() => setShowConfirmDelete(selectedDraft.id)}
                    className="w-full px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                  >
                    Delete Draft
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-black/10 border border-white/5 rounded-xl p-6 text-center">
                <svg className="w-8 h-8 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400">
                  Select a draft to view details and actions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showConfirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800 border border-white/10 rounded-xl p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-semibold text-white mb-2">Delete Draft?</h3>
                <p className="text-gray-400 mb-6">
                  This action cannot be undone. The draft will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDeleteDraft(showConfirmDelete)}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(null)}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-600 text-white font-medium hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}