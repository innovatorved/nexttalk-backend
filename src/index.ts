require("dotenv").config();

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@apollo/server/express4";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { PubSub } from "graphql-subscriptions";
import { useServer } from "graphql-ws/lib/use/ws";

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";

import { PrismaClient } from "@prisma/client";

import { GraphQLContext, Session, SubscriptionContext } from "./util/types";

import cookieParser from "cookie-parser";
import cors from "cors";
import { json } from "body-parser";

import { CLIENT_URL, PORT, HOST } from "./constants";

const prisma = new PrismaClient();

async function main() {
  const app = express();
  app.use(cookieParser());

  const pubsub = new PubSub();

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

  const getSubscriptionContext = async (
    ctx: SubscriptionContext
  ): Promise<GraphQLContext> => {
    ctx;
    // ctx is the graphql-ws Context where connectionParams live
    if (ctx.connectionParams && ctx.connectionParams.session) {
      const { session } = ctx.connectionParams;
      return { session, prisma, pubsub };
    }
    // Otherwise let our resolvers know we don't have a current user
    return { session: null, prisma, pubsub };
  };

  // Save the returned server's info so we can shutdown this server later
  const serverCleanup = useServer(
    {
      schema,
      context: (ctx: SubscriptionContext) => {
        // This will be run every time the client sends a subscription request
        // Returning an object will add that information to our
        // GraphQL context, which all of our resolvers have access to.
        return getSubscriptionContext(ctx);
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
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
    ],
  });

  await server.start();
  const corsOptions = {
    origin: CLIENT_URL,
    credentials: true,
  };

  app.get('/', (req, res) => {
    res.send('App is Running!')
    return;
  })

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(corsOptions),
    json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
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

        return { session: session as Session, prisma, pubsub };
      },
    })
  );

  // Now that our HTTP server is fully set up, we can listen to it.
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT, host: HOST }, resolve)
  );
  console.log(`Server is now running on http://localhost:${PORT}/graphql`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
