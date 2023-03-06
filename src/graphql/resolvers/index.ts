import merge from "lodash.merge";

import userResolvers from "./user";
import conversationResolver from "./conversation";
import messageResolver from "./message";
import scalarsResolver from "./scalars";

const resolvers = merge(
  {},
  userResolvers,
  conversationResolver,
  messageResolver,
  scalarsResolver
);

export default resolvers;
