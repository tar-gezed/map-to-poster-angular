/**
 * Overpass API response types for `out geom` format.
 * Using `out geom` embeds coordinates directly in ways/relations,
 * eliminating the need for separate node elements and lookups.
 */

export interface OverpassGeomCoord {
    lat: number;
    lon: number;
}

/**
 * Way element with inline geometry from `out geom` format.
 * Coordinates are embedded directly, no node IDs needed.
 */
export interface OverpassGeomWay {
    type: 'way';
    id: number;
    geometry: OverpassGeomCoord[];
    tags?: Record<string, string>;
}

/**
 * Relation member with optional inline geometry.
 * Way members will have geometry array, node members have lat/lon.
 */
export interface OverpassRelationMember {
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
    lat?: number;  // For node members
    lon?: number;  // For node members
    geometry?: OverpassGeomCoord[];  // For way members
}

/**
 * Relation element with inline geometry from `out geom` format.
 */
export interface OverpassGeomRelation {
    type: 'relation';
    id: number;
    members: OverpassRelationMember[];
    tags?: Record<string, string>;
}

export type OverpassGeomElement = OverpassGeomWay | OverpassGeomRelation;

export interface OverpassGeomResponse {
    version: number;
    generator: string;
    elements: OverpassGeomElement[];
}

/**
 * Categorized map data after parsing Overpass response.
 * With `out geom`, geometry is inline - no node map needed!
 */
export interface CategorizedMapData {
    roads: OverpassGeomWay[];
    water: OverpassGeomElement[];
    parks: OverpassGeomElement[];
}

// Legacy types for backward compatibility with deprecated methods
export interface OverpassNode {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
}

export interface OverpassWay {
    type: 'way';
    id: number;
    nodes: number[];
    tags?: Record<string, string>;
}

export interface OverpassRelation {
    type: 'relation';
    id: number;
    members: { type: string; ref: number; role: string }[];
    tags?: Record<string, string>;
}

export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

export interface OverpassResponse {
    version: number;
    generator: string;
    elements: OverpassElement[];
}
