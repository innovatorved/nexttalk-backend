import gql from "graphql-tag";

const typeDefs = gql`
  scalar Date

  type Mutation {
    createConversation(participantsIds: [String]): CreateConversationResponse
  }

  type CreateConversationResponse {
    conversationId: String
  }

  type Participant {
    id: String
    user: User
    hasSeenLatestMessage: Boolean
  }

  type Conversation {
    id: String
    participants: [Participant]
    latestMessage: Message
    createdAt: Date
    updatedAt: Date
  }

  type Query {
    conversations: [Conversation]
  }

  type Subscription {
    conversationCreated: Conversation
  }
`;

export default typeDefs;
