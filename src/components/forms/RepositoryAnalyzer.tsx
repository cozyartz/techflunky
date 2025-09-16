import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RepositoryIntegration,
  type RepositoryInfo,
  type RepositoryAnalysis
} from '../../lib/utils/repository-integration';

interface RepositoryAnalyzerProps {
  onAnalysisComplete?: (analysis: RepositoryAnalysis, repoInfo: RepositoryInfo) => void;
  className?: string;
}

export function RepositoryAnalyzer({ onAnalysisComplete, className }: RepositoryAnalyzerProps) {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepositoryInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const parsedRepo = RepositoryIntegration.parseRepositoryUrl(url.trim());
      if (!parsedRepo) {
        throw new Error('Invalid repository URL. Please enter a GitHub, GitLab, or Bitbucket URL.');
      }

      setRepoInfo(parsedRepo);
      const analysisResult = await RepositoryIntegration.analyzeRepository(parsedRepo);

      if (!analysisResult) {
        throw new Error('Could not analyze repository. It may be private or inaccessible.');
      }

      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult, parsedRepo);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze repository');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setAnalysis(null);
    setRepoInfo(null);
    setError(null);
  };

  const insights = analysis ? RepositoryIntegration.generateRepositoryInsights(analysis) : [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className="flex-1 px-4 py-3 bg-black/30 border border-yellow-400/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !url.trim()}
            className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </div>
            ) : (
              'Analyze'
            )}
          </button>
          {(analysis || error) && (
            <button
              onClick={handleClear}
              className="px-4 py-3 rounded-xl bg-gray-600 text-white font-medium hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {analysis && repoInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-black/20 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Repository Analysis</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                    {repoInfo.type.toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    analysis.estimatedComplexity === 'low' ? 'bg-green-500/20 text-green-400' :
                    analysis.estimatedComplexity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    analysis.estimatedComplexity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {analysis.estimatedComplexity.replace('-', ' ')} complexity
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Stats */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Project Stats</h4>
                  <div className="space-y-2 text-sm">
                    {analysis.stars !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stars:</span>
                        <span className="text-white">{analysis.stars.toLocaleString()}</span>
                      </div>
                    )}
                    {analysis.forks !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Forks:</span>
                        <span className="text-white">{analysis.forks.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contributors:</span>
                      <span className="text-white">{analysis.contributors}</span>
                    </div>
                    {analysis.openIssues !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Open Issues:</span>
                        <span className="text-white">{analysis.openIssues}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Languages</h4>
                  <div className="space-y-2">
                    {Object.entries(analysis.languages)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([lang, bytes]) => {
                        const total = Object.values(analysis.languages).reduce((sum, b) => sum + b, 0);
                        const percentage = ((bytes / total) * 100).toFixed(1);
                        return (
                          <div key={lang} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">{lang}</span>
                              <span className="text-gray-400">{percentage}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-700 rounded-full">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Quality Indicators */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Quality Indicators</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${analysis.hasTests ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-gray-300">Automated Tests</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${analysis.hasDocumentation ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-gray-300">Documentation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${analysis.hasDockerfile ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      <span className="text-gray-300">Docker Ready</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${analysis.hasCICD ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      <span className="text-gray-300">CI/CD Pipeline</span>
                    </div>
                    {analysis.license && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-gray-300">{analysis.license} License</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tech Stack */}
              {analysis.techStack.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Frameworks */}
              {analysis.frameworks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Frameworks & Libraries</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.frameworks.map((framework) => (
                      <span
                        key={framework}
                        className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {framework}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {insights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">AI Insights</h4>
                  <div className="space-y-2">
                    {insights.map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2 text-sm text-gray-300 p-2 bg-black/20 rounded-lg"
                      >
                        <span className="flex-shrink-0">{insight.slice(0, 2)}</span>
                        <span>{insight.slice(3)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}