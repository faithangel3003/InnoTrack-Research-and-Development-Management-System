import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, CardTitle, Input } from '../../components/ui'
import { logActivity } from '../../lib/api'

const tabs = ['Lifecycle Stages', 'Feature Flags', 'Email Templates', 'Branding'] as const

export function SystemSettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Lifecycle Stages')

  const saveMutation = useMutation({
    mutationFn: async (action: string) => {
      await logActivity({ action, entity_type: 'system_settings', severity: 'warning' })
    },
  })

  return (
    <section>
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Platform-wide configuration for lifecycle, modules, templates, and branding.</p>
      </div>

      <div className="tab-row">
        {tabs.map((item) => (
          <button key={item} className={`tab-btn ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Lifecycle Stages' && (
        <Card>
          <CardTitle>Lifecycle Stage Definitions</CardTitle>
          <div className="inline-actions">
            <Input placeholder="New stage name" />
            <Button onClick={() => saveMutation.mutate('lifecycle_stage.created')}>Add Stage</Button>
          </div>
        </Card>
      )}

      {tab === 'Feature Flags' && (
        <Card>
          <CardTitle>Feature Flags by Plan Tier</CardTitle>
          <div className="flag-list">
            {['tracking', 'lifecycle', 'docs', 'collab', 'analytics'].map((flag) => (
              <label key={flag} className="flag-item">
                <span>{flag}</span>
                <input type="checkbox" defaultChecked onChange={() => saveMutation.mutate('feature_flag.updated')} />
              </label>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Email Templates' && (
        <Card>
          <CardTitle>Email Templates</CardTitle>
          <div className="form-grid">
            <label>
              Invitation template
              <textarea className="input textarea" defaultValue="Welcome to InnoTrack. Click to activate your account." />
            </label>
            <label>
              Notification template
              <textarea className="input textarea" defaultValue="You have updates in your assigned projects." />
            </label>
            <Button onClick={() => saveMutation.mutate('email_templates.updated')}>Save Templates</Button>
          </div>
        </Card>
      )}

      {tab === 'Branding' && (
        <Card>
          <CardTitle>Branding</CardTitle>
          <div className="inline-actions">
            <Input type="file" />
            <Input type="color" defaultValue="#4f46e5" />
            <Button onClick={() => saveMutation.mutate('branding.updated')}>Save Branding</Button>
          </div>
        </Card>
      )}
    </section>
  )
}
