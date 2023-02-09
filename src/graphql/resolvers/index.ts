import merge from "lodash.merge";

import userResolvers from "./user";
import conversationResolver from "./conversation";

const resolvers = merge({}, userResolvers, conversationResolver);

export default resolvers;
