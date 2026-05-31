import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { FooterMeta } from './FooterMeta';

describe('FooterMeta', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the version label and the legal section toggles', () => {
    render(<FooterMeta versionLabel="v9.9 test" />);

    expect(screen.getByText('v9.9 test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprint' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Privacy Policy' }),
    ).toBeInTheDocument();
  });

  it('opens the imprint section, loads its content, and closes again', async () => {
    render(<FooterMeta />);

    fireEvent.click(screen.getByRole('button', { name: 'Imprint' }));

    // The dynamic import resolves and the imprint content is rendered.
    await waitFor(() => {
      expect(screen.getByText('Torsten Nordsiek')).toBeInTheDocument();
    });

    // The full-screen backdrop button closes the panel.
    fireEvent.click(screen.getByRole('button', { name: 'Close Imprint' }));

    expect(screen.queryByText('Torsten Nordsiek')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Close Imprint' }),
    ).toBeNull();
  });
});
