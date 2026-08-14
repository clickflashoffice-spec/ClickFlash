jest.mock('@clickflash/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}));

import { cloudApiService } from '../cloudApiService';

describe('cloudApiService checkout return', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('checks a Stripe session with the stored customer JWT', async () => {
    localStorage.setItem('gallery_token', 'customer-jwt');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ paid: true, status: 'paid', orderId: 'purchase-1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(cloudApiService.getCheckoutStatus('cs_test_a1B2c3D4e5F6')).resolves.toEqual({
      paid: true,
      status: 'paid',
      orderId: 'purchase-1',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8092/api/checkout/sessions/cs_test_a1B2c3D4e5F6',
      { headers: { Authorization: 'Bearer customer-jwt' } },
    );
  });

  it('does not request checkout status without a customer session', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(cloudApiService.getCheckoutStatus('cs_test_a1B2c3D4e5F6'))
      .rejects.toThrow('Customer authentication is required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
