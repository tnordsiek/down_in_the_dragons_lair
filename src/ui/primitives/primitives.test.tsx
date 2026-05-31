import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Button } from './Button';
import { Chip } from './Chip';
import { Panel } from './Panel';
import { RunicDivider } from './RunicDivider';
import { SectionHeading } from './SectionHeading';
import { cx } from './cx';

describe('primitives', () => {
  afterEach(() => {
    cleanup();
  });

  it('cx drops falsy parts and preserves order', () => {
    expect(cx('a', false, undefined, 'b', null, 'c')).toBe('a b c');
  });

  it('Panel renders a single div root, appends className last, and forwards data hooks', () => {
    const { container } = render(
      <Panel className="custom-pad" data-asset-id="ui_modal_frame">
        body
      </Panel>,
    );
    const root = container.firstElementChild;

    expect(root?.tagName).toBe('DIV');
    expect(root).toHaveAttribute('data-asset-id', 'ui_modal_frame');
    expect(root).toHaveClass('custom-pad');
    expect(root?.className.trim().endsWith('custom-pad')).toBe(true);
  });

  it('Button produces identical className for identical props (Center Map / End Turn invariant)', () => {
    render(
      <>
        <Button>Center Map</Button>
        <Button>End Turn</Button>
      </>,
    );

    const first = screen.getByRole('button', { name: 'Center Map' });
    const second = screen.getByRole('button', { name: 'End Turn' });

    expect(first.className).toBe(second.className);
    expect(first).toHaveAttribute('type', 'button');
  });

  it('Button fires onClick and honors disabled', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Start
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('SectionHeading renders the requested heading level with accessible name', () => {
    render(<SectionHeading level={3}>Actions</SectionHeading>);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Actions' }),
    ).toBeInTheDocument();
  });

  it('Chip renders a span and forwards a title', () => {
    render(
      <Chip tone="jade" title="Hit points">
        HP 5
      </Chip>,
    );
    const chip = screen.getByText('HP 5');

    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveAttribute('title', 'Hit points');
  });

  it('RunicDivider is a decorative separator', () => {
    render(<RunicDivider />);
    const divider = screen.getByRole('separator', { hidden: true });

    expect(divider).toHaveAttribute('aria-hidden', 'true');
  });
});
