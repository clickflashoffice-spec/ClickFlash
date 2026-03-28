import { apiService } from "../apiService";
import { marketingAutomationService } from "../marketingAutomationService";
import { orchestrationService } from "../orchestrationService";
import { pb } from "../pb";

// Mock PocketBase
jest.mock("../pb", () => ({
  pb: {
    collection: jest.fn(() => ({
      update: jest
        .fn()
        .mockResolvedValue({ id: "test-order", status: "Delivered" }),
      create: jest.fn().mockResolvedValue({ id: "test-payment" }),
      getFullList: jest.fn().mockResolvedValue([]),
    })),
  },
}));

// Mock services
jest.mock("../marketingAutomationService", () => ({
  marketingAutomationService: {
    triggerWorkflow: jest.fn(),
  },
}));

jest.mock("../orchestrationService", () => ({
  orchestrationService: {
    broadcast: jest.fn().mockResolvedValue({ success: 1, failed: 0 }),
  },
}));

describe.skip("apiService Core Solidification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("finalizeOrderForCustomerDelivery triggers marketing workflow", async () => {
    const orderId = "order-123";
    await apiService.finalizeOrderForCustomerDelivery(orderId);

    expect(pb.collection).toHaveBeenCalledWith("orders");
    expect(marketingAutomationService.triggerWorkflow).toHaveBeenCalledWith(
      "order-completed",
      expect.objectContaining({ id: "test-order", status: "Delivered" }),
    );
  });

  it("createLoanPayment uses loan_payments collection", async () => {
    const loanId = "loan-456";
    const paymentData = { amount: 100, paymentMethod: "Cash" };

    await apiService.createLoanPayment(loanId, paymentData);

    expect(pb.collection).toHaveBeenCalledWith("loan_payments");
    expect(pb.collection("loan_payments").create).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId,
        amount: 100,
        paymentMethod: "Cash",
      }),
    );
  });

  it("queueMassDeployment uses orchestration broadcast", async () => {
    const destinationIds = ["dest-1"];
    const payload = { theme: "dark" };

    const result = await apiService.queueMassDeployment(
      destinationIds,
      payload,
    );

    expect(result.success).toBe(true);
    expect(orchestrationService.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "DEPLOY_CONFIG",
        payload: payload,
      }),
    );
  });
});
