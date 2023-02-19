import { gql } from "apollo-server-core";

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
    latestMessageId: String!
    createdAt: Date
    updatedAt: Date
  }

  type Query {
    conversations: [Conversation]
  }
`;

export default typeDefs;
