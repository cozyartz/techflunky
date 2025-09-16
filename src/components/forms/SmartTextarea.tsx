import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { UseFormRegisterReturn } from 'react-hook-form';
import { FIELD_LIMITS } from '../../lib/validation/seller-schemas';

interface SmartTextareaProps {
  label: string;
  fieldName: keyof typeof FIELD_LIMITS;
  registration: UseFormRegisterReturn;
  value?: string;
  error?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  minRows?: number;
  maxRows?: number;
}

export function SmartTextarea({
  label,
  fieldName,
  registration,
  value = '',
  error,
  placeholder,
  helpText,
  required = false,
  minRows = 3,
  maxRows = 8
}: SmartTextareaProps) {
  const limits = FIELD_LIMITS[fieldName];
  const currentLength = value?.length || 0;
  const wordCount = value?.trim().split(/\s+/).filter(word => word.length > 0).length || 0;

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

  // Smart suggestions based on content
  const getSmartSuggestion = () => {
    if (currentLength === 0) return null;

    if (currentLength < 50) {
      return "Add more details about key features, benefits, or technical aspects.";
    }

    if (currentLength < limits.optimal) {
      if (fieldName === 'description') {
        return "Consider adding: target audience, main problem solved, or key differentiators.";
      }
      if (fieldName === 'competitive_advantage') {
        return "Explain what makes your platform unique compared to competitors.";
      }
      if (fieldName === 'target_market') {
        return "Be specific about company size, industry, or user personas.";
      }
    }

    if (isOptimal) {
      return "Excellent! This description provides great detail while staying concise.";
    }

    if (isOverOptimal) {
      return "Consider condensing to highlight the most important points.";
    }

    return null;
  };

  const smartSuggestion = getSmartSuggestion();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">{wordCount} words</span>
          <span className={getCharacterCountColor()}>
            {currentLength}/{limits.maximum}
            {currentLength < limits.optimal && (
              <span className="text-gray-500 ml-1">(aim for {limits.optimal}+)</span>
            )}
          </span>
        </div>
      </div>

      <div className="relative">
        <TextareaAutosize
          {...registration}
          className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white placeholder-gray-400 resize-none transition-all duration-300 focus:ring-2 focus:ring-yellow-400/20 ${
            error
              ? 'border-red-400 focus:border-red-400'
              : isOverMax
              ? 'border-red-400'
              : isOptimal
              ? 'border-green-400 focus:border-green-400'
              : 'border-yellow-400/20 focus:border-yellow-400'
          }`}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          maxLength={limits.maximum}
        />

        {/* Character count overlay for visual feedback */}
        {currentLength > limits.optimal * 0.8 && (
          <div className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded ${
            isOverMax ? 'bg-red-500/20 text-red-300' :
            isOverOptimal ? 'bg-yellow-500/20 text-yellow-300' :
            isOptimal ? 'bg-green-500/20 text-green-300' :
            'bg-blue-500/20 text-blue-300'
          }`}>
            {limits.maximum - currentLength} left
          </div>
        )}
      </div>

      {/* Progress bar with optimal zone indicator */}
      <div className="relative">
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {/* Optimal zone indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-green-400 opacity-50"
          style={{ left: `${optimalPercentage}%` }}
        />
        <div className="absolute -top-4 text-xs text-green-400 opacity-50" style={{ left: `${optimalPercentage}%` }}>
          <span className="bg-black px-1 rounded">optimal</span>
        </div>
      </div>

      {/* Feedback and help */}
      <div className="space-y-1">
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </p>
        )}

        {smartSuggestion && !error && (
          <p className={`text-xs flex items-start gap-2 ${
            isOptimal ? 'text-green-400' :
            isOverOptimal ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <span>{smartSuggestion}</span>
          </p>
        )}

        {helpText && !error && !smartSuggestion && (
          <p className="text-xs text-gray-400">{helpText}</p>
        )}

        {/* Writing tips for specific field types */}
        {currentLength === 0 && fieldName === 'description' && (
          <div className="text-xs text-gray-500 bg-gray-900/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Writing tips for platform description:</p>
            <ul className="space-y-1 ml-3">
              <li>• Start with the main problem your platform solves</li>
              <li>• Mention your target audience (e.g., "small businesses", "enterprise teams")</li>
              <li>• Highlight 2-3 key features or benefits</li>
              <li>• Include any notable achievements or metrics</li>
            </ul>
          </div>
        )}

        {currentLength === 0 && fieldName === 'competitive_advantage' && (
          <div className="text-xs text-gray-500 bg-gray-900/50 p-3 rounded-lg">
            <p className="font-medium mb-1">🎯 Competitive advantage examples:</p>
            <ul className="space-y-1 ml-3">
              <li>• Unique technology or algorithm</li>
              <li>• Better user experience or interface</li>
              <li>• Lower costs or better pricing model</li>
              <li>• Faster performance or processing</li>
              <li>• Better integrations or ecosystem</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}