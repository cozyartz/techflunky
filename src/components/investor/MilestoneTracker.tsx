import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Milestone {
  id: string;
  platformId: string;
  platformName: string;
  platformCategory: string;
  title: string;
  description: string;
  targetDate: string;
  completionDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  impactLevel: 'low' | 'medium' | 'high';
  progressPercent: number;
  category: string;
  isOverdue: boolean;
  investmentAmount: number;
  currentValuation: number;
  createdAt: string;
  updatedAt: string;
}

interface Achievement {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  completionDate: string;
  impactLevel: string;
  investmentAmount: number;
}

interface UpcomingDeadline {
  id: string;
  platformId: string;
  platformName: string;
  title: string;
  targetDate: string;
  status: string;
  impactLevel: string;
  investmentAmount: number;
  daysUntilDue: number;
}

interface MilestoneTrackerProps {
  investorId: string;
  platformId?: string;
  className?: string;
}

export default function MilestoneTracker({ investorId, platformId, className = '' }: MilestoneTrackerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'achievements' | 'notifications'>('overview');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [summary, setSummary] = useState({
    totalMilestones: 0,
    completedCount: 0,
    inProgressCount: 0,
    overdueCount: 0
  });

  useEffect(() => {
    loadMilestoneData();
  }, [investorId, platformId, filterStatus]);

  const loadMilestoneData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        investorId,
        status: filterStatus
      });
      if (platformId) params.append('platformId', platformId);

      const response = await fetch(`/api/investors/milestones/tracking?${params}`);
      const data = await response.json();

      if (data.success) {
        setMilestones(data.milestones);
        setAchievements(data.achievements);
        setUpcomingDeadlines(data.upcomingDeadlines);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to load milestone data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMilestone = async (milestoneId: string, progressPercent: number, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/investors/milestones/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_milestone',
          milestoneId,
          investorId,
          progressPercent,
          status,
          notes
        })
      });

      const result = await response.json();
      if (result.success) {
        loadMilestoneData();
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-purple-100 text-purple-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilColor = (days: number) => {
    if (days <= 3) return 'text-red-600 font-semibold';
    if (days <= 7) return 'text-orange-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Milestone Tracker</h2>
        <button
          onClick={() => loadMilestoneData()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {['overview', 'milestones', 'achievements', 'notifications'].map((tab) => (
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
            {tab === 'notifications' && upcomingDeadlines.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {upcomingDeadlines.length}
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
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Milestones</p>
                        <p className="text-2xl font-bold text-blue-900">{summary.totalMilestones}</p>
                      </div>
                      <div className="text-blue-500 text-3xl">🎯</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Completed</p>
                        <p className="text-2xl font-bold text-green-900">{summary.completedCount}</p>
                      </div>
                      <div className="text-green-500 text-3xl">✅</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">In Progress</p>
                        <p className="text-2xl font-bold text-orange-900">{summary.inProgressCount}</p>
                      </div>
                      <div className="text-orange-500 text-3xl">🔄</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 font-medium">Overdue</p>
                        <p className="text-2xl font-bold text-red-900">{summary.overdueCount}</p>
                      </div>
                      <div className="text-red-500 text-3xl">⚠️</div>
                    </div>
                  </div>
                </div>

                {upcomingDeadlines.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
                    <div className="space-y-3">
                      {upcomingDeadlines.map((deadline) => (
                        <motion.div
                          key={deadline.id}
                          layout
                          className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{deadline.title}</h4>
                            <p className="text-sm text-gray-600">{deadline.platformName}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${getDaysUntilColor(deadline.daysUntilDue)}`}>
                              {deadline.daysUntilDue === 0 ? 'Due Today' :
                               deadline.daysUntilDue === 1 ? '1 day left' :
                               `${deadline.daysUntilDue} days left`}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(deadline.targetDate)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {achievements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {achievements.slice(0, 4).map((achievement) => (
                        <motion.div
                          key={achievement.id}
                          layout
                          className="p-4 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                              <p className="text-sm text-gray-600">{achievement.platformName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Completed: {formatDate(achievement.completionDate)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(achievement.impactLevel)}`}>
                              {achievement.impactLevel}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'milestones' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                </div>

                {milestones.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones Found</h3>
                    <p className="text-gray-500">Milestones will appear here as your platforms set goals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <motion.div
                        key={milestone.id}
                        layout
                        className={`border rounded-lg p-6 hover:shadow-md transition-all cursor-pointer ${
                          milestone.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedMilestone(milestone)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                            <p className="text-gray-600 mt-1">{milestone.description}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {milestone.platformName} • {milestone.category}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                              {milestone.status}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(milestone.impactLevel)}`}>
                              {milestone.impactLevel} impact
                            </span>
                            {milestone.isOverdue && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{milestone.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                milestone.status === 'completed' ? 'bg-green-500' :
                                milestone.isOverdue ? 'bg-red-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${Math.min(milestone.progressPercent, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Target: {formatDate(milestone.targetDate)}</span>
                          {milestone.completionDate && (
                            <span>Completed: {formatDate(milestone.completionDate)}</span>
                          )}
                          <span>Investment: ${milestone.investmentAmount.toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-4">
                {achievements.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🏆</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Achievements</h3>
                    <p className="text-gray-500">Completed milestones will appear here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <motion.div
                        key={achievement.id}
                        layout
                        className="p-6 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                            <p className="text-sm text-gray-600">{achievement.platformName}</p>
                          </div>
                          <div className="text-green-500 text-2xl">🎉</div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(achievement.impactLevel)}`}>
                            {achievement.impactLevel} impact
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(achievement.completionDate)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <NotificationCenter
                investorId={investorId}
                onNotificationRead={loadMilestoneData}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMilestone && (
        <MilestoneDetailModal
          milestone={selectedMilestone}
          investorId={investorId}
          onClose={() => setSelectedMilestone(null)}
          onUpdate={(id, progress, status, notes) => {
            updateMilestone(id, progress, status, notes);
            setSelectedMilestone(null);
          }}
        />
      )}
    </div>
  );
}

interface MilestoneDetailModalProps {
  milestone: Milestone;
  investorId: string;
  onClose: () => void;
  onUpdate: (id: string, progress: number, status: string, notes?: string) => void;
}

function MilestoneDetailModal({ milestone, investorId, onClose, onUpdate }: MilestoneDetailModalProps) {
  const [progress, setProgress] = useState(milestone.progressPercent);
  const [status, setStatus] = useState(milestone.status);
  const [notes, setNotes] = useState('');

  const handleUpdate = () => {
    onUpdate(milestone.id, progress, status, notes);
  };

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
          <h2 className="text-2xl font-bold text-gray-900">{milestone.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-600">{milestone.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">{progress}%</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Add any notes about this milestone..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Update Milestone
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface NotificationCenterProps {
  investorId: string;
  onNotificationRead: () => void;
}

function NotificationCenter({ investorId, onNotificationRead }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [investorId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // This would fetch from a notifications API endpoint
      // For now, showing placeholder content
      setNotifications([]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🔔</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Center</h3>
        <p className="text-gray-500">Achievement alerts and milestone reminders will appear here</p>
      </div>
    </div>
  );
}