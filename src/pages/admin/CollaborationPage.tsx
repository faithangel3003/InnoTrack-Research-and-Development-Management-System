import { Bell, Megaphone, MessageSquare, PencilLine, Send, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as collaborationApi from '../../api/collaborationApi'
import * as projectApi from '../../api/projectApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate, relativeTime } from '../../utils/formatDate'

const textAreaClassName = 'min-h-[7rem] w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 transition focus:border-sky-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const announcementPageSize = 4
const notificationPageSize = 5

type AnnouncementFormState = {
  id: string | null
  title: string
  body: string
  priority: collaborationApi.AnnouncementPriority
  projectId: string
}

type AnnouncementFormErrors = {
  title?: string
  body?: string
}

const initialAnnouncementForm: AnnouncementFormState = {
  id: null,
  title: '',
  body: '',
  priority: 'Normal',
  projectId: '',
}

const announcementTitleInputId = 'collaboration-announcement-title'

function priorityBadgeVariant(priority: collaborationApi.AnnouncementPriority) {
  switch (priority) {
    case 'Urgent':
      return 'danger' as const
    case 'Important':
      return 'warning' as const
    default:
      return 'info' as const
  }
}

function upsertMessage(messages: collaborationApi.CollaborationMessage[], nextMessage: collaborationApi.CollaborationMessage) {
  const existing = messages.find((message) => message.id === nextMessage.id)
  if (existing) {
    return messages
      .map((message) => message.id === nextMessage.id ? nextMessage : message)
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  }

  return [...messages, nextMessage].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

function upsertChannel(channels: collaborationApi.CollaborationChannel[], nextChannel: collaborationApi.CollaborationChannel) {
  const existing = channels.find((channel) => channel.id === nextChannel.id)
  if (existing) {
    return [...channels]
      .map((channel) => channel.id === nextChannel.id ? nextChannel : channel)
      .sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
  }

  return [...channels, nextChannel].sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
}

function sortProjectChannels(channels: collaborationApi.CollaborationChannel[]) {
  return [...channels].sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
}

export function CollaborationPage() {
  const toast = useToast()
  const { user } = useAuth()
  const selectedChannelRef = useRef('')
  const announcementFormRef = useRef<HTMLDivElement | null>(null)
  const [workspace, setWorkspace] = useState<collaborationApi.CollaborationWorkspace | null>(null)
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [messages, setMessages] = useState<collaborationApi.CollaborationMessage[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(initialAnnouncementForm)
  const [announcementErrors, setAnnouncementErrors] = useState<AnnouncementFormErrors>({})
  const [announcementPage, setAnnouncementPage] = useState(1)
  const [notificationPage, setNotificationPage] = useState(1)
  const [announcementSaving, setAnnouncementSaving] = useState(false)
  const [announcementDeleting, setAnnouncementDeleting] = useState<collaborationApi.CollaborationAnnouncement | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageLoading, setMessageLoading] = useState(false)
  const [error, setError] = useState('')
  const [weeklyMessageCount, setWeeklyMessageCount] = useState(0)

  const isOrgAdmin = user?.role === 'SuperAdmin' || user?.role === 'SystemAdmin'
  const canManageAnnouncements = isOrgAdmin || user?.role === 'ProjectManager'
  const canEditAnnouncement = (announcement: collaborationApi.CollaborationAnnouncement) => {
    if (!user) {
      return false
    }

    if (isOrgAdmin) {
      return true
    }

    return announcement.postedByUserId === user.id
  }

  const selectedChannel = useMemo(
    () => workspace?.channels.find((channel) => channel.id === selectedChannelId) || workspace?.channels[0] || null,
    [selectedChannelId, workspace?.channels],
  )

  const unreadNotifications = useMemo(
    () => workspace?.notifications.filter((notification) => notification.unread).length || 0,
    [workspace?.notifications],
  )

  const totalAnnouncements = workspace?.announcements.length || 0
  const totalNotifications = workspace?.notifications.length || 0
  const announcementTotalPages = Math.max(1, Math.ceil(totalAnnouncements / announcementPageSize))
  const notificationTotalPages = Math.max(1, Math.ceil(totalNotifications / notificationPageSize))

  const paginatedAnnouncements = useMemo(
    () => (workspace?.announcements || []).slice((announcementPage - 1) * announcementPageSize, announcementPage * announcementPageSize),
    [announcementPage, workspace?.announcements],
  )

  const paginatedNotifications = useMemo(
    () => (workspace?.notifications || []).slice((notificationPage - 1) * notificationPageSize, notificationPage * notificationPageSize),
    [notificationPage, workspace?.notifications],
  )

  const loadWorkspace = useCallback(async () => {
    setLoading(true)

    try {
      const [nextWorkspace, nextProjects] = await Promise.all([
        collaborationApi.getCollaborationWorkspace(),
        projectApi.getAllProjects().catch(() => []),
      ])

      let workspaceToUse = nextWorkspace
      const canCreateProjectChannels = user?.role === 'SystemAdmin' || user?.role === 'ProjectManager'
      const projectIdsWithChannels = new Set(nextWorkspace.channels.map((channel) => channel.projectId).filter(Boolean))
      const projectsMissingChannels = canCreateProjectChannels
        ? nextProjects.filter((project) => !projectIdsWithChannels.has(project.id))
        : []

      if (projectsMissingChannels.length) {
        const createdChannels = await Promise.all(projectsMissingChannels.map(async (project) => {
          const members = await projectApi.getProjectMembers(project.id).catch(() => [])
          return collaborationApi.createChannel({
            name: project.title,
            description: `Project messenger for ${project.title}`,
            type: 'ProjectChannel',
            projectId: project.id,
            memberUserIds: members.map((member) => member.userId),
          }).catch(() => null)
        }))

        workspaceToUse = {
          ...nextWorkspace,
          channels: sortProjectChannels([...nextWorkspace.channels, ...createdChannels.filter((channel): channel is collaborationApi.CollaborationChannel => Boolean(channel))]),
        }
      }

      setWorkspace(workspaceToUse)
      setProjects(nextProjects)
      setSelectedChannelId((current) => current || workspaceToUse.channels[0]?.id || '')
      setError('')
      setWeeklyMessageCount(await collaborationApi.getWeeklyMessageVolume(workspaceToUse.channels.map((channel) => channel.id)))
    } catch (loadError) {
      setWorkspace(null)
      setProjects([])
      setError(loadError instanceof Error ? loadError.message : 'Failed to load collaboration workspace')
    } finally {
      setLoading(false)
    }
  }, [user?.role])

  const loadMessages = useCallback(async (channelId: string, markRead: boolean) => {
    setMessageLoading(true)

    try {
      const channelMessages = await collaborationApi.getChannelMessages(channelId)
      setMessages(channelMessages)

      if (markRead) {
        await collaborationApi.markChannelRead(channelId)
        setWorkspace((current) => current ? {
          ...current,
          channels: current.channels.map((channel) => channel.id === channelId ? { ...channel, unreadCount: 0 } : channel),
        } : current)
      }
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Failed to load channel messages')
      setMessages([])
    } finally {
      setMessageLoading(false)
    }
  }, [toast])

  useEffect(() => {
    selectedChannelRef.current = selectedChannelId
  }, [selectedChannelId])

  useEffect(() => {
    if (!user?.organizationId) {
      setError('Collaboration services require an organization context.')
      setLoading(false)
      return
    }

    void loadWorkspace()
  }, [loadWorkspace, user?.organizationId])

  useEffect(() => {
    if (!selectedChannelId) {
      setMessages([])
      return
    }

    void loadMessages(selectedChannelId, true)
  }, [loadMessages, selectedChannelId])

  useEffect(() => {
    let disconnect: (() => Promise<void>) | undefined

    async function connectHub() {
      disconnect = await collaborationApi.connectCollaborationHub({
        onMessageReceived: (message) => {
          setWorkspace((current) => current ? {
            ...current,
            channels: current.channels.map((channel) => channel.id === message.channelId
              ? {
                ...channel,
                lastActivityAt: message.createdAt,
                unreadCount: channel.id === selectedChannelRef.current ? 0 : channel.unreadCount + 1,
              }
              : channel),
          } : current)

          if (message.channelId === selectedChannelRef.current) {
            setMessages((current) => upsertMessage(current, message))
          }
        },
        onMessageEdited: (message) => {
          if (message.channelId === selectedChannelRef.current) {
            setMessages((current) => upsertMessage(current, message))
          }
        },
        onMessageDeleted: (messageId) => {
          setMessages((current) => current.map((message) => message.id === messageId ? { ...message, body: 'This message was deleted', isDeleted: true } : message))
        },
        onNotificationReceived: (notification) => {
          setWorkspace((current) => current ? {
            ...current,
            notifications: [notification, ...current.notifications],
          } : current)
        },
        onChannelUpdated: (channel) => {
          setWorkspace((current) => current ? {
            ...current,
            channels: upsertChannel(current.channels, channel),
          } : current)
        },
      })

      if (selectedChannelRef.current) {
        await collaborationApi.joinChannel(selectedChannelRef.current)
      }
    }

    if (user) {
      void connectHub()
    }

    return () => {
      if (selectedChannelRef.current) {
        void collaborationApi.leaveChannel(selectedChannelRef.current)
      }

      if (disconnect) {
        void disconnect()
      }
    }
  }, [user])

  useEffect(() => {
    if (!selectedChannelId) {
      return
    }

    void collaborationApi.joinChannel(selectedChannelId)

    return () => {
      void collaborationApi.leaveChannel(selectedChannelId)
    }
  }, [selectedChannelId])

  useEffect(() => {
    if (announcementPage > announcementTotalPages) {
      setAnnouncementPage(announcementTotalPages)
    }
  }, [announcementPage, announcementTotalPages])

  useEffect(() => {
    if (notificationPage > notificationTotalPages) {
      setNotificationPage(notificationTotalPages)
    }
  }, [notificationPage, notificationTotalPages])

  useEffect(() => {
    if (!announcementForm.id) {
      return
    }

    announcementFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    window.requestAnimationFrame(() => {
      const titleInput = document.getElementById(announcementTitleInputId) as HTMLInputElement | null
      titleInput?.focus()
      titleInput?.select()
    })
  }, [announcementForm.id])

  async function handleSendMessage() {
    if (!selectedChannel || !messageBody.trim()) {
      return
    }

    try {
      const message = await collaborationApi.sendChannelMessage(selectedChannel.id, { body: messageBody })
      setMessages((current) => upsertMessage(current, message))
      setWorkspace((current) => current ? {
        ...current,
        channels: current.channels.map((channel) => channel.id === selectedChannel.id ? { ...channel, lastActivityAt: message.createdAt } : channel),
      } : current)
      setMessageBody('')
      toast.success('Message posted to the channel')
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : 'Failed to send message')
    }
  }

  async function handleCreateAnnouncement() {
    const nextErrors: AnnouncementFormErrors = {}

    if (!announcementForm.title.trim()) {
      nextErrors.title = 'Announcement title is required'
    }

    if (!announcementForm.body.trim()) {
      nextErrors.body = 'Announcement body is required'
    }

    setAnnouncementErrors(nextErrors)

    if (nextErrors.title || nextErrors.body) {
      return
    }

    try {
      setAnnouncementSaving(true)

      const announcement = announcementForm.id
        ? await collaborationApi.updateAnnouncement(announcementForm.id, {
            title: announcementForm.title.trim(),
            body: announcementForm.body.trim(),
            priority: announcementForm.priority,
            projectId: announcementForm.projectId || undefined,
          })
        : await collaborationApi.createAnnouncement({
            title: announcementForm.title.trim(),
            body: announcementForm.body.trim(),
            priority: announcementForm.priority,
            projectId: announcementForm.projectId || undefined,
          })

      setWorkspace((current) => current ? {
        ...current,
        announcements: announcementForm.id
          ? current.announcements.map((entry) => entry.id === announcement.id ? announcement : entry)
          : [announcement, ...current.announcements],
      } : current)
      if (!announcementForm.id) {
        setAnnouncementPage(1)
      }
      setAnnouncementForm(initialAnnouncementForm)
      setAnnouncementErrors({})
      toast.success(announcementForm.id ? 'Announcement updated' : 'Announcement published')
    } catch (announcementError) {
      toast.error(getErrorMessage(announcementError, `Failed to ${announcementForm.id ? 'update' : 'create'} announcement`))
    } finally {
      setAnnouncementSaving(false)
    }
  }

  function handleEditAnnouncement(announcement: collaborationApi.CollaborationAnnouncement) {
    if (!canEditAnnouncement(announcement)) {
      toast.error('You do not have permission to edit this announcement')
      return
    }

    setAnnouncementForm({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      priority: announcement.priority,
      projectId: announcement.projectId || '',
    })
    setAnnouncementErrors({})
  }

  function handleCancelAnnouncementEdit() {
    setAnnouncementForm(initialAnnouncementForm)
    setAnnouncementErrors({})
  }

  async function handleDeleteAnnouncement() {
    if (!announcementDeleting) {
      return
    }

    try {
      setAnnouncementSaving(true)
      await collaborationApi.deleteAnnouncement(announcementDeleting.id)
      setWorkspace((current) => current ? {
        ...current,
        announcements: current.announcements.filter((entry) => entry.id !== announcementDeleting.id),
      } : current)
      if (announcementForm.id === announcementDeleting.id) {
        handleCancelAnnouncementEdit()
      }
      toast.success('Announcement deleted')
      setAnnouncementDeleting(null)
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete announcement'))
    } finally {
      setAnnouncementSaving(false)
    }
  }

  async function handleMarkRead(notificationId: string) {
    try {
      const updated = await collaborationApi.markNotificationRead(notificationId)
      setWorkspace((current) => current ? {
        ...current,
        notifications: current.notifications.map((notification) => notification.id === updated.id ? updated : notification),
      } : current)
    } catch (notificationError) {
      toast.error(notificationError instanceof Error ? notificationError.message : 'Failed to update notification')
    }
  }

  async function handleMarkAllRead() {
    try {
      await collaborationApi.markAllNotificationsRead()
      setWorkspace((current) => current ? {
        ...current,
        notifications: current.notifications.map((notification) => ({ ...notification, unread: false })),
      } : current)
    } catch (notificationError) {
      toast.error(notificationError instanceof Error ? notificationError.message : 'Failed to mark notifications as read')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[1.75rem] bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {workspace ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" leftIcon={<Bell size={16} />} onClick={() => void handleMarkAllRead()}>
            Mark All Read
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Active Channels" value={workspace?.channels.length || 0} helper="Organization and project-specific communication spaces" icon={<MessageSquare size={18} />} tone="sky" />
        <AdminMetricCard label="Unread Notifications" value={unreadNotifications} helper="Items still waiting for administrative attention" icon={<Bell size={18} />} tone="amber" />
        <AdminMetricCard label="Announcements" value={workspace?.announcements.length || 0} helper="Published broadcasts and targeted operational notices" icon={<Megaphone size={18} />} tone="emerald" />
        <AdminMetricCard label="Weekly Message Volume" value={weeklyMessageCount} helper="Messages sent across collaboration channels in the last 7 days" icon={<Sparkles size={18} />} tone="slate" />
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!workspace ? (
        <Card>
          <EmptyState title="No collaboration workspace available" message="The collaboration center could not initialize for the current organization." />
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card title="Channels & Live Thread" subtitle="Switch between organization-wide and project-specific threads, then continue the conversation in context.">
            <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-3">
                {workspace.channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${selectedChannel?.id === channel.id ? 'border-sky-300 bg-sky-50/80 shadow-[0_10px_24px_rgba(14,116,144,0.10)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{channel.name}</p>
                          <Badge variant={channel.scope === 'Project' ? 'info' : 'neutral'} text={channel.scope} />
                          {channel.isArchived ? <Badge variant="warning" text="Archived" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{channel.description}</p>
                      </div>
                      {channel.unreadCount > 0 ? <Badge variant="warning" text={`${channel.unreadCount} unread`} /> : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>{channel.memberCount} participant{channel.memberCount === 1 ? '' : 's'}</span>
                      <span>Active {relativeTime(channel.lastActivityAt)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4">
                {!selectedChannel ? (
                  <EmptyState title="No channel selected" message="Choose a collaboration channel to see the message thread." />
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{selectedChannel.name}</h3>
                        <Badge variant={selectedChannel.scope === 'Project' ? 'info' : 'neutral'} text={selectedChannel.scope} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{selectedChannel.description}</p>
                    </div>

                    <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                      {messageLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="h-20 animate-pulse rounded-[1.25rem] bg-white" />
                        ))
                      ) : messages.length === 0 ? (
                        <EmptyState title="No messages yet" message="Post the first update to start the thread for this channel." />
                      ) : (
                        messages.map((message) => {
                          const isCurrentUser = message.authorId === user?.id
                          return (
                            <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 ${isCurrentUser ? 'bg-sky-900 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                                <div className="mb-1 flex items-center justify-between gap-3 text-xs opacity-80">
                                  <span>{message.authorName}</span>
                                  <span>{formatDate(message.createdAt)}</span>
                                </div>
                                <p className="text-sm leading-6">{message.body}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-80">
                                  {message.isPinned ? <span className="rounded-full border border-current/30 px-2 py-0.5">Pinned</span> : null}
                                  {message.isEdited ? <span className="rounded-full border border-current/30 px-2 py-0.5">Edited</span> : null}
                                  {message.reactions.map((reaction) => (
                                    <span key={`${message.id}-${reaction.emoji}`} className="rounded-full border border-current/30 px-2 py-0.5">{reaction.emoji} {reaction.count}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <textarea
                        value={messageBody}
                        onChange={(event) => setMessageBody(event.target.value)}
                        className={textAreaClassName}
                        placeholder={`Share an update with ${selectedChannel.name}...`}
                      />
                      <div className="flex justify-end">
                        <Button leftIcon={<Send size={16} />} onClick={() => void handleSendMessage()} disabled={!messageBody.trim()}>
                          Post Message
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Announcements" subtitle="Broadcast operational notices to the full organization or link them to a specific project workspace.">
              <div ref={announcementFormRef} className="space-y-4 scroll-mt-6">
                {announcementForm.id ? (
                  <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Editing announcement. Update the fields below, then click Save Announcement.
                  </div>
                ) : null}
                <Input
                  id={announcementTitleInputId}
                  label="Announcement Title"
                  value={announcementForm.title}
                  error={announcementErrors.title}
                  onChange={(event) => {
                    setAnnouncementErrors((current) => ({ ...current, title: undefined }))
                    setAnnouncementForm((current) => ({ ...current, title: event.target.value }))
                  }}
                  requiredField
                />
                <Textarea
                  label="Body"
                  value={announcementForm.body}
                  error={announcementErrors.body}
                  onChange={(event) => {
                    setAnnouncementErrors((current) => ({ ...current, body: undefined }))
                    setAnnouncementForm((current) => ({ ...current, body: event.target.value }))
                  }}
                  requiredField
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Priority"
                    options={[
                      { value: 'Normal', label: 'Normal' },
                      { value: 'Important', label: 'Important' },
                      { value: 'Urgent', label: 'Urgent' },
                    ]}
                    value={announcementForm.priority}
                    onChange={(event) => setAnnouncementForm((current) => ({ ...current, priority: event.target.value as collaborationApi.AnnouncementPriority }))}
                  />
                  <Select
                    label="Project Scope"
                    options={[{ value: '', label: 'Organization-wide' }, ...projects.map((project) => ({ value: project.id, label: project.title }))]}
                    value={announcementForm.projectId}
                    onChange={(event) => setAnnouncementForm((current) => ({ ...current, projectId: event.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {announcementForm.id ? (
                    <Button variant="secondary" onClick={handleCancelAnnouncementEdit} disabled={announcementSaving}>
                      Cancel Edit
                    </Button>
                  ) : null}
                  <Button leftIcon={<Megaphone size={16} />} onClick={() => void handleCreateAnnouncement()} loading={announcementSaving} disabled={!canManageAnnouncements}>
                    {announcementForm.id ? 'Save Announcement' : 'Publish Announcement'}
                  </Button>
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {paginatedAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="rounded-[1.5rem] border border-slate-200 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                            <Badge variant={priorityBadgeVariant(announcement.priority)} text={announcement.priority} />
                            <Badge variant="neutral" text={announcement.projectTitle || 'Organization-wide'} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{announcement.body}</p>
                          <p className="mt-2 text-xs text-slate-400">Posted by {announcement.postedByName}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right text-xs text-slate-500">
                          <p>{formatDate(announcement.sentAt)}</p>
                          <p className="mt-1">Read confirmations: {announcement.readCount}</p>
                          {canEditAnnouncement(announcement) ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="secondary" size="sm" leftIcon={<PencilLine size={14} />} onClick={() => handleEditAnnouncement(announcement)}>
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => setAnnouncementDeleting(announcement)}>
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Pagination
                    currentPage={announcementPage}
                    totalPages={announcementTotalPages}
                    totalItems={totalAnnouncements}
                    pageSize={announcementPageSize}
                    onPageChange={setAnnouncementPage}
                  />
                </div>
              </div>
            </Card>

            <Card title="Notification Feed" subtitle="Operational events generated by announcements, document activity, and channel updates.">
              {workspace.notifications.length === 0 ? (
                <EmptyState title="No notifications" message="New document, message, and announcement alerts will appear here." />
              ) : (
                <div className="space-y-3">
                  {paginatedNotifications.map((notification) => (
                    <div key={notification.id} className={`rounded-[1.5rem] border px-4 py-4 ${notification.unread ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                            {notification.unread ? <Badge variant="info" text="Unread" /> : <Badge variant="neutral" text="Read" />}
                            <Badge variant="neutral" text={notification.kind} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{notification.body}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                        </div>
                        {notification.unread ? (
                          <Button variant="ghost" size="sm" onClick={() => void handleMarkRead(notification.id)}>
                            Mark Read
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <Pagination
                    currentPage={notificationPage}
                    totalPages={notificationTotalPages}
                    totalItems={totalNotifications}
                    pageSize={notificationPageSize}
                    onPageChange={setNotificationPage}
                  />
                </div>
              )}
            </Card>

          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!announcementDeleting}
        onClose={() => setAnnouncementDeleting(null)}
        onConfirm={handleDeleteAnnouncement}
        title="Delete Announcement"
        message={`Delete ${announcementDeleting?.title || 'this announcement'}? This removes it from the collaboration feed for all users.`}
        confirmText="Delete Announcement"
        confirmVariant="danger"
        loading={announcementSaving && !!announcementDeleting}
      />
    </div>
  )
}