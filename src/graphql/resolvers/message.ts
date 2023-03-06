import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { userIsConversationParticipant } from "../../util/function";
import {
  GraphQLContext,
  MessagePopulated,
  MessageSendSubscriptionPayload,
  SendMessageArguments,
} from "../../util/types";
import { conversationPopulated } from "./conversation";

const resolver = {
  Query: {
    messages: async function (
      _: any,
      args: { conversationId: string },
      context: GraphQLContext
    ): Promise<Array<MessagePopulated>> {
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized User");
      }

      const { id: userId } = session?.user;
      const { conversationId } = args;

      /**
       * Check conversation is exists and Verify that user is a participants
       */

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });

      if (!conversation) {
        throw new GraphQLError("Conversation Not Found");
      }

      const isAllowedToView = userIsConversationParticipant(
        conversation.participants,
        userId
      );

      if (!isAllowedToView) {
        throw new GraphQLError("Not Authorized to view");
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });
        return messages;
      } catch (error: any) {
        console.log("Message Error", error?.message);
        throw new GraphQLError(error?.message);
      }

      return [];
    },
  },
  Mutation: {
    sendMessage: async function (
      _: any,
      args: SendMessageArguments,
      context: GraphQLContext
    ): Promise<boolean> {
      const { session, prisma, pubsub } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized User");
      }

      const { id: userId } = session?.user;
      const { id: messageId, senderId, conversationId, body } = args;

      if (userId !== senderId) {
        throw new GraphQLError("Not Authorized User2");
      }

      try {
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        /**
         * Find conversationParticipants
         */
        const participants = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });
        if (!participants) {
          throw new GraphQLError("Problem participantsConversation not exists");
        }

        /**
         * Update Conversation Entity
         */

        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  id: participants?.id,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    userId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
        });

        pubsub.publish("MESSAGE_SEND", { messageSend: newMessage });
        // pubsub.publish("CONVERSATION_UPDATED", {
        //   conversationUpdated: {
        //     conversation,
        //   },
        // });
      } catch (error: any) {
        console.log("Send MEssage Error ", error?.message);
        throw new GraphQLError("Sending Message Error" + error?.message);
      }

      return true;
    },
  },
  Subscription: {
    messageSend: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["MESSAGE_SEND"]);
        },
        (
          payload: MessageSendSubscriptionPayload,
          args: { conversationId: string },
          context: GraphQLContext
        ) => {
          return payload.messageSend.conversationId === args.conversationId;
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export default resolver;
