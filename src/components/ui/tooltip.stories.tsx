import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tooltip content goes here</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const WithText: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Info</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is additional information</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const WithLongText: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Long Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent style={{ maxWidth: '300px' }}>
          <p>This is a longer tooltip with more content that wraps to multiple lines.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const MultipleTooltips: Story = {
  render: () => (
    <TooltipProvider>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit item</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              Delete
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete item</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              Share
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share item</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const IconButtonTooltips: Story = {
  render: () => (
    <TooltipProvider>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              🔍
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Search</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              ⚙️
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              ❓
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              🔔
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notifications</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const SidebarTooltips: Story = {
  render: () => (
    <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
      <p style={{ marginBottom: '1rem', fontWeight: 500 }}>Sidebar Navigation</p>
      <TooltipProvider>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['Dashboard', 'Analytics', 'Reports', 'Settings'].map((item) => (
            <Tooltip key={item}>
              <TooltipTrigger asChild>
                <Button variant="ghost" style={{ justifyContent: 'flex-start' }}>
                  {item}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Navigate to {item}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  ),
};
