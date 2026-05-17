import { FolderKanban, ShieldCheck, UserRound, Users } from 'lucide-react'
import { AdminMetricCard } from '../admin/AdminMetricCard'

type UserStatsCardsProps = {
  totalUsers: number
  activeUsers: number
  projectManagers: number
  teamMembers: number
}

export function UserStatsCards({ totalUsers, activeUsers, projectManagers, teamMembers }: UserStatsCardsProps) {
  const cards = [
    {
      label: 'Total Users',
      value: totalUsers,
      helper: 'All members in the current workspace',
      tone: 'sky' as const,
      icon: <Users size={18} />,
    },
    {
      label: 'Active Users',
      value: activeUsers,
      helper: 'Members with active access',
      tone: 'emerald' as const,
      icon: <ShieldCheck size={18} />,
    },
    {
      label: 'Project Managers',
      value: projectManagers,
      helper: 'Leads assigned to delivery workstreams',
      tone: 'amber' as const,
      icon: <FolderKanban size={18} />,
    },
    {
      label: 'Team Members',
      value: teamMembers,
      helper: 'Contributors collaborating on projects',
      tone: 'slate' as const,
      icon: <UserRound size={18} />,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
