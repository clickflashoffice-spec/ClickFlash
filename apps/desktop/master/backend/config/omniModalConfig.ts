export enum EcosystemMode {
  STUDIO = "STUDIO",
  SAAS = "SAAS",
  AUTONOMOUS = "AUTONOMOUS",
}

export interface OmniModalState {
  currentMode: EcosystemMode;
  uiEnabled: boolean;
  localPrintingEnabled: boolean;
  redisIngestionEnabled: boolean;
  biometricLinkingEnabled: boolean;
}

class OmniModalConfigManager {
  private state: OmniModalState;

  constructor() {
    // Default to Autonomous for V7.0 Edge Node
    const modeStr = process.env.ECOSYSTEM_MODE || "AUTONOMOUS";
    const mode = this.parseMode(modeStr);
    this.state = this.buildStateForMode(mode);
  }

  private parseMode(modeStr: string): EcosystemMode {
    switch (modeStr.toUpperCase()) {
      case "STUDIO": return EcosystemMode.STUDIO;
      case "SAAS": return EcosystemMode.SAAS;
      case "AUTONOMOUS": return EcosystemMode.AUTONOMOUS;
      default: return EcosystemMode.AUTONOMOUS;
    }
  }

  private buildStateForMode(mode: EcosystemMode): OmniModalState {
    switch (mode) {
      case EcosystemMode.STUDIO:
        return {
          currentMode: mode,
          uiEnabled: true,
          localPrintingEnabled: true,
          redisIngestionEnabled: false,
          biometricLinkingEnabled: false,
        };
      case EcosystemMode.SAAS:
        return {
          currentMode: mode,
          uiEnabled: false, // UI is in the cloud web portal
          localPrintingEnabled: false,
          redisIngestionEnabled: true,
          biometricLinkingEnabled: true,
        };
      case EcosystemMode.AUTONOMOUS:
        return {
          currentMode: mode,
          uiEnabled: false, // Headless edge node
          localPrintingEnabled: false,
          redisIngestionEnabled: true,
          biometricLinkingEnabled: true,
        };
    }
  }

  public getState(): OmniModalState {
    return { ...this.state };
  }

  public setMode(newMode: EcosystemMode) {
    console.log(`[OmniModal] Transitioning ecosystem mode to: ${newMode}`);
    this.state = this.buildStateForMode(newMode);
  }
}

export const omniModalConfig = new OmniModalConfigManager();
