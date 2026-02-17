# Google Sheets Sync Setup (Option B)

Sync CRM data (RMA and DTR cases) to a Google Sheet so stakeholders can view updates without using the CRM.

## 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a **new blank spreadsheet**.
2. Copy the **Spreadsheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Paste `SPREADSHEET_ID` into your `.env` as `GOOGLE_SHEET_ID`.

You do **not** need to create tabs manually. The sync will create two sheets: **"RMA Cases"** and **"DTR Cases"**.

## 2. Google Cloud: Service Account & JSON Key

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create a project (or select one) and enable **Google Sheets API**:
   - **APIs & Services** → **Enable APIs and Services** → search **Google Sheets API** → **Enable**.
3. Create a **Service Account**:
   - **APIs & Services** → **Credentials** → **Create Credentials** → **Service Account**.
   - Give it a name (e.g. "CRM Sync"), then **Create and Continue**. Skip optional steps and **Done**.

### 2a. Get the JSON key (Console)

Google still provides a JSON key file; the menu is under the service account’s **Keys** tab.

1. Go to [Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Select your **project** (top bar).
3. Click the **email** of the service account you created (e.g. `crm-sync@...iam.gserviceaccount.com`).
4. Open the **Keys** tab.
5. Click **Add key** → **Create new key**.
6. Choose **JSON** → **Create**.  
   A JSON file will **download** (you can’t download it again later).
7. Save the file somewhere safe (e.g. `backend/config/google-sheets-key.json`). **Do not commit it to git.**

If you don’t see **Add key** or **Create new key**, your organization may have disabled service account key creation. Use **2b** with the gcloud CLI (if you have permission) or ask your Google Cloud admin.

### 2b. Get the JSON key (gcloud CLI, if Console doesn’t work)

If the Console doesn’t show key creation or you prefer the command line:

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and run:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
2. Create and download the key (replace with your service account email):
   ```bash
   gcloud iam service-accounts keys create ./google-sheets-key.json \
     --iam-account=YOUR_SERVICE_ACCOUNT_EMAIL@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
   Example:
   ```bash
   gcloud iam service-accounts keys create ./google-sheets-key.json \
     --iam-account=crm-sync@my-project.iam.gserviceaccount.com
   ```
3. The file `google-sheets-key.json` is created in the current directory. Move it to a safe place (e.g. `backend/config/`) and **do not commit it to git**.

## 3. Share the Sheet with the Service Account

1. In the JSON file, find `client_email` (e.g. `crm-sync@your-project.iam.gserviceaccount.com`).
2. Open your Google Sheet → Share.
3. Add that email as an **Editor**. Leave "Notify people" unchecked if you prefer.
4. Save. The service account can now write to the sheet.

## 4. Configure the Backend

**Option A – Key file (recommended for local / VM)**

In `.env`:

```env
GOOGLE_SHEET_ID="your_spreadsheet_id_here"
GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your-service-account-key.json"
```

**Option B – Inline JSON (e.g. serverless)**

Set `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_CREDENTIALS_JSON` to the **entire** JSON key content as a single line (escape quotes as needed). Leave `GOOGLE_APPLICATION_CREDENTIALS` unset.

## 5. Triggering a Sync

- **Who:** Only users with **manager** or **admin** role can sync.
- **Endpoint:** `POST /api/sync/google-sheet`  
  - Send the request with a valid JWT in the `Authorization: Bearer <token>` header.
- **Status:** `GET /api/sync/google-sheet/status`  
  - Returns whether sync is configured (no secrets in the response).

**Scheduling (optional)**  
Use a cron job or cloud scheduler to call `POST /api/sync/google-sheet` with an admin/manager token (e.g. create an API key or use a dedicated service user) so the sheet updates on a schedule (e.g. daily).

## 6. What Gets Synced

- **RMA Cases** tab: Up to 5,000 most recent RMA cases (Id, Call Log #, RMA #, Type, Status, dates, Site, Product, Part, Serial, Assigned To, etc.).
- **DTR Cases** tab: Up to 5,000 most recent DTR cases (Id, Case #, Error Date, Site, Unit Model/Serial, Nature of Problem, Status, Severity, Assigned To, Closed By/Date, etc.).

Each sync **replaces** the data in those two tabs with the current CRM data.
