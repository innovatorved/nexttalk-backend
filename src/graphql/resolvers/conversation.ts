import {
  ConversationPopulated,
  GraphQLContext,
  ConversationUpdatedSubscriptionData,
  ConversationDeletedSubscriptionPayload,
} from "../../util/types";
import { userIsConversationParticipant } from "../../util/function";
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
        console.error("Conversation Error", error?.message);
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
        console.error("createConversation Error", error?.message);

        throw new GraphQLError("Error in creating conversation");
      }
    },
    markConversationAsRead: async function (
      _: any,
      args: { userId: string; conversationId: string },
      context: GraphQLContext
    ): Promise<boolean> {
      const { userId, conversationId } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }

      try {
        await prisma.conversationParticipant.updateMany({
          where: {
            userId: userId,
            conversationId: conversationId,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });

        return true;
      } catch (error: any) {
        console.error("Error in MarkConversation Error", error);
        throw new GraphQLError("Failed to mark conversation as read.");
      }
    },
    deleteConversation: async function (
      _: any,
      args: { conversationId: string },
      context: GraphQLContext
    ): Promise<boolean> {
      const { session, prisma, pubsub } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }

      try {
        /**
         * Delete conversation and all related entities
         * Optimize entire code into single transactiob
         */
        const deletedConversation = await prisma.$transaction(async (tx) => {
          await tx.conversation.update({
            where: {
              id: conversationId,
            },
            data: {
              latestMessageId: null,
            },
          });

          const deletedConversation = await tx.conversation.delete({
            where: {
              id: conversationId,
            },
            include: {
              participants: true,
            },
          });

          await tx.conversationParticipant.deleteMany({
            where: {
              conversationId: conversationId,
            },
          });

          await tx.message.deleteMany({
            where: {
              conversationId: conversationId,
            },
          });

          return deletedConversation;
        });

        pubsub.publish("CONVERSATION_DELETED", {
          conversationDeleted: deletedConversation,
        });

        return true;
      } catch (error: any) {
        console.error("deleteConversation error", error);
        throw new GraphQLError("Failed to delete conversation");
      }
    },
    updateParticipants: async function (
      _: any,
      args: { conversationId: string; participantIds: string[] },
      context: GraphQLContext
    ): Promise<boolean> {
      const { session, prisma, pubsub } = context;
      const { conversationId, participantIds } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const participants = await prisma.conversationParticipant.findMany({
          where: {
            conversationId,
          },
        });

        const existingParticipants = participants.map((p) => p.userId);

        const participantsToDelete = existingParticipants.filter(
          (id) => !participantIds.includes(id)
        );

        const participantsToCreate = participantIds.filter(
          (id) => !existingParticipants.includes(id)
        );

        const transactionStatements = [
          prisma.conversation.update({
            where: {
              id: conversationId,
            },
            data: {
              participants: {
                deleteMany: {
                  userId: {
                    in: participantsToDelete,
                  },
                  conversationId,
                },
              },
            },
            include: conversationPopulated,
          }),
        ];

        if (participantsToCreate.length) {
          transactionStatements.push(
            prisma.conversation.update({
              where: {
                id: conversationId,
              },
              data: {
                participants: {
                  createMany: {
                    data: participantsToCreate.map((id) => ({
                      userId: id,
                      hasSeenLatestMessage: true,
                    })),
                  },
                },
              },
              include: conversationPopulated,
            })
          );
        }

        const [deleteUpdate, addUpdate] = await prisma.$transaction(
          transactionStatements
        );

        pubsub.publish("CONVERSATION_UPDATED", {
          conversationUpdated: {
            conversation: addUpdate || deleteUpdate,
            addedUserIds: participantsToCreate,
            removedUserIds: participantsToDelete,
          },
        });

        return true;
      } catch (error: any) {
        console.error("updateParticipants error:", error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
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
    conversationUpdated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["CONVERSATION_UPDATED"]);
        },
        (
          payload: ConversationUpdatedSubscriptionData,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }

          const { id: userId } = session.user;
          const {
            conversationUpdated: {
              conversation: { participants },
              addedUserIds,
              removedUserIds,
            },
          } = payload;

          const userIsParticipant = userIsConversationParticipant(
            participants,
            userId
          );

          const userSentLatestMessage =
            payload.conversationUpdated.conversation.latestMessage?.senderId ===
            userId;

          const userIsBeingRemoved =
            removedUserIds &&
            Boolean(removedUserIds.find((id) => id === userId));

          return (
            (userIsParticipant && !userSentLatestMessage) ||
            userSentLatestMessage ||
            userIsBeingRemoved
          );
        }
      ),
    },
    conversationDeleted: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["CONVERSATION_DELETED"]);
        },
        (
          payload: ConversationDeletedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }

          const { id: userId } = session.user;
          const {
            conversationDeleted: { participants },
          } = payload;

          return userIsConversationParticipant(participants, userId);
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
