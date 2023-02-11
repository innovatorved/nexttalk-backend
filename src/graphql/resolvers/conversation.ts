import { GraphQLContext } from "../../util/types";
import { ApolloError } from "apollo-server-core";
import { Prisma } from "@prisma/client";

const resolvers = {
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantsIds: Array<string> },
      context: GraphQLContext
    ): Promise<{ conversationId: string }> => {
      const { participantsIds } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not Authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantsIds.map((id) => {
                  return {
                    userId: id,
                    hasSeenLatestMessage: id === userId,
                  };
                }),
              },
            },
            latestMessageId: null,
          },
          include: conversationPopulated,
        });
        return {
          conversationId: conversation.id,
        };
      } catch (error: any) {
        console.log("createConversation Error", error?.message);
        throw new ApolloError("Error in creating conversation");
      }
    },
  },
};

export default resolvers;

export const participantPopulate =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulate,
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
