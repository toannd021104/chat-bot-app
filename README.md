Create a Chat App using AWS Amplify and Cognito (with CI/CD)
============================================================

This repository contains the commands and code used in this [YouTube Video](https://www.youtube.com/watch?v=ma1FA2be8Ac), modified to create a Chat Application instead of a Quiz App.
Terminal Commands
-----------------

Here are the terminal commands in order of appearance of the video.

`npm install -g @aws-amplify/cli`

`amplify configure`

`npx create-react-app <name of your app>`

`cd <name of your app>`

`amplify init`

`amplify add auth`

`amplify push`

`npm install aws-amplify @aws-amplify/ui-react lucide-react`

`npm install lucide-react`

`npm install -D tailwindcss@3.0.4 postcss autoprefixer`

`npx tailwindcss init`

`npm start`

### Git Commands 

`git init`

`git add .`

`git commit -m "Initial commit"`

`git branch -M main`

`git remote add origin <repository URL>`

`git push -u origin main`

Code Files
----------

-   **App.js**: The React application that's configured to use Cognito for authentication
-   **ChatApp.js**: The main Chat component with messaging functionality

Features
--------

-   🔐 **User Authentication** with AWS Cognito
-   💬 **Real-time Chat Interface** with message history
-   📁 **File Upload Support** with preview
-   🗨️ **Multiple Conversations** management
-   📱 **Responsive Design** with modern UI
-   🚀 **CI/CD Ready** with AWS Amplify hosting

Chat App Functionality
----------------------

-   User login/logout with AWS Cognito
-   Send and receive messages
-   File attachment support
-   Conversation management (create new, switch between conversations)
-   Message timestamps
-   Loading states and animations
-   Responsive sidebar with user profile

Technologies Used
-----------------

-   React 19
-   AWS Amplify
-   AWS Cognito
-   Lucide React (for icons)
-   Tailwind CSS 3.0.4 (for styling)
