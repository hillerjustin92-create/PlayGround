import React from 'react'
import { Badge, Dot, Icon } from './ui.jsx'

export default function Topbar({ tabLabel, eyebrow, lab, clock }) {
  const time = clock.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const date = clock.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
  const provider = lab.provider?.mode || 'local'
  return (
    <header className="topbar">
      <div className="topbar__crumb">
        <span className="topbar__eyebrow">{eyebrow}</span>
        <span className="topbar__slash">/</span>
        <strong>{tabLabel}</strong>
      </div>
      <div className="topbar__right">
        <Badge tone={provider === 'local' ? 'lime' : 'teal'} className="topbar__provider">
          <Icon name={provider === 'local' ? 'cpu' : 'wifi'} size={13} />
          {provider === 'local' ? 'LabLM-1 · lokal' : provider}
        </Badge>
        <span className="topbar__clock">
          <Icon name="clock" size={14} />
          <span>{date} · {time}</span>
        </span>
        <Badge tone="ok" dot className="topbar__health">System intakt</Badge>
        <div className="topbar__operator" title="Operator">
          <span className="topbar__operator-dot" />
          <span>OP</span>
        </div>
      </div>
    </header>
  )
}
