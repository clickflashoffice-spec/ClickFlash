import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'ClickFlash/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'photographer@studio.com',
  },
};

export const WithError: Story = {
  args: {
    label: 'Album Name',
    placeholder: 'Summer Wedding 2026',
    error: 'Album name must be at least 3 characters',
    value: 'AB',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Desk ID',
    value: 'desk_abc123xyz',
    disabled: true,
  },
};
