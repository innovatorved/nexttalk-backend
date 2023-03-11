import gql from "graphql-tag";

const typeDefs = gql`
  scalar Date

  type Mutation {
    createConversation(participantsIds: [String]): CreateConversationResponse
  }

  type Mutation {
    markConversationAsRead(userId: String!, conversationId: String!): Boolean
  }

  type Mutation {
    deleteConversation(conversationId: String!): Boolean
  }

  type Mutation {
    updateParticipants(
      conversationId: String!
      participantIds: [String]!
    ): Boolean
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

  type ConversationUpdatedSubscriptionPayload {
    conversation: Conversation
    addedUserIds: [String]
    removedUserIds: [String]
  }

  type ConversationDeletedResponse {
    id: String
  }

  type Query {
    conversations: [Conversation]
  }

  type Subscription {
    conversationCreated: Conversation
  }

  type Subscription {
    conversationUpdated: ConversationUpdatedSubscriptionPayload
  }

  type Subscription {
    conversationDeleted: ConversationDeletedResponse
  }
`;

export default typeDefs;
