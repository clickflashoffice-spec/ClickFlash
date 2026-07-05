import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "../loginRateLimiter.js";
import { validateLogin } from "../validation.js";
import { verifyPassword } from "../auth.js";
import { handlePayments } from "../payments.js";

export const handleRecords = async (request: Request, url: URL, pathName: string, env: any, dbManager: any, corsHeaders: any, photoProcessor: any, payload: any) => {


          // Records CRUD with SQL Injection protection
          if (pathName.includes("/records")) {
            const collection = pathName.split("/")[3];
            
            // Whitelist of allowed tables - prevents SQL injection
            const ALLOWED_TABLES: Record<string, string> = {
              albums: "albums",
              photos: "photos",
              orders: "orders",
              users: "users",
              products: "products",
              bookings: "bookings",
              destinations: "destinations",
            };
            
            // Strict validation - reject unknown tables
            if (!ALLOWED_TABLES[collection]) {
              return new Response(
                JSON.stringify({
                  error: "Bad Request",
                  message: "Invalid collection: " + collection,
                }),
                {
                  status: 400,
                },
              );
            }
            
            const table = ALLOWED_TABLES[collection];

            if (request.method === "GET") {
              const url = new URL(request.url);
              const filterParam = url.searchParams.get("filter");
              const limit = parseInt(url.searchParams.get("limit") || "100", 10);
              const offset = parseInt(url.searchParams.get("offset") || "0", 10);

              // Build parameterized query
              let query = `SELECT * FROM ${table}`;
              const params: any[] = [];

              if (filterParam) {
                const filters = filterParam.split("&&").map((f) => f.trim());
                filters.forEach((f) => {
                  const match = f.match(
                    /([a-zA-Z0-9_]+)\s*=\s*["']?([^"']+)["']?/,
                  );
                  if (match) {
                    const key = match[1];
                    const val = match[2];
                    // Validate column name against whitelist pattern
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                      query +=
                        (params.length === 0 ? " WHERE " : " AND ") +
                        `${key} = ?`;
                      params.push(val);
                    }
                  }
                });
              }

              // Add pagination
              query += ` LIMIT ? OFFSET ?`;
              params.push(Math.min(limit, 100), offset); // Cap at 100 records

              const records = await dbManager.query(query, params);
              return new Response(
                JSON.stringify({ results: records, count: records.length }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            // POST - Create record
            if (request.method === "POST") {
              try {
                const body = await request.json() as any;
                
                // Get column names from body
                const columns = Object.keys(body).filter(k => 
                  /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)
                );
                
                if (columns.length === 0) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "No valid fields provided" }),
                    { status: 400 }
                  );
                }
                
                const placeholders = columns.map(() => "?").join(", ");
                const values = columns.map(c => body[c]);
                
                const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
                await dbManager.run(query, values);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record created" }),
                  { status: 201 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Create Error", message: e.message }),
                  { status: 500 }
                );
              }
            }

            // PATCH - Update record
            if (request.method === "PATCH") {
              try {
                const body = await request.json() as any;
                const id = body.id;
                
                if (!id) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "ID required" }),
                    { status: 400 }
                  );
                }
                
                const columns = Object.keys(body)
                  .filter(k => k !== "id" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
                
                if (columns.length === 0) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "No valid fields to update" }),
                    { status: 400 }
                  );
                }
                
                const setClause = columns.map(c => `${c} = ?`).join(", ");
                const values = [...columns.map(c => body[c]), id];
                
                const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
                await dbManager.run(query, values);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record updated" }),
                  { status: 200 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Update Error", message: e.message }),
                  { status: 500 }
                );
              }
            }

            // DELETE - Delete record
            if (request.method === "DELETE") {
              try {
                const body = await request.json() as any;
                const id = body.id;
                
                if (!id) {
                  return new Response(
                    JSON.stringify({ error: "Bad Request", message: "ID required" }),
                    { status: 400 }
                  );
                }
                
                const query = `DELETE FROM ${table} WHERE id = ?`;
                await dbManager.run(query, [id]);
                
                return new Response(
                  JSON.stringify({ success: true, message: "Record deleted" }),
                  { status: 200 }
                );
              } catch (e: any) {
                return new Response(
                  JSON.stringify({ error: "Delete Error", message: e.message }),
                  { status: 500 }
                );
              }
            }
          }
  return null;
};
