import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  WorkerRequest,
  Shift,
  TitoLog,
  Conversation,
  Message,
  Notification,
  RequestStatus,
  ShiftStatus,
} from "@/types";

const KEYS = {
  REQUESTS: "@wc_requests",
  SHIFTS: "@wc_shifts",
  TITO: "@wc_tito",
  CONVERSATIONS: "@wc_conversations",
  MESSAGES: "@wc_messages",
  NOTIFICATIONS: "@wc_notifications",
};

// Helper to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get current date plus offset in days
const getDate = (daysOffset: number = 0, hoursOffset: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
};

// Sample data generation
const generateSampleData = () => {
  const requests: WorkerRequest[] = [
    {
      id: "req-1",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "Security Guard",
      shiftStartTime: getDate(1, 8),
      shiftEndTime: getDate(1, 16),
      locationMajorIntersection: "King & Bay, Toronto",
      payStructure: "$25/hour",
      notes: "Corporate office security, professional attire required",
      status: "submitted",
      slaDeadline: getDate(0, 4),
      createdAt: getDate(-1),
      updatedAt: getDate(-1),
    },
    {
      id: "req-2",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "Event Staff",
      shiftStartTime: getDate(3, 18),
      shiftEndTime: getDate(3, 23),
      locationMajorIntersection: "Front & Spadina, Toronto",
      payStructure: "$22/hour",
      notes: "Gala event, black attire",
      status: "assigned",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(2),
      createdAt: getDate(-2),
      updatedAt: getDate(-1),
    },
    {
      id: "req-3",
      clientId: "client-2",
      clientName: "Tech Solutions Inc",
      roleNeeded: "Warehouse Associate",
      shiftStartTime: getDate(0, 6),
      shiftEndTime: getDate(0, 14),
      locationMajorIntersection: "Airport & Derry, Mississauga",
      payStructure: "$20/hour",
      notes: "Heavy lifting required",
      status: "in_progress",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(-1),
      createdAt: getDate(-3),
      updatedAt: getDate(0),
    },
    {
      id: "req-4",
      clientId: "client-1",
      clientName: "Sarah Mitchell",
      roleNeeded: "Receptionist",
      shiftStartTime: getDate(-2, 9),
      shiftEndTime: getDate(-2, 17),
      locationMajorIntersection: "Yonge & Bloor, Toronto",
      payStructure: "$23/hour",
      notes: "Front desk coverage",
      status: "completed",
      hrAssignedId: "hr-1",
      hrAssignedName: "Emily Chen",
      slaDeadline: getDate(-3),
      createdAt: getDate(-5),
      updatedAt: getDate(-2),
    },
  ];

  const shifts: Shift[] = [
    {
      id: "shift-1",
      workerRequestId: "req-2",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(3, 18),
      endTime: getDate(3, 23),
      locationMajorIntersection: "Front & Spadina, Toronto",
      locationCoordinates: { latitude: 43.6426, longitude: -79.3871 },
      geofenceRadius: 100,
      status: "scheduled",
      payRate: 22,
      workerIds: ["worker-1"],
      workerNames: ["James Rodriguez"],
      clientName: "Sarah Mitchell",
      roleNeeded: "Event Staff",
      createdAt: getDate(-1),
    },
    {
      id: "shift-2",
      workerRequestId: "req-3",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(0, 6),
      endTime: getDate(0, 14),
      locationMajorIntersection: "Airport & Derry, Mississauga",
      locationCoordinates: { latitude: 43.6777, longitude: -79.6248 },
      geofenceRadius: 100,
      status: "in_progress",
      payRate: 20,
      workerIds: ["worker-1", "worker-2"],
      workerNames: ["James Rodriguez", "Alex Johnson"],
      clientName: "Tech Solutions Inc",
      roleNeeded: "Warehouse Associate",
      createdAt: getDate(-2),
    },
    {
      id: "shift-3",
      workerRequestId: "req-4",
      hrManagerId: "hr-1",
      hrManagerName: "Emily Chen",
      startTime: getDate(-2, 9),
      endTime: getDate(-2, 17),
      locationMajorIntersection: "Yonge & Bloor, Toronto",
      locationCoordinates: { latitude: 43.6709, longitude: -79.3857 },
      geofenceRadius: 100,
      status: "completed",
      payRate: 23,
      workerIds: ["worker-1"],
      workerNames: ["James Rodriguez"],
      clientName: "Sarah Mitchell",
      roleNeeded: "Receptionist",
      createdAt: getDate(-4),
    },
  ];

  const titoLogs: TitoLog[] = [
    {
      id: "tito-1",
      shiftId: "shift-2",
      workerId: "worker-1",
      workerName: "James Rodriguez",
      timeIn: getDate(0, 6),
      timeInLocation: "Airport & Derry",
      verificationMethod: "gps",
      status: "pending",
      shiftDate: getDate(0),
      createdAt: getDate(0, 6),
    },
    {
      id: "tito-2",
      shiftId: "shift-3",
      workerId: "worker-1",
      workerName: "James Rodriguez",
      timeIn: getDate(-2, 9),
      timeOut: getDate(-2, 17),
      timeInLocation: "Yonge & Bloor",
      timeOutLocation: "Yonge & Bloor",
      verificationMethod: "gps",
      approvedBy: "client-1",
      approvedAt: getDate(-2, 18),
      status: "approved",
      shiftDate: getDate(-2),
      createdAt: getDate(-2, 9),
    },
  ];

  const conversations: Conversation[] = [
    {
      id: "conv-1",
      type: "client_hr",
      participants: [
        { id: "hr-1", name: "Emily Chen", role: "hr" },
        { id: "client-1", name: "Sarah Mitchell", role: "client" },
      ],
      lastMessage: "The event staff has been confirmed for Saturday",
      lastMessageAt: getDate(0, -2),
      unreadCount: 1,
      createdAt: getDate(-5),
    },
    {
      id: "conv-2",
      type: "hr_worker",
      participants: [
        { id: "hr-1", name: "Emily Chen", role: "hr" },
        { id: "worker-1", name: "James Rodriguez", role: "worker" },
      ],
      lastMessage: "Reminder: Your shift starts at 6 AM tomorrow",
      lastMessageAt: getDate(-1, 10),
      unreadCount: 0,
      createdAt: getDate(-10),
    },
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "Hi Sarah, I wanted to confirm the details for your event staffing request.",
      createdAt: getDate(-1, -5),
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "client-1",
      senderName: "Sarah Mitchell",
      senderRole: "client",
      content: "Yes, we need 2 staff members for the gala on Saturday evening.",
      readAt: getDate(-1, -4),
      createdAt: getDate(-1, -4),
    },
    {
      id: "msg-3",
      conversationId: "conv-1",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "The event staff has been confirmed for Saturday",
      createdAt: getDate(0, -2),
    },
    {
      id: "msg-4",
      conversationId: "conv-2",
      senderId: "hr-1",
      senderName: "Emily Chen",
      senderRole: "hr",
      content: "Reminder: Your shift starts at 6 AM tomorrow",
      readAt: getDate(-1, 12),
      createdAt: getDate(-1, 10),
    },
  ];

  const notifications: Notification[] = [
    {
      id: "notif-1",
      userId: "worker-1",
      title: "Shift Reminder",
      message: "Your warehouse shift starts in 2 hours",
      type: "shift",
      isRead: false,
      actionUrl: "/shifts/shift-2",
      createdAt: getDate(0, 4),
    },
    {
      id: "notif-2",
      userId: "hr-1",
      title: "New Request",
      message: "Sarah Mitchell submitted a new worker request",
      type: "request",
      isRead: false,
      actionUrl: "/requests/req-1",
      createdAt: getDate(-1),
    },
    {
      id: "notif-3",
      userId: "client-1",
      title: "TITO Pending",
      message: "James Rodriguez submitted time for approval",
      type: "tito",
      isRead: false,
      actionUrl: "/tito/tito-1",
      createdAt: getDate(0, 6),
    },
  ];

  return { requests, shifts, titoLogs, conversations, messages, notifications };
};

