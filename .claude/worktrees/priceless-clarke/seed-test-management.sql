INSERT INTO orders (id, date, clientName, email, status, paymentMethod, total, totalAmount, items, desk_id, original_id, access_pin) 
VALUES ('test-order-999', '2026-02-23', 'Test Customer', 'test@clickflash.ai', 'paid', 'credit_card', 45.0, 45.0, '[{"id": "test-photo-999", "url": "https://pub-28688497faae4e4baef943e8003f9091.r2.dev/1111/highres/img2.webp"}]', 'test-desk', 'test-order-999', '999999') 
ON CONFLICT(id) DO UPDATE SET access_pin = '999999';
