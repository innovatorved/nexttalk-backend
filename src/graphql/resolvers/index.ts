import merge from "lodash.merge";

import userResolvers from "./user";
import conversationResolver from "./conversation";
import scalarsResolver from "./scalars";

const resolvers = merge(
  {},
  userResolvers,
  conversationResolver,
  scalarsResolver
);

export default resolvers;
