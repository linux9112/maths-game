import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamesHubView } from '../../features/games/hub/GamesHubView';
import { GAME_CATALOG } from '../../features/games/hub/gameCatalog';

describe('GamesHubView', () => {
  it('renders Math Arcade Arena header and all 17 game cards by default', () => {
    render(<GamesHubView />);
    expect(screen.getByText('Math Arcade Arena')).toBeInTheDocument();
    expect(screen.getByText('17 Modes')).toBeInTheDocument();

    // Verify all 17 games are in the catalog and rendered
    expect(GAME_CATALOG.length).toBe(17);
    GAME_CATALOG.forEach((game) => {
      expect(screen.getByText(game.title)).toBeInTheDocument();
    });
  });

  it('filters games by category tab click', () => {
    render(<GamesHubView />);

    // Click Speed tab
    const speedTab = screen.getByRole('button', { name: 'Speed' });
    fireEvent.click(speedTab);

    // Speed games should be present
    expect(screen.getByText('Rain Calculation')).toBeInTheDocument();
    expect(screen.getByText('60-Second Rush')).toBeInTheDocument();
    expect(screen.getByText('Rocket Math')).toBeInTheDocument();
    expect(screen.getByText('Bomb Defusal')).toBeInTheDocument();

    // Non-speed games should not be present
    expect(screen.queryByText('Boss Battle Arena')).toBeNull();
    expect(screen.queryByText('Memory Calculation')).toBeNull();
  });

  it('filters games by search text input', () => {
    render(<GamesHubView />);
    const searchInput = screen.getByPlaceholderText('Search games...');
    fireEvent.change(searchInput, { target: { value: 'Rocket' } });

    expect(screen.getByText('Rocket Math')).toBeInTheDocument();
    expect(screen.queryByText('Rain Calculation')).toBeNull();
  });

  it('launches a game when its card is clicked', () => {
    render(<GamesHubView />);
    const rainCard = screen.getByText('Rain Calculation');
    fireEvent.click(rainCard);

    // Rain calculation game should now be active
    expect(screen.getByText('Configure & Play')).toBeInTheDocument();
  });
});
