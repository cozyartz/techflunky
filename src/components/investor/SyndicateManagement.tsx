import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Syndicate {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  minimumInvestment: number;
  maximumInvestment: number;
  status: string;
  deadline: string;
  leadInvestor: string;
  myRole: string;
  myInvestment: number;
  votingPower: number;
  memberCount: number;
  fundingProgress: number;
  targetPlatform: {
    name: string;
    category: string;
    aiScore: number;
  };
}

interface SyndicateInvitation {
  id: string;
  syndicateId: string;
  syndicate: {
    name: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    minimumInvestment: number;
    platform: {
      name: string;
      aiScore: number;
    };
  };
  invitedBy: string;
  message: string;
  createdAt: string;
  expiresAt: string;
}

interface SyndicateOpportunity {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  minimumInvestment: number;
  maximumInvestment: number;
  deadline: string;
  isPublic: boolean;
  currentMembers: number;
  fundingProgress: number;
  platform: {
    name: string;
    category: string;
    aiScore: number;
    expectedROI: number;
  };
}

interface SyndicateManagementProps {
  investorId: string;
  className?: string;
}

export default function SyndicateManagement({ investorId, className = '' }: SyndicateManagementProps) {
  const [activeTab, setActiveTab] = useState<'syndicates' | 'invitations' | 'opportunities' | 'create'>('syndicates');
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
  const [invitations, setInvitations] = useState<SyndicateInvitation[]>([]);
  const [opportunities, setOpportunities] = useState<SyndicateOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSyndicate, setSelectedSyndicate] = useState<Syndicate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadSyndicateData();
  }, [investorId, activeTab]);

  const loadSyndicateData = async () => {
    setLoading(true);
    try {
      const endpoints = {
        syndicates: `/api/investors/syndicates/management?investorId=${investorId}&action=list`,
        invitations: `/api/investors/syndicates/management?investorId=${investorId}&action=invitations`,
        opportunities: `/api/investors/syndicates/management?investorId=${investorId}&action=opportunities`
      };

      if (activeTab === 'syndicates') {
        const response = await fetch(endpoints.syndicates);
        const data = await response.json();
        if (data.success) setSyndicates(data.syndicates);
      } else if (activeTab === 'invitations') {
        const response = await fetch(endpoints.invitations);
        const data = await response.json();
        if (data.success) setInvitations(data.invitations);
      } else if (activeTab === 'opportunities') {
        const response = await fetch(endpoints.opportunities);
        const data = await response.json();
        if (data.success) setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error('Failed to load syndicate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSyndicate = async (syndicateId: string, investmentAmount: number) => {
    try {
      const response = await fetch('/api/investors/syndicates/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_syndicate',
          syndicateId,
          investorId,
          investmentAmount
        })
      });

      const result = await response.json();
      if (result.success) {
        loadSyndicateData();
      }
    } catch (error) {
      console.error('Failed to join syndicate:', error);
    }
  };

  const handleInvitationResponse = async (invitationId: string, response: 'accept' | 'decline', investmentAmount?: number) => {
    try {
      const apiResponse = await fetch('/api/investors/syndicates/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_invitation',
          invitationId,
          response,
          investmentAmount
        })
      });

      const result = await apiResponse.json();
      if (result.success) {
        loadSyndicateData();
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead': return 'bg-purple-100 text-purple-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fundraising': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Syndicate Management</h2>
        <button
          onClick={() => setActiveTab('create')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create Syndicate
        </button>
      </div>

      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {['syndicates', 'invitations', 'opportunities', 'create'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'invitations' && invitations.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {invitations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center h-64"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'syndicates' && (
              <div className="space-y-4">
                {syndicates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🏛️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Syndicates Yet</h3>
                    <p className="text-gray-500 mb-4">Join or create your first investment syndicate</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      Create Syndicate
                    </button>
                  </div>
                ) : (
                  syndicates.map((syndicate) => (
                    <motion.div
                      key={syndicate.id}
                      layout
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSyndicate(syndicate)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{syndicate.name}</h3>
                          <p className="text-gray-600 mt-1">{syndicate.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(syndicate.myRole)}`}>
                            {syndicate.myRole}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(syndicate.status)}`}>
                            {syndicate.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Target Platform</p>
                          <p className="font-medium">{syndicate.targetPlatform.name}</p>
                          <p className="text-xs text-gray-500">{syndicate.targetPlatform.category}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">My Investment</p>
                          <p className="font-medium">{formatCurrency(syndicate.myInvestment)}</p>
                          <p className="text-xs text-gray-500">{syndicate.votingPower}% voting power</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Progress</p>
                          <p className="font-medium">{formatCurrency(syndicate.currentAmount)} / {formatCurrency(syndicate.targetAmount)}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(syndicate.fundingProgress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{syndicate.memberCount} members</span>
                        <span>Deadline: {formatDate(syndicate.deadline)}</span>
                        <span>AI Score: {syndicate.targetPlatform.aiScore}/10</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div className="space-y-4">
                {invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Invitations</h3>
                    <p className="text-gray-500">You'll see syndicate invitations here when you receive them</p>
                  </div>
                ) : (
                  invitations.map((invitation) => (
                    <motion.div
                      key={invitation.id}
                      layout
                      className="border border-gray-200 rounded-lg p-6 bg-blue-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{invitation.syndicate.name}</h3>
                          <p className="text-gray-600 mt-1">{invitation.syndicate.description}</p>
                          <p className="text-sm text-gray-500 mt-2">Invited by: {invitation.invitedBy}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires: {formatDate(invitation.expiresAt)}
                        </div>
                      </div>

                      {invitation.message && (
                        <div className="bg-white p-3 rounded-lg mb-4">
                          <p className="text-sm text-gray-700">"{invitation.message}"</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Target Amount</p>
                          <p className="font-medium">{formatCurrency(invitation.syndicate.targetAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Minimum Investment</p>
                          <p className="font-medium">{formatCurrency(invitation.syndicate.minimumInvestment)}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'accept', invitation.syndicate.minimumInvestment)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Accept & Join
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="space-y-4">
                {opportunities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Opportunities</h3>
                    <p className="text-gray-500">Check back later for new syndicate opportunities</p>
                  </div>
                ) : (
                  opportunities.map((opportunity) => (
                    <motion.div
                      key={opportunity.id}
                      layout
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{opportunity.name}</h3>
                          <p className="text-gray-600 mt-1">{opportunity.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {opportunity.isPublic && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Public
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {opportunity.currentMembers} members
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Target Platform</p>
                          <p className="font-medium">{opportunity.platform.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {opportunity.platform.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              AI: {opportunity.platform.aiScore}/10
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Investment Range</p>
                          <p className="font-medium">
                            {formatCurrency(opportunity.minimumInvestment)} - {formatCurrency(opportunity.maximumInvestment)}
                          </p>
                          <p className="text-xs text-gray-500">Expected ROI: {opportunity.platform.expectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Progress</p>
                          <p className="font-medium">
                            {formatCurrency(opportunity.currentAmount)} / {formatCurrency(opportunity.targetAmount)}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(opportunity.fundingProgress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          Deadline: {formatDate(opportunity.deadline)}
                        </span>
                        <button
                          onClick={() => handleJoinSyndicate(opportunity.id, opportunity.minimumInvestment)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Join Syndicate
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'create' && (
              <CreateSyndicateForm
                investorId={investorId}
                onSuccess={() => {
                  setActiveTab('syndicates');
                  loadSyndicateData();
                }}
                onCancel={() => setActiveTab('syndicates')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedSyndicate && (
        <SyndicateDetailModal
          syndicate={selectedSyndicate}
          investorId={investorId}
          onClose={() => setSelectedSyndicate(null)}
          onUpdate={loadSyndicateData}
        />
      )}
    </div>
  );
}

interface CreateSyndicateFormProps {
  investorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateSyndicateForm({ investorId, onSuccess, onCancel }: CreateSyndicateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetPlatformId: '',
    targetAmount: '',
    minimumInvestment: '',
    maximumInvestment: '',
    deadline: '',
    isPublic: true,
    initialInvestment: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/investors/syndicates/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_syndicate',
          investorId,
          ...formData,
          targetAmount: parseInt(formData.targetAmount),
          minimumInvestment: parseInt(formData.minimumInvestment),
          maximumInvestment: parseInt(formData.maximumInvestment),
          initialInvestment: parseInt(formData.initialInvestment) || 0
        })
      });

      const result = await response.json();
      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create syndicate:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Syndicate Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., TechFlunky Platform Investment Group"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Amount ($)
          </label>
          <input
            type="number"
            required
            value={formData.targetAmount}
            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="500000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Investment ($)
          </label>
          <input
            type="number"
            required
            value={formData.minimumInvestment}
            onChange={(e) => setFormData({ ...formData, minimumInvestment: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="25000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Investment ($)
          </label>
          <input
            type="number"
            required
            value={formData.maximumInvestment}
            onChange={(e) => setFormData({ ...formData, maximumInvestment: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="100000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deadline
          </label>
          <input
            type="date"
            required
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Initial Investment ($)
          </label>
          <input
            type="number"
            value={formData.initialInvestment}
            onChange={(e) => setFormData({ ...formData, initialInvestment: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="50000"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Describe the investment opportunity and syndicate goals..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.isPublic}
          onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
          Make this syndicate publicly discoverable
        </label>
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create Syndicate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface SyndicateDetailModalProps {
  syndicate: Syndicate;
  investorId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function SyndicateDetailModal({ syndicate, investorId, onClose, onUpdate }: SyndicateDetailModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{syndicate.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-gray-600">{syndicate.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Investment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Amount:</span>
                  <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(syndicate.targetAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Amount:</span>
                  <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(syndicate.currentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">My Investment:</span>
                  <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(syndicate.myInvestment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">My Voting Power:</span>
                  <span className="font-medium">{syndicate.votingPower}%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Platform Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform:</span>
                  <span className="font-medium">{syndicate.targetPlatform.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{syndicate.targetPlatform.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AI Score:</span>
                  <span className="font-medium">{syndicate.targetPlatform.aiScore}/10</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all"
                style={{ width: `${Math.min(syndicate.fundingProgress, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{syndicate.fundingProgress.toFixed(1)}% funded</span>
              <span>{syndicate.memberCount} members</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}