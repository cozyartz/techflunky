import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { FIELD_LIMITS } from '../../lib/validation/seller-schemas';

interface SmartTextInputProps {
  label: string;
  fieldName: keyof typeof FIELD_LIMITS;
  registration: UseFormRegisterReturn;
  value?: string;
  error?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel';
}

export function SmartTextInput({
  label,
  fieldName,
  registration,
  value = '',
  error,
  placeholder,
  helpText,
  required = false,
  type = 'text'
}: SmartTextInputProps) {
  const limits = FIELD_LIMITS[fieldName];
  const currentLength = value?.length || 0;
  const isOptimal = currentLength >= limits.optimal && currentLength <= limits.maximum;
  const isOverOptimal = currentLength > limits.optimal && currentLength <= limits.maximum;
  const isOverMax = currentLength > limits.maximum;

  const getCharacterCountColor = () => {
    if (isOverMax) return 'text-red-400';
    if (isOverOptimal) return 'text-yellow-400';
    if (isOptimal) return 'text-green-400';
    return 'text-gray-400';
  };

  const getProgressBarColor = () => {
    if (isOverMax) return 'bg-red-500';
    if (isOverOptimal) return 'bg-yellow-500';
    if (isOptimal) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const progressPercentage = Math.min((currentLength / limits.maximum) * 100, 100);
  const optimalPercentage = (limits.optimal / limits.maximum) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className={`text-xs ${getCharacterCountColor()}`}>
          {currentLength}/{limits.maximum}
          {currentLength < limits.optimal && (
            <span className="text-gray-500 ml-1">(aim for {limits.optimal}+)</span>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          type={type}
          {...registration}
          className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white placeholder-gray-400 transition-all duration-300 focus:ring-2 focus:ring-yellow-400/20 ${
            error
              ? 'border-red-400 focus:border-red-400'
              : isOverMax
              ? 'border-red-400'
              : isOptimal
              ? 'border-green-400 focus:border-green-400'
              : 'border-yellow-400/20 focus:border-yellow-400'
          }`}
          placeholder={placeholder}
          maxLength={limits.maximum}
        />

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Optimal marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400 opacity-50"
            style={{ left: `${optimalPercentage}%` }}
          />
        </div>
      </div>

      {/* Help text and feedback */}
      <div className="space-y-1">
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </p>
        )}

        {helpText && !error && (
          <p className="text-xs text-gray-400">{helpText}</p>
        )}

        {/* Dynamic feedback based on length */}
        {!error && currentLength > 0 && (
          <div className="text-xs">
            {isOptimal && (
              <p className="text-green-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Perfect length! This will look great in your listing.
              </p>
            )}
            {isOverOptimal && (
              <p className="text-yellow-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                A bit long, but still acceptable. Consider trimming for better impact.
              </p>
            )}
            {currentLength < limits.optimal && currentLength > 10 && (
              <p className="text-blue-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Good start! Add more details to reach the optimal length.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}