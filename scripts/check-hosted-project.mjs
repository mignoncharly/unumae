#!/usr/bin/env node

const projectRef = process.env.SUPABASE_PROJECT_REF;
const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const token = process.env.SUPABASE_ACCESS_TOKEN;
const maximumDiskRatio = Number(process.env.MAXIMUM_DISK_RATIO ?? '0.8');
if (!/^[a-z0-9]{20}$/.test(projectRef ?? '') || !projectUrl || !token) {
  throw new Error(
    'SUPABASE_PROJECT_REF, SUPABASE_URL, and SUPABASE_ACCESS_TOKEN are required.'
  );
}

const management = async (path) => {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok)
    throw new Error(`Management API ${path}: HTTP ${response.status}`);
  return response.json();
};

const warm = await fetch(`${projectUrl}/auth/v1/health`, {
  signal: AbortSignal.timeout(20_000),
});
if (!warm.ok)
  throw new Error(`Hosted Auth health check failed: HTTP ${warm.status}`);

await management('/health?services=db,auth,storage&timeout_ms=20000');
const disk = await management('/config/disk/util');
const size = Number(disk.metrics?.fs_size_bytes ?? 0);
const used = Number(disk.metrics?.fs_used_bytes ?? 0);
if (!(size > 0) || !(used >= 0))
  throw new Error('Disk utilization response was incomplete.');
const ratio = used / size;
console.log(
  `Project ${projectRef}: services healthy; database disk ${(ratio * 100).toFixed(1)}% used.`
);
if (ratio >= maximumDiskRatio) {
  throw new Error(
    `Database disk utilization exceeds ${(maximumDiskRatio * 100).toFixed(0)}%.`
  );
}
