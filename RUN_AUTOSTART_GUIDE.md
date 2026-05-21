# CloudDrive Lumina — Auto-Start & Background Run Guide (Windows)

This guide shows you how to set up the dashboard to run automatically in the background when your computer turns on, survive crashes/reloads silently on code changes, and remain accessible via Tailscale on any other PC.

---

## Prerequisites (One-time setup on a new PC)

1. **Install Node.js**: Download and install Node.js from [nodejs.org](https://nodejs.org/).
2. **Install Tailscale**: Download and sign in to Tailscale on both this host PC and any client devices.

---

## Step 1: Install PM2 Globally

PM2 is the production process manager that keeps your server and client running in the background.

Open PowerShell or Command Prompt as Administrator and run:
```bash
npm install -g pm2
```

---

## Step 2: Configure PM2 for the Project

1. Navigate to the root folder of this project:
   ```bash
   cd d:\web-projectttttttttttt
   ```
   *(Replace with the actual folder path on the new PC)*

2. Start the ecosystem configuration:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. Save the running state so it is remembered:
   ```bash
   pm2 save
   ```

---

## Step 3: Configure Automatic Boot Persistence

Since Windows does not have native PM2 startup scripts, we use a lightweight, silent VBScript in the Windows Startup directory to automatically restore the servers on boot.

1. Press `Win + R`, type `shell:startup`, and press Enter. This will open the Windows **Startup folder** in File Explorer.
2. In that folder, create a new text file named `start-pm2.vbs`.
3. Open it in Notepad and paste the following content:
   ```vbs
   Set WshShell = CreateObject("WScript.Shell")
   WshShell.Run "cmd.exe /c pm2 resurrect", 0, False
   ```
4. Save and close the file. 

*(From now on, whenever the PC boots up and you log in, both your backend server and React client will start silently in the background!)*

---

## Step 4: Set Up Tailscale Remote Access

To access the server from other devices on your Tailscale network:

1. Open PowerShell and run:
   ```bash
   tailscale serve --bg 5173
   ```
   *(This configures Tailscale to route traffic from your machine's Tailnet URL directly to the frontend server running on port 5173. The Tailscale daemon will persist this background rule automatically even after rebooting!)*

2. Get your PC's Tailscale domain:
   ```bash
   tailscale status
   ```
3. Type the tailnet URL (e.g. `http://your-pc.tailnet-name.ts.net`) into the browser of any phone, tablet, or laptop connected to your Tailscale network!

---

## Useful PM2 Commands for Daily Management

Since the app runs invisibly in the background, use these commands in a terminal to check on them:

* **View Status / Memory / CPU Usage**:
  ```bash
  pm2 status
  ```
* **View Live Consolidated Logs**:
  ```bash
  pm2 logs
  ```
* **Restart the Backend Server**:
  ```bash
  pm2 restart clouddrive-server
  ```
* **Stop everything completely**:
  ```bash
  pm2 stop all
  ```
