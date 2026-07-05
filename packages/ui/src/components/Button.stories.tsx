import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'ClickFlash/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'glass', 'premium', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'icon'],
    },
    isLoading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Save Album',
    size: 'md',
  },
};

export const Premium: Story = {
  args: {
    variant: 'premium',
    children: 'Upgrade to Pro',
    size: 'lg',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete Photo',
    size: 'md',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Syncing…',
    isLoading: true,
    size: 'md',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-6 bg-slate-900">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="glass">Glass</Button>
      <Button variant="premium">Premium</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};
