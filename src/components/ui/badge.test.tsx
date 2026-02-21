import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge, badgeVariants } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should render badge with number', () => {
      render(<Badge>42</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge.tagName).toBe('DIV');
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('text-primary-foreground');
      expect(badge).toHaveClass('border-transparent');
    });

    it('should apply secondary variant classes', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
    });

    it('should apply destructive variant classes', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('text-destructive-foreground');
    });

    it('should apply outline variant classes', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
      expect(badge).not.toHaveClass('border-transparent');
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-semibold');
    });

    it('should have transition classes', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('transition-colors');
    });

    it('should have focus ring classes', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('focus:outline-none');
      expect(badge).toHaveClass('focus:ring-2');
      expect(badge).toHaveClass('focus:ring-ring');
      expect(badge).toHaveClass('focus:ring-offset-2');
    });
  });

  describe('Custom classes', () => {
    it('should merge custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('bg-primary');
    });

    it('should apply multiple custom classes', () => {
      render(<Badge className="class1 class2">Multiple</Badge>);
      const badge = screen.getByText('Multiple');
      expect(badge).toHaveClass('class1');
      expect(badge).toHaveClass('class2');
    });
  });

  describe('Children', () => {
    it('should render string children', () => {
      render(<Badge>String Child</Badge>);
      expect(screen.getByText('String Child')).toBeInTheDocument();
    });

    it('should render number children', () => {
      render(<Badge>{42}</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render with icon and text', () => {
      render(
        <Badge>
          <span data-testid="icon">🔔</span>
          <span>Notification</span>
        </Badge>,
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Notification')).toBeInTheDocument();
    });
  });

  describe('HTML attributes', () => {
    it('should support id attribute', () => {
      render(<Badge id="my-badge">Badge</Badge>);
      expect(document.getElementById('my-badge')).toBeInTheDocument();
    });

    it('should support data attributes', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Badge aria-label="Status badge">Active</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });
  });

  describe('badgeVariants utility', () => {
    it('should generate correct classes for default variant', () => {
      const classes = badgeVariants({ variant: 'default' });
      expect(classes).toContain('bg-primary');
      expect(classes).toContain('text-primary-foreground');
    });

    it('should generate correct classes for secondary variant', () => {
      const classes = badgeVariants({ variant: 'secondary' });
      expect(classes).toContain('bg-secondary');
      expect(classes).toContain('text-secondary-foreground');
    });

    it('should generate correct classes for destructive variant', () => {
      const classes = badgeVariants({ variant: 'destructive' });
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('text-destructive-foreground');
    });

    it('should generate correct classes for outline variant', () => {
      const classes = badgeVariants({ variant: 'outline' });
      expect(classes).toContain('text-foreground');
    });

    it('should merge custom classes', () => {
      const classes = badgeVariants({ className: 'custom-class' });
      expect(classes).toContain('custom-class');
    });
  });
});
