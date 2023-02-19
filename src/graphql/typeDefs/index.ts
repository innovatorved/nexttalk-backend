import userTypeDefs from "./user";
import conversationTypeDefs from "./conversation";
import messageTypeDefs from "./message";
import { DateTimeTypeDefinition } from "graphql-scalars";

const typeDefs = [
  userTypeDefs,
  conversationTypeDefs,
  messageTypeDefs,
  DateTimeTypeDefinition,
];

export default typeDefs;
