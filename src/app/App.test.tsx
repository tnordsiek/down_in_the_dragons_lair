import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the milestone 1 start screen placeholder', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: "Down in the Dragon's Lair",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Milestone 1 scaffold')).toBeInTheDocument();
  });
});
