require("dotenv").config();

import { ApolloServer } from "apollo-server-express";
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageLocalDefault,
} from "apollo-server-core";
import { makeExecutableSchema } from "@graphql-tools/schema";

import { PubSub } from "graphql-subscriptions";

import express from "express";
import http from "http";

import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";

import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";

import { CLIENT_URL } from "./constants";
import { GraphQLContext, Session, SubscriptionContext } from "./util/types";

import { PrismaClient } from "@prisma/client";

import cookieParser from "cookie-parser";

async function main() {
  const app = express();
  app.use(cookieParser());
  const httpServer = http.createServer(app);

  // Web Socket Server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql/subscriptions",
  });

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const prisma = new PrismaClient();
  const pubsub = new PubSub();

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx: SubscriptionContext): Promise<GraphQLContext> => {
        if (ctx.connectionParams && ctx.connectionParams.session) {
          const { session } = ctx.connectionParams;
          return { session, prisma, pubsub };
        }
        return { session: null, prisma, pubsub };
      },
    },
    wsServer
  );

  const corsOption = {
    origin: CLIENT_URL,
    credentials: true,
  };

  const server = new ApolloServer({
    schema,
    context: async ({ req, res }): Promise<GraphQLContext> => {
      if (!req.cookies["next-auth.session-token"])
        return { session: null, prisma, pubsub };
      const sessionToken = req.cookies["next-auth.session-token"];

      const session = (await prisma.session.findUnique({
        where: {
          sessionToken,
        },
        select: {
          user: true,
          expires: true,
        },
      })) as Session;

      return { session, prisma, pubsub };
    },
    csrfPrevention: true,
    cache: "bounded",
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },

      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });

  await server.start();
  server.applyMiddleware({ app, cors: corsOption });
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 5000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:5000${server.graphqlPath}`);
}

main().catch((err) => console.log(err));
