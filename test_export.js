const TOUCH = "http://127.0.0.1:8091";
const MASTER = "http://127.0.0.1:8090";

async function run() {
  // 1. Create order on Touch (as if offline)
  const order = {
    date: "2026-06-29",
    clientName: "Offline Test Client",
    email: "offline@test.com",
    items: [{ id: "test-item-1", name: "Test Item", quantity: 1, price: 15, photoId: "photo-1" }],
    total: 15,
    status: "Pending",
  };

  const res = await fetch(`${TOUCH}/api/collections/orders/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error("Touch order creation failed: " + await res.text());
  const touchOrder = await res.json();
  console.log("Created local order:", touchOrder.id);

  // 2. Export to Master
  console.log("Exporting to master...");
  const exportRes = await fetch(`${TOUCH}/api/orders/${touchOrder.id}/export-to-master`, {
    method: 'POST'
  });
  if (!exportRes.ok) throw new Error("Export failed: " + await exportRes.text());
  const exportData = await exportRes.json();
  console.log("Export result:", exportData);
}

run().catch(console.error);
