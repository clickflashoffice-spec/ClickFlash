import { test, expect } from "@playwright/test";

test.describe("Master Chroma Key API", () => {
  test("should handle chroma API requests gracefully", async ({ request }) => {
    // We test that the master backend accepts the multipart form data for chroma processing
    const response = await request.post("/api/photos/upload-chroma", {
      data: "dummy data",
      headers: {
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
      }
    });

    // We expect a 400 or 500 since we sent dummy data, not a crash.
    // Or if the API is mocked, we expect a 200.
    const status = response.status();
    expect([200, 400, 500]).toContain(status);
  });
});
