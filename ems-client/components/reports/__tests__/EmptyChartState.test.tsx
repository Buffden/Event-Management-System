import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { EmptyChartState } from '../EmptyChartState';

describe('EmptyChartState', () => {
  it('should render default message when no message prop provided', () => {
    render(<EmptyChartState />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should render custom message when provided', () => {
    render(<EmptyChartState message="Custom empty message" />);
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    const { container } = render(<EmptyChartState />);
    const element = container.firstChild as HTMLElement;

    expect(element).toHaveClass('text-center');
    expect(element).toHaveClass('py-12');
  });

  it('should render message with correct text color classes', () => {
    const { container } = render(<EmptyChartState message="Test message" />);
    const paragraph = container.querySelector('p');

    expect(paragraph).toHaveClass('text-slate-600');
    expect(paragraph).toHaveClass('dark:text-slate-400');
  });
});

