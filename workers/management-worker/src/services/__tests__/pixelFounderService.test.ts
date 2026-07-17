import { PixelFounderService } from "../pixelFounderService.js";

describe("PixelFounderService", () => {
  const service = new PixelFounderService();

  it("calculates forecasts only from supplied metrics", async () => {
    const forecast = await service.generateSalesForecast({
      totalOrders: 10,
      totalRevenue: 3000,
      averageOrderValue: 300,
      thirtyDayTrend: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-06-${String(index + 1).padStart(2, "0")}`,
        revenue: 100,
        orders: index % 3 === 0 ? 1 : 0,
      })),
    });

    expect(forecast.end_of_week_revenue).toBe(700);
    expect(forecast.end_of_month_revenue).toBe(3000);
    expect(forecast.insights).toHaveLength(3);
  });

  it("returns an honest zero forecast when no data is supplied", async () => {
    const forecast = await service.generateSalesForecast({});

    expect(forecast.end_of_week_revenue).toBe(0);
    expect(forecast.end_of_month_revenue).toBe(0);
    expect(forecast.insights[0]).toContain("No positive revenue observations");
  });

  it("creates metadata-only album suggestions", async () => {
    const suggestion = await service.generateAlbumSuggestions(
      [{ mimeType: "image/jpeg" }, { mimeType: "image/png" }],
      ["Beach & Pool", "Evening"],
    );

    expect(suggestion).toEqual({
      title: "Beach & Pool Collection",
      description: "Metadata-based draft for 2 photos. Review the title, categories, and cover before publishing.",
      categories: ["Beach & Pool", "Evening"],
      coverPhotoIndex: 0,
    });
  });

  it("never invents revenue when chat context omits it", async () => {
    const response = await service.generateResponse("Analyze revenue today", {
      selectedContext: "Resort A",
    });

    expect(response).toContain("No live revenue metric was supplied");
    expect(response).not.toMatch(/\$\d/);
  });

  it("uses supplied chat metrics", async () => {
    const response = await service.generateResponse("Analyze revenue today", {
      selectedContext: "Resort A",
      metrics: { revenueToday: 1250, totalOrders: 5 },
    });

    expect(response).toContain("$1250.00");
    expect(response).toContain("5 orders");
  });

  it("builds a two-sentence audit from measured performance", () => {
    const response = service.generatePerformanceReview({
      importedPhotos: 100,
      soldPhotos: 30,
      badQualityPhotos: 2,
      totalCustomers: 60,
      salesRevenue: 900,
    });

    expect(response).toContain("Sales rate was 50.0%");
    expect(response).toContain("sell-through was 30.0%");
    expect(response).toContain("$900.00");
    expect(response).toContain("2 photos were flagged");
  });
});
