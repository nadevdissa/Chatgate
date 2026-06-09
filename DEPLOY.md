# Deploy ChatGate Online

ChatGate needs a Node.js server running 24/7. The easiest free option is **Render**.

## Step 1 — Put your code on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create a repo named `chatgate` (leave it empty)
3. In your project folder, run:

```bash
cd "/Users/gayandissanayake/website project"
git init
git add .
git commit -m "ChatGate multi-user chat app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chatgate.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 2 — Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New +** → **Blueprint**
3. Connect your GitHub account
4. Select the `chatgate` repository
5. Render will read `render.yaml` automatically
6. Click **Apply** and wait 2–3 minutes

When it finishes, you get a URL like:

`https://chatgate-xxxx.onrender.com`

Share that link — anyone in the world can sign up and chat.

## Step 3 — Test it

1. Open your Render URL
2. Create an account
3. Open the same URL on your phone or another computer
4. Create a second account
5. Send a friend request and start chatting

## Keep the server awake (free plan)

Render’s free plan sleeps after 15 minutes of no traffic. The first visit after sleep may take ~30 seconds to load. Upgrading to a paid plan ($7/mo) keeps it always on.

## Data storage note

User accounts and messages are saved on the server. On the free plan, data can reset if Render redeploys your app. For a school project or demo this is usually fine. For permanent storage, upgrade Render or add a database later.

## Run locally (for testing)

```bash
npm install
npm start
```

Open http://localhost:3000
