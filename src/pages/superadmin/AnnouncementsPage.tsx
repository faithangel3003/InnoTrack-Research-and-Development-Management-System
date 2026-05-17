import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Card, CardTitle, Input } from '../../components/ui'
import { getAnnouncements, logActivity, saveAnnouncement } from '../../lib/api'

const schema = z.object({
  title: z.string().min(3),
  body: z.string().min(10),
  severity: z.enum(['info', 'warning', 'critical']),
  target_type: z.enum(['all', 'role', 'org']),
  target_value: z.string().optional(),
  scheduled_for: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const announcementsQuery = useQuery({ queryKey: ['announcements'], queryFn: getAnnouncements })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      severity: 'info',
      target_type: 'all',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await saveAnnouncement(values)
      await logActivity({
        action: 'announcement.created',
        entity_type: 'announcement',
        metadata: values,
        severity: values.severity,
      })
    },
    onSuccess: async () => {
      form.reset({ severity: 'info', target_type: 'all' })
      await queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  return (
    <section>
      <div className="page-header">
        <h1>Announcements</h1>
        <p>Broadcast platform notices to all users, specific roles, or organizations.</p>
      </div>

      <Card>
        <CardTitle>Compose Announcement</CardTitle>
        <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label>
            Title
            <Input {...form.register('title')} placeholder="Maintenance Window" />
          </label>
          <label>
            Body (Markdown)
            <textarea className="input textarea" {...form.register('body')} placeholder="Write your announcement..." />
          </label>
          <div className="inline-actions">
            <label>
              Severity
              <select className="input" {...form.register('severity')}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              Target
              <select className="input" {...form.register('target_type')}>
                <option value="all">All</option>
                <option value="role">Role</option>
                <option value="org">Org</option>
              </select>
            </label>
            <label>
              Target Value
              <Input {...form.register('target_value')} placeholder="Optional role/org" />
            </label>
            <label>
              Schedule
              <Input type="datetime-local" {...form.register('scheduled_for')} />
            </label>
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Past Announcements</CardTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Target</th>
                <th>Sent At</th>
                <th>Read Receipt</th>
              </tr>
            </thead>
            <tbody>
              {(announcementsQuery.data ?? []).map((announcement) => (
                <tr key={announcement.id}>
                  <td>{announcement.title}</td>
                  <td><span className={`badge ${announcement.severity}`}>{announcement.severity}</span></td>
                  <td>{announcement.target_type}</td>
                  <td>{announcement.sent_at}</td>
                  <td>{announcement.read_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
