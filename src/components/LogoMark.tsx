export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13Z" fill="#d92b2b" />
      <path d="M24 7.5 38.3 15.8v16.4L24 40.5 9.7 32.2V15.8Z" fill="#16191d" />
      <path
        d="M29.5 16h-9.5v13.5h4.2v-9.6h5.3Z"
        fill="#fff"
      />
      <rect x="29.5" y="24" width="4.2" height="5.5" fill="#d92b2b" />
    </svg>
  )
}

export function BrandBlock({ dark = true }: { dark?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <LogoMark size={40} />
      <div>
        <div
          style={{
            font: "800 21px/0.95 var(--font-head)",
            letterSpacing: '0.04em',
            color: dark ? '#fff' : '#16191d',
          }}
        >
          JREC
        </div>
        <div
          style={{
            font: "500 8px var(--font-mono)",
            letterSpacing: '0.22em',
            color: dark ? '#8a929d' : '#6b7480',
            marginTop: 3,
            whiteSpace: 'nowrap',
          }}
        >
          STAINLESS STEEL FABRICATION
        </div>
      </div>
    </div>
  )
}
