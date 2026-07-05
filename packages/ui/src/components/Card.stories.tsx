import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'ClickFlash/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <div className="p-8 bg-slate-900 min-h-32">
      <Card>
        <h3 className="text-white font-bold text-lg mb-2">Album Title</h3>
        <p className="text-slate-400 text-sm">Wedding · 12 Jun 2026 · 247 photos</p>
      </Card>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="p-8 bg-slate-900">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">Beach Sunset Package</h3>
            <p className="text-slate-400 text-sm mt-1">2 selections · €49</p>
          </div>
          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Paid</span>
        </div>
      </Card>
    </div>
  ),
};
