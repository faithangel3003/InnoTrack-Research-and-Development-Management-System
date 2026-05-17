import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Card, CardTitle, Input } from '../../components/ui'
import { createOrganization, getOrganizations, logActivity } from '../../lib/api'
import type { OrganizationRow } from '../../lib/types'

const schema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  plan: z.enum(['free', 'pro', 'enterprise']),
})

type FormValues = z.infer<typeof schema>

export function OrganizationsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all')
  const [open, setOpen] = useState(false)

  const { data = [], isLoading } = useQuery({ queryKey: ['orgs'], queryFn: getOrganizations })

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await createOrganization(values)
      await logActivity({ action: 'organization.created', entity_type: 'organization', severity: 'critical', metadata: values })
    },
    onSuccess: async () => {
      setOpen(false)
      await qc.invalidateQueries({ queryKey: ['orgs'] })
    },
  })

  const filtered = useMemo(
    () =>
      data.filter((org) => {
        const matchesSearch =
          org.name.toLowerCase().includes(search.toLowerCase()) || org.owner.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || org.status === statusFilter
        const matchesPlan = planFilter === 'all' || org.plan === planFilter
        return matchesSearch && matchesStatus && matchesPlan
      }),
    [data, search, statusFilter, planFilter],
  )

  const columns = useMemo<ColumnDef<OrganizationRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'owner', header: 'Owner' },
      { accessorKey: 'memberCount', header: 'Members' },
      { accessorKey: 'projectCount', header: 'Projects' },
      { accessorKey: 'plan', header: 'Plan' },
      { accessorKey: 'createdAt', header: 'Created' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <span className={`badge ${row.original.status}`}>{row.original.status}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="row-actions">
            <Button className="button-ghost">View</Button>
            <Button className="button-ghost">Edit</Button>
            <Button
              className="button-ghost warning"
              onClick={async () => {
                if (confirm(`Suspend ${row.original.name}?`)) {
                  await logActivity({
                    action: 'organization.suspended',
                    entity_type: 'organization',
                    entity_id: row.original.id,
                    severity: 'warning',
                  })
                }
              }}
            >
              Suspend
            </Button>
            <Button
              className="button-ghost danger"
              onClick={async () => {
                if (confirm(`Delete ${row.original.name}? This action cannot be undone.`)) {
                  await logActivity({
                    action: 'organization.deleted',
                    entity_type: 'organization',
                    entity_id: row.original.id,
                    severity: 'critical',
                  })
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', plan: 'pro' } })

  return (
    <section>
      <div className="page-header row">
        <div>
          <h1>Organizations</h1>
          <p>Manage tenant organizations across the platform.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create Organization</Button>
      </div>

      <Card className="filters-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or owner" />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="input" value={planFilter} onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}>
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </Card>

      <Card>
        <CardTitle>Organization Directory</CardTitle>
        {isLoading ? (
          <div className="table-skeleton">Loading organizations...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
          <Card className="dialog">
            <CardTitle>Create Organization</CardTitle>
            <form
              className="form-grid"
              onSubmit={form.handleSubmit((values) => {
                createMutation.mutate(values)
              })}
            >
              <label>
                Name
                <Input {...form.register('name')} />
              </label>
              <label>
                Plan
                <select className="input" {...form.register('plan')}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <div className="dialog-actions">
                <Button type="button" className="button-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </section>
  )
}
