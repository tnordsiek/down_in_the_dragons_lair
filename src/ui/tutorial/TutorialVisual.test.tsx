import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSetupStore } from '../../state/setupStore';
import { TutorialVisual } from './TutorialVisual';

describe('TutorialVisual', () => {
  beforeEach(() => {
    useSetupStore.setState({ movementPointsEnabled: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows two filled player cards for the overview', () => {
    render(<TutorialVisual visual="player-cards" />);

    expect(screen.getByTestId('player-card-player_human')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-player_ai_1')).toBeInTheDocument();
  });

  it('shows the current phase and remaining steps for the turn', () => {
    render(<TutorialVisual visual="turn-actions" />);

    expect(screen.getByText('turn_start / 4')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'End Turn' }),
    ).toBeInTheDocument();
  });

  it('shows a clean move-cost badge on the adjacent tile only', () => {
    render(<TutorialVisual visual="movement" />);

    expect(screen.getByTestId('move-cost-0--1')).toHaveTextContent('1');
    // With a single step left, neither the far tile nor the start tile
    // ("walk out and back") are flagged as reachable.
    expect(screen.queryByTestId('move-cost-0--2')).toBeNull();
    expect(screen.queryByTestId('move-cost-0-0')).toBeNull();
  });

  it('hides the zoom control on tutorial board visuals', () => {
    render(<TutorialVisual visual="movement" />);

    expect(screen.queryByTestId('board-zoom-control')).toBeNull();
  });

  it('offers exploration targets around the start tile', () => {
    render(<TutorialVisual visual="exploration" />);

    expect(screen.getByTestId('explore-target-1-0')).toBeInTheDocument();
    expect(screen.getByTestId('explore-target-0--1')).toBeInTheDocument();
  });

  it('shows the tile-rotation controls for a pending tile', () => {
    render(<TutorialVisual visual="tile-rotation" />);

    expect(
      screen.getByRole('button', { name: 'Confirm tile rotation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rotate tile clockwise' }),
    ).toBeInTheDocument();
  });

  it('shows a monster room token', () => {
    const { container } = render(<TutorialVisual visual="room-token" />);

    expect(
      container.querySelector('[data-asset-id="token_creepy_spider"]'),
    ).not.toBeNull();
  });

  it('shows example combat dice', () => {
    render(<TutorialVisual visual="combat-dice" />);

    expect(screen.getByAltText('Combat die 1: 5')).toBeInTheDocument();
    expect(screen.getByAltText('Combat die 2: 6')).toBeInTheDocument();
  });

  it('shows a populated inventory for loot', () => {
    render(<TutorialVisual visual="inventory" />);

    expect(screen.getByText('ATK +3')).toBeInTheDocument();
  });

  it('shows a treasure chest token', () => {
    const { container } = render(<TutorialVisual visual="chest" />);

    expect(
      container.querySelector('[data-asset-id="token_treasure_chest"]'),
    ).not.toBeNull();
  });

  it('shows a wounded hero for the healing step', () => {
    render(<TutorialVisual visual="healing" />);

    expect(screen.getByText('HP 2/5')).toBeInTheDocument();
  });

  it('highlights the active player for the turn-order step', () => {
    render(<TutorialVisual visual="turn-order" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows differing treasure scores for the scoreboard', () => {
    render(<TutorialVisual visual="scoreboard" />);

    expect(screen.getByText('4 pts')).toBeInTheDocument();
    expect(screen.getByText('2 pts')).toBeInTheDocument();
  });
});
