import { Coordinates } from "./location.interface";

// =================== src/app/core/models/map.interface.ts ===================
export interface MapMarker {
  id: string;
  position: Coordinates;
  title: string;
  description?: string;
  type: MarkerType;
  icon?: string;
  color?: string;
  isVisible: boolean;
  data?: any;
}

export interface MapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  steps: RouteStep[];
  polyline: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: Coordinates;
  endLocation: Coordinates;
}

export enum MarkerType {
  PARKING = 'parking',
  USER_LOCATION = 'user_location',
  DESTINATION = 'destination',
  POINT_OF_INTEREST = 'poi',
  SEARCH_RESULT = 'search_result'
}
