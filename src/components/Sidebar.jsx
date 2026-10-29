import React from 'react'
import { Icon, Dot } from './ui.jsx'
import { LABOR, NODES } from '../data.js'

const GROUPS = [
  {
    label: 'Betrieb',
    items: [
      { id: 'overview', label: 'Leitstand', icon: 'overview' },
      { id: 'bot', label: 'BEXP-01', icon: 'bot', badge: 'AI' },
      { id: 'office', label: 'Büro', icon: 'office' }
    ]
  },
  {
    label: 'Werkstatt',
    items: [
      { id: 'workflows', label: 'Workflows', icon: 'chain' },
      { id: 'frameworks', label: 'Frameworks', icon: 'frameworks' },
      { id: 'models', label: 'Modelle', icon: 'models', badge: 'free' }
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'monitoring', label: 'Monitoring', icon: 'monitor' },
      { id: 'settings', label: 'Einstellungen', icon: 'settings' }
    ]
  }
]

export default function Sidebar({ tab, onNavigate, lab, counts }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand__text">
          <strong>KI-LABOR</strong>
          <span>OS · {LABOR.version}</span>
        </div>
      </div>

      <nav className="nav" aria-label="Hauptnavigation">
        {GROUPS.map((group) => (
          <div className="nav__group" key={group.label}>
            <div className="nav__label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav__item ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                <span className="nav__icon"><Icon name={item.icon} size={18} /></span>
                <span className="nav__text">{item.label}</span>
                {item.badge && <span className="nav__badge">{item.badge}</span>}
                {item.id === 'monitoring' && <span className="nav__live"><Dot tone="ok" pulse /></span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__status">
        <div className="sidebar__status-head">
          <span className="eyebrow">System</span>
          <span className="badge badge--ok badge--tiny"><Dot tone="ok" pulse />intakt</span>
        </div>
        <div className="sidebar__node">
          <span className="sidebar__node-id">{NODES.A01.id}</span>
          <span className="sidebar__node-role">Controller</span>
          <Dot tone="ok" />
        </div>
        <div className="sidebar__node">
          <span className="sidebar__node-id">{NODES.B02.id}</span>
          <span className="sidebar__node-role">Worker</span>
          <Dot tone="ok" />
        </div>
        <div className="sidebar__meter">
          <div className="sidebar__meter-head">
            <span>Freie Modelle</span>
            <strong>{counts.ready}/{lab.models.length}</strong>
          </div>
          <div className="meter"><span style={{ width: `${(counts.ready / Math.max(1, lab.models.length)) * 100}%` }} /></div>
        </div>
        <div className="sidebar__cost">
          <Icon name="euro" size={14} />
          <span>0,00 € pro Anfrage</span>
        </div>
      </div>

      <div className="sidebar__footer">
        <span>{LABOR.network}</span>
        <span>v{LABOR.version}</span>
      </div>
    </aside>
  )
}
