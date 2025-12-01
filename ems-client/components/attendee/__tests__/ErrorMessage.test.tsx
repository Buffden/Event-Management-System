import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should have error card styling', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const card = container.querySelector('.border-red-200');
    expect(card).toBeInTheDocument();
  });

  it('should render AlertCircle icon', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});

