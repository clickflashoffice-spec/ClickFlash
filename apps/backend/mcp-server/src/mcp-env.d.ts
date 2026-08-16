declare module '@modelcontextprotocol/sdk/types.js' {
  export interface Tool {
    name: string;
    description?: string;
    inputSchema: {
      type: "object";
      properties?: Record<string, any>;
      required?: string[];
    };
  }
  
  export interface Prompt {
    name: string;
    description?: string;
    arguments?: any[];
  }
  
  export interface Resource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }
  
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
  export const ListResourcesRequestSchema: any;
  export const ReadResourceRequestSchema: any;
  export const ListPromptsRequestSchema: any;
  export const GetPromptRequestSchema: any;
  export const CallToolResultSchema: any;
}
