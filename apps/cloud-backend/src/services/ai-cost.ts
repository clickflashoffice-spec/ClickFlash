import type { D1Database } from '@cloudflare/workers-types';

export async function logAICost(
  db: D1Database,
  functionName: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  resortId?: string
) {
  const costUsd = (promptTokens * 0.075 / 1000000) + (completionTokens * 0.30 / 1000000);
  const id = crypto.randomUUID();
  
  await db.prepare(
    `INSERT INTO ai_cost_ledger (id, function_name, model, prompt_tokens, completion_tokens, estimated_cost_usd, resort_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, functionName, model, promptTokens, completionTokens, costUsd, resortId || null).run();
}

export async function checkDailyBudget(db: D1Database, maxDailyUsd: number): Promise<boolean> {
  const result = await db.prepare(
    `SELECT SUM(estimated_cost_usd) as total FROM ai_cost_ledger WHERE date(created_at) = date('now')`
  ).first();
  const total = (result?.total as number) || 0;
  return total > maxDailyUsd;
}
