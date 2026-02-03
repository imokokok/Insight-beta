import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" style={{ width: '400px' }}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Account settings content goes here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Password settings content goes here.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Application settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Settings content goes here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: '500px' }}>
      <TabsList>
        <TabsTrigger value="overview">📊 Overview</TabsTrigger>
        <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
        <TabsTrigger value="reports">📋 Reports</TabsTrigger>
        <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Overview content</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Analytics content</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Reports content</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Settings content</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const OracleTabs: Story = {
  render: () => (
    <Tabs defaultValue="chainlink" style={{ width: '600px' }}>
      <TabsList>
        <TabsTrigger value="chainlink">Chainlink</TabsTrigger>
        <TabsTrigger value="uma">UMA</TabsTrigger>
        <TabsTrigger value="pyth">Pyth</TabsTrigger>
        <TabsTrigger value="api3">API3</TabsTrigger>
      </TabsList>
      <TabsContent value="chainlink">
        <Card>
          <CardHeader>
            <CardTitle>Chainlink</CardTitle>
            <CardDescription>Industry-standard price feeds</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Chainlink oracle configuration and monitoring</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="uma">
        <Card>
          <CardHeader>
            <CardTitle>UMA</CardTitle>
            <CardDescription>Optimistic Oracle</CardDescription>
          </CardHeader>
          <CardContent>
            <p>UMA optimistic oracle assertions and disputes</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="pyth">
        <Card>
          <CardHeader>
            <CardTitle>Pyth</CardTitle>
            <CardDescription>Low-latency financial data</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Pyth oracle price feeds and updates</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="api3">
        <Card>
          <CardHeader>
            <CardTitle>API3</CardTitle>
            <CardDescription>First-party oracle</CardDescription>
          </CardHeader>
          <CardContent>
            <p>API3 Airnode configurations</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const SimpleTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" style={{ width: '400px' }}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p>Content for Tab 1</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p>Content for Tab 2</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p>Content for Tab 3</p>
      </TabsContent>
    </Tabs>
  ),
};
