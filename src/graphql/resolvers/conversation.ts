import {
  ConversationPopulated,
  GraphQLContext,
  MessagePopulated,
} from "../../util/types";
import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";
import { withFilter } from "graphql-subscriptions";

const resolvers = {
  Query: {
    conversations: async (
      _: any,
      __: any,
      context: GraphQLContext
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: userId,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        return conversations;
      } catch (error: any) {
        console.log("Conversation Error", error?.message);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantsIds: Array<string> },
      context: GraphQLContext
    ): Promise<{ conversationId: string }> => {
      const { participantsIds } = args;
      const { session, prisma, pubsub } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const [conversation, message] = await prisma.$transaction(
          async (tx) => {
            const conversation = await tx.conversation.create({
              data: {
                participants: {
                  createMany: {
                    data: participantsIds.map((id) => ({
                      userId: id,
                      hasSeenLatestMessage: id === userId,
                    })),
                  },
                },
              },
              include: conversationPopulated,
            });

            const message = await tx.message.create({
              data: {
                body: "Welcome to the Conversation💭!",
                sender: {
                  connect: { id: userId },
                },
                conversation: {
                  connect: { id: conversation.id },
                },
              },
            });

            await tx.conversation.update({
              where: { id: conversation.id },
              data: {
                latestMessageId: message.id,
              },
            });

            return [conversation, message];
          }
        );
        pubsub.publish("CONVERSATION_CREATED", {
          conversationCreated: {
            ...conversation,
            messages: [message],
            latestMessage: message,
          },
        });

        return {
          conversationId: conversation.id,
        };
      } catch (error: any) {
        console.log("createConversation Error", error?.message);

        throw new GraphQLError("Error in creating conversation");
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (
          _: ConversationCreatedSubscriptionPayload,
          __: any,
          context: GraphQLContext
        ) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
        },
        (payload: any, _: any, context: GraphQLContext) => {
          const { session } = context;
          const {
            conversationCreated: { participants },
          } = payload;

          const userIsParticipant = !!participants.find(
            (p: any) => p?.userId === session?.user?.id
          );
          return userIsParticipant;
        }
      ),
    },
  },
};

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
        image: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default resolvers;
