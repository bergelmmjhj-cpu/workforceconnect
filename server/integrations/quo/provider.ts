import type { QuoConversation, QuoMessage, QuoCallLog } from "../../../shared/schema";

export interface SendMessageParams {
  toNumber: string;
  body: string;
  conversationId?: string;
}

export interface InitiateCallParams {
  toNumber: string;
  participantName?: string;
}

export interface QuoProvider {
  sendMessage(params: SendMessageParams): Promise<QuoMessage>;
  initiateCall(params: InitiateCallParams): Promise<QuoCallLog>;
  getConversations(): Promise<QuoConversation[]>;
  getMessages(conversationId: string): Promise<QuoMessage[]>;
  getCallLogs(): Promise<QuoCallLog[]>;
  handleInboundMessage(fromNumber: string, body: string): Promise<QuoMessage>;
  updateCallStatus(callId: string, status: string, durationSeconds?: number): Promise<QuoCallLog>;
}
