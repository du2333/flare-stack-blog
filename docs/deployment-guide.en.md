# Flare Stack Blog Deployment Guide

This guide helps you deploy the blog quickly and reliably to the Cloudflare platform. We provide two automated deployment options: GitHub Actions and Cloudflare Workers Builds.

## Core Configuration Preview

Before getting started, let's look at the differences between the two methods:

| Option   | Platform                  | Free Quota      | Features                                                                                             |
| :------- | :------------------------ | :-------------- | :--------------------------------------------------------------------------------------------------- |
| Option 1 | GitHub Actions            | 2000 mins/month | High flexibility, manual deployment trigger, automatic CDN cache clearing, easy subsequent updates   |
| Option 2 | Cloudflare Workers Builds | 3000 mins/month | Simple configuration, no token management required, but deployments can only be triggered via `push` |

Both quotas are generous and more than enough. GitHub Actions is completely free for public repositories; the 2000 minutes limit applies to private repositories.

---

## Phase 1: Prerequisites (Universal)

Regardless of which deployment method you choose, you must first prepare the following "infrastructure".

### 1. Fork This Repository (Required)

This is the first step for all deployments. Click the "Fork" button in the upper right corner of the repository to clone the source code into your own GitHub account.
_Only by forking to your own account will you have the permissions to configure secrets and trigger automated deployments._

### 2. Register & Enable Services

