import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, CardTitle } from '../../components/ui'
import { getProjects, logActivity } from '../../lib/api'
import type { ProjectRow } from '../../lib/types'

export function ProjectsPage() {
  const [selected, setSelected] = useState<ProjectRow | null>(null)
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const archiveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await logActivity({
        action: 'project.force_archived',
        entity_type: 'project',
        entity_id: projectId,
        severity: 'critical',
      })
    },
  })

  return (
    <section>
      <div className="page-header">
        <h1>Projects Oversight</h1>
        <p>Cross-organization view of all R&D projects with lifecycle governance.</p>
      </div>

      <Card>
        <CardTitle>All Projects</CardTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Organization</th>
                <th>Lifecycle Stage</th>
                <th>Lead Researcher</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(projectsQuery.data ?? []).map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.orgName}</td>
                  <td><span className="badge">{project.lifecycleStage}</span></td>
                  <td>{project.leadResearcher}</td>
                  <td>{project.lastActivity}</td>
                  <td>
                    <div className="row-actions">
                      <Button className="button-ghost" onClick={() => setSelected(project)}>Inspect</Button>
                      <Button
                        className="button-ghost warning"
                        onClick={async () => {
                          if (confirm('Force archive this project?')) {
                            await archiveMutation.mutateAsync(project.id)
                          }
                        }}
                      >
                        Force-Archive
                      </Button>
                      <Button className="button-ghost">Transfer Owner</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <aside className="sheet">
          <div className="sheet-head">
            <h3>{selected.name}</h3>
            <Button className="button-ghost" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <p>Organization: {selected.orgName}</p>
          <p>Lifecycle Stage: {selected.lifecycleStage}</p>
          <p>Lead Researcher: {selected.leadResearcher}</p>
          <p>Tasks: {selected.tasksCount}</p>
          <p>Documents: {selected.documentsCount}</p>
          <p>Last Activity: {selected.lastActivity}</p>
        </aside>
      )}
    </section>
  )
}
