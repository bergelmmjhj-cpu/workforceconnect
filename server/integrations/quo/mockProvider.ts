import { randomUUID } from "crypto";
import type { QuoProvider, SendMessageParams, InitiateCallParams } from "./provider";
import type { QuoConversation, QuoMessage, QuoCallLog } from "../../../shared/schema";

const QUO_FROM_NUMBER = process.env.QUO_FROM_NUMBER || "+1-647-555-0100";

const conversations: Map<string, QuoConversation> = new Map();
const messages: Map<string, QuoMessage> = new Map();
const callLogs: Map<string, QuoCallLog> = new Map();

function seedDemoData() {
  const now = new Date();
  const conv1: QuoConversation = {
    id: "quo-conv-1",
    externalId: null,
    participantType: "worker",
    participantId: "worker-1",
    participantName: "Alex Johnson",
    participantPhone: "+1-416-555-0101",
    lastMessageAt: new Date(now.getTime() - 30 * 60 * 1000),
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 30 * 60 * 1000),
  };
  const conv2: QuoConversation = {
    id: "quo-conv-2",
    externalId: null,
    participantType: "client",
    participantId: "client-1",
    participantName: "Marriott Downtown",
    participantPhone: "+1-416-555-0202",
    lastMessageAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  };

  conversations.set(conv1.id, conv1);
  conversations.set(conv2.id, conv2);

  const msg1: QuoMessage = {
    id: "quo-msg-1",
    conversationId: conv1.id,
    externalId: null,
    direction: "outbound",
    toNumber: conv1.participantPhone,
    fromNumber: QUO_FROM_NUMBER,
    body: "Hi Alex, your shift tomorrow at Marriott Downtown starts at 8 AM. Please confirm attendance.",
    status: "delivered",
    sentAt: new Date(now.getTime() - 60 * 60 * 1000),
    deliveredAt: new Date(now.getTime() - 60 * 60 * 1000 + 5000),
    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
  };
  const msg2: QuoMessage = {
    id: "quo-msg-2",
    conversationId: conv1.id,
    externalId: null,
    direction: "inbound",
    toNumber: QUO_FROM_NUMBER,
    fromNumber: conv1.participantPhone,
    body: "Confirmed! I'll be there. Thanks!",
    status: "delivered",
    sentAt: new Date(now.getTime() - 30 * 60 * 1000),
    deliveredAt: new Date(now.getTime() - 30 * 60 * 1000),
    createdAt: new Date(now.getTime() - 30 * 60 * 1000),
  };
  const msg3: QuoMessage = {
    id: "quo-msg-3",
    conversationId: conv2.id,
    externalId: null,
    direction: "outbound",
    toNumber: conv2.participantPhone,
    fromNumber: QUO_FROM_NUMBER,
    body: "Good morning! Just confirming we have 5 housekeepers scheduled for today.",
    status: "delivered",
    sentAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    deliveredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000 + 3000),
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
  };
  const msg4: QuoMessage = {
    id: "quo-msg-4",
    conversationId: conv2.id,
    externalId: null,
    direction: "inbound",
    toNumber: QUO_FROM_NUMBER,
    fromNumber: conv2.participantPhone,
    body: "Thank you! Can you send one more person for the afternoon shift?",
    status: "delivered",
    sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    deliveredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  };

  messages.set(msg1.id, msg1);
  messages.set(msg2.id, msg2);
  messages.set(msg3.id, msg3);
  messages.set(msg4.id, msg4);

  const call1: QuoCallLog = {
    id: "quo-call-1",
    externalId: null,
    direction: "outbound",
    toNumber: "+1-416-555-0101",
    fromNumber: QUO_FROM_NUMBER,
    status: "completed",
    startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    endedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 180000),
    durationSeconds: 180,
    recordingUrl: null,
    participantName: "Alex Johnson",
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
  };
  const call2: QuoCallLog = {
    id: "quo-call-2",
    externalId: null,
    direction: "inbound",
    toNumber: QUO_FROM_NUMBER,
    fromNumber: "+1-416-555-0303",
    status: "completed",
    startedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    endedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000 + 90000),
    durationSeconds: 90,
    recordingUrl: null,
    participantName: "New Applicant",
    createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
  };

  callLogs.set(call1.id, call1);
  callLogs.set(call2.id, call2);
}

