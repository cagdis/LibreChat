import { validateThemeDefinition } from '@librechat/client';
import { arvorePressTheme } from './arvorepress';

describe('arvorePressTheme', () => {
  it('defines a valid versioned theme', () => {
    expect(validateThemeDefinition(arvorePressTheme)).toEqual([]);
  });
});
