// 3D ASCII logo rendering with ANSI colors

import { ANSI } from './ansi-colors'

export type LogoType = 'compact' | 'medium' | 'full'

export function renderLogo(type: LogoType): string {
  switch (type) {
    case 'compact':
      return renderCompactLogo()
    case 'medium':
      return renderMediumLogo()
    case 'full':
      return renderFullLogo()
  }
}

function renderFullLogo(): string {
  const g = ANSI.BRIGHT_GREEN  // Primary color
  const r = ANSI.RESET

  return [
    g + ' ___  ___   ___ ___   _   _       ___ ___  ___  ___ ___ ' + r,
    g + '/ __|/ _ \\ / __|_ _| /_\\ | |     | __/ _ \\| _ \\/ __| __|' + r,
    g + '\\__ \\ (_) | (__ | | / _ \\| |__   | _| (_) |   / (_ | _| ' + r,
    g + '|___/\\___/ \\___|___/_/ \\_\\____|  |_| \\___/|_|_\\___|___|' + r
  ].join('\r\n')
}

function renderMediumLogo(): string {
  const g = ANSI.BRIGHT_GREEN
  const r = ANSI.RESET

  return [
    g + ' ___  ___   ___ ___   _   _    ' + r,
    g + '/ __|/ _ \\ / __|_ _| /_\\ | |   ' + r,
    g + '\\__ \\ (_) | (__ | | / _ \\| |__ ' + r,
    g + '|___/\\___/ \\___|___/_/ \\_\\____|' + r,
    '',
    g + ' ___  ___  ___  ___ ___ ' + r,
    g + '| __/ _ \\| _ \\/ __| __|' + r,
    g + '| _| (_) |   / (_ | _| ' + r,
    g + '|_| \\___/|_|_\\___|___|' + r
  ].join('\r\n')
}

function renderCompactLogo(): string {
  const g = ANSI.BRIGHT_GREEN
  const r = ANSI.RESET

  return [
    g + ' ___         _      _' + r,
    g + '/ __| ___ __(_)__ _| |' + r,
    g + '\\__ \\/ _ / _| / _` | |' + r,
    g + '|___/\\___\\__|_\\__,_|_|' + r,
    '',
    g + ' ___                ' + r,
    g + '| __>__ _ _ _ __ _ ___ ' + r,
    g + '| _/ _ \\ \'_/ _` / -_)' + r,
    g + '|_|\\___/_| \\__, \\___|' + r,
    g + '           |___/     ' + r
  ].join('\r\n')
}
