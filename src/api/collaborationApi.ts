import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { axiosInstance } from './axiosInstance'

export type CollaborationChannelType = 'ProjectChannel' | 'DirectMessage' | 'General' | 'Announcement'
export type CollaborationScope = 'Organization' | 'Project' | 'Direct'
export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent'

type ApiChannel = {
  id: string
  name: string
  description?: string | null
  type: CollaborationChannelType
  projectId?: string | null
  projectTitle?: string | null
  organizationId: string
  createdByUserId: string
  isArchived: boolean
  memberCount: number
  unreadCount: number
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

type ApiMessageReaction = {
  emoji: string
  count: number
  userNames: string[]
  reactedByCurrentUser: boolean
}

type ApiMessage = {
  id: string
  channelId: string
  senderId: string
  senderName: string
  content: string
  type: 'Text' | 'File' | 'System' | 'Announcement'
  parentMessageId?: string | null
  isEdited: boolean
  editedAt?: string | null
  isPinned: boolean
  isDeleted: boolean
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
  reactions: ApiMessageReaction[]
}

type ApiAnnouncement = {
  id: string
  title: string
  content: string
  postedByUserId: string
  postedByName: string
  organizationId: string
  projectId?: string | null
  projectTitle?: string | null
  priority: AnnouncementPriority
  isPublished: boolean
  publishedAt?: string | null
  expiresAt?: string | null
  readCount: number
  createdAt: string
  updatedAt: string
}

type ApiNotification = {
  id: string
  userId: string
  title: string
  message: string
  type: 'TaskAssigned' | 'MessageReceived' | 'ProjectUpdated' | 'DocumentUploaded' | 'AnnouncementPosted' | 'MilestoneReached' | 'MentionReceived' | number
  referenceId?: string | null
  referenceType?: string | null
  isRead: boolean
  createdAt: string
}

export type CollaborationChannel = {
  id: string
  name: string
  description: string
  type: CollaborationChannelType
  scope: CollaborationScope
  memberCount: number
  lastActivityAt: string
  unreadCount: number
  projectId?: string | null
  projectTitle?: string | null
  isArchived: boolean
}

export type CollaborationMessageReaction = {
  emoji: string
  count: number
  userNames: string[]
  reactedByCurrentUser: boolean
}

export type CollaborationMessage = {
  id: string
  channelId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isPinned: boolean
  isDeleted: boolean
  reactions: CollaborationMessageReaction[]
}

export type CollaborationAnnouncement = {
  id: string
  title: string
  body: string
  priority: AnnouncementPriority
  projectId?: string | null
  projectTitle?: string | null
  postedByUserId: string
  postedByName: string
  sentAt: string
  readCount: number
  expiresAt?: string | null
}

export type CollaborationNotificationKind = 'announcement' | 'message' | 'document' | 'task' | 'project' | 'milestone' | 'mention'

export type CollaborationNotification = {
  id: string
  title: string
  body: string
  kind: CollaborationNotificationKind
  createdAt: string
  unread: boolean
  referenceId?: string | null
  referenceType?: string | null
}

export type CollaborationWorkspace = {
  channels: CollaborationChannel[]
  announcements: CollaborationAnnouncement[]
  notifications: CollaborationNotification[]
}

export type CollaborationHubHandlers = {
  onMessageReceived?: (message: CollaborationMessage) => void
  onMessageEdited?: (message: CollaborationMessage) => void
  onMessageDeleted?: (messageId: string) => void
  onNotificationReceived?: (notification: CollaborationNotification) => void
  onChannelUpdated?: (channel: CollaborationChannel) => void
}

let activeConnection: HubConnection | null = null
let activeConnectionPromise: Promise<HubConnection> | null = null
let nextSubscriberId = 0

const hubSubscribers = new Map<number, CollaborationHubHandlers>()

function resolveScope(type: CollaborationChannelType, projectId?: string | null): CollaborationScope {
  if (type === 'DirectMessage') {
    return 'Direct'
  }

  return projectId ? 'Project' : 'Organization'
}

function mapChannel(channel: ApiChannel): CollaborationChannel {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description || 'No channel description provided.',
    type: channel.type,
    scope: resolveScope(channel.type, channel.projectId),
    memberCount: channel.memberCount,
    lastActivityAt: channel.lastActivityAt,
    unreadCount: channel.unreadCount,
    projectId: channel.projectId || undefined,
    projectTitle: channel.projectTitle || undefined,
    isArchived: channel.isArchived,
  }
}

