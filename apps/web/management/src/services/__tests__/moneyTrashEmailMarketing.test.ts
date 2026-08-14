import { moneyTrashEmailMarketing } from '../moneyTrashEmailMarketing';

describe('MoneyTrashEmailMarketingService', () => {
  beforeEach(() => {
    // Clear all listeners and timers before each test to ensure a clean slate
    moneyTrashEmailMarketing.dispose();
  });

  describe('GDPR rightToBeForgotten', () => {
    it('should strip PII from email logs and add email to unsubscribed list', () => {
      const targetEmail = 'forget-me@example.com';
      const safeEmail = 'keep-me@example.com';

      // Inject some mock data using prototype casting to bypass private restrictions for testing
      const serviceAny = moneyTrashEmailMarketing as any;
      
      serviceAny.emailLogs = [
        { id: '1', recipient: targetEmail, status: 'sent', sentAt: new Date() },
        { id: '2', recipient: safeEmail, status: 'opened', sentAt: new Date() },
        { id: '3', recipient: targetEmail, status: 'delivered', sentAt: new Date() }
      ];

      // Act
      moneyTrashEmailMarketing.rightToBeForgotten(targetEmail);

      // Assert
      expect(serviceAny.unsubscribedEmails.has(targetEmail)).toBe(true);
      expect(serviceAny.unsubscribedEmails.has(safeEmail)).toBe(false);
      
      // Target email logs should be completely removed
      expect(serviceAny.emailLogs).toHaveLength(1);
      expect(serviceAny.emailLogs[0].recipient).toBe(safeEmail);
    });
  });
});
