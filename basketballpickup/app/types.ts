// src/types.ts (Optional: Or define inline)

export interface Coords {
    latitude: number;
    longitude: number;
  }
  
  // Simplified structure for Overpass elements we care about
  export interface OverpassElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number; // Nodes have lat/lon directly
    lon?: number;
    center?: { // Ways/relations have center when using 'out center;'
      lat: number;
      lon: number;
    };
    tags?: {
      [key: string]: string; // e.g., name, sport, leisure
    };
  }
  
  export interface OverpassResponse {
    elements: OverpassElement[];
  }
  
  // Our simplified Court data structure for map markers
  export interface Court {
    id: number;
    latitude: number;
    longitude: number;
    name?: string;
    tags?: { [key: string]: string };
  }