import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This is the main body of the card.</p>
      </CardContent>
    </Card>
  ),
};

export const SimpleCard: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardContent style={{ padding: '1.5rem' }}>
        <p>Simple card with just content</p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to proceed?</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This action cannot be undone. Please confirm your choice.</p>
        <div
          style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}
        >
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </CardContent>
    </Card>
  ),
};

export const StatsCard: Story = {
  render: () => (
    <Card style={{ width: '250px' }}>
      <CardHeader style={{ paddingBottom: 0 }}>
        <CardDescription>Total Users</CardDescription>
        <CardTitle style={{ fontSize: '2rem' }}>1,234</CardTitle>
      </CardHeader>
      <CardContent>
        <p style={{ color: 'green', fontSize: '0.875rem' }}>↑ 12% from last month</p>
      </CardContent>
    </Card>
  ),
};

export const Dashboard: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      <Card>
        <CardHeader style={{ paddingBottom: 0 }}>
          <CardDescription>Active Oracles</CardDescription>
          <CardTitle style={{ fontSize: '2rem' }}>42</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader style={{ paddingBottom: 0 }}>
          <CardDescription>Pending Alerts</CardDescription>
          <CardTitle style={{ fontSize: '2rem' }}>7</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader style={{ paddingBottom: 0 }}>
          <CardDescription>Uptime (24h)</CardDescription>
          <CardTitle style={{ fontSize: '2rem' }}>99.9%</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
};

export const WithList: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest actions</CardDescription>
      </CardHeader>
      <CardContent>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {['Created new oracle', 'Updated configuration', 'Resolved alert'].map((item, i) => (
            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e5e5' }}>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  ),
};
