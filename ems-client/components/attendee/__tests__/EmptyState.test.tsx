import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('EmptyState', () => {
  it('should render with message', () => {
    render(<EmptyState message="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render with action button when actionLabel and actionHref provided', () => {
    render(
      <EmptyState
        message="No items"
        actionLabel="Create New"
        actionHref="/create"
      />
    );
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('should render with action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        message="No items"
        actionLabel="Create New"
        onAction={onAction}
      />
    );
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('should call onAction when button is clicked', async () => {
    const onAction = jest.fn();
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(
      <EmptyState
        message="No items"
        actionLabel="Create New"
        onAction={onAction}
      />
    );

    const button = screen.getByText('Create New');
    await user.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

