// Iconos SVG inline (sin dependencias externas: funcionan sin conexión).

type IconName =
  | 'home'
  | 'check'
  | 'target'
  | 'calendar'
  | 'wallet'
  | 'settings'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'close'
  | 'flame'
  | 'moon'
  | 'sun'
  | 'cloud-off'
  | 'cloud'
  | 'list'
  | 'sparkles'
  | 'chevron-left'
  | 'chevron-right'
  | 'download'
  | 'upload'
  | 'clock'
  | 'repeat';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  check: 'M4 12.5 9.5 18 20 6.5',
  target:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  calendar:
    'M7 2v3M17 2v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 5Z',
  wallet:
    'M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Zm14 5.5h.01',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.14-1.47l2.03-1.58-2-3.46-2.4.96a8 8 0 0 0-2.54-1.47L14.5 2h-5l-.45 2.98a8 8 0 0 0-2.54 1.47l-2.4-.96-2 3.46L4.14 10.53A8 8 0 0 0 4 12c0 .49.05.97.14 1.47l-2.03 1.58 2 3.46 2.4-.96a8 8 0 0 0 2.54 1.47L9.5 22h5l.45-2.98a8 8 0 0 0 2.54-1.47l2.4.96 2-3.46-2.03-1.58c.09-.5.14-.98.14-1.47Z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3',
  close: 'M6 6l12 12M18 6 6 18',
  flame:
    'M12 22c4 0 7-2.7 7-6.5 0-4.5-3.5-6-4.5-10.5-2 1.5-3 3.5-3 5.5 0 1.5-1 2-1.5 1.5-.7-.7-.5-2-.5-3-2.5 2-4.5 4.5-4.5 7C5 19.3 8 22 12 22Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  'cloud-off': 'M3 3l18 18M7.5 8A5 5 0 0 1 17 9.5a3.5 3.5 0 0 1 1.8 6.3M15.5 18H7a4 4 0 0 1-.9-7.9',
  cloud: 'M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5H7Z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9L19 15Z',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  download: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  upload: 'M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2',
  repeat: 'M4 9V7a3 3 0 0 1 3-3h10m0 0-3-3m3 3-3 3M20 15v2a3 3 0 0 1-3 3H7m0 0 3 3m-3-3 3-3',
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export type { IconName };
