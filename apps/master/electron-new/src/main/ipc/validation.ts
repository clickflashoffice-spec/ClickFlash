import { z } from 'zod';
import { IpcChannels, InvokeChannel } from './channels';

const validationSchemas: Partial<Record<InvokeChannel, z.ZodSchema>> = {
  'kiosk:unlock': z.object({ pin: z.string().length(6) }),
  'dialog:openDirectory': z.object({
    title: z.string().optional(),
    buttonLabel: z.string().optional()
  }).optional(),
  'dialog:openFile': z.object({
    title: z.string().optional(),
    filters: z.array(z.object({
      name: z.string(),
      extensions: z.array(z.string())
    })).optional(),
    multiple: z.boolean().optional()
  }).optional(),
  'dialog:saveFile': z.object({
    title: z.string().optional(),
    defaultPath: z.string().optional(),
    filters: z.array(z.object({
      name: z.string(),
      extensions: z.array(z.string())
    })).optional()
  }).optional(),
};

export function validateIpcPayload(channel: InvokeChannel, args: unknown[]): { valid: boolean; error?: string; data?: unknown } {
  const schema = validationSchemas[channel];
  
  if (!schema) {
    return { valid: true, data: args };
  }

  try {
    const data = args.length === 1 ? args[0] : args;
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { valid: true, data: result.data };
    }
    
    return { 
      valid: false, 
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Validation error' };
  }
}

export function isValidInvokeChannel(channel: string): channel is InvokeChannel {
  return IpcChannels.invoke.includes(channel as InvokeChannel);
}

export function isValidOnChannel(channel: string): channel is typeof IpcChannels.on[number] {
  return IpcChannels.on.includes(channel as typeof IpcChannels.on[number]);
}
