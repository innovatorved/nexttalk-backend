import {
  CreateUsernameResponse,
  GraphQLContext,
  SearchUser,
} from "../../util/types";

import { ApolloError } from "apollo-server-core";

const resolvers = {
  Query: {
    searchUsers: async (
      _: any,
      args: { username: string },
      context: GraphQLContext
    ): Promise<SearchUser[]> => {
      const { username: searchedUsername } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not Authorized");
      }

      const {
        user: { username: myUsername },
      } = session;

      try {
        const users = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              not: myUsername,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            username: true,
            image: true,
          },
        });
        return users;
      } catch (error: any) {
        console.log("Searched User Error", error?.message);
        throw new ApolloError(error?.message);
      }
    },
  },
  Mutation: {
    createUsername: async (
      _: any,
      args: { username: string },
      context: GraphQLContext
    ): Promise<CreateUsernameResponse> => {
      const { username } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not Authorized");
      }

      const { id: userId } = session.user;

      try {
        // Check Username is not already taken
        const existingUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });

        if (existingUser) {
          return {
            error: "Username is Already taken!",
          };
        }

        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            username,
          },
        });

        return { success: true };
      } catch (error: any) {
        console.log("Create Username Error", error?.message);
        return {
          error: error?.message,
        };
      }
    },
  },
  // Subscription: {},
};
export default resolvers;
