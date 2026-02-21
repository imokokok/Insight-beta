import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Input defaultValue="default text" />);
      expect(screen.getByDisplayValue('default text')).toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      // Input without type defaults to text, but may not have explicit type attribute
      expect(document.querySelector('input')).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      // Password inputs don't have role="textbox" in some browsers
      expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      expect(document.querySelector('input[type="number"]')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle text input', async () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'hello');
      expect(input).toHaveValue('hello');
    });

    it('should handle onChange events', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      await userEvent.type(screen.getByRole('textbox'), 'a');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle focus events', async () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      await userEvent.click(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('should handle blur events', async () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.tab();
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('should not accept input when disabled', async () => {
      render(<Input disabled defaultValue="initial" />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'new text');
      expect(input).toHaveValue('initial');
    });
  });

  describe('Read-only state', () => {
    it('should be read-only when readOnly prop is true', () => {
      render(<Input readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('Required state', () => {
    it('should be required when required prop is true', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('Custom classes', () => {
    it('should merge custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('rounded-md');
    });

    it('should apply multiple custom classes', () => {
      render(<Input className="class1 class2" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('class1');
      expect(input).toHaveClass('class2');
    });
  });

  describe('Accessibility', () => {
    it('should have correct textbox role', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Input aria-label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(<Input aria-describedby="help-text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support id attribute', () => {
      render(<Input id="username" />);
      expect(document.getElementById('username')).toBeInTheDocument();
    });

    it('should support name attribute', () => {
      render(<Input name="username" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('flex');
      expect(input).toHaveClass('h-9');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('border');
    });

    it('should have focus styling', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:outline-none');
      expect(input).toHaveClass('focus-visible:ring-1');
    });
  });
});
