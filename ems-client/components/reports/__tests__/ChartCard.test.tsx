import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ChartCard } from '../ChartCard';

describe('ChartCard', () => {
  it('should render title', () => {
    render(<ChartCard title="Test Chart">Content</ChartCard>);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <ChartCard title="Test Chart">
        <div data-testid="chart-content">Chart Content</div>
      </ChartCard>
    );
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.getByText('Chart Content')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <ChartCard title="Test Chart" description="Chart description">
        Content
      </ChartCard>
    );
    expect(screen.getByText('Chart description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const { container } = render(
      <ChartCard title="Test Chart">Content</ChartCard>
    );
    const description = container.querySelector('p.text-sm');
    expect(description).not.toBeInTheDocument();
  });

  it('should have correct card styling', () => {
    const { container } = render(
      <ChartCard title="Test Chart">Content</ChartCard>
    );
    const card = container.firstChild as HTMLElement;

    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('dark:bg-slate-800');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow');
    expect(card).toHaveClass('p-6');
  });
});

