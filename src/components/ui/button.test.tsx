import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with default variant', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
    });

    it('should render button with custom text', () => {
      render(<Button>Submit</Button>);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should render with correct type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gradient-to-r');
      expect(button).toHaveClass('from-primary-600');
    });

    it('should apply destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('from-red-600');
      expect(button).toHaveClass('to-red-500');
    });

    it('should apply outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('border-primary/20');
    });

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('from-primary-100');
      expect(button).toHaveClass('text-primary-dark');
    });

    it('should apply ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary-dark');
      expect(button).toHaveClass('hover:bg-primary/10');
    });

    it('should apply link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('underline-offset-4');
      expect(button).toHaveClass('hover:underline');
    });
  });

  describe('Sizes', () => {
    it('should apply default size classes', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
    });

    it('should apply small size classes', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
      expect(button).toHaveClass('px-3');
    });

    it('should apply large size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('px-8');
    });

    it('should apply icon size classes', () => {
      render(<Button size="icon">Icon</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should not trigger click when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom classes', () => {
    it('should merge custom className with variant classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-gradient-to-r');
    });

    it('should apply multiple custom classes', () => {
      render(<Button className="class1 class2">Multiple</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('class1');
      expect(button).toHaveClass('class2');
    });
  });

  describe('buttonVariants utility', () => {
    it('should generate correct classes for default variant', () => {
      const classes = buttonVariants({ variant: 'default', size: 'default' });
      expect(classes).toContain('bg-gradient-to-r');
      expect(classes).toContain('h-10');
    });

    it('should generate correct classes for destructive variant', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'sm' });
      expect(classes).toContain('from-red-600');
      expect(classes).toContain('h-9');
    });

    it('should merge custom classes', () => {
      const classes = buttonVariants({ className: 'custom-class' });
      expect(classes).toContain('custom-class');
    });
  });
});
