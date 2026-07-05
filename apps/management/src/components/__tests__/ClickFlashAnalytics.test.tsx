import React from "react";
import { render, screen, waitFor } from "./test-utils";
import "@testing-library/jest-dom";
import ClickFlashAnalytics from "../management/analytics/ClickFlashAnalytics";
import * as apiService from "../../services/apiService";
import * as cloudApiService from "../../services/cloudApiService";

const mockGetOrders = jest.fn();
const mockGetBookings = jest.fn();
const mockGetDestinations = jest.fn();
const mockGetExpenses = jest.fn();
const mockCloudGet = jest.fn();

jest.mock("../../services/apiService", () => ({
  apiService: {
    getOrders: (...args: unknown[]) => mockGetOrders(...args),
    getBookings: (...args: unknown[]) => mockGetBookings(...args),
    getDestinations: (...args: unknown[]) => mockGetDestinations(...args),
    getExpenses: (...args: unknown[]) => mockGetExpenses(...args),
  },
}));

jest.mock("../../services/cloudApiService", () => ({
  cloudApiService: {
    get: (...args: unknown[]) => mockCloudGet(...args),
  },
}));

describe("ClickFlashAnalytics Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrders.mockResolvedValue([]);
    mockGetBookings.mockResolvedValue([]);
    mockGetDestinations.mockResolvedValue([
      { id: "site-1", name: "Marhaba Club" },
    ]);
    mockGetExpenses.mockResolvedValue([]);
    mockCloudGet.mockResolvedValue({ data: {} });
  });

  it("renders loading state initially", () => {
    render(<ClickFlashAnalytics context="global" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders analytics dashboard after data loads", async () => {
    render(<ClickFlashAnalytics context="global" />);

    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Global Network/i)).toBeInTheDocument();
  });

  it("shows site leaderboard when in global view", async () => {
    render(<ClickFlashAnalytics context="global" />);

    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Global Network/i)).toBeInTheDocument();
  });

  it("filters data when context is provided", async () => {
    render(<ClickFlashAnalytics context="site-1" />);

    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Resort Analytics/i)).toBeInTheDocument();
  });
});