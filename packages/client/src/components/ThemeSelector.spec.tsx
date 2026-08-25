import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ThemeSelector from './ThemeSelector';
import { ThemeContext } from '../theme';

jest.mock('../hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const matchMedia = (matches: boolean) =>
  jest.fn().mockImplementation(
    (media: string) =>
      ({
        matches,
        media,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }) as unknown as MediaQueryList,
  );

const renderToggle = (theme: string, highContrast: boolean) => {
  const setTheme = jest.fn();
  render(
    <ThemeContext.Provider
      value={
        {
          theme,
          setTheme,
          resolvedMode: 'light',
          highContrast,
          setThemeRGB: () => undefined,
          setThemeDefinition: () => undefined,
          setThemeName: () => undefined,
          resetTheme: () => undefined,
        } as React.ContextType<typeof ThemeContext>
      }
    >
      <ThemeSelector returnThemeOnly />
    </ThemeContext.Provider>,
  );
  return setTheme;
};

describe('ThemeSelector scheme toggle', () => {
  beforeEach(() => {
    /** `changeTheme` throttles itself through this global for 500ms. */
    window.lastThemeChange = undefined;
    window.matchMedia = matchMedia(false);
  });

  it('flips the scheme and keeps an explicit contrast choice', () => {
    const setTheme = renderToggle('high-contrast-light', true);
    fireEvent.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('high-contrast-dark');
  });

  /** Under `system` the contrast comes from `prefers-contrast`, so the stored
   *  mode never names it and only the resolved value can carry it forward. */
  it('keeps an OS-requested contrast when the stored mode is system', () => {
    const setTheme = renderToggle('system', true);
    fireEvent.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('high-contrast-dark');
  });

  it('leaves an ordinary system mode on the plain schemes', () => {
    const setTheme = renderToggle('system', false);
    fireEvent.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('answers Ctrl+Shift+T with the same choice', () => {
    const setTheme = renderToggle('system', true);
    fireEvent.keyDown(window, { key: 'T', ctrlKey: true, shiftKey: true });
    expect(setTheme).toHaveBeenCalledWith('high-contrast-dark');
  });
});