- **Cloudflare Account**: [Click here to register](https://dash.cloudflare.com/sign-up). Note: You need to add a payment method to enable R2 and Workers AI services which have generous free quotas (personal blogs usually incur no charges).
- **Domain Hosting**: Host your domain's DNS on Cloudflare. This is a prerequisite for using the free CDN and automated deployments.

### 3. Create Cloudflare Resources

Create the following resources in your Cloudflare Dashboard and record their Names / IDs:

- **R2 Bucket**: Used to store images and static resources (Record the bucket name).
- **D1 Database**: Used to store posts and configurations (Record the Database ID).
- **KV Namespace**: Used for caching (Record the Namespace ID).
- **Queues**: Used for processing asynchronous tasks (Create a queue named `blog-queue`).

### 4. Get Core Credentials (IDs)

You will need the following two IDs throughout the deployment process. You can find them on the right side of your domain's overview page (Account Home -> Your Domain):

- **Account ID**
- **Zone ID**

### 5. Create API Tokens

We need to grant the deployment scripts permission to operate on your account. Click on the top-right Avatar -> My Profile -> API Tokens -> Create Token.

#### A. CDN Purge Token (Required)

- **Template**: Use the "Edit zone DNS" template.
- **Permissions**: Zone -> Cache Purge -> Purge.
- **Resources**: Include -> All zones (or specify your domain).
- **Purpose**: Automatically force updates to the CDN cache after the app is deployed.

#### B. Deployment Token (Only required for Option 1)

- **Template**: Use the "Edit Cloudflare Workers" template.
- **Permissions**: Add more -> D1 -> Edit.
- **Resources**: Include -> All zones (or specify your domain).
- **Purpose**: Allow GitHub Actions to remotely deploy code and execute database migrations.

### 6. Create a GitHub OAuth App

To enable the GitHub login feature:

1. Go to GitHub Settings -> Developer Settings -> OAuth Apps -> New OAuth App.
2. **Homepage URL**: `https://<your-domain>`
3. **Authorization callback URL**: `https://<your-domain>/api/auth/callback/github`
4. After creation, record the **Client ID** and generate a new **Client Secret**.

---

## Phase 2: Choose a Deployment Option

### Option 1: Automated Deployment via GitHub Actions

Builds and distributes via GitHub's servers.

#### 0. Enable Actions

By default, GitHub disables Actions in forked repositories for security reasons. You must enable it in the Actions tab of your repository settings.

#### 1. Configure Repository Variables

In your GitHub repository, go to Settings -> Secrets and variables -> Actions, click "New repository secret" to add the following variables:

**A. Required Deployment Variables (Secrets - CI/CD)**
| Variable Name | Description |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | The Deployment Token from Phase 1, Step 5B |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `D1_DATABASE_ID` | Your D1 Database ID |
| `KV_NAMESPACE_ID` | Your KV Namespace ID |
| `BUCKET_NAME` | Your R2 Bucket Name |

**B. Required Runtime Configuration (Secrets - Runtime)**
| Variable Name | Description |
| :--- | :--- |
| `BETTER_AUTH_SECRET` | Run `openssl rand -hex 32` in your terminal to generate this |
| `BETTER_AUTH_URL` | Your app URL (e.g., `https://blog.example.com`) |
| `ADMIN_EMAIL` | Admin email address |
| `GH_CLIENT_ID` | GitHub OAuth Client ID |
| `GH_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `CLOUDFLARE_ZONE_ID` | Your Cloudflare Zone ID |
| `CLOUDFLARE_PURGE_API_TOKEN` | The CDN Purge Token from Phase 1, Step 5A |
| `DOMAIN` | Your blog domain (e.g., `blog.example.com`) |

**C. Optional Runtime Configuration (Secrets)**
| Variable Name | Description |
| :--- | :--- |
| `GH_TOKEN` | Used to check for version updates. To avoid GitHub API rate limits (since multiple Workers share IPs), configure a [Fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new) with default permissions. |
| `PAGEVIEW_SALT` | Salt for anonymizing pageview visitor hashes. Generate with `openssl rand -hex 16`. |
| `UMAMI_SRC` | Umami client-side tracking proxy URL (e.g., `https://cloud.umami.is`) |

**D. Optional Build-time Frontend Variables**
These variables usually go into the `Variables` tab. They start with `VITE_` and are injected into the client code.
| Variable Name | Description |
| :--- | :--- |
| `VITE_UMAMI_WEBSITE_ID` | Umami Website ID for client-side tracking (Note: This is set as a Variable, not a Secret) |

Site title, description, theme images, favicon assets, and other personalization are managed from the admin **Settings** page after you create and log into an admin account. `src/blog.config.ts` remains the seeded default/fallback source used before runtime overrides are saved.

#### 2. Trigger Deployment

Go to the Actions tab in your GitHub repository, enable workflows, and manually run the "Deploy" workflow. In the future, every time you push code to the repository, the system will automatically update the blog.

---

### Option 2: Direct Deployment via Cloudflare Dashboard

Connects your repository directly on Cloudflare Workers.

#### 1. Modify the Configuration File

Locally or on the GitHub website, duplicate `wrangler.example.jsonc` and rename it to `wrangler.jsonc`. Replace the IDs and names inside it with your own.

```jsonc
{
  "keep_vars": true, // Do not clear runtime variables on every build
  "routes": [
    { "pattern": "blog.example.com", "custom_domain": true }
  ],
  "d1_databases": [
    { "binding": "DB", "database_id": "YOUR-D1-ID", ... }
  ],
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "YOUR-R2-NAME", ... }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "YOUR-KV-ID", ... }
  ]
}
```

#### 2. Create and Connect Project

1. In the Cloudflare Dashboard, go to Workers & Pages -> Create application -> Pages -> Connect to Git.
2. Select your repository and configure the build settings:
   - **Framework preset**: `None`
   - **Build command**: `bun run build`
   - **Deploy command**: `bun run deploy`
3. Add Environment Variables:
   - In the build configuration, add `BUN_VERSION`: `1.3.5`.
   - Add frontend variables only when needed, for example `VITE_UMAMI_WEBSITE_ID` or `VITE_TURNSTILE_SITE_KEY`.

#### 3. Configure Runtime Variables

After the initial deployment is complete, go to the Worker's Settings -> Variables and Secrets. Click "Add secret" and fill in sensitive configurations like `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `ADMIN_EMAIL`, etc. Check the "Required Runtime Configuration" table from Option 1 for details.

**Important Note on Variable Names**: In the Cloudflare Dashboard, GitHub variable names must use their full names instead of `GH_`:

- `GH_CLIENT_ID` → `GITHUB_CLIENT_ID`
- `GH_CLIENT_SECRET` → `GITHUB_CLIENT_SECRET`
- `GH_TOKEN` → `GITHUB_TOKEN`

**CDN Caching**: Because Option 2 does not use GitHub Actions, it will not automatically purge the CDN cache. After every new deployment, please manually click "Clear CDN Cache" in your blog's admin "Settings" page. (If you haven't registered an admin account yet and pages are missing styles, clear the cache directly in the Cloudflare dashboard).

---

## Phase 3: Optional Advanced Configuration

