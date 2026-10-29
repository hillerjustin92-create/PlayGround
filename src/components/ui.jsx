import React from 'react'

const ICONS = {
  overview: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bot: 'M12 3v3M8 9h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM9 13h.01M15 13h.01M9.5 16.5h5M5 12H3M21 12h-2',
  office: 'M4 21V5a1 1 0 0 1 1-1h6v17M11 21h9V9a1 1 0 0 0-1-1h-8M7 8h.01M7 12h.01M7 16h.01M15 12h.01M15 16h.01',
  chain: 'M9 15l6-6M7.5 10.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 13.5l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  frameworks: 'M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  models: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  monitor: 'M3 12h4l2.5-6 4 12 2.5-6h5',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M8 4v6M16 14v6',
  send: 'M4 12l16-8-6 16-2.5-6.5L4 12z',
  play: 'M8 5l11 7-11 7V5z',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12l5 5L20 6',
  alert: 'M12 4l9 16H3L12 4zM12 10v4M12 17h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  wifi: 'M4 9a12 12 0 0 1 16 0M7 12.5a8 8 0 0 1 10 0M10 16a4 4 0 0 1 4 0M12 19h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  euro: 'M17 7a6 6 0 1 0 0 10M4 10h9M4 14h9',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  refresh: 'M20 11a8 8 0 1 0-2 6M20 5v6h-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  chevron: 'M9 6l6 6-6 6',
  cpu: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M6 6h12v12H6zM10 10h4v4h-4z',
  spark: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  book: 'M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5zM8 3v18',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5zM12 15v3'
}

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name] || ICONS.spark} />
    </svg>
  )
}

export function Panel({ title, eyebrow, actions, children, className = '', tone = '' }) {
  return (
    <section className={`panel ${tone ? `panel--${tone}` : ''} ${className}`}>
      {(title || eyebrow || actions) && (
        <header className="panel__head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="panel__title">{title}</h2>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {dot && <span className={`dot dot--${tone}`} />}
      {children}
    </span>
  )
}

export function Dot({ tone = 'ok', pulse = false }) {
  return <span className={`dot dot--${tone} ${pulse ? 'dot--pulse' : ''}`} />
}

export function Gauge({ value, label, tone = 'lime', size = 92, suffix = '%' }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference
  return (
    <div className={`gauge gauge--${tone}`} style={{ width: size }}>
      <svg viewBox="0 0 84 84" width={size} height={size}>
        <circle className="gauge__track" cx="42" cy="42" r={radius} />
        <circle
          className="gauge__value"
          cx="42"
          cy="42"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <div className="gauge__label">
        <strong>{value}</strong>
        <span>{suffix}</span>
      </div>
      <div className="gauge__caption">{label}</div>
    </div>
  )
}

export function Sparkline({ data, tone = 'lime', height = 52, fill = true }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 240
  const points = data.map((value, index) => {
    const x = (index / Math.max(1, data.length - 1)) * width
    const y = height - 6 - ((value - min) / range) * (height - 12)
    return [x, y]
  })
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg className={`spark spark--${tone}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" height={height} width="100%">
      {fill && <path className="spark__area" d={area} />}
      <path className="spark__line" d={line} />
      {points.length > 0 && <circle className="spark__dot" cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.6" />}
    </svg>
  )
}

function inline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>
    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

export function RichText({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let list = []
  let code = null
  let codeLines = []

  const flushList = () => {
    if (list.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="rich__list">{list}</ul>)
      list = []
    }
  }

  lines.forEach((raw, index) => {
    if (raw.trim().startsWith('```')) {
      if (code === null) {
        flushList()
        code = index
        codeLines = []
      } else {
        blocks.push(<pre key={`pre-${code}`} className="rich__code"><code>{codeLines.join('\n')}</code></pre>)
        code = null
        codeLines = []
      }
      return
    }
    if (code !== null) {
      codeLines.push(raw)
      return
    }
    if (!raw.trim()) {
      flushList()
      return
    }
    const bullet = raw.match(/^\s*[-•]\s+(.*)$/)
    const numbered = raw.match(/^\s*\d+\.\s+(.*)$/)
    if (bullet || numbered) {
      list.push(<li key={`li-${index}`}>{inline((bullet || numbered)[1], `li-${index}`)}</li>)
      return
    }
    flushList()
    blocks.push(<p key={`p-${index}`}>{inline(raw, `p-${index}`)}</p>)
  })
  flushList()
  if (code !== null && codeLines.length) {
    blocks.push(<pre key="pre-final" className="rich__code"><code>{codeLines.join('\n')}</code></pre>)
  }
  return <div className="rich">{blocks}</div>
}

export function BotAvatar({ size = 48, active = false, className = '' }) {
  return (
    <svg
      className={`bot-avatar ${active ? 'bot-avatar--active' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="botGrad" x1="10" y1="10" x2="54" y2="54">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="34" r="27" stroke="url(#botGrad)" strokeOpacity="0.25" />
      <circle cx="32" cy="34" r="21" stroke="url(#botGrad)" strokeOpacity="0.45" strokeDasharray="3 5" />
      <line x1="32" y1="10" x2="32" y2="16" stroke="url(#botGrad)" strokeWidth="2.4" strokeLinecap="round" />
      <circle className="bot-avatar__antenna" cx="32" cy="8" r="2.6" fill="var(--accent)" />
      <rect x="18" y="18" width="28" height="26" rx="8" fill="var(--panel-2)" stroke="url(#botGrad)" strokeWidth="2" />
      <rect className="bot-avatar__eye" x="24" y="27" width="4.5" height="6" rx="2.2" fill="var(--accent)" />
      <rect className="bot-avatar__eye bot-avatar__eye--delay" x="35.5" y="27" width="4.5" height="6" rx="2.2" fill="var(--accent)" />
      <path d="M26 38h12" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 46v-4M46 46v-4M12 30v8M52 30v8" stroke="url(#botGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
