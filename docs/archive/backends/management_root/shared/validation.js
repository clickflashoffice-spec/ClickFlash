/**
 * Shared manual validation logic for Management App
 * Replaces Zod to avoid ESM loading conflicts
 */

const isValidEmail = (email) => {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidDate = (date) => {
  return typeof date === "string" && !isNaN(Date.parse(date));
};

function validateRequest(data, tableName, isUpdate = false) {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Request body must be an object" };
  }

  const errors = [];
  const validated = { ...data };

  try {
    switch (tableName) {
      case "users":
      case "photographers":
        if (!isUpdate || data.email !== undefined) {
          if (!isValidEmail(data.email)) errors.push("Invalid email format");
        }
        if (!isUpdate || data.name !== undefined) {
          if (!data.name || typeof data.name !== "string")
            errors.push("Name is required");
        }
        break;
      case "albums":
        if (!isUpdate || data.title !== undefined) {
          if (!data.title) errors.push("Title is required");
        }
        if (!isUpdate || data.date !== undefined) {
          if (!isValidDate(data.date)) errors.push("Invalid date format");
        }
        break;
      case "orders":
        if (!isUpdate || data.clientName !== undefined) {
          if (!data.clientName) errors.push("Client name is required");
        }
        if (!isUpdate || data.email !== undefined) {
          if (!isValidEmail(data.email)) errors.push("Invalid email format");
        }
        break;
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(", ")}`,
      };
    }

    return { success: true, data: validated };
  } catch (e) {
    return { success: false, error: "Internal validation error: " + e.message };
  }
}

function validateLogin(data) {
  const errors = [];
  if (!isValidEmail(data.email)) errors.push("Invalid email format");
  if (!data.password || data.password.length < 1)
    errors.push("Password is required");

  if (errors.length > 0) {
    return { success: false, error: `Validation failed: ${errors.join(", ")}` };
  }

  return { success: true, data };
}

module.exports = {
  validateRequest,
  validateLogin,
};
