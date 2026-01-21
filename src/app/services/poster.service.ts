import { Injectable } from '@angular/core';
import Konva from 'konva';
import { Theme } from './theme.service';
import {
    CategorizedMapData,
    OverpassGeomWay,
    OverpassGeomElement,
    OverpassGeomRelation,
    OverpassRelationMember
} from './overpass.types';

@Injectable({
    providedIn: 'root'
})
export class PosterService {

    async generatePoster(
        containerId: string,
        mapData: CategorizedMapData,
        theme: Theme,
        city: string,
        country: string,
        coords: { lat: number, lon: number },
        distance: number,
        onProgress?: (message: string, progress: number) => void,
        width: number = 1200,
        height: number = 1600
    ): Promise<Konva.Stage> {

        const stage = new Konva.Stage({
            container: containerId,
            width: width,
            height: height
        });

        const layer = new Konva.Layer();
        stage.add(layer);

        // Background
        const bg = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: height,
            fill: theme.bg
        });
        layer.add(bg);

        // Mercator projection function (Lat/Lon to Meters)
        // Standard Web Mercator (EPSG:3857)
        const R = 6378137; // Earth radius in meters
        const MAX_LAT = 85.05112878;

        const project = (lat: number, lon: number) => {
            // Clamp latitude to avoid infinity
            const safeLat = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);

            const x = R * (lon * Math.PI / 180);
            const y = R * Math.log(Math.tan(Math.PI / 4 + (safeLat * Math.PI / 180) / 2));
            return { x, y };
        };

        // Project center
        const cProj = project(coords.lat, coords.lon);

        // Define viewport in METERS (using distance as horizontal radius)
        // Adjust for Mercator projection distortion: Scale by 1/cos(lat)
        const scaleFactor = 1 / Math.cos(coords.lat * Math.PI / 180);
        const distMapUnits = distance * scaleFactor;

        const ratio = height / width;
        const minX = cProj.x - distMapUnits;
        const maxX = cProj.x + distMapUnits;
        const minY = cProj.y - (distMapUnits * ratio);
        const maxY = cProj.y + (distMapUnits * ratio);

        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;

        // We will use minX/minY as our "minProj" for offset calculation
        const minProj = { x: minX, y: minY };

        // Scale to fit canvas
        const scale = width / dataWidth;

        // Center vertically in the canvas
        const renderedHeight = dataHeight * scale;
        const offsetX = (width - dataWidth * scale) / 2;
        const offsetY = (height - renderedHeight) / 2;

        const toCanvas = (lat: number, lon: number) => {
            const proj = project(lat, lon);
            // Flip Y because canvas Y is down (screen coordinates)
            return {
                x: (proj.x - minProj.x) * scale + offsetX,
                y: height - ((proj.y - minProj.y) * scale + offsetY)
            };
        };

        // Helper to extract points from inline geometry
        // Note: Some geometry arrays may contain null entries that need to be skipped
        const extractPoints = (geometry: ({ lat: number; lon: number } | null)[]): number[] => {
            const points: number[] = [];
            for (const coord of geometry) {
                if (coord && coord.lat != null && coord.lon != null) {
                    const p = toCanvas(coord.lat, coord.lon);
                    points.push(p.x, p.y);
                }
            }
            return points;
        };

        // Draw water and parks with inline geometry
        const drawPolygons = async (
            elements: OverpassGeomElement[],
            color: string,
            startProgress: number,
            endProgress: number,
            label: string
        ) => {
            const paths: number[][] = [];
            const CHUNK_SIZE = 500;

            for (let i = 0; i < elements.length; i++) {
                if (i % CHUNK_SIZE === 0) {
                    const currentProgress = startProgress + ((i / elements.length) * (endProgress - startProgress));
                    if (onProgress) onProgress(`Processing ${label}...`, Math.round(currentProgress));
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const el = elements[i];

                if (el.type === 'way') {
                    // Way with inline geometry
                    const way = el as OverpassGeomWay;
                    if (way.geometry && way.geometry.length >= 3) {
                        const points = extractPoints(way.geometry);
                        if (points.length >= 6) {
                            paths.push(points);
                        }
                    }
                } else if (el.type === 'relation') {
                    // Relation - extract geometry from members
                    const rel = el as OverpassGeomRelation;
                    for (const member of rel.members) {
                        if (member.geometry && member.geometry.length >= 3) {
                            const points = extractPoints(member.geometry);
                            if (points.length >= 6) {
                                paths.push(points);
                            }
                        }
                    }
                }
            }

            if (paths.length === 0) return;

            // Render all paths in a single shape for performance
            // IMPORTANT: Use fillStrokeShape to apply shape's fill/stroke colors
            const shape = new Konva.Shape({
                fill: color,
                strokeEnabled: false,
                listening: false,
                sceneFunc: function (context, shape) {
                    context.beginPath();
                    for (const path of paths) {
                        context.moveTo(path[0], path[1]);
                        for (let i = 2; i < path.length; i += 2) {
                            context.lineTo(path[i], path[i + 1]);
                        }
                        context.closePath();
                    }
                    // fillStrokeShape applies the shape's fill/stroke properties
                    context.fillStrokeShape(shape);
                }
            });
            layer.add(shape);
        };

        // Draw roads with proper z-ordering (major roads on top)
        const drawRoads = async (
            roads: OverpassGeomWay[],
            startProgress: number,
            endProgress: number
        ) => {
            // Group roads by style for efficient batching
            // Key format: "color|width|zIndex"
            const roadGroups = new Map<string, number[][]>();
            const CHUNK_SIZE = 1000;

            for (let i = 0; i < roads.length; i++) {
                if (i % CHUNK_SIZE === 0) {
                    const currentProgress = startProgress + ((i / roads.length) * (endProgress - startProgress));
                    if (onProgress) onProgress('Processing roads...', Math.round(currentProgress));
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const way = roads[i];
                if (!way.geometry || way.geometry.length < 2) continue;

                const points = extractPoints(way.geometry);
                if (points.length < 4) continue;

                // Determine road style based on highway type
                const highway = way.tags?.['highway'] || 'unclassified';
                let color = theme.road_default;
                let width = 1;
                let zIndex = 0; // Higher zIndex = drawn later = on top visually

                if (['motorway', 'motorway_link'].includes(highway)) {
                    color = theme.road_motorway;
                    width = 3;
                    zIndex = 4; // Highest - drawn on top
                } else if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(highway)) {
                    color = theme.road_primary;
                    width = 2.5;
                    zIndex = 3;
                } else if (['secondary', 'secondary_link'].includes(highway)) {
                    color = theme.road_secondary;
                    width = 2;
                    zIndex = 2;
                } else if (['tertiary', 'tertiary_link'].includes(highway)) {
                    color = theme.road_tertiary;
                    width = 1.5;
                    zIndex = 1;
                } else if (['residential', 'living_street', 'unclassified'].includes(highway)) {
                    color = theme.road_residential;
                    width = 1;
                    zIndex = 0; // Lowest - drawn first (below other roads)
                }

                const key = `${color}|${width}|${zIndex}`;
                if (!roadGroups.has(key)) {
                    roadGroups.set(key, []);
                }
                roadGroups.get(key)!.push(points);
            }

            if (roadGroups.size === 0) return;

            // Sort by zIndex (ascending) so lower roads are drawn first
            const sortedKeys = Array.from(roadGroups.keys()).sort((a, b) => {
                const zA = parseInt(a.split('|')[2], 10);
                const zB = parseInt(b.split('|')[2], 10);
                return zA - zB;
            });

            const MAX_PATHS_PER_SHAPE = 2000;

            for (const key of sortedKeys) {
                const [color, widthStr] = key.split('|');
                const strokeWidth = parseFloat(widthStr);
                const allPaths = roadGroups.get(key)!;

                // Split into chunks to avoid canvas crash
                for (let i = 0; i < allPaths.length; i += MAX_PATHS_PER_SHAPE) {
                    const batchPaths = allPaths.slice(i, i + MAX_PATHS_PER_SHAPE);

                    const shape = new Konva.Shape({
                        stroke: color,
                        strokeWidth: strokeWidth,
                        lineCap: 'round',
                        lineJoin: 'round',
                        listening: false,
                        sceneFunc: function (context, shape) {
                            context.beginPath();
                            for (const path of batchPaths) {
                                context.moveTo(path[0], path[1]);
                                for (let k = 2; k < path.length; k += 2) {
                                    context.lineTo(path[k], path[k + 1]);
                                }
                            }
                            // fillStrokeShape applies the shape's stroke properties
                            context.fillStrokeShape(shape);
                        }
                    });
                    layer.add(shape);
                }
            }
        };

        // Draw waterways (rivers, streams) as stroked lines
        // Similar to roads but with water color
        const drawWaterways = async (
            waterways: OverpassGeomWay[],
            color: string,
            startProgress: number,
            endProgress: number
        ) => {
            const paths: number[][] = [];
            const CHUNK_SIZE = 500;

            for (let i = 0; i < waterways.length; i++) {
                if (i % CHUNK_SIZE === 0) {
                    const currentProgress = startProgress + ((i / waterways.length) * (endProgress - startProgress));
                    if (onProgress) onProgress(`Processing waterways...`, Math.round(currentProgress));
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const way = waterways[i];
                if (!way.geometry || way.geometry.length < 2) continue;

                const points = extractPoints(way.geometry);
                if (points.length >= 4) {
                    paths.push(points);
                }
            }

            if (paths.length === 0) return;

            // Determine stroke width based on waterway type
            // Major rivers get thicker lines
            const getWaterwayWidth = (tags: Record<string, string> | undefined): number => {
                const type = tags?.['waterway'] || '';
                if (type === 'river') return 3;
                if (type === 'canal') return 2.5;
                if (type === 'stream') return 1.5;
                return 1; // ditch, drain, etc.
            };

            // Group by width for efficient batching
            const widthGroups = new Map<number, number[][]>();
            for (let i = 0; i < waterways.length; i++) {
                const way = waterways[i];
                if (!way.geometry || way.geometry.length < 2) continue;
                const points = extractPoints(way.geometry);
                if (points.length < 4) continue;

                const strokeWidth = getWaterwayWidth(way.tags);
                if (!widthGroups.has(strokeWidth)) {
                    widthGroups.set(strokeWidth, []);
                }
                widthGroups.get(strokeWidth)!.push(points);
            }

            const MAX_PATHS_PER_SHAPE = 2000;

            // Draw from thinnest to thickest (larger rivers on top)
            const sortedWidths = Array.from(widthGroups.keys()).sort((a, b) => a - b);

            for (const strokeWidth of sortedWidths) {
                const allPaths = widthGroups.get(strokeWidth)!;

                for (let i = 0; i < allPaths.length; i += MAX_PATHS_PER_SHAPE) {
                    const batchPaths = allPaths.slice(i, i + MAX_PATHS_PER_SHAPE);

                    const shape = new Konva.Shape({
                        stroke: color,
                        strokeWidth: strokeWidth,
                        lineCap: 'round',
                        lineJoin: 'round',
                        listening: false,
                        sceneFunc: function (context, shape) {
                            context.beginPath();
                            for (const path of batchPaths) {
                                context.moveTo(path[0], path[1]);
                                for (let k = 2; k < path.length; k += 2) {
                                    context.lineTo(path[k], path[k + 1]);
                                }
                            }
                            context.fillStrokeShape(shape);
                        }
                    });
                    layer.add(shape);
                }
            }
        };

        // Draw Layers in order
        (async () => {
            try {
                // 1. Water areas (lakes, basins) - filled polygons
                if (onProgress) onProgress('Water areas', 5);
                await drawPolygons(mapData.waterAreas, theme.water, 0, 15, 'water areas');

                // 2. Parks and green spaces
                if (onProgress) onProgress('Parks', 15);
                await drawPolygons(mapData.parks, theme.parks, 15, 30, 'parks');

                // 3. Waterways (rivers, streams) - stroked lines
                if (onProgress) onProgress('Waterways', 30);
                await drawWaterways(mapData.waterways, theme.water, 30, 45);

                // 4. Roads (on top of everything)
                if (onProgress) onProgress('Roads', 45);
                await drawRoads(mapData.roads, 45, 90);

                if (onProgress) onProgress('Finalizing', 95);
                await new Promise(resolve => setTimeout(resolve, 0));

                // Gradient Fade - Top
                const gradTop = new Konva.Rect({
                    x: 0,
                    y: 0,
                    width: width,
                    height: height * 0.25,
                    fillLinearGradientStartPoint: { x: 0, y: 0 },
                    fillLinearGradientEndPoint: { x: 0, y: height * 0.25 },
                    fillLinearGradientColorStops: [0, theme.gradient_color, 1, 'rgba(0,0,0,0)']
                });
                layer.add(gradTop);

                // Gradient Fade - Bottom
                const gradBottom = new Konva.Rect({
                    x: 0,
                    y: height * 0.75,
                    width: width,
                    height: height * 0.25,
                    fillLinearGradientStartPoint: { x: 0, y: 0 },
                    fillLinearGradientEndPoint: { x: 0, y: height * 0.25 },
                    fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 1, theme.gradient_color]
                });
                layer.add(gradBottom);

                // Text - City
                const cityText = new Konva.Text({
                    x: width / 2,
                    y: height * 0.86 - 50,
                    text: city.toUpperCase().split('').join('  '),
                    fontSize: 60,
                    fontFamily: 'Roboto',
                    fontStyle: 'bold',
                    fill: theme.text,
                    align: 'center'
                });
                cityText.offsetX(cityText.width() / 2);
                layer.add(cityText);

                // Text - Country
                const countryText = new Konva.Text({
                    x: width / 2,
                    y: height * 0.90,
                    text: country.toUpperCase(),
                    fontSize: 22,
                    fontFamily: 'Roboto',
                    fontStyle: 'normal',
                    fill: theme.text,
                    align: 'center'
                });
                countryText.offsetX(countryText.width() / 2);
                layer.add(countryText);

                // Text - Coordinates
                const latStr = coords.lat >= 0 ? `${coords.lat.toFixed(4)}° N` : `${Math.abs(coords.lat).toFixed(4)}° S`;
                const lonStr = coords.lon >= 0 ? `${coords.lon.toFixed(4)}° E` : `${Math.abs(coords.lon).toFixed(4)}° W`;
                const coordText = new Konva.Text({
                    x: width / 2,
                    y: height * 0.93,
                    text: `${latStr} / ${lonStr}`,
                    fontSize: 14,
                    fontFamily: 'Roboto',
                    fill: theme.text,
                    opacity: 0.7,
                    align: 'center'
                });
                coordText.offsetX(coordText.width() / 2);
                layer.add(coordText);

                // Separator Line
                const sepLine = new Konva.Line({
                    points: [width * 0.4, height * 0.88, width * 0.6, height * 0.88],
                    stroke: theme.text,
                    strokeWidth: 1
                });
                layer.add(sepLine);

                // Attribution
                const attrText = new Konva.Text({
                    x: width - 10,
                    y: height - 20,
                    text: '© OpenStreetMap contributors',
                    fontSize: 10,
                    fontFamily: 'Roboto',
                    fill: theme.text,
                    opacity: 0.5,
                    align: 'right'
                });
                attrText.offsetX(attrText.width());
                layer.add(attrText);

                layer.batchDraw();

                if (onProgress) onProgress('Done', 100);

            } catch (err) {
                console.error("Background rendering error", err);
                if (onProgress) onProgress('Error', 0);
            }
        })();

        // Return stage IMMEDIATELY with just background
        return stage;
    }
}