function mapMessage(message: ApiMessage): CollaborationMessage {
  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.senderId,
    authorName: message.senderName,
    body: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    isEdited: message.isEdited,
    isPinned: message.isPinned,
    isDeleted: message.isDeleted,
    reactions: message.reactions,
  }
}

function mapAnnouncement(announcement: ApiAnnouncement): CollaborationAnnouncement {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.content,
    priority: announcement.priority,
    projectId: announcement.projectId || undefined,
    projectTitle: announcement.projectTitle || undefined,
    postedByUserId: announcement.postedByUserId,
    postedByName: announcement.postedByName,
    sentAt: announcement.publishedAt || announcement.createdAt,
    readCount: announcement.readCount,
    expiresAt: announcement.expiresAt || undefined,
  }
}

function normalizeNotificationType(type: ApiNotification['type']): CollaborationNotificationKind {
  if (typeof type === 'number') {
    switch (type) {
      case 0:
        return 'task'
      case 1:
        return 'message'
      case 2:
        return 'project'
      case 3:
        return 'document'
      case 4:
        return 'announcement'
      case 5:
        return 'milestone'
      case 6:
        return 'mention'
      default:
        return 'message'
    }
  }

  const kindMap: Record<Exclude<ApiNotification['type'], number>, CollaborationNotificationKind> = {
    AnnouncementPosted: 'announcement',
    MessageReceived: 'message',
    DocumentUploaded: 'document',
    TaskAssigned: 'task',
    ProjectUpdated: 'project',
    MilestoneReached: 'milestone',
    MentionReceived: 'mention',
  }

  return kindMap[type]
}

function mapNotification(notification: ApiNotification): CollaborationNotification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.message,
    kind: normalizeNotificationType(notification.type),
    createdAt: notification.createdAt,
    unread: !notification.isRead,
    referenceId: notification.referenceId || undefined,
    referenceType: notification.referenceType ? notification.referenceType.trim() : undefined,
  }
}

function apiRoot() {
  const configured = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api'
  return configured.replace(/\/api\/?$/, '')
}

function sortChannels(channels: CollaborationChannel[]) {
  return [...channels].sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
}

function dispatchMessageReceived(message: CollaborationMessage) {
  hubSubscribers.forEach((handlers) => handlers.onMessageReceived?.(message))
}

function dispatchMessageEdited(message: CollaborationMessage) {
  hubSubscribers.forEach((handlers) => handlers.onMessageEdited?.(message))
}

function dispatchMessageDeleted(messageId: string) {
  hubSubscribers.forEach((handlers) => handlers.onMessageDeleted?.(messageId))
}

function dispatchNotificationReceived(notification: CollaborationNotification) {
  hubSubscribers.forEach((handlers) => handlers.onNotificationReceived?.(notification))
}

function dispatchChannelUpdated(channel: CollaborationChannel) {
  hubSubscribers.forEach((handlers) => handlers.onChannelUpdated?.(channel))
}

