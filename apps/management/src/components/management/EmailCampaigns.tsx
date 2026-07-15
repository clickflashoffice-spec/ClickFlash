import React, { useState } from 'react';
import { emailService } from '../../services/EmailService';

export const EmailCampaigns: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !html || !to) {
      setStatus({ type: 'error', msg: 'All fields are required.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const recipients = to.split(',').map(email => email.trim());
      await emailService.sendCampaign(recipients, subject, html);
      setStatus({ type: 'success', msg: 'Campaign sent successfully!' });
      setSubject('');
      setHtml('');
      setTo('');
    } catch (error: any) {
      setStatus({ type: 'error', msg: error.message || 'Failed to send campaign.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Email Campaigns</h2>
      
      {status && (
        <div className={`p-4 mb-6 rounded-md ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipients (comma separated)
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="guest@example.com, another@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Special Offer for Your Stay!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            HTML Content
          </label>
          <textarea
            className="w-full px-4 py-2 border rounded-md h-48 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
            placeholder="<h1>Hello!</h1><p>Here is your offer...</p>"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending Campaign...' : 'Send Campaign'}
        </button>
      </form>
    </div>
  );
};
