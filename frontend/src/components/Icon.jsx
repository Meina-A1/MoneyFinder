const paths = {
  logo: 'M4 10 3 3l7 4h4l7-4-1 7c3 8-1 11-8 11S1 18 4 10ZM7 13h.01M17 13h.01m-7 4 2 2 2-2',
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  entries: 'M4 6h16M4 12h16M4 18h10',
  category: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01',
  wallet: 'M3 6h16v4M3 6v14h18V10H7a4 4 0 0 1-4-4Zm0 0 14-3v3M17 14h4',
  chart: 'M4 3v17h17M8 15l4-5 4 3 5-8',
  card: 'M3 5h18v14H3zM3 10h18M7 15h3',
  health: 'M3 12h4l3-8 4 16 3-8h4',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M7 17 17 7M7 7h10v10',
  down: 'M7 7l10 10M7 17h10V7',
  logout: 'M9 4H4v16h5M9 12h12m-4-4 4 4-4 4',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
}
export default function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.chart} />
    </svg>
  )
}