seedDemoData();

export class MockQuoProvider implements QuoProvider {
  async sendMessage(params: SendMessageParams): Promise<QuoMessage> {
    const { toNumber, body, conversationId } = params;
    
    let convId = conversationId;
    
    if (!convId) {
      const existingConv = Array.from(conversations.values()).find(
        (c) => c.participantPhone === toNumber
      );

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const newConv: QuoConversation = {
          id: randomUUID(),
          externalId: null,
          participantType: "other",
          participantId: null,
          participantName: null,
          participantPhone: toNumber,
          lastMessageAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        conversations.set(newConv.id, newConv);
        convId = newConv.id;
      }
    }

    const now = new Date();
    const message: QuoMessage = {
      id: randomUUID(),
      conversationId: convId,
      externalId: null,
      direction: "outbound",
      toNumber: toNumber,
      fromNumber: QUO_FROM_NUMBER,
      body: body,
      status: "sent",
      sentAt: now,
      deliveredAt: null,
      createdAt: now,
    };
    messages.set(message.id, message);

    const conv = conversations.get(convId);
    if (conv) {
      conv.lastMessageAt = now;
      conv.updatedAt = now;
    }

    return message;
  }

  async initiateCall(params: InitiateCallParams): Promise<QuoCallLog> {
    const { toNumber, participantName } = params;
    const now = new Date();

    const callLog: QuoCallLog = {
      id: randomUUID(),
      externalId: null,
      direction: "outbound",
      toNumber: toNumber,
      fromNumber: QUO_FROM_NUMBER,
      status: "initiated",
      startedAt: now,
      endedAt: null,
      durationSeconds: null,
      recordingUrl: null,
      participantName: participantName || null,
      createdAt: now,
    };
    callLogs.set(callLog.id, callLog);

    setTimeout(async () => {
      await this.updateCallStatus(callLog.id, "ringing");
      setTimeout(async () => {
        const duration = Math.floor(Math.random() * 180) + 30;
        await this.updateCallStatus(callLog.id, "completed", duration);
      }, 3000);
    }, 1000);

    return callLog;
  }

  async getConversations(): Promise<QuoConversation[]> {
    return Array.from(conversations.values()).sort(
      (a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
    );
  }

  async getMessages(conversationId: string): Promise<QuoMessage[]> {
    return Array.from(messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getCallLogs(): Promise<QuoCallLog[]> {
    return Array.from(callLogs.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  async handleInboundMessage(fromNumber: string, body: string): Promise<QuoMessage> {
    let conv = Array.from(conversations.values()).find(
      (c) => c.participantPhone === fromNumber
    );

    let convId: string;
    if (conv) {
      convId = conv.id;
    } else {
      const newConv: QuoConversation = {
        id: randomUUID(),
        externalId: null,
        participantType: "other",
        participantId: null,
        participantName: null,
        participantPhone: fromNumber,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      conversations.set(newConv.id, newConv);
      convId = newConv.id;
      conv = newConv;
    }

    const now = new Date();
    const message: QuoMessage = {
      id: randomUUID(),
      conversationId: convId,
      externalId: null,
      direction: "inbound",
      toNumber: QUO_FROM_NUMBER,
      fromNumber: fromNumber,
      body: body,
      status: "delivered",
      sentAt: now,
      deliveredAt: now,
      createdAt: now,
    };
    messages.set(message.id, message);

    if (conv) {
      conv.lastMessageAt = now;
      conv.updatedAt = now;
    }

    return message;
  }

  async updateCallStatus(callId: string, status: string, durationSeconds?: number): Promise<QuoCallLog> {
    const call = callLogs.get(callId);
    if (!call) {
      throw new Error("Call not found");
    }

    call.status = status;
    if (status === "completed" || status === "failed" || status === "no-answer") {
      call.endedAt = new Date();
      if (durationSeconds !== undefined) {
        call.durationSeconds = durationSeconds;
      }
    }

    return call;
  }
}
