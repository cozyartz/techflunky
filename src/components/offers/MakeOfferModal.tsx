import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Platform {
  id: string;
  title: string;
  price: number;
  acceptsOffers: boolean;
  minOfferAmount?: number;
}

interface MakeOfferModalProps {
  platform: Platform;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (offerId: string) => void;
}

export default function MakeOfferModal({ platform, isOpen, onClose, onSuccess }: MakeOfferModalProps) {
  const [formData, setFormData] = useState({
    buyerName: '',
    buyerEmail: '',
    offerAmount: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const askingPrice = platform.price / 100; // Convert from cents
  const minOffer = platform.minOfferAmount ? platform.minOfferAmount / 100 : askingPrice * 0.6;
  const suggestedOffer = Math.round(askingPrice * 0.85);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const offerAmount = parseInt(formData.offerAmount);

      if (offerAmount < minOffer) {
        throw new Error(`Minimum offer amount is ${formatPrice(minOffer)}`);
      }

      if (offerAmount >= askingPrice) {
        throw new Error(`Offer amount must be less than asking price of ${formatPrice(askingPrice)}`);
      }

      const response = await fetch('/api/offers/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platformId: platform.id,
          buyerName: formData.buyerName,
          buyerEmail: formData.buyerEmail,
          offerAmount: offerAmount * 100, // Convert to cents
          message: formData.message
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit offer');
      }

      onSuccess(result.offerId);
      onClose();

      // Reset form
      setFormData({
        buyerName: '',
        buyerEmail: '',
        offerAmount: '',
        message: ''
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!platform.acceptsOffers) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Make an Offer</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{platform.title}</h4>
                <div className="text-sm text-gray-600">
                  <div>Asking Price: <span className="font-semibold">{formatPrice(askingPrice)}</span></div>
                  <div>Minimum Offer: <span className="font-semibold">{formatPrice(minOffer)}</span></div>
                  <div className="text-green-600 mt-1">
                    💡 Tip: Offers around {formatPrice(suggestedOffer)} (85%) are often accepted
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="buyerName"
                    value={formData.buyerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="buyerEmail"
                    value={formData.buyerEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="offerAmount"
                      value={formData.offerAmount}
                      onChange={handleInputChange}
                      required
                      min={minOffer}
                      max={askingPrice - 1}
                      step="1000"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder={suggestedOffer.toString()}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to Seller (Optional)
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                    placeholder="Tell the seller why you're interested in their platform..."
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  <div className="font-medium mb-1">📋 What happens next:</div>
                  <ul className="text-xs space-y-1">
                    <li>• Your offer expires in 72 hours</li>
                    <li>• The seller will be notified immediately</li>
                    <li>• You'll receive email updates on offer status</li>
                    <li>• Accepted offers are processed through secure escrow</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold ${
                      isSubmitting
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-yellow-300'
                    } transition-colors`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Offer'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}