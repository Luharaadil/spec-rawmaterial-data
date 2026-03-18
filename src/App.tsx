import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Database, Layers, Package, Copy, Check } from 'lucide-react';
import { fetchRecipeData, fetchSpecData, fetchRubberData, RecipeItem, SpecData, RubberData } from './services/sheetService';

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [rubberData, setRubberData] = useState<RubberData[]>([]);
  const [specData, setSpecData] = useState<SpecData[]>([]);
  
  const [result, setResult] = useState<{
    recipe: RecipeItem[];
    specs: SpecData[];
    hasSearched: boolean;
  }>({
    recipe: [],
    specs: [],
    hasSearched: false
  });

  const [copiedRecipe, setCopiedRecipe] = useState(false);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const handleCopyRecipe = () => {
    if (!result.recipe.length) return;
    const header = "Material Name\tMaterial Code\tWeight";
    const rows = result.recipe.map(item => `${item.name}\t${item.code}\t${item.weight}`);
    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedRecipe(true);
    setTimeout(() => setCopiedRecipe(false), 2000);
  };

  const handleCopySpecs = () => {
    if (!result.specs.length) return;
    const header = "Material\tAlternative Text\tLong Text (Tyre Spec)";
    const rows = result.specs.map(spec => `${spec.material}\t${spec.alternativeText}\t${spec.longText}`);
    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSpecs(true);
    setTimeout(() => setCopiedSpecs(false), 2000);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rubber, spec] = await Promise.all([
          fetchRubberData(),
          fetchSpecData()
        ]);
        setRubberData(rubber);
        setSpecData(spec);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load data from Google Sheets. Please ensure the sheet is accessible.');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const q = query.trim().toUpperCase();
    if (!q) return;

    setIsSearching(true);
    setError(null);
    
    try {
      // Fetch recipe data dynamically for the searched rubber name
      const recipe = await fetchRecipeData(q);

      // Find the SAP code from the rubber data to search the specs
      const rubberMatch = rubberData.find(r => 
        r.rubberName.toUpperCase() === q || r.sapCode.toUpperCase() === q
      );
      const searchSapCode = rubberMatch?.sapCode.toUpperCase() || q;

      // Extract the first 4 digits from the query (e.g., "7316" from "7316F")
      const digitMatch = q.match(/\d{4}/);
      const baseCode = digitMatch ? digitMatch[0] : q;

      // We search specs by checking if the compound contains the 4-digit base code
      // (or matches the SAP code/raw query as a fallback)
      const specMatches = specData.filter(s => {
        const cusion = s.cusionCompound.toUpperCase();
        const tread1 = s.treadCompound1.toUpperCase();
        const tread2 = s.treadCompound2.toUpperCase();

        if (digitMatch) {
          return cusion.includes(baseCode) || tread1.includes(baseCode) || tread2.includes(baseCode);
        }

        return cusion === searchSapCode ||
               tread1 === searchSapCode ||
               tread2 === searchSapCode ||
               cusion === q ||
               tread1 === q ||
               tread2 === q;
      });

      setResult({
        recipe: recipe,
        specs: specMatches,
        hasSearched: true
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch recipe data.');
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">Initializing Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Search */}
        <header className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border-t-4 border-orange-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">MAXXIS RUBBER INDIA</h1>
              <p className="text-sm text-slate-500 font-medium">Spec and raw material searcher</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Rubber Name (e.g., 7316F)..."
              className="w-full pl-12 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-lg"
            />
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="absolute right-2 px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </header>

        {/* Results Area */}
        {result.hasSearched && (
          <div className="space-y-6">
            
            {/* Raw Material Card */}
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold tracking-tight text-slate-800">Raw Material Details for "{query.toUpperCase()}"</h2>
                </div>
                {result.recipe.length > 0 && (
                  <button
                    onClick={handleCopyRecipe}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedRecipe ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copiedRecipe ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              
              {result.recipe.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold">Material Name</th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold">Material Code</th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.recipe.map((item, idx) => (
                        <tr key={idx} className="hover:bg-orange-50/50 transition-colors group">
                          <td className="py-4 px-4 text-sm font-medium text-slate-800">
                            {item.name}
                          </td>
                          <td className="py-4 px-4 font-mono text-sm text-slate-500">
                            {item.code}
                          </td>
                          <td className="py-4 px-4 text-sm font-bold text-orange-600 text-right">
                            {item.weight}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <p>No raw material recipe found for "{query}". Ensure the version is marked with "V".</p>
                </div>
              )}
            </section>

            {/* Tyre Specs Table */}
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-bold tracking-tight text-slate-800">Compatible Tyre Specs</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 px-3 py-1 rounded-full text-xs font-bold text-orange-700">
                    {result.specs.length} {result.specs.length === 1 ? 'Match' : 'Matches'}
                  </div>
                  {result.specs.length > 0 && (
                    <button
                      onClick={handleCopySpecs}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedSpecs ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copiedSpecs ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {result.specs.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold">Material</th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold">Alternative Text</th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold">Long Text (Tyre Spec)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.specs.map((spec, idx) => (
                        <tr key={idx} className="hover:bg-orange-50/50 transition-colors group">
                          <td className="py-4 px-4 font-mono text-sm text-slate-500 whitespace-nowrap">
                            {spec.material}
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-slate-800">
                            {spec.alternativeText}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-600">
                            {spec.longText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <p>No compatible tyre specs found for "{query}".</p>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
