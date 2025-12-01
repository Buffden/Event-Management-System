import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ChartTooltip } from '../ChartTooltip';
import { ThemeProvider } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

describe('ChartTooltip', () => {
  it('should return null when not active', () => {
    const { container } = render(<ChartTooltip active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when payload is empty', () => {
    const { container } = render(<ChartTooltip active={true} payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when payload is undefined', () => {
    const { container } = render(<ChartTooltip active={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render tooltip when active with payload', () => {
    const payload = [
      { name: 'Sales', value: 1000, color: '#3b82f6' },
      { name: 'Revenue', value: 2000, color: '#10b981' },
    ];

    render(
      <ThemeProvider>
        <ChartTooltip active={true} payload={payload} label="January" />
      </ThemeProvider>
    );

    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('Sales: 1,000')).toBeInTheDocument();
    expect(screen.getByText('Revenue: 2,000')).toBeInTheDocument();
  });

  it('should format large numbers with locale string', () => {
    const payload = [
      { name: 'Users', value: 1234567, color: '#3b82f6' },
    ];

    render(
      <ThemeProvider>
        <ChartTooltip active={true} payload={payload} label="Total" />
      </ThemeProvider>
    );

    expect(screen.getByText(/Users:.*1,234,567/)).toBeInTheDocument();
  });

  it('should handle single payload item', () => {
    const payload = [
      { name: 'Count', value: 42, color: '#ef4444' },
    ];

    render(
      <ThemeProvider>
        <ChartTooltip active={true} payload={payload} label="Test" />
      </ThemeProvider>
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Count: 42')).toBeInTheDocument();
  });

  it('should apply dark mode styles when theme is dark', () => {
    // Mock dark theme
    jest.spyOn(require('next-themes'), 'useTheme').mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
    });

    const payload = [
      { name: 'Data', value: 100, color: '#3b82f6' },
    ];

    const { container } = render(
      <ThemeProvider>
        <ChartTooltip active={true} payload={payload} label="Dark Mode" />
      </ThemeProvider>
    );

    const tooltip = container.querySelector('div');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip?.style.backgroundColor).toBe('rgb(30, 41, 59)'); // slate-800
  });
});

