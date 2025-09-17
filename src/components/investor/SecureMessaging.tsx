// Secure Messaging System - Platform Owner & Investor Communication
// End-to-end encrypted messaging with compliance features for TechFlunky
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserType: 'investor' | 'platform_owner' | 'admin';
  toUserId: string;
  toUserName: string;
  platformId?: string;
  platformName?: string;
  content: string;
  messageType: 'text' | 'document' | 'milestone_update' | 'financial_report' | 'system';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isEncrypted: boolean;
  timestamp: string;
  readAt?: string;
  replyToMessageId?: string;
  attachments: MessageAttachment[];
  complianceFlags: string[];
  isConfidential: boolean;
}

interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isEncrypted: boolean;
  downloadUrl: string;
  uploadedAt: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  platformId?: string;
  platformName?: string;
  subject: string;
  lastMessage: Message;
  unreadCount: number;
  isConfidential: boolean;
  complianceLevel: 'standard' | 'enhanced' | 'regulatory';
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  userId: string;
  userName: string;
  userType: 'investor' | 'platform_owner' | 'admin';
  role: string;
  avatar?: string;
  lastSeenAt: string;
}

export default function SecureMessaging() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [complianceMode, setComplianceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // 30-second updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/messaging/conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.messages || []);

      // Mark messages as read
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/messaging/conversations/${conversationId}/mark-read`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`/api/messaging/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'text',
          priority: 'normal',
          isEncrypted: encryptionEnabled,
          isConfidential: complianceMode
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(selectedConversation);
        fetchConversations(); // Update conversation list
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const startNewConversation = async (platformOwnerId: string, platformId: string, subject: string) => {
    try {
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [platformOwnerId],
          platformId,
          subject,
          complianceLevel: complianceMode ? 'regulatory' : 'standard'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversationId);
        setShowNewConversation(false);
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 border-red-400/20';
      case 'high': return 'text-orange-400 border-orange-400/20';
      case 'normal': return 'text-blue-400 border-blue-400/20';
      case 'low': return 'text-gray-400 border-gray-400/20';
      default: return 'text-blue-400 border-blue-400/20';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.platformName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.userName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-[600px] bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Messages</h3>
            <button
              onClick={() => setShowNewConversation(true)}
              className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-3 py-1 rounded-lg text-sm font-medium hover:bg-yellow-400/20 transition-colors"
            >
              New
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pl-10 text-white text-sm focus:border-yellow-400 transition-colors"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Security Controls */}
          <div className="flex items-center space-x-4 mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={encryptionEnabled}
                onChange={(e) => setEncryptionEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border ${encryptionEnabled ? 'bg-green-400 border-green-400' : 'border-gray-400'} flex items-center justify-center`}>
                {encryptionEnabled && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-xs text-gray-400">Encryption</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={complianceMode}
                onChange={(e) => setComplianceMode(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border ${complianceMode ? 'bg-purple-400 border-purple-400' : 'border-gray-400'} flex items-center justify-center`}>
                {complianceMode && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="ml-2 text-xs text-gray-400">Compliance</span>
            </label>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              className={`p-4 border-b border-gray-800 cursor-pointer transition-colors hover:bg-gray-800/50 ${
                selectedConversation === conversation.id ? 'bg-yellow-400/10 border-l-2 border-l-yellow-400' : ''
              }`}
              onClick={() => setSelectedConversation(conversation.id)}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">{conversation.subject}</h4>
                  {conversation.platformName && (
                    <p className="text-xs text-gray-400 truncate">{conversation.platformName}</p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className="text-xs text-gray-400">{formatTimestamp(conversation.updatedAt)}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-yellow-400 text-black text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                  {conversation.isConfidential && (
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-300 truncate">{conversation.lastMessage.content}</p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  {conversation.participants.slice(0, 3).map((participant) => (
                    <div
                      key={participant.userId}
                      className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-xs text-white font-medium"
                    >
                      {participant.userName.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-1">
                  {conversation.lastMessage.isEncrypted && (
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {conversation.lastMessage.priority !== 'normal' && (
                    <span className={`w-2 h-2 rounded-full ${getPriorityColor(conversation.lastMessage.priority).includes('red') ? 'bg-red-400' : getPriorityColor(conversation.lastMessage.priority).includes('orange') ? 'bg-orange-400' : 'bg-gray-400'}`}></span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Messages Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">
                    {conversations.find(c => c.id === selectedConversation)?.subject}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {conversations.find(c => c.id === selectedConversation)?.platformName}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {encryptionEnabled && (
                    <span className="px-2 py-1 bg-green-400/10 text-green-400 border border-green-400/20 rounded-full text-xs font-medium">
                      Encrypted
                    </span>
                  )}
                  {complianceMode && (
                    <span className="px-2 py-1 bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded-full text-xs font-medium">
                      Compliance
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.fromUserType === 'investor' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`max-w-[70%] ${
                    message.fromUserType === 'investor'
                      ? 'bg-yellow-400/10 border border-yellow-400/20'
                      : 'bg-gray-800/50 border border-gray-700'
                  } rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{message.fromUserName}</span>
                      <div className="flex items-center space-x-2">
                        {message.isEncrypted && (
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        <span className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{message.content}</p>

                    {message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm text-gray-300 flex-1">{attachment.fileName}</span>
                            <span className="text-xs text-gray-400">{(attachment.fileSize / 1024).toFixed(1)}KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 transition-colors resize-none"
                    rows={3}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-medium hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Select a Conversation</h3>
              <p className="text-gray-400">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}