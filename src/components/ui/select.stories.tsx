import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger style={{ width: '250px' }}>
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
        <SelectItem value="mango">Mango</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger style={{ width: '300px' }}>
        <SelectValue placeholder="Select a programming language" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Frontend</SelectLabel>
          <SelectItem value="react">React</SelectItem>
          <SelectItem value="vue">Vue</SelectItem>
          <SelectItem value="angular">Angular</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Backend</SelectLabel>
          <SelectItem value="node">Node.js</SelectItem>
          <SelectItem value="python">Python</SelectItem>
          <SelectItem value="go">Go</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithValue: Story = {
  render: () => (
    <Select defaultValue="react">
      <SelectTrigger style={{ width: '250px' }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="react">React</SelectItem>
        <SelectItem value="vue">Vue</SelectItem>
        <SelectItem value="angular">Angular</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const BlockchainSelect: Story = {
  render: () => (
    <Select>
      <SelectTrigger style={{ width: '200px' }}>
        <SelectValue placeholder="Select blockchain" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ethereum">Ethereum</SelectItem>
        <SelectItem value="polygon">Polygon</SelectItem>
        <SelectItem value="arbitrum">Arbitrum</SelectItem>
        <SelectItem value="optimism">Optimism</SelectItem>
        <SelectItem value="base">Base</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const OracleSelect: Story = {
  render: () => (
    <Select>
      <SelectTrigger style={{ width: '200px' }}>
        <SelectValue placeholder="Select oracle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="chainlink">Chainlink</SelectItem>
        <SelectItem value="uma">UMA</SelectItem>
        <SelectItem value="pyth">Pyth</SelectItem>
        <SelectItem value="api3">API3</SelectItem>
        <SelectItem value="band">Band Protocol</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const AllExamples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Select>
        <SelectTrigger style={{ width: '250px' }}>
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="polygon">
        <SelectTrigger style={{ width: '200px' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ethereum">Ethereum</SelectItem>
          <SelectItem value="polygon">Polygon</SelectItem>
          <SelectItem value="arbitrum">Arbitrum</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
