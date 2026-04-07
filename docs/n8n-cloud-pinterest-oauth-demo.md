## Goal

Set up **n8n Cloud** so Pinterest OAuth completes via a public callback (no `localhost`), then run an **interactive** workflow that publishes **one manually selected Pin** for the demo video.

## 1) Create the n8n Cloud workflow (import)

- Import `n8n/DLH-Lite-Pinterest-Publish.json` into your n8n Cloud workspace.
- Keep it **inactive** until credentials are connected and tested.

## 2) Create/connect the Pinterest OAuth credential (n8n Cloud)

In n8n Cloud:

- Go to **Credentials** → add a Pinterest OAuth / OAuth2 credential (or your existing Pinterest credential).
- When you click **Connect** (or similar), n8n will show you a **Redirect/Callback URL**.

Copy that callback URL. This is what Pinterest needs.

## 3) Add the Redirect URI in Pinterest Developer App

In the Pinterest developer portal (your app settings):

- Add the **exact** Redirect URI from step 2.
- Save.

Notes:
- Redirect URI must match exactly (scheme, host, path).
- Do not use `localhost` for this demo.

## 4) Do the OAuth connect in AdsPower (proxy environment)

For the demo video, perform the OAuth connect while your browser session is inside AdsPower:

- In n8n Cloud → Credentials → open the Pinterest credential → click **Connect**.
- The Pinterest consent screen should open in the AdsPower-controlled browser session.
- Log in and click **Allow access**.

Success criteria:
- n8n shows the credential as **Connected**.

## 5) Run the interactive publish UI (demo entrypoint)

Open the workflow's **GET Webhook URL** in a browser tab (inside AdsPower for the recording).

Behavior:
- If Pinterest credential is **not connected**, the page shows a clear “connect first” message.
- If connected, it shows a dropdown of **PENDING** rows.
- You choose **one** row and submit.

## 6) Verify the demo outputs

- The response page shows **Pin ID**.
- The selected Google Sheet row is updated to:
  - `status = PUBLISHED`
  - `pin_id = <new pin id>`
  - `published_date = <timestamp>`

## Demo video checklist (what Pinterest reviewers must see)

- Full OAuth flow: Pinterest consent screen + Allow + credential becomes connected.
- Real integration: workflow publishes a Pin via the Pinterest API.
- Manual intent: you select **one** pin explicitly (no “next pending automatically”).

