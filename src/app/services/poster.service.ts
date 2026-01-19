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

    private project(lat: number, lon: number, centerLat: number, centerLon: number, scale: number, width: number, height: number): { x: number, y: number } {
        // Simple Equirectangular projection for small areas (or Mercator)
        // Using Mercator for better shape preservation
        const x = (lon - centerLat) * (Math.PI / 180) * 6378137;
        // Mercator y
        const latRad = lat * Math.PI / 180;
        const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * 6378137;

        // Center projection
        const centerLatRad = centerLat * Math.PI / 180;
        const centerY = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2)) * 6378137;
        const centerX = (centerLon - centerLat) * (Math.PI / 180) * 6378137; // This is wrong, centerLon should be subtracted from lon

        // Correct logic:
        // x = (lon - centerLon) * ...
        const xMeters = (lon - centerLon) * (Math.PI / 180) * 6378137 * Math.cos(centerLat * Math.PI / 180);
        const yMeters = (lat - centerLat) * 111320; // Simple approximation for now or full Mercator?

        // Let's use standard Web Mercator
        // x = lon * 20037508.34 / 180
        // y = log(tan((90 + lat) * PI / 360)) / (PI / 180) * 20037508.34 / 180

        // But we need to fit into width/height based on bbox.
        // Easier: Normalize lat/lon to 0-1 range based on bbox, then scale to width/height.
        return { x: 0, y: 0 };
    }

    // Better approach: Calculate bounds of data, then scale to fit canvas
    private getBounds(nodes: Map<number, { lat: number, lon: number }>): { minLat: number, maxLat: number, minLon: number, maxLon: number } {
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        for (const node of nodes.values()) {
            if (node.lat < minLat) minLat = node.lat;
            if (node.lat > maxLat) maxLat = node.lat;
            if (node.lon < minLon) minLon = node.lon;
            if (node.lon > maxLon) maxLon = node.lon;
        }
        return { minLat, maxLat, minLon, maxLon };
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

        // Combine all nodes for bounds calculation
        const allNodes = new Map<number, { lat: number, lon: number }>();
        const addNodes = (data: OsmData) => {
            for (const el of data.elements) {
                if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
                    allNodes.set(el.id, { lat: el.lat, lon: el.lon });
                }
            }
        };
        addNodes(roadsData);
        addNodes(waterData);
        addNodes(parksData);

        // Calculate bounds and scale
        // We want to center on `coords`
        // But we should use the bounds of the fetched data or the requested bbox?
        // Let's use the requested bbox logic.
        // We don't have the bbox here, but we have the data.
        // Let's calculate bounds from data.
        const bounds = this.getBounds(allNodes);

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

        // Helper to draw ways (Async to prevent UI freeze)
        const drawWays = async (data: OsmData, type: 'water' | 'park' | 'road') => {
            const nodeMap = this.createNodeMap(data.elements);

            // Sort roads by hierarchy if road
            let ways = data.elements.filter(e => e.type === 'way');

            if (type === 'road') {
                const hierarchy = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified'];
                ways.sort((a, b) => {
                    const hA = a.tags?.['highway'] || '';
                    const hB = b.tags?.['highway'] || '';
                    return hierarchy.indexOf(hA) - hierarchy.indexOf(hB);
                });
            }

            // Chunk rendering
            const BATCH_SIZE = 50;
            for (let i = 0; i < ways.length; i++) {
                if (i % BATCH_SIZE === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                const way = ways[i];
                if (!way.nodes) continue;

                const points: number[] = [];
                for (const nodeId of way.nodes) {
                    const node = nodeMap.get(nodeId);
                    if (node) {
                        const p = toCanvas(node.lat, node.lon);
                        points.push(p.x, p.y);
                    }
                }

                if (points.length < 4) continue;

                if (type === 'water') {
                    const poly = new Konva.Line({
                        points: points,
                        fill: theme.water,
                        closed: true,
                        strokeEnabled: false
                    });
                    layer.add(poly);
                } else if (type === 'park') {
                    const poly = new Konva.Line({
                        points: points,
                        fill: theme.parks,
                        closed: true,
                        strokeEnabled: false
                    });
                    layer.add(poly);
                } else if (type === 'road') {
                    const highway = way.tags?.['highway'] || 'unclassified';
                    let color = theme.road_default;
                    let width = 1;

                    if (['motorway', 'motorway_link'].includes(highway)) {
                        color = theme.road_motorway;
                        width = 3;
                    } else if (['trunk', 'trunk_link', 'primary', 'primary_link'].includes(highway)) {
                        color = theme.road_primary;
                        width = 2.5;
                    } else if (['secondary', 'secondary_link'].includes(highway)) {
                        color = theme.road_secondary;
                        width = 2;
                    } else if (['tertiary', 'tertiary_link'].includes(highway)) {
                        color = theme.road_tertiary;
                        width = 1.5;
                    } else if (['residential', 'living_street', 'unclassified'].includes(highway)) {
                        color = theme.road_residential;
                        width = 1;
                    }

                    const line = new Konva.Line({
                        points: points,
                        stroke: color,
                        strokeWidth: width,
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    layer.add(line);
                }
            }
        };

        // Draw Layers in order (Sequential await to keep UI responsive)
        await drawWays(waterData, 'water');
        await drawWays(parksData, 'park');
        await drawWays(roadsData, 'road');

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
