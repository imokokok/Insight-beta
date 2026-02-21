import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';

describe('Card Component', () => {
  it('renders card with content correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
      </Card>,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom class names', () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
    // Should also have default classes
    expect(card).toHaveClass('rounded-2xl');
  });
});
