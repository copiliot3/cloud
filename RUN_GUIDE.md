# CloudDrive Lumina — Running Guide

Follow these steps to run the dashboard and enable remote access via Tailscale.

## 1. Running the Project

You need to run both the **Backend** and the **Frontend** in two separate terminals.

### Terminal A: Backend (Server)
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Start the development server (with auto-restart):
   ```bash
   npm run dev
   ```
   *Note: This uses `nodemon`, so the server will automatically restart whenever you save a file in the server directory.*

### Terminal B: Frontend (Client)
1. Navigate to the client directory:
   ```bash
   cd client
   ```   for stoping server    ::::  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. The dashboard will be available at `http://localhost:5173`.

---
npx -y localtunnel --port 5173 for running and makeing public of frontend 
## 2. How to Restart the Server

If you need to manually restart the backend server:
*   **In the Backend Terminal:** Type `rs` and press `Enter`.
*   **Or:** Press `Ctrl + C` to stop the server, then run `npm run dev` again.

---

## 3. Remote Access via Tailscale

To access your local dashboard from any other device (phone, laptop) using Tailscale:

1.  **Install Tailscale**: Download and sign in on your Windows machine and your other devices.
2.  **Expose the Frontend**:
    In a new terminal, run the following command:
    ```bash
    tailscale serve --bg 5173
    ```
3.  **Access Remotely**:
    *   Find your machine's Tailscale name (e.g., `my-pc.tailnet-name.ts.net`).
    *   On your other device, simply go to `http://my-pc.tailnet-name.ts.net` in the browser.
    *   Tailscale will automatically route the traffic to your local Vite server.

> [!TIP]
> Make sure your Backend is running in its own terminal, otherwise the Frontend won't be able to fetch any files!
