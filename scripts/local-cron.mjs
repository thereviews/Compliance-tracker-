import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { readFileSync } from 'node:fs';

loadEnvConfig(process.cwd(), true);

const config = JSON.parse(
  readFileSync('vercel.json', 'utf8')
);

const jobs = config.crons ?? [];
const secret = process.env.CRON_SECRET;
const baseUrl = (
  process.env.LOCAL_CRON_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

if (!secret) {
  console.error('CRON_SECRET is missing from the development environment.');
  process.exit(1);
}

if (jobs.length === 0) {
  console.error('No cron jobs found in vercel.json.');
  process.exit(1);
}

const lastRun = new Map();
const running = new Set();

function matchesDailySchedule(schedule, now) {
  const parts = schedule.trim().split(/\s+/);

  if (
    parts.length !== 5 ||
    parts[2] !== '*' ||
    parts[3] !== '*' ||
    parts[4] !== '*'
  ) {
    throw new Error(`Unsupported local cron schedule: ${schedule}`);
  }

  const [minute, hour] = parts;

  return (
    Number(minute) === now.getUTCMinutes() &&
    Number(hour) === now.getUTCHours()
  );
}

async function runJob(job, runKey) {
  if (running.has(job.path)) {
    console.log(`[SKIP] ${job.path} is already running.`);
    return;
  }

  running.add(job.path);

  console.log(`[START] ${new Date().toISOString()} ${job.path}`);

  try {
    const response = await fetch(`${baseUrl}${job.path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(600000),
    });

    const body = await response.text();

    console.log(
      `[DONE] ${job.path} HTTP ${response.status}: ${body}`
    );

    if (!response.ok) {
      console.error(`[ERROR] ${job.path} returned HTTP ${response.status}.`);
    }
  } catch (error) {
    console.error(`[ERROR] ${job.path}: ${error.message}`);
    console.error(
      'The request outcome may be uncertain. It will not be retried automatically.'
    );
  } finally {
    running.delete(job.path);
    lastRun.set(job.path, runKey);
  }
}

console.log('Local ComplianceTracker scheduler started.');
console.log(`Target server: ${baseUrl}`);
console.log('Schedules loaded from vercel.json:');

for (const job of jobs) {
  console.log(`  ${job.schedule} UTC -> ${job.path}`);
}

if (process.argv.includes('--run-now')) {
  console.log('Manual run requested.');
  for (const job of jobs) {
    void runJob(job, `manual-${Date.now()}`);
  }
} else {
  console.log('Waiting for scheduled execution. Keep this process running.');

  function checkSchedules() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

    for (const job of jobs) {
      try {
        if (!matchesDailySchedule(job.schedule, now)) {
          continue;
        }

        const runKey = `${date} ${job.schedule}`;

        if (lastRun.get(job.path) === runKey) {
          continue;
        }

        lastRun.set(job.path, runKey);
        void runJob(job, runKey);
      } catch (error) {
        console.error(`[SCHEDULE ERROR] ${job.path}: ${error.message}`);
      }
    }
  }

  checkSchedules();
  setInterval(checkSchedules, 15000);
}
