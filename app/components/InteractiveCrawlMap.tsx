import React, { useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ForceGraphMethods, ForceGraphProps, NodeObject } from 'react-force-graph-2d';

interface Node extends NodeObject {
  id: string;
  depth: number;
  isIndexable: boolean;
  pagetype: string;
  fullUrl: string;
  domain: string;
}

interface Link {
  source: string;
  target: string;
}

const ForceGraph2D = dynamic(() => 
  import('react-force-graph-2d').then(mod => {
    const ForwardRefForceGraph2D = React.forwardRef<ForceGraphMethods, ForceGraphProps<Node, Link>>((props, ref) => {
      const Comp = mod.default;
      return <Comp {...props} ref={ref} />;
    });
    ForwardRefForceGraph2D.displayName = 'ForwardRefForceGraph2D';
    return ForwardRefForceGraph2D;
  }),
  { ssr: false, loading: () => <p>Loading graph...</p> }
);

interface CrawlData {
  'Full URL': string;
  Depth: number;
  'Is Indexable': boolean;
  pagetype: string;
  'URL Path': string;
}

interface Link {
  source: string;
  target: string;
}

interface Rollup {
  byDepth: Record<number, number>;
  byPageType: Record<string, number>;
}

const InteractiveCrawlMap: React.FC = () => {
  const [data, setData] = useState<CrawlData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonUrl, setJsonUrl] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedPageTypes, setSelectedPageTypes] = useState<Set<string>>(new Set());
  const [allPageTypes, setAllPageTypes] = useState<string[]>([]);
  const [showIndexableOnly, setShowIndexableOnly] = useState<boolean>(false);
  const [showNonIndexableOnly, setShowNonIndexableOnly] = useState<boolean>(false);
  const [maxDepth, setMaxDepth] = useState<number>(Infinity);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [highlightLinks, setHighlightLinks] = useState<Set<Link>>(new Set());
  const [connectedNodes, setConnectedNodes] = useState<Set<string>>(new Set());
  const [nodeRollup, setNodeRollup] = useState<Rollup>({ byDepth: {}, byPageType: {} });
  const [pageTypeSearchTerm, setPageTypeSearchTerm] = useState('');
  const [domainSearchTerm, setDomainSearchTerm] = useState('');
  const [showDomainFilter, setShowDomainFilter] = useState(false);
  const [showPageTypeFilter, setShowPageTypeFilter] = useState(false);
  const [showNodeInfo, setShowNodeInfo] = useState(true);
  const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);
  const graphRef = useRef<ForceGraphMethods>(null);

  const pageTypeColors = useMemo(() => {
    const colorGroups = {
      PLP: ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'],
      PDP: ['#166534', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'],
      Home: ['#7C2D12', '#EA580C', '#FB923C', '#FDBA74', '#FED7AA'],
      Category: ['#701A75', '#C026D3', '#E879F9', '#F0ABFC', '#F5D0FE'],
      Search: ['#831843', '#DB2777', '#EC4899', '#F472B6', '#FBCFE8'],
      Other: ['#1E3A8A', '#2563EB', '#60A5FA', '#93C5FD', '#BFDBFE']
    };

    const colorMap: { [key: string]: string } = {};
    allPageTypes.forEach((pageType, index) => {
      let group = 'Other';
      for (const [key] of Object.entries(colorGroups)) {
        if (pageType.toLowerCase().includes(key.toLowerCase())) {
          group = key;
          break;
        }
      }
      const groupColors = colorGroups[group as keyof typeof colorGroups];
      colorMap[pageType] = groupColors[index % groupColors.length];
    });
    return colorMap;
  }, [allPageTypes]);

  const handleEngineStop = useCallback(() => {
    if (graphRef.current) {
      setVisibleNodes(graphRef.current.graphData().nodes);
    }
  }, []);


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(jsonUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result: CrawlData[] = await response.json();
      
      const pageTypes: string[] = Array.from(
        new Set(result.map(item => typeof item.pagetype === 'string' ? item.pagetype : ''))
      );
      setAllPageTypes(pageTypes);
      setSelectedPageTypes(new Set(pageTypes));

      const domains: string[] = Array.from(
        new Set(result.map(item => {
          try {
            return new URL(item['Full URL']).hostname;
          } catch {
            return '';
          }
        }))
      );
      setAllDomains(domains);
      setSelectedDomains(new Set(domains));
      
      const chunkSize = 1000;
      const chunks: CrawlData[][] = [];
      for (let i = 0; i < result.length; i += chunkSize) {
        chunks.push(result.slice(i, i + chunkSize));
      }
      
      setData(chunks[0]);
      
      chunks.slice(1).forEach((chunk, index) => {
        setTimeout(() => {
          setData(prevData => [...prevData, ...chunk]);
        }, (index + 1) * 1000);
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }, [jsonUrl]);

  const filteredData = useMemo(() => {
    return data.filter((item: CrawlData) => {
      const depthCondition = maxDepth === Infinity ? true : item.Depth <= maxDepth;
      const indexableCondition = 
        (!showIndexableOnly && !showNonIndexableOnly) ||
        (showIndexableOnly && item['Is Indexable']) ||
        (showNonIndexableOnly && !item['Is Indexable']);
      const pageTypeCondition = selectedPageTypes.has(item.pagetype);
      const domainCondition = selectedDomains.has(new URL(item['Full URL']).hostname);
      return depthCondition && indexableCondition && pageTypeCondition && domainCondition;
    });
  }, [data, maxDepth, showIndexableOnly, showNonIndexableOnly, selectedPageTypes, selectedDomains]);

  const { nodes, links } = useMemo(() => {
    const nodesMap = new Map<string, Node>();
    const linksArray: Link[] = [];

    if (jsonUrl) {
      nodesMap.set('/', {
        id: '/',
        depth: 0,
        isIndexable: true,
        pagetype: 'home',
        fullUrl: '/',
        domain: new URL(jsonUrl).hostname
      });
    }

    filteredData.forEach(item => {
      const domain = new URL(item['Full URL']).hostname;
      const node: Node = {
        id: item['URL Path'], // This is now explicitly a string
        depth: item.Depth,
        isIndexable: item['Is Indexable'],
        pagetype: item.pagetype,
        fullUrl: item['Full URL'],
        domain: domain
      };
      nodesMap.set(node.id, node);

      const parentPath = item['URL Path'].split('/').slice(0, -1).join('/') || '/';
      if (nodesMap.has(parentPath)) {
        linksArray.push({ source: parentPath, target: node.id });
      } else {
        linksArray.push({ source: '/', target: node.id });
      }
    });

    return { 
      nodes: Array.from(nodesMap.values()), 
      links: linksArray
    };
  }, [filteredData, jsonUrl]);

  const filteredPageTypes = useMemo(() => {
    const searchTerm = pageTypeSearchTerm.toLowerCase();
    return allPageTypes.filter(pageType => 
      pageType.toLowerCase().includes(searchTerm)
    );
  }, [allPageTypes, pageTypeSearchTerm]);

  const filteredDomains = useMemo(() => {
    const searchTerm = domainSearchTerm.toLowerCase();
    return allDomains.filter(domain => 
      domain.toLowerCase().includes(searchTerm)
    );
  }, [allDomains, domainSearchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonUrl) {
      fetchData();
    }
  };

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    const connectedLinks = links.filter(link => link.source === node.id || link.target === node.id);
    setHighlightLinks(new Set(connectedLinks));
    const connectedNodeIds = new Set(connectedLinks.flatMap(link => [link.source, link.target]));
    setConnectedNodes(connectedNodeIds);

    const rollup = {
      byDepth: {} as Record<number, number>,
      byPageType: {} as Record<string, number>
    };

    connectedLinks.forEach(link => {
      const connectedNode = nodes.find(n => n.id === (link.source === node.id ? link.target : link.source));
      if (connectedNode) {
        rollup.byDepth[connectedNode.depth] = (rollup.byDepth[connectedNode.depth] || 0) + 1;
        rollup.byPageType[connectedNode.pagetype] = (rollup.byPageType[connectedNode.pagetype] || 0) + 1;
      }
    });

    setNodeRollup(rollup);
  }, [links, nodes]);

  const nodeColor = useCallback((node: Node) => {
    return connectedNodes.has(node.id as string)
      ? '#FFA500'
      : (node.isIndexable ? pageTypeColors[node.pagetype] : '#FF5252');
  }, [connectedNodes, pageTypeColors]);

  const nodeLabel = useCallback((node: Node): string => {
    return showNodeInfo 
      ? `URL: ${node.fullUrl}\nDepth: ${node.depth}\nPage Type: ${node.pagetype}`
      : '';
  }, [showNodeInfo]);

  const nodeCanvasObject = useCallback((node: Node, ctx: CanvasRenderingContext2D) => {
    const size = node.depth === 0 ? 8 : 5;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = nodeColor(node);
    ctx.fill();
  }, [nodeColor]);

  const togglePageType = (pageType: string) => {
    setSelectedPageTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageType)) {
        newSet.delete(pageType);
      } else {
        newSet.add(pageType);
      }
      return newSet;
    });
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  };

  const handlePageTypeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageTypeSearchTerm(e.target.value);
  };

  const handleDomainSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomainSearchTerm(e.target.value);
  };

  const selectFilteredPageTypes = () => {
    setSelectedPageTypes(prev => {
      const newSet = new Set(prev);
      filteredPageTypes.forEach(pageType => newSet.add(pageType));
      return newSet;
    });
  };

  const deselectFilteredPageTypes = () => {
    setSelectedPageTypes(prev => {
      const newSet = new Set(prev);
      filteredPageTypes.forEach(pageType => newSet.delete(pageType));
      return newSet;
    });
  };

  const selectFilteredDomains = () => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev);
      filteredDomains.forEach(domain => newSet.add(domain));
      return newSet;
    });
  };

  const deselectFilteredDomains = () => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev);
      filteredDomains.forEach(domain => newSet.delete(domain));
      return newSet;
    });
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-xl font-bold mb-4">Interactive Crawl Map</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="url"
          value={jsonUrl}
          onChange={(e) => setJsonUrl(e.target.value)}
          placeholder="Enter JSON URL"
          className="border p-2 mr-2 w-64 text-gray-700"
          required
        />
        <div className="mt-2 mb-2">
          <label className="mr-2">Max Depth:</label>
          <select
            value={maxDepth === Infinity ? 'All' : maxDepth}
            onChange={(e) => setMaxDepth(e.target.value === 'All' ? Infinity : parseInt(e.target.value))}
            className="border p-1 bg-gray-700 text-white"
          >
            <option value="All">All</option>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(depth => (
              <option key={depth} value={depth}>{depth}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 mb-2">
          <label className="mr-2">
            <input
              type="checkbox"
              checked={showIndexableOnly}
              onChange={(e) => {
                setShowIndexableOnly(e.target.checked);
                if (e.target.checked) setShowNonIndexableOnly(false);
              }}
            />
            Show Indexable Only
          </label>
          <label className="ml-4 mr-2">
            <input
              type="checkbox"
              checked={showNonIndexableOnly}
              onChange={(e) => {
                setShowNonIndexableOnly(e.target.checked);
                if (e.target.checked) setShowIndexableOnly(false);
              }}
            />
            Show Non-Indexable Only
          </label>
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
          Load Data
        </button>
        <button 
          type="button" 
          onClick={() => setShowNodeInfo(!showNodeInfo)}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          {showNodeInfo ? 'Hide' : 'Show'} Node Info
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {loading ? (
        <p>Loading crawl map data...</p>
      ) : data.length > 0 ? (
        <>
          <div className="flex mb-4 space-x-4">
            <div className="w-1/2">
              <button
                onClick={() => setShowDomainFilter(!showDomainFilter)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75"
              >
                Domain Filter
                {showDomainFilter ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {showDomainFilter && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={domainSearchTerm}
                    onChange={handleDomainSearch}
                    placeholder="Search domains..."
                    className="border p-2 w-full text-gray-700 mb-2"
                  />
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={selectFilteredDomains}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Select All Filtered
                    </button>
                    <button
                      onClick={deselectFilteredDomains}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Deselect All Filtered
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-gray-800 p-2 rounded">
                    {filteredDomains.map((domain) => (
                      <div key={domain} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedDomains.has(domain)}
                          onChange={() => toggleDomain(domain)}
                          className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-white">{domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-1/2">
              <button
                onClick={() => setShowPageTypeFilter(!showPageTypeFilter)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 focus-visible:ring-opacity-75"
              >
                Page Type Filter
                {showPageTypeFilter ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {showPageTypeFilter && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={pageTypeSearchTerm}
                    onChange={handlePageTypeSearch}
                    placeholder="Search page types..."
                    className="border p-2 w-full text-gray-700 mb-2"
                  />
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={selectFilteredPageTypes}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Select All Filtered
                    </button>
                    <button
                      onClick={deselectFilteredPageTypes}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Deselect All Filtered
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-gray-800 p-2 rounded">
                    {filteredPageTypes.map((pageType) => (
                      <div key={pageType} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedPageTypes.has(pageType)}
                          onChange={() => togglePageType(pageType)}
                          className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-white">{pageType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative" style={{ width: '100%', height: 'calc(100vh - 250px)', minHeight: '500px', border: '1px solid #ddd' }}>
            <ForceGraph2D
              ref={graphRef}
              graphData={{ nodes, links }}
              nodeColor={nodeColor}
              nodeLabel={nodeLabel}
              onNodeClick={handleNodeClick}
              linkColor={(link: Link) => highlightLinks.has(link) ? '#FFA500' : '#999'}
              nodeCanvasObject={nodeCanvasObject}
              linkDirectionalParticles={0}
              cooldownTicks={100}
              onEngineStop={handleEngineStop}
            />
          </div>

          {selectedNode && showNodeInfo && (
            <div className="mt-4 p-4 bg-gray-800 text-white border-l-4 border-blue-500">
              <h3 className="font-bold">Selected Node Information</h3>
              <p><strong>URL:</strong> {selectedNode.fullUrl}</p>
              <p><strong>Depth:</strong> {selectedNode.depth}</p>
              <p><strong>Is Indexable:</strong> {selectedNode.isIndexable ? 'Yes' : 'No'}</p>
              <p><strong>Page Type:</strong> {selectedNode.pagetype}</p>
              <h4 className="font-bold mt-2">Connected Nodes Rollup</h4>
              <div>
                <h5 className="font-bold">By Depth:</h5>
                {Object.entries(nodeRollup.byDepth).map(([depth, count]) => (
                  <p key={depth}>Depth {depth}: {count}</p>
                ))}
              </div>
              <div className="mt-2">
                <h5 className="font-bold">By Page Type:</h5>
                {Object.entries(nodeRollup.byPageType).map(([pageType, count]) => (
                  <p key={pageType}>{pageType}: {count}</p>
                ))}
              </div>
            </div>
          )}

            <div className="mt-4">
            <h3 className="font-bold">Legend</h3>
            <div className="flex flex-wrap mt-2">
              {allPageTypes.map((pageType) => (
                <div key={pageType} className="flex items-center mr-4 mb-2" style={{ opacity: selectedPageTypes.has(pageType) ? 1 : 0.5 }}>
                  <div className="w-4 h-4 mr-2" style={{ backgroundColor: pageTypeColors[pageType] }}></div>
                  <span>{pageType}</span>
                </div>
              ))}
              <div className="flex items-center mr-4 mb-2">
                <div className="w-4 h-4 bg-red-500 mr-2"></div>
                <span>Non-Indexable</span>
              </div>
              <div className="flex items-center mr-4 mb-2">
                <div className="w-4 h-4 bg-orange-500 mr-2"></div>
                <span>Selected/Connected</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p>Enter a JSON URL and click &quot;Load Data&quot; to view the crawl map.</p>
      )}
    </div>
  );
};

export default InteractiveCrawlMap;