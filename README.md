# NextTalk Backend

NextTalk is a real-time chat application that supports both individual and group chats. This is the Backend codebase of the application built using Nodejs, GraphQl and Prisma ORM. The database used is MongoDB.

Note : This is the Backend codebase of the application. The frontend codebase can be found [here](https://github.com/innovatorved/nexttalk-frontend.git) .

## Installation

To run the application locally, follow these steps:

1. Clone the repository: 

```bash
    git clone https://github.com/innovatorved/nexttalk-backend.git
```
2. Install the dependencies:

```bash
    cd nexttalk-backend
    npm install
```
3. Set up the environment variables:

```bash
    cp .env.example .env
```
4. Set up Prisma Configuration

```bash
    npx prisma generate
    npx prisma db push
```

Check the [CONFIG.md](https://github.com/innovatorved/nexttalk-backend/blob/main/CONFIG.md) file before Starting the Server.

5. Start the serve :

For Development server change the `NODE_ENV` variable in `.env` to `development` and run the following command:

```bash
    npm run dev
```
For Production server change the `NODE_ENV` variable in `.env` to `production` and run the following commands: 

```bash
    npm run build
    npm run start
```
6. Open [http://localhost:4000](http://localhost:4000) with your browser to see the result.

You can Also yse DockerFile to run the application locally 

```bash
    docker build -t nexttalk-backend .
    docker run -p 4000:8080 nexttalk-backend
```

Note : Make sure to replace the values in `.env` with your own values.

## Features

- Real-time individual chat
- Real-time group chat
- User authentication and authorization
- Ability to create, join and leave chat groups
- View list of online and offline users
- Search for users and chat groups
- Responsive design

## Tech Stack

Prisma ORM, MongoDB, GraphQl, subscriptions, Apollo Server, Nodejs

## Contributing

Contributions are welcome! Feel free to create a pull request or raise an issue. Please read the [contributing guidelines](https://github.com/innovatorved/nexttalk-backend/blob/main/CONTRIBUTING.md) before contributing.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/innovatorved/nexttalk-backend/blob/main/LICENSE) file for details.


## Authors

- [Ved Gupta](https://www.github.com/innovatorved)

## 🚀 About Me

I'm a Developer i will feel the code then write .

## Support

For support, email vedgupta@protonmail.com
