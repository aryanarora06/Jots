import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Settings2, X, Search, Focus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tapAnimation } from '../utils/motion';
import api from '../api';

const GraphView = ({ darkMode, onNoteClick, selectedTagFilters = [], activeNoteIds }) => {
    // Basic State
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGraphReady, setIsGraphReady] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [showOrphans, setShowOrphans] = useState(true);
    const [showLabels, setShowLabels] = useState('hover'); // 'hover', 'always', 'never'

    // Force sliders
    const [linkDistance, setLinkDistance] = useState(35);
    const [repelForce, setRepelForce] = useState(100);
    const [gravityForce, setGravityForce] = useState(0.05);

    // Refs
    const containerRef = useRef(null);
    const graphRef = useRef(null);
    const settingsRef = useRef(null);
    const settingsButtonRef = useRef(null);

    // Close settings on click-outside or Escape
    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleClickOutside = (e) => {
            if (
                settingsRef.current && !settingsRef.current.contains(e.target) &&
                settingsButtonRef.current && !settingsButtonRef.current.contains(e.target)
            ) {
                setIsSettingsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsSettingsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSettingsOpen]);

    // Responsive sizing — always measure the container directly so browser zoom is handled correctly
    useEffect(() => {
        if (isLoading) return; // Wait until container is rendered
        
        const updateDimensions = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setDimensions({
                width: Math.floor(rect.width),
                height: Math.max(400, Math.floor(rect.height))
            });
        };

        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        window.addEventListener('resize', updateDimensions);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateDimensions);
        }

        updateDimensions();
        
        // Removed the hacky setTimeouts as resizeObserver handles changes properly now
        
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateDimensions);
            }
        };
    }, [isLoading]);

    // Fetch and preprocess graph data
    useEffect(() => {
        const fetchGraph = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/api/notes/graph/');
                const { nodes, edges } = response.data;

                // Precompute neighbors for Obsidian hover effect
                const links = edges.map(e => ({ source: e.source, target: e.target }));
                const neighborMap = new Map();
                nodes.forEach(n => neighborMap.set(n.id, new Set()));
                
                links.forEach(l => {
                    neighborMap.get(l.source).add(l.target);
                    neighborMap.get(l.target).add(l.source);
                });

                setGraphData({
                    nodes: nodes.map((n, i) => {
                        // Distribute initial positions in a circle to ensure symmetric collapse
                        const angle = (i / nodes.length) * 2 * Math.PI;
                        const initialRadius = 100;
                        return {
                            ...n,
                            x: Math.cos(angle) * initialRadius,
                            y: Math.sin(angle) * initialRadius,
                            val: 1 + (n.incoming_count + n.outgoing_count) * 0.5,
                            neighbors: neighborMap.get(n.id)
                        };
                    }),
                    links,
                });
            } catch (err) {
                console.error('Failed to fetch graph data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchGraph();
    }, []);

    // Filter Graph Data
    const filteredGraphData = useMemo(() => {
        let activeNodes = graphData.nodes;

        if (!showOrphans) {
            activeNodes = activeNodes.filter(n => n.incoming_count > 0 || n.outgoing_count > 0);
        }

        if (activeNoteIds) {
            activeNodes = activeNodes.filter(n => activeNoteIds.has(n.id));
        }

        if (selectedTagFilters && selectedTagFilters.length > 0) {
            const selectedSet = new Set(selectedTagFilters.map(String));
            const taggedNodeIds = new Set(
                activeNodes.filter(n => n.tags && n.tags.some(tagId => selectedSet.has(String(tagId)))).map(n => n.id)
            );
            
            const nodesToShow = new Set(taggedNodeIds);
            
            // Also include connected nodes
            graphData.links.forEach(l => {
                const src = typeof l.source === 'object' ? l.source.id : l.source;
                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                if (taggedNodeIds.has(src)) nodesToShow.add(tgt);
                if (taggedNodeIds.has(tgt)) nodesToShow.add(src);
            });
            
            // Include neighbors from the full graph data, bypassing the activeNoteIds restriction for those neighbors
            activeNodes = graphData.nodes.filter(n => nodesToShow.has(n.id));
            
            // Re-apply orphan filtering for the newly added neighbors if necessary
            if (!showOrphans) {
                activeNodes = activeNodes.filter(n => n.incoming_count > 0 || n.outgoing_count > 0);
            }
        }

        const activeNodeIds = new Set(activeNodes.map(n => n.id));
        
        let activeLinks = graphData.links.filter(l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return activeNodeIds.has(src) && activeNodeIds.has(tgt);
        });

        // Search highlighting is handled in the paint layer, but we can filter too.
        // In Obsidian, search highlights matching nodes and dims others.
        // We'll pass the search query to the paint function.

        return { nodes: activeNodes, links: activeLinks };
    }, [graphData, showOrphans, searchQuery, selectedTagFilters, activeNoteIds]);

    const [displayedGraphData, setDisplayedGraphData] = useState({ nodes: [], links: [] });

    // Apply Physics
    useEffect(() => {
        if (graphRef.current) {
            const fg = graphRef.current;
            
            fg.d3Force('charge').strength(-repelForce); 
            fg.d3Force('link').distance(linkDistance);     
            
            fg.d3Force('center', null);
            
            const customGravity = function(alpha) {
                const nodes = customGravity.nodes || [];
                
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if (node.x === undefined || node.y === undefined) continue;
                    
                    node.vx -= node.x * gravityForce * alpha;
                    node.vy -= node.y * gravityForce * alpha;
                }
            };
            customGravity.initialize = function(nodes) {
                customGravity.nodes = nodes;
            };
            
            fg.d3Force('customGravity', customGravity);
            
            fg.d3ReheatSimulation();
        }
    }, [filteredGraphData, linkDistance, repelForce, gravityForce]);

    // Auto-center is handled immediately since warmupTicks puts nodes in their final positions
    useEffect(() => {
        setIsGraphReady(false);
        const timer = setTimeout(() => {
            setDisplayedGraphData(filteredGraphData);
            setRenderedKey(prev => prev + 1);
            if (graphRef.current && filteredGraphData.nodes.length > 0) {
                // Wait briefly for the engine to ingest the data and run warmup ticks
                setTimeout(() => {
                    if (graphRef.current) {
                        // Smoothly animate the camera to frame the new nodes (like clicking Restore View)
                        const padding = dimensions.width < 600 ? 35 : 120;
                        graphRef.current.zoomToFit(400, padding, () => true);
                        setIsGraphReady(true);
                    }
                }, 100);
            } else {
                setIsGraphReady(true);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [filteredGraphData, dimensions.width]);

    // No more handleZoomEnd logic, the camera is free.

    // Colors
    const colors = useMemo(() => ({
        node: darkMode ? '#ffffff' : '#000000',
        nodeFavourite: darkMode ? '#ffffff' : '#000000',
        nodeHover: darkMode ? '#ffffff' : '#000000',
        nodeOrphan: darkMode ? '#4b5563' : '#9ca3af',
        link: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
        linkHighlight: darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
        text: darkMode ? '#f3f4f6' : '#111827',
        textDim: darkMode ? '#9ca3af' : '#6b7280',
        bg: darkMode ? '#000000' : '#ffffff',
    }), [darkMode]);

    // Rendering Helpers
    const isNodeMatch = useCallback((node) => {
        if (!searchQuery.trim()) return false;
        return node.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }, [searchQuery]);

    const isHoveredNeighbor = useCallback((node) => {
        if (!hoveredNode) return false;
        return hoveredNode.neighbors.has(node.id);
    }, [hoveredNode]);

    const getOpacity = useCallback((node) => {
        if (hoveredNode) {
            return (node.id === hoveredNode.id || isHoveredNeighbor(node)) ? 1 : 0.1;
        }
        if (searchQuery.trim()) {
            return isNodeMatch(node) ? 1 : 0.1;
        }
        return 1;
    }, [hoveredNode, isHoveredNeighbor, searchQuery, isNodeMatch]);

    const paintNode = useCallback((node, ctx, globalScale) => {
        const opacity = getOpacity(node);
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const isNeighbor = isHoveredNeighbor(node);
        const isMatch = isNodeMatch(node);
        
        const radius = 5;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        
        let fillColor = colors.node;

        ctx.fillStyle = fillColor;
        ctx.globalAlpha = opacity;
        ctx.fill();

        if (isHovered || isMatch) {
            ctx.shadowColor = colors.nodeHover;
            ctx.shadowBlur = 15;
            ctx.fill(); // Fill again with shadow
            ctx.shadowBlur = 0;
        }

        // Draw Label
        const shouldShowLabel = 
            showLabels === 'always' || 
            (showLabels === 'hover' && (isHovered || isNeighbor || opacity === 1 && searchQuery.trim())) ||
            (isMatch);

        if (shouldShowLabel && (globalScale > 1 || shouldShowLabel)) {
            const fontSize = Math.max(11 / globalScale, 3) * (isHovered ? 1.2 : 1);
            ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isHovered || isMatch ? colors.text : colors.textDim;
            
            const words = (node.title || '').split(' ');
            let line = '';
            let currentY = node.y + radius + 2;
            const lineHeight = fontSize * 1.2;
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                if (testLine.length > 20 && i > 0) {
                    ctx.fillText(line.trim(), node.x, currentY);
                    line = words[i] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) {
                ctx.fillText(line.trim(), node.x, currentY);
            }
        }
        
        ctx.globalAlpha = 1; // Reset alpha
    }, [getOpacity, hoveredNode, isHoveredNeighbor, isNodeMatch, colors, showLabels, searchQuery]);

    const getLinkColor = useCallback((link) => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        
        let isHighlighted = false;
        let opacity = 1;

        if (hoveredNode) {
            isHighlighted = (srcId === hoveredNode.id || tgtId === hoveredNode.id);
            opacity = isHighlighted ? 1 : 0.1;
        } else if (searchQuery.trim()) {
            const srcMatch = isNodeMatch(filteredGraphData.nodes.find(n => n.id === srcId) || {});
            const tgtMatch = isNodeMatch(filteredGraphData.nodes.find(n => n.id === tgtId) || {});
            isHighlighted = srcMatch && tgtMatch;
            opacity = (srcMatch || tgtMatch) ? 0.3 : 0.05;
        }

        const colorParts = colors.link.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (colorParts) {
            const [, r, g, b] = colorParts;
            return isHighlighted 
                ? (darkMode ? `rgba(255,255,255,0.8)` : `rgba(0,0,0,0.8)`)
                : `rgba(${r},${g},${b},${opacity * 0.3})`; // Base alpha multiplied
        }
        return colors.link;
    }, [hoveredNode, searchQuery, isNodeMatch, filteredGraphData.nodes, colors, darkMode]);

    if (isLoading && graphData.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center py-32">
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm" style={{ backgroundColor: colors.bg, height: dimensions.height }}>
            
            {/* Top Bar Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
                <div className="flex items-center gap-3 text-xs font-medium bg-white dark:bg-black px-3 py-2 rounded-md border border-gray-200 dark:border-gray-800 pointer-events-auto shadow-sm">
                    <span>{filteredGraphData.nodes.length} nodes</span>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <span>{filteredGraphData.links.length} edges</span>
                </div>

                <motion.button 
                    whileTap={tapAnimation}
                    ref={settingsButtonRef}
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-2 bg-white dark:bg-black rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 pointer-events-auto shadow-sm transition-colors"
                >
                    <Settings2 className="w-4 h-4 text-black dark:text-white" />
                </motion.button>
            </div>

            {/* Recenter Graph Button */}
            <motion.button
                whileTap={tapAnimation}
                onClick={() => {
                    if (graphRef.current) {
                        // Use a responsive padding so the edge nodes and labels are safely within the screen bounds
                        const padding = dimensions.width < 600 ? 35 : 120;
                        graphRef.current.zoomToFit(400, padding, () => true);
                    }
                }}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-black rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 pointer-events-auto shadow-sm transition-colors text-black dark:text-white text-sm font-medium"
            >
                <Focus className="w-4 h-4" />
                Restore View
            </motion.button>

            {/* Obsidian Settings Panel Overlay */}
            <AnimatePresence mode="wait">
                {isSettingsOpen && (
                    <motion.div
                        ref={settingsRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-14 right-3 z-20 w-72 max-h-[80%] overflow-y-auto bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-4 text-sm"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-black dark:text-white">Graph Settings</h3>
                            <motion.button whileTap={tapAnimation} onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-black dark:hover:text-white">
                                <X className="w-4 h-4" />
                            </motion.button>
                        </div>

                        <div className="space-y-6">
                            {/* Filters */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filters</h4>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search files..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={showOrphans} 
                                        onChange={(e) => setShowOrphans(e.target.checked)}
                                        className="accent-black dark:accent-white border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">Show Orphans</span>
                                </label>
                            </div>

                            {/* Display */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Display</h4>
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 mb-1">Text Labels</label>
                                    <select 
                                        value={showLabels} 
                                        onChange={(e) => setShowLabels(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none py-1.5 px-2 text-black dark:text-white outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                    >
                                        <option value="hover">Hover Only</option>
                                        <option value="always">Always Show</option>
                                        <option value="never">Never Show</option>
                                    </select>
                                </div>
                            </div>

                            {/* Forces */}
                            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forces</h4>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-700 dark:text-gray-300">Repel Force</label>
                                        <span className="text-xs text-gray-500">{repelForce}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="500" 
                                        value={repelForce}
                                        onChange={(e) => setRepelForce(Number(e.target.value))}
                                        className="custom-slider"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-700 dark:text-gray-300">Gravity Force</label>
                                        <span className="text-xs text-gray-500">{gravityForce.toFixed(3)}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.005" 
                                        max="0.2" 
                                        step="0.005"
                                        value={gravityForce}
                                        onChange={(e) => setGravityForce(Number(e.target.value))}
                                        className="custom-slider"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-gray-700 dark:text-gray-300">Connection Length</label>
                                        <span className="text-xs text-gray-500">{linkDistance}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="150" 
                                        value={linkDistance}
                                        onChange={(e) => setLinkDistance(Number(e.target.value))}
                                        className="custom-slider"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${(!isLoading && isGraphReady) ? 'opacity-100' : 'opacity-0'}`}>
                <ForceGraph2D
                    ref={graphRef}
                    graphData={displayedGraphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    backgroundColor={colors.bg}
                    nodeCanvasObject={paintNode}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        const radius = 8;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }}
                    linkColor={getLinkColor}
                    linkWidth={(link) => {
                        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                        
                        if (hoveredNode) {
                            return (srcId === hoveredNode.id || tgtId === hoveredNode.id) ? 2 : 1;
                        }
                        return 1;
                    }}
                    warmupTicks={100}
                    linkDirectionalArrowLength={0} // Obsidian doesn't use arrows by default
                    linkCurvature={0} // Straight lines feel cleaner
                    onNodeHover={(node) => setHoveredNode(node)}
                    onNodeClick={(node) => {
                        if (onNoteClick) onNoteClick(node.id);
                    }}
                    onNodeDragEnd={(node) => {
                        // Unpin the node after dragging so gravity can pull it back to the center
                        node.fx = null;
                        node.fy = null;
                    }}
                    d3AlphaDecay={0.015}
                    d3VelocityDecay={0.4}
                    enableNodeDrag={true}
                />
            </div>
        </div>
    );
};

export default GraphView;
