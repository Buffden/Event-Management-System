import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription } from '../alert';

describe('Alert', () => {
  it('should render with default variant', () => {
    render(<Alert>Default Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Default Alert');
  });

  it('should render with destructive variant', () => {
    render(<Alert variant="destructive">Destructive Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Destructive Alert');
  });

  it('should apply custom className', () => {
    const { container } = render(<Alert className="custom-class">Alert</Alert>);
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('custom-class');
  });

  it('should render with AlertDescription', () => {
    render(
      <Alert>
        <AlertDescription>Alert description text</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Alert description text')).toBeInTheDocument();
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Alert with ref</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