async function ensureHubConnection() {
  if (activeConnection) {
    return activeConnection
  }

  if (activeConnectionPromise) {
    return activeConnectionPromise
  }

  const connection = new HubConnectionBuilder()
    .withUrl(`${apiRoot()}/hubs/collaboration`, {
      accessTokenFactory: () => localStorage.getItem('innotrack_token') || '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  connection.on('ReceiveMessage', (payload: ApiMessage) => dispatchMessageReceived(mapMessage(payload)))
  connection.on('MessageEdited', (payload: ApiMessage) => dispatchMessageEdited(mapMessage(payload)))
  connection.on('MessageDeleted', (messageId: string) => dispatchMessageDeleted(messageId))
  connection.on('NotificationReceived', (payload: ApiNotification) => dispatchNotificationReceived(mapNotification(payload)))
  connection.on('ChannelUpdated', (payload: ApiChannel) => dispatchChannelUpdated(mapChannel(payload)))
  connection.onclose(() => {
    if (activeConnection === connection) {
      activeConnection = null
    }
  })

  activeConnectionPromise = connection.start()
    .then(() => {
      activeConnection = connection
      activeConnectionPromise = null
      return connection
    })
    .catch((error) => {
      activeConnectionPromise = null
      throw error
    })

  return activeConnectionPromise
}

export async function getChannels() {
  const { data } = await axiosInstance.get<ApiChannel[]>('/channels')
  return sortChannels(data.map(mapChannel))
}

export async function getChannelMessages(channelId: string) {
  const { data } = await axiosInstance.get<ApiMessage[]>(`/channels/${channelId}/messages`)
  return data.map(mapMessage)
}

export async function getAnnouncements() {
  const { data } = await axiosInstance.get<ApiAnnouncement[]>('/announcements')
  return data.map(mapAnnouncement)
}

export async function getNotifications() {
  const { data } = await axiosInstance.get<ApiNotification[]>('/notifications')
  return data.map(mapNotification)
}

export async function getCollaborationWorkspace(): Promise<CollaborationWorkspace> {
  const [channels, announcements, notifications] = await Promise.all([
    getChannels(),
    getAnnouncements(),
    getNotifications(),
  ])

  return {
    channels,
    announcements,
    notifications,
  }
}

export async function createChannel(input: {
  name: string
  description?: string
  type: CollaborationChannelType
  projectId?: string
  memberUserIds?: string[]
}) {
  const { data } = await axiosInstance.post<ApiChannel>('/channels', {
    name: input.name,
    description: input.description,
    type: input.type,
    projectId: input.projectId,
    memberUserIds: input.memberUserIds || [],
  })
  return mapChannel(data)
}

export async function getWeeklyMessageVolume(channelIds: string[]) {
  const weeklyCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const batches = await Promise.all(channelIds.map((channelId) => getChannelMessages(channelId).catch(() => [])))
  return batches.flat().filter((message) => new Date(message.createdAt).getTime() >= weeklyCutoff).length
}

export async function sendChannelMessage(channelId: string, input: { body: string; parentMessageId?: string }) {
  const { data } = await axiosInstance.post<ApiMessage>(`/channels/${channelId}/messages`, {
    content: input.body,
    parentMessageId: input.parentMessageId,
  })
  return mapMessage(data)
}

export async function createAnnouncement(input: {
  title: string
  body: string
  priority: AnnouncementPriority
  projectId?: string
}) {
  const { data } = await axiosInstance.post<ApiAnnouncement>('/announcements', {
    title: input.title,
    content: input.body,
    priority: input.priority,
    projectId: input.projectId || undefined,
    publishImmediately: true,
  })
  return mapAnnouncement(data)
}

export async function updateAnnouncement(id: string, input: {
  title: string
  body: string
  priority: AnnouncementPriority
  projectId?: string
}) {
  const { data } = await axiosInstance.put<ApiAnnouncement>(`/announcements/${id}`, {
    title: input.title,
    content: input.body,
    priority: input.priority,
    projectId: input.projectId || undefined,
    isPublished: true,
  })
  return mapAnnouncement(data)
}

export async function deleteAnnouncement(id: string) {
  await axiosInstance.delete(`/announcements/${id}`)
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await axiosInstance.patch<ApiNotification>(`/notifications/${notificationId}/read`)
  return mapNotification(data)
}

export async function markAllNotificationsRead() {
  await axiosInstance.patch('/notifications/read-all')
}

export async function markChannelRead(channelId: string) {
  await axiosInstance.patch(`/channels/${channelId}/read`)
}

export async function connectCollaborationHub(handlers: CollaborationHubHandlers) {
  if (typeof window === 'undefined') {
    return async () => {}
  }

  const subscriberId = ++nextSubscriberId
  hubSubscribers.set(subscriberId, handlers)

  try {
    await ensureHubConnection()
  } catch (error) {
    hubSubscribers.delete(subscriberId)
    throw error
  }

  return async () => {
    hubSubscribers.delete(subscriberId)

    if (hubSubscribers.size > 0) {
      return
    }

    if (activeConnectionPromise) {
      try {
        const pendingConnection = await activeConnectionPromise

        if (hubSubscribers.size === 0) {
          await pendingConnection.stop()
        }
      } finally {
        if (hubSubscribers.size === 0) {
          activeConnection = null
          activeConnectionPromise = null
        }
      }

      return
    }

    if (!activeConnection) {
      return
    }

    const connection = activeConnection
    activeConnection = null
    await connection.stop()
  }
}

export async function joinChannel(channelId: string) {
  const connection = activeConnection ?? (activeConnectionPromise ? await activeConnectionPromise : null)

  if (!connection) {
    return
  }

  await connection.invoke('JoinChannel', channelId)
}

export async function leaveChannel(channelId: string) {
  const connection = activeConnection ?? (activeConnectionPromise ? await activeConnectionPromise : null)

  if (!connection) {
    return
  }

  await connection.invoke('LeaveChannel', channelId)
}