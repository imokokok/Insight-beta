import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
  describe('Rendering', () => {
    it('should render label with text', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render as label element', () => {
      render(<Label>Email</Label>);
      const label = screen.getByText('Email');
      expect(label.tagName).toBe('LABEL');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLLabelElement | null };
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('HTML attributes', () => {
    it('should support htmlFor attribute', () => {
      render(<Label htmlFor="username">Username</Label>);
      expect(screen.getByText('Username')).toHaveAttribute('for', 'username');
    });

    it('should support id attribute', () => {
      render(<Label id="label-id">Label</Label>);
      expect(document.getElementById('label-id')).toBeInTheDocument();
    });

    it('should support data attributes', () => {
      render(<Label data-testid="form-label">Label</Label>);
      expect(screen.getByTestId('form-label')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Label>Styled Label</Label>);
      const label = screen.getByText('Styled Label');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
      expect(label).toHaveClass('leading-none');
    });

    it('should have peer-disabled styling', () => {
      render(<Label>Label</Label>);
      const label = screen.getByText('Label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('Custom classes', () => {
    it('should merge custom className', () => {
      render(<Label className="custom-class">Custom</Label>);
      const label = screen.getByText('Custom');
      expect(label).toHaveClass('custom-class');
      expect(label).toHaveClass('text-sm');
    });

    it('should apply multiple custom classes', () => {
      render(<Label className="class1 class2">Multiple</Label>);
      const label = screen.getByText('Multiple');
      expect(label).toHaveClass('class1');
      expect(label).toHaveClass('class2');
    });
  });

  describe('Accessibility', () => {
    it('should be associated with input via htmlFor', () => {
      render(
        <>
          <Label htmlFor="email">Email Address</Label>
          <input id="email" type="email" />
        </>,
      );
      const label = screen.getByText('Email Address');
      expect(label).toHaveAttribute('for', 'email');
    });

    it('should support aria-label', () => {
      render(<Label aria-label="Form label">Label</Label>);
      expect(screen.getByLabelText('Form label')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should trigger click on associated input when clicked', async () => {
      const handleClick = vi.fn();
      render(
        <>
          <Label htmlFor="checkbox">Check me</Label>
          <input id="checkbox" type="checkbox" onClick={handleClick} />
        </>,
      );

      await userEvent.click(screen.getByText('Check me'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('should support onClick handler', async () => {
      const handleClick = vi.fn();
      render(<Label onClick={handleClick}>Clickable</Label>);

      await userEvent.click(screen.getByText('Clickable'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Children', () => {
    it('should render string children', () => {
      render(<Label>String Child</Label>);
      expect(screen.getByText('String Child')).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(
        <Label>
          Email <span>*</span>
        </Label>,
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <Label>
          <span data-testid="icon">📧</span> Email
        </Label>,
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });
});
