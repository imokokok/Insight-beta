import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

describe('Tabs', () => {
  const renderTabs = (props = {}) => {
    return render(
      <Tabs value="tab1" onValueChange={vi.fn()} {...props}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>,
    );
  };

  describe('Rendering', () => {
    it('should render tabs component', () => {
      renderTabs();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('should render active tab content', () => {
      renderTabs();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should not render inactive tab content', () => {
      renderTabs();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <Tabs value="tab1" onValueChange={vi.fn()} ref={ref}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Interactions', () => {
    it('should call onValueChange when tab is clicked', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs value="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      await userEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('should switch content when tab changes', async () => {
      const { rerender } = renderTabs();

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      rerender(
        <Tabs value="tab2" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>,
      );

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next tab with ArrowRight', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs value="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('should navigate to previous tab with ArrowLeft', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs value="tab2" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(handleChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around to first tab from last tab with ArrowRight', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs value="tab3" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      tab3.focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(handleChange).toHaveBeenCalledWith('tab1');
    });

    it('should wrap around to last tab from first tab with ArrowLeft', async () => {
      const handleChange = vi.fn();
      render(
        <Tabs value="tab1" onValueChange={handleChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });
  });

  describe('Styling', () => {
    it('should apply active tab styles', () => {
      renderTabs();
      const activeTab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(activeTab).toHaveClass('bg-white');
      expect(activeTab).toHaveClass('text-gray-950');
      expect(activeTab).toHaveClass('shadow');
    });

    it('should apply inactive tab styles', () => {
      renderTabs();
      const inactiveTab = screen.getByRole('tab', { name: 'Tab 2' });
      expect(inactiveTab).toHaveClass('hover:bg-gray-200/50');
      expect(inactiveTab).toHaveClass('hover:text-gray-900');
    });

    it('should merge custom className on Tabs', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()} className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(document.querySelector('.custom-tabs')).toBeInTheDocument();
    });

    it('should merge custom className on TabsList', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(document.querySelector('.custom-list')).toBeInTheDocument();
    });

    it('should merge custom className on TabsTrigger', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole('tab')).toHaveClass('custom-trigger');
    });

    it('should merge custom className on TabsContent', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByText('Content')).toHaveClass('custom-content');
    });
  });

  describe('Accessibility', () => {
    it('should have correct role attributes', () => {
      renderTabs();
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('should have focus visible styles on tabs', () => {
      renderTabs();
      const tab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab).toHaveClass('focus-visible:outline-none');
      expect(tab).toHaveClass('focus-visible:ring-2');
    });

    it('should have correct type attribute on tab buttons', () => {
      renderTabs();
      const tab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab).toHaveAttribute('type', 'button');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when TabsTrigger is used outside Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsTrigger value="tab1">Tab 1</TabsTrigger>);
      }).toThrow('TabsTrigger must be used within Tabs');

      consoleSpy.mockRestore();
    });

    it('should throw error when TabsContent is used outside Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsContent value="tab1">Content</TabsContent>);
      }).toThrow('TabsContent must be used within Tabs');

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>,
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should handle disabled tab', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const disabledTab = screen.getByRole('tab', { name: 'Tab 2' });
      expect(disabledTab).toBeDisabled();
      expect(disabledTab).toHaveClass('disabled:opacity-50');
    });

    it('should handle empty tab list', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList />
        </Tabs>,
      );

      expect(document.querySelector('[role="tablist"]')).toBeInTheDocument();
    });
  });
});
