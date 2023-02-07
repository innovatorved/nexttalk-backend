require("dotenv").config();

import { ApolloServer } from "apollo-server-express";
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageLocalDefault,
} from "apollo-server-core";
import { makeExecutableSchema } from "@graphql-tools/schema";

import express from "express";
import http from "http";

import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";

import { CLIENT_URL } from "./constants";
import { GraphQLContext, Session } from "./util/types";

import { PrismaClient } from "@prisma/client";

import cookieParser from "cookie-parser";

async function main() {
  const app = express();
  app.use(cookieParser());
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const corsOption = {
    origin: CLIENT_URL,
    credentials: true,
  };

  const prisma = new PrismaClient();

  const server = new ApolloServer({
    schema,
    context: async ({ req, res }): Promise<GraphQLContext> => {
      if (!req.cookies["next-auth.session-token"])
        return { session: null, prisma };
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

      return { session, prisma };
    },
    csrfPrevention: true,
    cache: "bounded",
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });

  await server.start();
  server.applyMiddleware({ app, cors: corsOption });
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

main().catch((err) => console.log(err));
