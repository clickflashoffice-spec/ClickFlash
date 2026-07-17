const STAFF_ROLES = new Set(["admin", "manager", "owner", "photographer", "super-admin", "super_admin"]);

export const handleRest = async (
  request: Request,
  url: URL,
  pathName: string,
  dbManager: any,
  payload: any // Decoded JWT token payload if authenticated
) => {
  // Extract the resource and potentially ID from the path: /api/albums, /api/albums/123
  const parts = pathName.split("/");
  if (parts.length < 3) return null; // Not a valid REST path

  const resource = parts[2]; // e.g., "albums"
  const resourceId = parts[3]; // e.g., "123" (optional)

  // Whitelist of allowed resources
  const ALLOWED_RESOURCES: Record<string, string> = {
    albums: "albums",
    photos: "photos",
    orders: "orders",
    users: "users",
    products: "products",
    bookings: "bookings",
    destinations: "destinations",
  };

  if (!ALLOWED_RESOURCES[resource]) {
    return null; // Let other handlers (like /api/checkout) process it if it's not a standard REST resource
  }

  const table = ALLOWED_RESOURCES[resource];

  const role = typeof payload?.role === "string" ? payload.role.toLowerCase() : "";
  if (!STAFF_ROLES.has(role)) {
    return new Response(JSON.stringify({ error: "Forbidden", message: "Staff access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET - Fetch records
  if (request.method === "GET") {
    if (resourceId) {
      // Fetch single record
      const records = await dbManager.query(`SELECT * FROM ${table} WHERE id = ?`, [resourceId]);
      if (records.length === 0) {
        return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
      }
      return new Response(JSON.stringify(records[0]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch list
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Map query params to where conditions (e.g. ?albumId=123)
    url.searchParams.forEach((val, key) => {
      if (key !== "limit" && key !== "offset" && key !== "sort" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        conditions.push(`${key} = ?`);
        params.push(val);
      }
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Sort Support
    const sort = url.searchParams.get("sort");
    if (sort) {
      const isDesc = sort.startsWith("-");
      const sortColumn = isDesc ? sort.substring(1) : sort;
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortColumn)) {
         query += ` ORDER BY ${sortColumn} ${isDesc ? 'DESC' : 'ASC'}`;
      }
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(Math.min(limit, 100), offset);

    const records = await dbManager.query(query, params);
    return new Response(
      JSON.stringify({ items: records, totalItems: records.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // POST - Create record
  if (request.method === "POST") {
    try {
      const body = await request.json() as any;
      const columns = Object.keys(body).filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));

      if (columns.length === 0) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "No valid fields provided" }), { status: 400 });
      }

      const placeholders = columns.map(() => "?").join(", ");
      const values = columns.map((c) => body[c]);

      const query = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`;
      
      // We expect D1 driver to return the inserted ID via RETURNING id or similar (if supported),
      // otherwise we just return success.
      const result = await dbManager.query(query, values);
      const insertedRecord = result.length > 0 ? result[0] : { success: true };

      return new Response(JSON.stringify(insertedRecord), { status: 201 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Create Error", message: e.message }), { status: 500 });
    }
  }

  // PATCH - Update record
  if (request.method === "PATCH") {
    try {
      if (!resourceId) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "ID required" }), { status: 400 });
      }
      
      const body = await request.json() as any;
      const columns = Object.keys(body).filter((k) => k !== "id" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));

      if (columns.length === 0) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "No valid fields to update" }), { status: 400 });
      }

      const setClause = columns.map((c) => `${c} = ?`).join(", ");
      const values = [...columns.map((c) => body[c]), resourceId];

      const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      await dbManager.run(query, values);

      return new Response(JSON.stringify({ success: true, id: resourceId }), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Update Error", message: e.message }), { status: 500 });
    }
  }

  // DELETE - Delete record
  if (request.method === "DELETE") {
    try {
      if (!resourceId) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "ID required" }), { status: 400 });
      }

      const query = `DELETE FROM ${table} WHERE id = ?`;
      await dbManager.run(query, [resourceId]);

      return new Response(JSON.stringify({ success: true, id: resourceId }), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "Delete Error", message: e.message }), { status: 500 });
    }
  }

  return null;
};