// Initialize storage with sample data
export async function initializeStorage() {
  try {
    const existingRequests = await AsyncStorage.getItem(KEYS.REQUESTS);
    if (!existingRequests) {
      const data = generateSampleData();
      await Promise.all([
        AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(data.requests)),
        AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(data.shifts)),
        AsyncStorage.setItem(KEYS.TITO, JSON.stringify(data.titoLogs)),
        AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(data.conversations)),
        AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(data.messages)),
        AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data.notifications)),
      ]);
    }
  } catch (error) {
    console.error("Failed to initialize storage:", error);
  }
}

// Requests
export async function getRequests(userId?: string, role?: string): Promise<WorkerRequest[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.REQUESTS);
    let requests: WorkerRequest[] = data ? JSON.parse(data) : [];
    
    if (role === "client" && userId) {
      requests = requests.filter(r => r.clientId === userId);
    }
    
    return requests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getRequest(id: string): Promise<WorkerRequest | null> {
  const requests = await getRequests();
  return requests.find(r => r.id === id) || null;
}

export async function createRequest(request: Omit<WorkerRequest, "id" | "createdAt" | "updatedAt">): Promise<WorkerRequest> {
  const requests = await getRequests();
  const newRequest: WorkerRequest = {
    ...request,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  requests.unshift(newRequest);
  await AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  return newRequest;
}

export async function updateRequest(id: string, updates: Partial<WorkerRequest>): Promise<WorkerRequest | null> {
  const requests = await getRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  requests[index] = {
    ...requests[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  return requests[index];
}

// Shifts
export async function getShifts(userId?: string, role?: string): Promise<Shift[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SHIFTS);
    let shifts: Shift[] = data ? JSON.parse(data) : [];
    
    if (role === "worker" && userId) {
      shifts = shifts.filter(s => s.workerIds.includes(userId));
    }
    
    return shifts.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  } catch {
    return [];
  }
}

export async function getShift(id: string): Promise<Shift | null> {
  const shifts = await getShifts();
  return shifts.find(s => s.id === id) || null;
}

export async function createShift(shift: Omit<Shift, "id" | "createdAt">): Promise<Shift> {
  const shifts = await getShifts();
  const newShift: Shift = {
    ...shift,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  shifts.unshift(newShift);
  await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  return newShift;
}

export async function updateShift(id: string, updates: Partial<Shift>): Promise<Shift | null> {
  const shifts = await getShifts();
  const index = shifts.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  shifts[index] = { ...shifts[index], ...updates };
  await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
  return shifts[index];
}

// TITO
export async function getTitoLogs(userId?: string, role?: string): Promise<TitoLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TITO);
    let logs: TitoLog[] = data ? JSON.parse(data) : [];
    
    if (role === "worker" && userId) {
      logs = logs.filter(t => t.workerId === userId);
    }
    
    return logs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function createTitoLog(log: Omit<TitoLog, "id" | "createdAt">): Promise<TitoLog> {
  const logs = await getTitoLogs();
  const newLog: TitoLog = {
    ...log,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  await AsyncStorage.setItem(KEYS.TITO, JSON.stringify(logs));
  return newLog;
}

export async function updateTitoLog(id: string, updates: Partial<TitoLog>): Promise<TitoLog | null> {
  const logs = await getTitoLogs();
  const index = logs.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  logs[index] = { ...logs[index], ...updates };
  await AsyncStorage.setItem(KEYS.TITO, JSON.stringify(logs));
  return logs[index];
}

// Conversations
export async function getConversations(userId: string): Promise<Conversation[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    const conversations: Conversation[] = data ? JSON.parse(data) : [];
    return conversations
      .filter(c => c.participants.some(p => p.id === userId))
      .sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt).getTime() - 
        new Date(a.lastMessageAt || a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    const conversations: Conversation[] = data ? JSON.parse(data) : [];
    return conversations.find(c => c.id === id) || null;
  } catch {
    return null;
  }
}

// Messages
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MESSAGES);
    const messages: Message[] = data ? JSON.parse(data) : [];
    return messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function sendMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
  const messages = await AsyncStorage.getItem(KEYS.MESSAGES);
  const allMessages: Message[] = messages ? JSON.parse(messages) : [];
  
  const newMessage: Message = {
    ...message,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  allMessages.push(newMessage);
  await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(allMessages));
  
  // Update conversation last message
  const convData = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
  const conversations: Conversation[] = convData ? JSON.parse(convData) : [];
  const convIndex = conversations.findIndex(c => c.id === message.conversationId);
  if (convIndex !== -1) {
    conversations[convIndex].lastMessage = message.content;
    conversations[convIndex].lastMessageAt = newMessage.createdAt;
    await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  }
  
  return newMessage;
}

// Notifications
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifications: Notification[] = data ? JSON.parse(data) : [];
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifications: Notification[] = data ? JSON.parse(data) : [];
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].isRead = true;
      await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  } catch {}
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notifications = await getNotifications(userId);
  return notifications.filter(n => !n.isRead).length;
}

// Clear all data
export async function clearStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
