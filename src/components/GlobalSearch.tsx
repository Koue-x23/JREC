import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  HardHat,
  Receipt,
  Search,
  Users,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { searchAll, type SearchResult } from '../lib/search'

const KIND_ICON: Record<SearchResult['kind'], React.ReactNode> = {
  Customer: <Users size={15} />,
  Quotation: <FileText size={15} />,
  Job: <HardHat size={15} />,
  'Service Report': <ClipboardList size={15} />,
  Invoice: <Receipt size={15} />,
  Payment: <CreditCard size={15} />,
  Statement: <BookOpen size={15} />,
}

export function GlobalSearch() {
  const { data } = useData()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => searchAll(data, q), [data, q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const go = (r: SearchResult) => {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    navigate(r.to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[sel]) go(results[sel])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // group results by kind preserving score order
  const groups: { kind: string; items: SearchResult[] }[] = []
  for (const r of results) {
    const last = groups[groups.length - 1]
    if (last && last.kind === r.kind) last.items.push(r)
    else groups.push({ kind: r.kind, items: [r] })
  }

  let flatIndex = -1

  return (
    <div className="search" ref={boxRef}>
      <div className="search-box">
        <Search size={16} />
        <input
          ref={inputRef}
          value={q}
          placeholder="Search customers, invoices, INV-00001, JOB-00008, Juan…"
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setSel(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Global search"
        />
        <kbd>Ctrl K</kbd>
      </div>
      {open && q.trim() !== '' && (
        <div className="search-pop">
          {results.length === 0 && (
            <div className="search-empty">
              No records match <b>“{q}”</b>.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.kind}>
              <div className="search-group">{g.kind}</div>
              {g.items.map((r) => {
                flatIndex += 1
                const idx = flatIndex
                return (
                  <div
                    key={r.kind + r.id}
                    className={`search-row ${idx === sel ? 'sel' : ''}`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => go(r)}
                  >
                    <span className="sr-icon">{KIND_ICON[r.kind]}</span>
                    <span className="sr-main">
                      <span className="sr-title">
                        <span className="num">{r.title}</span>
                        <span className="t">{r.subtitle}</span>
                      </span>
                      <span className="sr-meta">{r.meta}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {results.length > 0 && (
            <div className="search-hint">↑↓ to navigate · Enter to open · Esc to close</div>
          )}
        </div>
      )}
    </div>
  )
}
