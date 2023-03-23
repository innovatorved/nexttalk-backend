
# Config
Prisma Doesnot have a support for unique key on sparse field. So we need to create a unique index with sparse field manually.

## Create a Sparse Index for the username field

```
db.User.createIndex( { username: 1 }, { sparse: true, unique: true } )
db.Conversation.createIndex( { latestMessageId: 1 }, { sparse: true, unique: true } )
```

## And Delete these two indexes from the database using Mongodb 
```
db.User.dropIndex( "User_username_key" )
db.Conversation.dropIndex( "Conversation_latestMessageId_key" )
```

Note : if you use `npx prisma db push` again in any scenario, it will create the indexes automatically. So you need to delete and create them manually and So you need to run both command again.