import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Code, 
  Globe, 
  Clock, 
  Play, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  Star,
  Calendar,
  Activity,
  Zap,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface RPAScript {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  executionTime: number;
  scriptType: 'javascript' | 'custom' | 'template';
  scriptContent: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
}

const RPAScriptLibrary: React.FC = () => {
  const [scripts, setScripts] = useState<RPAScript[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<RPAScript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'executions'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedScript, setSelectedScript] = useState<RPAScript | null>(null);

  const categories = [
    'all',
    'scrolling',
    'form-filling',
    'clicking',
    'data-extraction',
    'social-media',
    'ecommerce',
    'custom'
  ];

  const categoryLabels = {
    'all': 'All Scripts',
    'scrolling': 'Scrolling',
    'form-filling': 'Form Filling',
    'clicking': 'Clicking',
    'data-extraction': 'Data Extraction',
    'social-media': 'Social Media',
    'ecommerce': 'E-commerce',
    'custom': 'Custom'
  };

  // Load scripts from localStorage
  const loadScripts = () => {
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    if (savedScripts) {
      try {
        const parsedScripts = JSON.parse(savedScripts);
        console.log('📚 RPAScriptLibrary loaded', parsedScripts.length, 'scripts');
        console.log('📝 Script names:', parsedScripts.map((s: RPAScript) => s.name));
        setScripts(parsedScripts);
        setFilteredScripts(parsedScripts);
      } catch (error) {
        console.error('Failed to parse scripts:', error);
        setScripts([]);
        setFilteredScripts([]);
      }
    } else {
      console.log('📚 RPAScriptLibrary: No scripts found in localStorage');
      setScripts([]);
      setFilteredScripts([]);
    }
  };

  useEffect(() => {
    loadScripts();

    // Listen for script updates
    const handleScriptsUpdate = (event: any) => {
      console.log('🔄 RPAScriptLibrary: Received update event');
      loadScripts();
    };

    window.addEventListener('rpa-scripts-updated', handleScriptsUpdate);
    
    // Also listen for storage events (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'antidetect_rpa_scripts') {
        console.log('🔄 RPAScriptLibrary: localStorage changed, reloading');
        loadScripts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('rpa-scripts-updated', handleScriptsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Filter and sort scripts
  useEffect(() => {
    let filtered = scripts;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(script =>
        script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        script.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        script.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (script.tags && script.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(script => 
        script.category === selectedCategory || 
        (selectedCategory === 'custom' && !script.category)
      );
    }

    // Sort scripts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'executions':
          return b.executionCount - a.executionCount;
        default:
          return 0;
      }
    });

    setFilteredScripts(filtered);
  }, [scripts, searchQuery, selectedCategory, sortBy]);

  const handleToggleFavorite = (scriptId: string) => {
    const updatedScripts = scripts.map(script => 
      script.id === scriptId 
        ? { ...script, isFavorite: !script.isFavorite }
        : script
    );
    setScripts(updatedScripts);
    localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
    window.dispatchEvent(new CustomEvent('rpa-scripts-updated'));
    toast.success('Favorite status updated');
  };

  const handleDeleteScript = (scriptId: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      const updatedScripts = scripts.filter(script => script.id !== scriptId);
      setScripts(updatedScripts);
      localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
      window.dispatchEvent(new CustomEvent('rpa-scripts-updated'));
      if (selectedScript?.id === scriptId) {
        setSelectedScript(null);
      }
      toast.success('Script deleted successfully');
    }
  };

  const handleCopyScript = (script: RPAScript) => {
    const scriptCopy = {
      ...script,
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${script.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0,
      lastExecuted: undefined
    };

    const updatedScripts = [...scripts, scriptCopy];
    setScripts(updatedScripts);
    localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
    window.dispatchEvent(new CustomEvent('rpa-scripts-updated'));
    toast.success('Script copied successfully');
  };

  const handleExportScript = (script: RPAScript) => {
    const dataStr = JSON.stringify(script, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Script exported successfully');
  };

  const handleImportScript = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedScript = JSON.parse(e.target?.result as string);
        // Generate new ID to avoid conflicts
        importedScript.id = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        importedScript.createdAt = new Date().toISOString();
        importedScript.updatedAt = new Date().toISOString();
        
        const updatedScripts = [...scripts, importedScript];
        setScripts(updatedScripts);
        localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(updatedScripts));
        window.dispatchEvent(new CustomEvent('rpa-scripts-updated'));
        toast.success('Script imported successfully');
      } catch (error) {
        toast.error('Invalid script file');
      }
    };
    reader.readAsText(file);
  };

  const handleBulkExport = () => {
    const dataStr = JSON.stringify(scripts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rpa_scripts_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('All scripts exported successfully');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScriptTypeIcon = (type: string) => {
    switch (type) {
      case 'javascript': return <Code className="h-4 w-4" />;
      case 'custom': return <Zap className="h-4 w-4" />;
      case 'template': return <Star className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getScriptTypeColor = (type: string) => {
    switch (type) {
      case 'javascript': return 'bg-blue-100 text-blue-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      case 'template': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RPA Script Library</h1>
          <p className="text-muted-foreground mt-2">
            {scripts.length} automation script{scripts.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              loadScripts();
              toast.success('Scripts refreshed!');
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportScript}
              className="hidden"
            />
          </label>
          <Button 
            variant="outline" 
            onClick={handleBulkExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
                <option value="executions">Most Used</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert when no scripts */}
      {scripts.length === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <strong className="text-blue-900">No scripts found!</strong>
                <p className="text-blue-700 text-sm mt-1">
                  Go to <strong>Script Builder</strong> tab to create your first automation script. 
                  Pre-built templates are available to get you started quickly!
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Scripts Grid/List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${viewMode === 'grid' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          {filteredScripts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Code className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {scripts.length === 0 ? 'No Scripts Created Yet' : 'No scripts match your filters'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Go to Script Builder tab to create your first script'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {filteredScripts.map((script) => (
                <Card 
                  key={script.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedScript?.id === script.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedScript(script)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getScriptTypeIcon(script.scriptType)}
                        <h4 className="font-medium truncate">{script.name}</h4>
                        {script.isFavorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(script.id);
                          }}
                        >
                          <Star className={`h-3 w-3 ${script.isFavorite ? 'text-yellow-500 fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyScript(script);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportScript(script);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScript(script.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {script.description}
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getScriptTypeColor(script.scriptType)}>
                        {script.scriptType}
                      </Badge>
                      {script.category && (
                        <Badge variant="outline">
                          {script.category}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{script.websiteUrl}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{script.executionTime} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>{script.executionCount} executions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Updated {formatDate(script.updatedAt)}</span>
                      </div>
                    </div>

                    {script.tags && script.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {script.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {script.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{script.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Script Details Sidebar */}
        {selectedScript && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Script Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{selectedScript.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedScript.description}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedScript.websiteUrl}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedScript.executionTime} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedScript.executionCount} executions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Created {formatDate(selectedScript.createdAt)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Script Content Preview</h5>
                  <ScrollArea className="h-32">
                    <pre className="text-xs bg-muted p-2 rounded">
                      <code>{selectedScript.scriptContent.substring(0, 200)}...</code>
                    </pre>
                  </ScrollArea>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RPAScriptLibrary;
