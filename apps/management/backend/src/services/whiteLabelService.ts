import { logger } from '../utils/logger';
import type { Env } from '../server';

export interface WhiteLabelConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  emailFromName?: string;
}

export class WhiteLabelService {
  constructor(private env: Env) {}

  async getConfig(deskId: string) {
    try {
      const configStr = await this.env.DB.prepare(
        'SELECT white_label_config FROM desks WHERE id = ?'
      ).bind(deskId).first('white_label_config');
      
      if (!configStr) return {};
      return JSON.parse(configStr as string);
    } catch (error) {
      logger.error(`Failed to get white label config for desk ${deskId}: ${error}`);
      throw error;
    }
  }

  async updateConfig(deskId: string, config: WhiteLabelConfig) {
    try {
      const existingConfig = await this.getConfig(deskId);
      const newConfig = { ...existingConfig, ...config };
      
      await this.env.DB.prepare(
        'UPDATE desks SET white_label_config = ? WHERE id = ?'
      ).bind(JSON.stringify(newConfig), deskId).run();
      
      logger.info(`Updated white label config for desk ${deskId}`);
      return newConfig;
    } catch (error) {
      logger.error(`Failed to update white label config for desk ${deskId}: ${error}`);
      throw error;
    }
  }
}
