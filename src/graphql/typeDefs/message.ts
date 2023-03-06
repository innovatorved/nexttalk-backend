import gql from "graphql-tag";

const typeDefs = gql`
  type Message {
    id: String
    sender: User
    senderId: String
    body: String
    createdAt: Date
  }

  type Query {
    messages(conversationId: String): [Message]
  }

  type Mutation {
    sendMessage(
      id: String
      conversationId: String
      senderId: String
      body: String
    ): Boolean
  }

  type Subscription {
    messageSend(conversationId: String): Message
  }
`;

export default typeDefs;
