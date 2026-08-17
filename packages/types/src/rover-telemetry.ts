export interface RoverTelemetry {
  roverId: string;
  batteryLevel: number;
  gps: {
    lat: number;
    lng: number;
  };
  lidarState: 'Scanning' | 'Clear' | 'Obstacle' | 'Error';
  status: 'Idle' | 'Moving' | 'Shooting' | 'Charging' | 'Error';
  lastUpdated: string;
}

export interface RoverCommand {
  commandId: string;
  roverId: string;
  action: 'dispatch' | 'dock' | 'compose_shot';
  payload?: Record<string, unknown>;
  timestamp: string;
}
