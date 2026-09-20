import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\832c4294-bcd5-4d9f-a792-7663799991d4\\scratch\\screenshots";

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const pages = [
  { name: "home", url: "http://localhost:3000/" },
  { name: "predictor", url: "http://localhost:3000/predictor" },
  { name: "results", url: "http://localhost:3000/results?percentile=92.5&score_type=MHT-CET&seat_type=GOPENH" },
  { name: "compare", url: "http://localhost:3000/compare?colleges=1,2" },
  { name: "colleges_dir", url: "http://localhost:3000/colleges" },
  { name: "college_detail", url: "http://localhost:3000/colleges/1" },
  { 
    name: "admin", 
    url: "http://localhost:3000/admin",
    setup: async (page) => {
      await page.evaluate(() => {
        const authData = {
          userId: "admin_superuser",
          role: "admin",
          name: "System Administrator",
          adminKey: "admin_secret_key_123"
        };
        localStorage.setItem("cp_user_auth", JSON.stringify(authData));
        localStorage.setItem("cp_admin_key", "admin_secret_key_123");
      });
    }
  },
  { 
    name: "dashboard", 
    url: "http://localhost:3000/dashboard",
    setup: async (page) => {
      await page.evaluate(() => {
        const dummySession = {
          access_token: "mock_jwt_token_for_dashboard",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "dummy_refresh",
          user: {
            id: "usr_test_student_1",
            aud: "authenticated",
            role: "authenticated",
            email: "aarav.sharma@candidate.edu",
            user_metadata: { full_name: "Aarav Sharma" },
            created_at: "2026-01-15T10:00:00.000Z"
          }
        };
        localStorage.setItem("cp_supabase_session", JSON.stringify(dummySession));
        localStorage.setItem("cp_user_auth", JSON.stringify({
          userId: "usr_test_student_1",
          role: "user",
          name: "Aarav Sharma"
        }));
      });
    }
  }
];

async function run() {
  console.log("Launching headless Chrome from:", chromePath);
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    for (const p of pages) {
      try {
        console.log(`Navigating to ${p.name} (${p.url})...`);
        // Navigate once to allow localStorage evaluation if needed
        if (p.setup) {
          await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 15000 });
          await p.setup(page);
          await page.reload({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
        } else {
          await page.goto(p.url, { waitUntil: "networkidle", timeout: 15000 }).catch(async () => {
            await page.waitForTimeout(1500);
          });
        }

        await page.waitForTimeout(1000);

        const filename = `${p.name}_${vp.name}.png`;
        const filePath = path.join(outDir, filename);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`Saved screenshot: ${filename}`);
      } catch (err) {
        console.error(`Error capturing ${p.name} on ${vp.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll visual captures finished successfully!");
}

run().catch(console.error);
