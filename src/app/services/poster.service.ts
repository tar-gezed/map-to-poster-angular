import { Injectable } from '@angular/core';
import Konva from 'konva';
import { Theme } from './theme.service';

export interface OsmElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    nodes?: number[];
    tags?: { [key: string]: string };
    members?: { type: string; ref: number; role: string }[];
}

export interface OsmData {
    elements: OsmElement[];
}

@Injectable({
    providedIn: 'root'
})
export class PosterService {

    constructor() { }

    private createNodeMap(elements: OsmElement[]): Map<number, { lat: number, lon: number }> {
        const nodeMap = new Map<number, { lat: number, lon: number }>();
        for (const el of elements) {
            if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
                nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
            }
        }
        return nodeMap;
    }

    async generatePoster(
        containerId: string,
        roadsData: OsmData,
        waterData: OsmData,
        parksData: OsmData,
        theme: Theme,
        city: string,
        country: string,
        coords: { lat: number, lon: number },
        distance: number,
        width: number = 1200, // 1200x1600 is good for preview, export can be higher
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

        // Define viewport in METERS (using distance as radius)
        const minX = cProj.x - distance;
        const maxX = cProj.x + distance;
        const minY = cProj.y - distance;
        const maxY = cProj.y + distance;

        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;

        // We will use minX/minY as our "minProj" for offset calculation
        const minProj = { x: minX, y: minY };

        // Scale to fit canvas
        // Canvas is 1200x1600 (Portrait)
        // Data is Square
        // We want to FIT WIDTH (filling the width of the poster)
        const scale = width / dataWidth;

        // Center vertically in the canvas
        // The data height in canvas pixels:
        const renderedHeight = dataHeight * scale;
        const offsetX = (width - dataWidth * scale) / 2;
        const offsetY = (height - renderedHeight) / 2;

        const toCanvas = (lat: number, lon: number) => {
            const proj = project(lat, lon);
            // Flip Y because canvas Y is down (screen coordinates)
            // But Mercator Y increases upwards (North).
            return {
                x: (proj.x - minProj.x) * scale + offsetX,
                y: height - ((proj.y - minProj.y) * scale + offsetY)
            };
        };

        // Optimized batch rendering
        const drawOptimizedLayers = (data: OsmData, type: 'water' | 'park' | 'road') => {
            const nodeMap = this.createNodeMap(data.elements);
            const ways = data.elements.filter(e => e.type === 'way');

            // 1. Pre-process geometry
            // Convert everything to array of points [[x,y,x,y], [x,y,x,y]]
            const paths: number[][] = [];
            const roadGroups: Map<string, number[][]> = new Map(); // key = "color_width_zIndex", value = array of paths

            for (const way of ways) {
                if (!way.nodes || way.nodes.length < 2) continue;

                const points: number[] = [];
                for (const nodeId of way.nodes) {
                    const node = nodeMap.get(nodeId);
                    if (node) {
                        const p = toCanvas(node.lat, node.lon);
                        points.push(p.x, p.y);
                    }
                }

                if (points.length < 4) continue; // Need at least 2 points (x,y, x,y)

                if (type === 'road') {
                    // Group roads by style
                    const highway = way.tags?.['highway'] || 'unclassified';
                    let color = theme.road_default;
                    let width = 1;
                    let zIndex = 0; // 0=lowest (drawn first), 4=highest (drawn last)

                    if (['motorway', 'motorway_link'].includes(highway)) {
                        color = theme.road_motorway;
                        width = 3;
                        zIndex = 0;
                    } else if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(highway)) {
                        color = theme.road_primary;
                        width = 2.5;
                        zIndex = 1;
                    } else if (['secondary', 'secondary_link'].includes(highway)) {
                        color = theme.road_secondary;
                        width = 2;
                        zIndex = 2;
                    } else if (['tertiary', 'tertiary_link'].includes(highway)) {
                        color = theme.road_tertiary;
                        width = 1.5;
                        zIndex = 3;
                    } else if (['residential', 'living_street', 'unclassified'].includes(highway)) {
                        color = theme.road_residential;
                        width = 1;
                        zIndex = 4;
                    }

                    const key = `${color}|${width}|${zIndex}`;
                    if (!roadGroups.has(key)) {
                        roadGroups.set(key, []);
                    }
                    roadGroups.get(key)!.push(points);

                } else {
                    // Water / Park
                    paths.push(points);
                }
            }

            // 2. Create Konva Shapes
            if (type === 'water' || type === 'park') {
                if (paths.length === 0) return;

                const color = type === 'water' ? theme.water : theme.parks;
                const shape = new Konva.Shape({
                    fill: color,
                    strokeEnabled: false,
                    listening: false, // Performance optimization
                    sceneFunc: (context, shape) => {
                        context.beginPath();
                        for (const path of paths) {
                            context.moveTo(path[0], path[1]);
                            for (let i = 2; i < path.length; i += 2) {
                                context.lineTo(path[i], path[i + 1]);
                            }
                            context.closePath();
                        }
                        context.fillStrokeShape(shape);
                    }
                });
                layer.add(shape);
            } else if (type === 'road') {
                if (roadGroups.size === 0) return;

                // Sort by zIndex (ascending)
                const sortedKeys = Array.from(roadGroups.keys()).sort((a, b) => {
                    const zA = parseInt(a.split('|')[2], 10);
                    const zB = parseInt(b.split('|')[2], 10);
                    return zA - zB;
                });

                for (const key of sortedKeys) {
                    const [color, widthStr] = key.split('|');
                    const width = parseFloat(widthStr);
                    const roadPaths = roadGroups.get(key)!;

                    const shape = new Konva.Shape({
                        stroke: color,
                        strokeWidth: width,
                        lineCap: 'round',
                        lineJoin: 'round',
                        listening: false,
                        sceneFunc: (context, shape) => {
                            context.beginPath();
                            for (const path of roadPaths) {
                                context.moveTo(path[0], path[1]);
                                for (let i = 2; i < path.length; i += 2) {
                                    context.lineTo(path[i], path[i + 1]);
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
        drawOptimizedLayers(waterData, 'water');
        drawOptimizedLayers(parksData, 'park');
        drawOptimizedLayers(roadsData, 'road');

        // Gradient Fade
        // Top
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

        // Bottom
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

        // Text
        // City
        // Adjust Y to account for text height (Konva draws from top-left)
        // We want the baseline around 0.86, so subtract font height roughly
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

        // Country
        const countryText = new Konva.Text({
            x: width / 2,
            y: height * 0.90, // Keep this, or adjust if needed
            text: country.toUpperCase(),
            fontSize: 22,
            fontFamily: 'Roboto',
            fontStyle: 'normal',
            fill: theme.text,
            align: 'center'
        });
        countryText.offsetX(countryText.width() / 2);
        layer.add(countryText);

        // Coords
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
        // Ensure this is below City and above Country
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

        layer.draw();
        return stage;
    }
}