### 1. Image Optimization (Cloudflare Images)

Enable [Image Resizing](https://developers.cloudflare.com/images/) for your domain in your Dashboard. You get 5000 free transform requests per month, which drastically improves blog image loading speeds.

### 2. Email System (Resend)

Register on [Resend](https://resend.com/) and bind your domain (we recommend using a subdomain).

- Get the API Key and fill it into your blog admin's "Settings" page.
- Once enabled, your blog supports: Password login, verification codes, and comment reply email notifications.

### 3. CAPTCHA / Bot Protection (Cloudflare Turnstile)

Go to the Cloudflare Turnstile page and create a Widget. Record the Site Key and Secret Key. Fill them in:

- `VITE_TURNSTILE_SITE_KEY` - Build-time variable (Repository Variable)
- `TURNSTILE_SECRET_KEY` - Runtime variable (Repository Secret)
  _Redeploy to take effect._

### 4. Blog Information & Favicon

**Blog Identity**: After your first admin login, open the admin **Settings** page to edit the site title, description, author, social links, and theme assets.
**Favicon**: Generate favicon assets with a tool such as [Real Favicon Generator](https://realfavicongenerator.net/), then upload the generated files from the admin **Settings** page instead of replacing files in `public/`.

---

## Phase 4: Maintenance & Updates

### Syncing Upstream Updates

When the admin panel notifies you of a new version (or if you manually check the GitHub repository):

1. Go to the homepage of your Forked repository.
2. Click **Sync fork** -> **Update branch**.
3. **Automated deployment**:
   - Option 1: GitHub Actions will detect the code update and trigger a deployment automatically.
   - Option 2: Cloudflare will automatically detect the new GitHub commit and begin building.

_About merge conflicts:_ This project has abstracted all personalized configurations into environment variables. Directly syncing upstream code usually won't result in any merge conflicts.

---

## Frequently Asked Questions (FAQ)

### 1. The deployment succeeded, but the webpage won't open or actions error out?

If the deployment succeeds without errors but you see errors (like 500 or a blank screen) when visiting:

- **Check the console**: Press F12 to open Developer Tools and check the Console tab for errors.
- **View Live Logs**: In the Cloudflare Dashboard, go to your Worker project -> Observability -> Live. Open your blog in another tab while this is running to capture real-time errors. This usually tells you exactly which environment variable is missing or misconfigured.
- **Check environment variables**: The vast majority of "won't load" issues are caused by incorrectly configured environment variables.

### 2. What is the difference between Build-time vs Runtime variables?

Since this is a full-stack project, there are two types of variables:

- **Build-time variables**: Starting with `VITE_`. These are "hardcoded" into the client script when the project is bundled. If they are wrong, you MUST trigger a new build/deployment for fixes to take effect.
- **Runtime variables**: Read by the server code during execution. These are used in server-side logic dynamically.
  In Option 1 (GitHub Actions), you just put everything into your GitHub Secrets/Variables and the pipeline sorts them. In Option 2 (Cloudflare Dashboard), you put Build variables in Settings -> Build -> Variables, and Runtime variables in Settings -> Variables and Secrets.

### 3. How do I configure analytics?

The system has built-in pageview statistics (using Cloudflare Queue + D1). The admin dashboard shows traffic overview, and the homepage displays popular posts. Optionally set `PAGEVIEW_SALT` to strengthen visitor hash anonymization.

Optionally, you can also use Umami for client-side tracking by setting `UMAMI_SRC` and `VITE_UMAMI_WEBSITE_ID`:

```bash
UMAMI_SRC=https://cloud.umami.is
VITE_UMAMI_WEBSITE_ID=your-website-id
```

### 4. I published a post, why isn't it showing on the frontend?

The publish button only triggers the backend to actually publish the post if its status is set to "Published" AND the publish time is earlier than the current time. If the publish time is set in the future, a background task will execute at that future point.

### 5. How do I unpublish an already published post?

Change its status from "Published" to "Draft", and the "Publish" button will turn into an "Unpublish" button.

### 6. How do I configure things like background images in certain themes?

Use the admin **Settings** page for day-to-day site personalization. If you are developing or extending a theme, check `src/blog.config.ts` for seeded defaults and the site-config schema/theme guide for the runtime fields that can be overridden from admin.
