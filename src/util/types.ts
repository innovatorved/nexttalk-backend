import { Prisma, PrismaClient } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";
import { Context } from "graphql-ws/lib/server";
import { conversationPopulated } from "../graphql/resolvers/conversation";
import { messagePopulated } from "../graphql/resolvers/message";

export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
  pubsub: PubSub;
}

export interface SubscriptionContext extends Context {
  connectionParams: {
    session?: Session;
  };
}

// Users
export interface Session {
  user?: User;
  expires: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean | null;
  name: string;
  image: string;
}
export interface CreateUsernameResponse {
  success?: boolean;
  error?: string;
}

export interface SearchUser {
  id: string;
  username: string | null;
  image: string | null;
}

export type ConversationPopulated = Prisma.ConversationGetPayload<{
  include: typeof conversationPopulated;
}>;

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}

export interface ConversationUpdatedSubscriptionData {
  conversationUpdated: {
    conversation: ConversationPopulated;
    addedUserIds: Array<string>;
    removedUserIds: Array<string>;
  };
}

export interface ConversationDeletedSubscriptionPayload {
  conversationDeleted: ConversationPopulated;
}

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantPopulated;
}>;

/**
 * Messages Types
 */

export interface SendMessageArguments {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}

export interface MessageSendSubscriptionPayload {
  messageSend: MessagePopulated;
}
export type MessagePopulated = Prisma.MessageGetPayload<{
  include: typeof messagePopulated;
}>;
