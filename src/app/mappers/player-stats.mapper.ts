export function getWinratePercent(winrate?: number): number {
  if (typeof winrate !== 'number') return 0;
  return Math.round(winrate * 100);
}

export function getWinrateGradient(winratePercent: number): string {
  return `conic-gradient(var(--accent-0) 0deg ${winratePercent * 3.6}deg, rgba(255,255,255,0.08) ${winratePercent * 3.6}deg 360deg)`;
}

export function getQueueLabel(
  queueId?: number,
  gameMode?: string,
  gameType?: string
): string {
  if (queueId === 420) return 'SoloQ';
  if (queueId === 440) return 'Flex';
  if (queueId === 450) return 'ARAM';
  if (gameMode) return gameMode;
  if (gameType) return gameType;
  return 'Unknown';
}

export function normalizeRole(teamPosition?: string, lane?: string, role?: string): string {
  if (teamPosition === 'TOP' || lane === 'TOP') return 'Top';
  if (teamPosition === 'JUNGLE' || lane === 'JUNGLE') return 'Jungle';
  if (teamPosition === 'MIDDLE' || lane === 'MIDDLE') return 'Mid';
  if (teamPosition === 'BOTTOM') return role?.includes('SUPPORT') ? 'Support' : 'ADC';
  if (teamPosition === 'UTILITY') return 'Support';
  if (lane === 'BOTTOM') return role?.includes('SUPPORT') ? 'Support' : 'ADC';
  return 'Unknown';
}

export function getRoleLabel(
  roleLabel?: string,
  teamPosition?: string,
  lane?: string,
  role?: string
): string {
  if (roleLabel && roleLabel !== 'Unknown') return roleLabel;
  return normalizeRole(teamPosition, lane, role);
}

export function formatMatchDate(timestamp?: number, locale: string = 'fr-FR'): string {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
