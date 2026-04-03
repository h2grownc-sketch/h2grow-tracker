# H2 Grow Job Tracker — Setup Guide

Follow these steps in order. Total time: about 15-20 minutes.

---

## STEP 1: Create Your Accounts

### GitHub (where your code lives)
1. Go to **github.com**
2. Click **Sign Up**
3. Use your H2GrowNC@gmail.com email
4. Pick a username like `h2grownc`
5. Confirm your email from inbox

### Vercel (where your website runs)
1. Go to **vercel.com**
2. Click **Sign Up**
3. Choose **"Continue with GitHub"**
4. Authorize the connection — done

---

## STEP 2: Set Up Google Sheets (Your Database)

### Create the spreadsheet
1. Go to **sheets.google.com** (logged into H2GrowNC@gmail.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it **"H2 Grow Job Tracker"**

### Add the backend script
1. In your new spreadsheet, click **Extensions > Apps Script**
2. This opens a code editor in a new tab
3. **Delete everything** in the editor
4. Open the file called `google-apps-script.js` from this project
5. **Copy the entire contents** and paste into the Apps Script editor
6. Click the **floppy disk icon** (or Ctrl+S) to save
7. Name the project "H2 Grow Tracker" when asked

### Deploy the script
1. Click **Deploy > New Deployment** (top right)
2. Click the gear icon next to "Type" and select **Web app**
3. Description: "H2 Grow Tracker"
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Click **Deploy**
7. It will ask you to authorize — click through and allow access
8. **COPY THE URL** it gives you — you'll need this in Step 4
   - It looks like: `https://script.google.com/macros/s/ABC123.../exec`
   - Save this somewhere — text it to yourself

---

## STEP 3: Upload Code to GitHub

### Create a new repository
1. Go to **github.com** (make sure you're logged in)
2. Click the **+** icon (top right) > **New repository**
3. Name it: `h2grow-tracker`
4. Keep it **Public** (required for free Vercel hosting)
5. Check **"Add a README file"**
6. Click **Create repository**

### Upload the project files
1. In your new repository, click **"Add file" > "Upload files"**
2. Drag and drop ALL the files from this project folder:
   - `package.json`
   - `next.config.js`
   - `.gitignore`
   - `app/` folder (contains `globals.css`, `layout.js`, `page.js`)
   - `lib/` folder (contains `sheets.js`)
   - `public/` folder (contains `manifest.json`)
3. **DO NOT upload** `google-apps-script.js` — that stays local
4. Click **"Commit changes"**

**TIP:** If the folder upload doesn't work, you can create each file manually:
- Click "Add file" > "Create new file"
- For files in folders, type the path like `app/page.js` and it creates the folder automatically
- Paste the file contents and commit

---

## STEP 4: Deploy to Vercel

1. Go to **vercel.com/new**
2. It will show your GitHub repositories — click **Import** next to `h2grow-tracker`
3. In the configuration screen:
   - Framework: should auto-detect **Next.js**
   - Open **"Environment Variables"**
   - Add one variable:
     - Name: `NEXT_PUBLIC_APPS_SCRIPT_URL`
     - Value: *paste the Google Apps Script URL from Step 2*
   - Click **Add**
4. Click **Deploy**
5. Wait 1-2 minutes for it to build
6. When done, Vercel gives you a URL like `h2grow-tracker.vercel.app`

**That's your dashboard!** Open it on your phone and bookmark it.

---

## STEP 5: Add to Your Phone Home Screen

### iPhone
1. Open the URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "H2 Grow" and tap Add

### Android
1. Open the URL in Chrome
2. Tap the **three dots** menu
3. Tap **"Add to Home Screen"**
4. Name it "H2 Grow" and tap Add

Send the same URL to Tate so he can do the same thing.

---

## STEP 6: Share With Tate

Just text Tate the Vercel URL. He opens it, bookmarks it, adds to home screen.
He'll see the same data you do — the Schedule tab is his weekly view.

---

## Troubleshooting

**"No jobs showing up"**
- Make sure your Apps Script URL is correct in Vercel environment variables
- Make sure you deployed the Apps Script as a Web App with "Anyone" access

**"Changes not saving"**
- Check that the Apps Script is deployed (not just saved)
- Open your Google Sheet — you should see a "Jobs" tab being created

**"Build failed on Vercel"**
- Check that all files are uploaded with the correct folder structure
- Make sure `package.json` is in the root, not inside a subfolder

**Need to update the Apps Script URL?**
- Go to vercel.com > your project > Settings > Environment Variables
- Update the URL, then redeploy (Deployments tab > three dots > Redeploy)

---

## Custom Domain (Optional, Later)

If you want it at something like `tracker.h2grownc.com`:
1. In Vercel, go to your project > Settings > Domains
2. Add `tracker.h2grownc.com`
3. In your GoDaddy DNS, add a CNAME record pointing to `cname.vercel-dns.com`
4. Wait a few minutes for DNS to propagate
