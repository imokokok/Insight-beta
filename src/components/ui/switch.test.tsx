import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from './switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('should render switch component', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should have correct role attribute', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toHaveAttribute('role', 'switch');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Switch ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Checked state', () => {
    it('should render unchecked by default', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('should render checked when checked prop is true', () => {
      render(<Switch checked={true} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should apply checked styles when checked', () => {
      render(<Switch checked={true} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('bg-primary');
    });

    it('should apply unchecked styles when not checked', () => {
      render(<Switch checked={false} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('bg-gray-200');
    });
  });

  describe('Interactions', () => {
    it('should call onCheckedChange when clicked', async () => {
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should toggle from checked to unchecked', async () => {
      const handleChange = vi.fn();
      render(<Switch checked={true} onCheckedChange={handleChange} />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should handle onClick prop', async () => {
      const handleClick = vi.fn();
      render(<Switch onClick={handleClick} />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Switch disabled />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toBeDisabled();
      expect(switchEl).toHaveClass('disabled:cursor-not-allowed');
      expect(switchEl).toHaveClass('disabled:opacity-50');
    });

    it('should not trigger change when disabled', async () => {
      const handleChange = vi.fn();
      render(<Switch disabled onCheckedChange={handleChange} />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have correct base classes', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('peer');
      expect(switchEl).toHaveClass('inline-flex');
      expect(switchEl).toHaveClass('h-6');
      expect(switchEl).toHaveClass('w-11');
      expect(switchEl).toHaveClass('rounded-full');
    });

    it('should merge custom className', () => {
      render(<Switch className="custom-switch" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('custom-switch');
    });

    it('should render thumb element', () => {
      render(<Switch />);
      const thumb = document.querySelector('span');
      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass('rounded-full');
      expect(thumb).toHaveClass('bg-white');
    });

    it('should translate thumb when checked', () => {
      render(<Switch checked={true} />);
      const thumb = document.querySelector('span');
      expect(thumb).toHaveClass('translate-x-5');
    });

    it('should not translate thumb when unchecked', () => {
      render(<Switch checked={false} />);
      const thumb = document.querySelector('span');
      expect(thumb).toHaveClass('translate-x-0');
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-checked attribute when unchecked', () => {
      render(<Switch checked={false} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('should have correct aria-checked attribute when checked', () => {
      render(<Switch checked={true} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('should have focus visible styles', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('focus-visible:outline-none');
      expect(switchEl).toHaveClass('focus-visible:ring-2');
      expect(switchEl).toHaveClass('focus-visible:ring-primary500');
    });

    it('should have correct type attribute', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toHaveAttribute('type', 'button');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid toggling', async () => {
      const handleChange = vi.fn();
      render(<Switch checked={false} onCheckedChange={handleChange} />);

      const switchEl = screen.getByRole('switch');
      await userEvent.click(switchEl);
      await userEvent.click(switchEl);
      await userEvent.click(switchEl);

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('should handle undefined onCheckedChange', async () => {
      render(<Switch checked={false} />);

      // Should not throw error
      await userEvent.click(screen.getByRole('switch'));
    });

    it('should handle undefined checked prop', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });
});
