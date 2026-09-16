import { Fragment, type ReactNode } from 'react'
import { useData } from '../../context/DataContext'
import { LogoMark } from '../LogoMark'

export interface TitleBlockCell {
  k: string
  v: ReactNode
  red?: boolean
}

/**
 * A4-ready document sheet styled like an engineering drawing:
 * double frame, letterhead, and a technical title block at the foot.
 * On screen it previews as paper; printing outputs only this sheet.
 */
export function DocSheet({
  title,
  docNo,
  meta = [],
  stamp,
  footerCells = [],
  children,
}: {
  title: string
  docNo: string
  meta?: [string, string][]
  stamp?: { text: string; className: string }
  footerCells?: TitleBlockCell[]
  children: ReactNode
}) {
  const { data } = useData()
  const s = data.settings

  return (
    <div className="doc-sheet">
      <div className="doc-frame">
        {stamp && <div className={`doc-stamp ${stamp.className}`}>{stamp.text}</div>}
        <header className="doc-head">
          <div className="dh-left">
            {s.logo ? (
              <img src={s.logo} alt="" className="dh-logo" style={{ objectFit: 'contain' }} />
            ) : (
              <LogoMark size={52} />
            )}
            <div>
              <div className="dh-bizname">{s.business_name}</div>
              <div className="dh-bizlines">
                {s.address}
                {'\n'}
                {s.phone ? `Tel ${s.phone}` : ''}
                {s.email ? `${s.phone ? ' · ' : ''}${s.email}` : ''}
              </div>
            </div>
          </div>
          <div className="dh-right">
            <div className="dh-type">{title}</div>
            <div className="dh-num">{docNo}</div>
            {meta.length > 0 && (
              <div className="dh-meta">
                {meta.map(([k, v]) => (
                  <Fragment key={k}>
                    <span className="k">{k}</span>
                    <span className="v">{v}</span>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </header>
        <div className="doc-body">{children}</div>
        <footer className="doc-titleblock">
          {footerCells.map((c) => (
            <div className="tb-cell" key={c.k}>
              <div className="tb-k">{c.k}</div>
              <div className={`tb-v ${c.red ? 'red' : ''}`}>{c.v}</div>
            </div>
          ))}
          <div className="tb-cell">
            <div className="tb-k">Sheet</div>
            <div className="tb-v">1 of 1</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
