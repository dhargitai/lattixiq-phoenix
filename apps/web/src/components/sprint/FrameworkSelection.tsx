'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import type { KnowledgeContent } from '@phoenix/core';

interface SearchFilters {
  contentType: string[];
  targetPersona: string[];
  startupPhase: string[];
  problemCategory: string[];
  superModel?: boolean;
}

interface FrameworkCardProps {
  framework: KnowledgeContent;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

function FrameworkCard({ framework, isSelected, onSelect, onDeselect }: FrameworkCardProps) {
  const handleToggle = () => {
    if (isSelected) {
      onDeselect();
    } else {
      onSelect();
    }
  };

  return (
    <div className={`card bg-base-100 border-2 transition-all duration-200 ${
      isSelected 
        ? 'border-primary bg-primary/5 shadow-lg' 
        : 'border-base-300 hover:border-base-400 hover:shadow-md'
    }`}>
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="card-title text-base mb-2">{framework.title}</h4>
            
            {/* Type and Category Badges */}
            <div className="flex flex-wrap gap-1 mb-3">
              <div className={`badge badge-sm ${
                framework.type === 'mental-model' ? 'badge-info' :
                framework.type === 'cognitive-bias' ? 'badge-warning' :
                framework.type === 'fallacy' ? 'badge-error' :
                framework.type === 'strategic-framework' ? 'badge-success' :
                'badge-ghost'
              }`}>
                {framework.type.replace('-', ' ')}
              </div>
              <div className="badge badge-ghost badge-sm">
                {framework.mainCategory}
              </div>
              {framework.superModel && (
                <div className="badge badge-accent badge-sm">
                  Super Model
                </div>
              )}
            </div>

            {/* Hook/Definition */}
            <p className="text-sm text-base-content/80 mb-2 line-clamp-2">
              {framework.hook}
            </p>
            
            {/* Key Takeaway */}
            <p className="text-xs text-base-content/60 line-clamp-1">
              💡 {framework.keyTakeaway}
            </p>

            {/* Target Info */}
            <div className="mt-3 text-xs text-base-content/50">
              <span>For: {framework.targetPersona.join(', ')}</span>
              {framework.startupPhase.length > 0 && (
                <span> • Phase: {framework.startupPhase.join(', ')}</span>
              )}
            </div>
          </div>

          {/* Selection Button */}
          <button
            className={`btn btn-sm ml-3 ${
              isSelected 
                ? 'btn-primary' 
                : 'btn-outline btn-primary'
            }`}
            onClick={handleToggle}
          >
            {isSelected ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Selected
              </>
            ) : (
              'Select'
            )}
          </button>
        </div>

        {/* Expand for More Details */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-base-200 space-y-2">
            <div>
              <h5 className="text-xs font-semibold text-base-content/70 mb-1">Definition</h5>
              <p className="text-xs text-base-content/80">{framework.definition}</p>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-base-content/70 mb-1">Modern Example</h5>
              <p className="text-xs text-base-content/80">{framework.modernExample}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <h5 className="text-xs font-semibold text-error mb-1">⚠️ Pitfall</h5>
                <p className="text-xs text-base-content/80">{framework.pitfall}</p>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-success mb-1">✅ Payoff</h5>
                <p className="text-xs text-base-content/80">{framework.payoff}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FrameworkSelection() {
  const {
    problemBrief,
    diagnosticResponses,
    selectedFrameworks,
    frameworkRecommendations,
    setFrameworkRecommendations,
    selectFramework,
    deselectFramework,
    setCurrentStage,
    markStageCompleted,
    setLoading,
    isLoading,
  } = useSprintStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    contentType: [],
    targetPersona: ['founder'],
    startupPhase: ['seed'],
    problemCategory: [],
    superModel: undefined,
  });
  const [searchResults, setSearchResults] = useState<KnowledgeContent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Auto-generate search query and perform initial search
  useEffect(() => {
    if (problemBrief && frameworkRecommendations.length === 0) {
      generateSearchQuery();
    }
  }, [problemBrief]);

  const generateSearchQuery = useCallback(() => {
    if (!problemBrief) return;

    // Create search query from problem brief
    const queryParts = [
      problemBrief.summary,
      problemBrief.context,
      problemBrief.stakes,
    ].filter(part => part && part.trim().length > 0);

    const query = queryParts.join(' ').slice(0, 500); // Limit query length
    setSearchQuery(query);
    
    // Set filters based on problem brief and diagnostics
    const newFilters: SearchFilters = {
      contentType: problemBrief.decisionType === 'type-2' 
        ? ['strategic-framework', 'mental-model'] 
        : ['tactical-tool', 'mental-model'],
      targetPersona: ['founder'],
      startupPhase: mapStartupPhase(),
      problemCategory: extractProblemCategories(),
      superModel: undefined,
    };
    setFilters(newFilters);

    // Perform initial search
    performSearch(query, newFilters);
  }, [problemBrief, diagnosticResponses]);

  const mapStartupPhase = (): string[] => {
    const company_stage = diagnosticResponses.company_stage as string;
    if (company_stage?.includes('Pre-revenue')) return ['ideation'];
    if (company_stage?.includes('Early revenue')) return ['seed'];
    if (company_stage?.includes('Scaling')) return ['growth'];
    if (company_stage?.includes('Established')) return ['scale-up'];
    return ['seed']; // default
  };

  const extractProblemCategories = (): string[] => {
    const categories = [];
    const problem = problemBrief?.summary?.toLowerCase() || '';
    
    if (problem.includes('product') || problem.includes('feature')) {
      categories.push('Product Development');
    }
    if (problem.includes('market') || problem.includes('customer')) {
      categories.push('Market Strategy');
    }
    if (problem.includes('team') || problem.includes('hire') || problem.includes('people')) {
      categories.push('Team Building');
    }
    if (problem.includes('funding') || problem.includes('investment') || problem.includes('money')) {
      categories.push('Fundraising');
    }
    if (problem.includes('growth') || problem.includes('scale')) {
      categories.push('Growth Strategy');
    }
    
    return categories;
  };

  const performSearch = useCallback(async (query: string, searchFilters: SearchFilters) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          filters: {
            contentType: searchFilters.contentType.length > 0 ? searchFilters.contentType : undefined,
            targetPersona: searchFilters.targetPersona,
            startupPhase: searchFilters.startupPhase,
            problemCategory: searchFilters.problemCategory.length > 0 ? searchFilters.problemCategory : undefined,
            language: 'en',
            superModel: searchFilters.superModel,
          },
          limit: 12,
          threshold: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API results to match KnowledgeContent interface
      const frameworks: KnowledgeContent[] = data.results.map((result: Record<string, unknown>) => ({
        id: result.id as string,
        title: result.title as string,
        type: result.type as any,
        embedding: [], // Not needed for UI
        language: 'en',
        mainCategory: (result.metadata as any).mainCategory,
        subcategory: (result.metadata as any).subcategory,
        hook: (result.content as any).hook,
        definition: (result.content as any).definition,
        analogyOrMetaphor: '', // Not returned by API
        keyTakeaway: (result.content as any).keyTakeaway,
        classicExample: (result.content as any).classicExample,
        modernExample: (result.content as any).modernExample,
        pitfall: (result.content as any).pitfall,
        payoff: (result.content as any).payoff,
        visualMetaphor: '', // Not returned by API
        diveDeeperMechanism: '', // Not returned by API
        diveDeeperOriginStory: '', // Not returned by API
        diveDeeperPitfallsNuances: '', // Not returned by API
        targetPersona: (result.metadata as any).targetPersona,
        startupPhase: (result.metadata as any).startupPhase,
        problemCategory: (result.metadata as any).problemCategory,
        superModel: (result.metadata as any).superModel,
      }));

      setSearchResults(frameworks);
      
      // Set as recommendations if this is the initial search
      if (frameworkRecommendations.length === 0) {
        setFrameworkRecommendations(frameworks);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [frameworkRecommendations.length, setFrameworkRecommendations]);

  const handleSearch = () => {
    performSearch(searchQuery, filters);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: unknown) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
  };

  const handleContinue = async () => {
    if (selectedFrameworks.length === 0) {
      return;
    }

    setLoading(true);
    try {
      markStageCompleted('framework-selection');
      setCurrentStage('framework-application');
    } finally {
      setLoading(false);
    }
  };

  const displayFrameworks = searchResults.length > 0 ? searchResults : frameworkRecommendations;

  if (isLoading && frameworkRecommendations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Finding relevant frameworks for your decision...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="alert alert-info">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="font-bold">Framework Selection</h3>
          <div className="text-sm">
            I&apos;ve found relevant mental models and frameworks for your decision. Select 2-4 frameworks that resonate with your situation.
          </div>
        </div>
      </div>

      {/* Search Interface */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title mb-4">Search & Filter Frameworks</h4>
          
          {/* Search Query */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Search Query</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Describe your decision or situation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="btn btn-primary"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">
                <span className="label-text">Content Type</span>
              </label>
              <div className="space-y-1">
                {['mental-model', 'strategic-framework', 'tactical-tool', 'cognitive-bias'].map(type => (
                  <label key={type} className="cursor-pointer label justify-start">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mr-2"
                      checked={filters.contentType.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('contentType', [...filters.contentType, type]);
                        } else {
                          handleFilterChange('contentType', filters.contentType.filter(t => t !== type));
                        }
                      }}
                    />
                    <span className="label-text text-sm">{type.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Startup Phase</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.startupPhase[0] || 'seed'}
                onChange={(e) => handleFilterChange('startupPhase', [e.target.value])}
              >
                <option value="ideation">Ideation</option>
                <option value="seed">Seed</option>
                <option value="growth">Growth</option>
                <option value="scale-up">Scale-up</option>
                <option value="crisis">Crisis</option>
              </select>
            </div>
          </div>

          {searchError && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{searchError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Frameworks Summary */}
      {selectedFrameworks.length > 0 && (
        <div className="card bg-primary/5 border border-primary/30">
          <div className="card-body">
            <h4 className="card-title">Selected Frameworks ({selectedFrameworks.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedFrameworks.map(framework => (
                <div key={framework.id} className="badge badge-primary badge-lg">
                  {framework.title}
                  <button
                    className="ml-2 btn btn-ghost btn-xs"
                    onClick={() => deselectFramework(framework.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Framework Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayFrameworks.map(framework => (
          <FrameworkCard
            key={framework.id}
            framework={framework}
            isSelected={selectedFrameworks.some(sf => sf.id === framework.id)}
            onSelect={() => selectFramework(framework)}
            onDeselect={() => deselectFramework(framework.id)}
          />
        ))}
      </div>

      {displayFrameworks.length === 0 && !isSearching && (
        <div className="text-center py-8">
          <div className="text-base-content/60">
            No frameworks found. Try adjusting your search or filters.
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleContinue}
          disabled={selectedFrameworks.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Processing...
            </>
          ) : (
            <>
              Continue with {selectedFrameworks.length} Framework{selectedFrameworks.length !== 1 ? 's' : ''}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 ml-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}