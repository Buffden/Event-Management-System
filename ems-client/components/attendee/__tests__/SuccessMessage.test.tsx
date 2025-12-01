import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SuccessMessage } from '../SuccessMessage';

describe('SuccessMessage', () => {
  it('should render success message', () => {
    render(<SuccessMessage message="Operation successful" />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('should have success card styling', () => {
    const { container } = render(<SuccessMessage message="Success" />);
    const card = container.querySelector('.border-green-200');
    expect(card).toBeInTheDocument();
  });

  it('should render CheckCircle2 icon', () => {
    const { container } = render(<SuccessMessage message="Success" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});

