// Security Scanner for Code Containers
import type { APIContext } from 'astro';

const SECURITY_RULES = {
  // Dangerous patterns to detect
  dangerousPatterns: [
    // Command injection
    { pattern: /exec\s*\([^)]*\$|system\s*\([^)]*\$|shell_exec\s*\(/gi, severity: 'high', message: 'Potential command injection vulnerability' },
    { pattern: /eval\s*\(|Function\s*\(/gi, severity: 'high', message: 'Dynamic code execution detected' },

    // SQL injection
    { pattern: /\$_(GET|POST|REQUEST)\s*\[[^]]+\]\s*[^;]*;?\s*(SELECT|INSERT|UPDATE|DELETE)/gi, severity: 'high', message: 'Potential SQL injection vulnerability' },

    // File system access
    { pattern: /file_get_contents\s*\([^)]*\$|fopen\s*\([^)]*\$|readfile\s*\([^)]*\$/gi, severity: 'medium', message: 'Unrestricted file access detected' },
    { pattern: /fs\.readFile|fs\.writeFile|fs\.unlink/gi, severity: 'medium', message: 'File system operations detected' },

    // Network requests
    { pattern: /curl\s+|wget\s+|fetch\s*\(/gi, severity: 'medium', message: 'External network requests detected' },

    // Sensitive data exposure
    { pattern: /(password|secret|key|token)\s*[:=]\s*['"]/gi, severity: 'high', message: 'Hardcoded secrets detected' },
    { pattern: /api[_-]?key\s*[:=]|secret[_-]?key\s*[:=]/gi, severity: 'high', message: 'API key exposure detected' },

    // Crypto vulnerabilities
    { pattern: /md5\s*\(|sha1\s*\(/gi, severity: 'medium', message: 'Weak cryptographic hash detected' },

    // Path traversal
    { pattern: /\.\.\/|\.\.\\|\.\.\%2F/gi, severity: 'high', message: 'Path traversal attempt detected' },

    // XSS vulnerabilities
    { pattern: /innerHTML\s*=|document\.write\s*\(/gi, severity: 'medium', message: 'Potential XSS vulnerability' },

    // Dangerous functions
    { pattern: /unserialize\s*\(|pickle\.loads\s*\(/gi, severity: 'high', message: 'Unsafe deserialization detected' }
  ],

  // Dependency vulnerabilities (simplified)
  vulnerableDependencies: {
    'express': { versions: ['<4.17.1'], severity: 'medium', message: 'Express version has known vulnerabilities' },
    'lodash': { versions: ['<4.17.12'], severity: 'high', message: 'Lodash prototype pollution vulnerability' },
    'minimist': { versions: ['<1.2.2'], severity: 'medium', message: 'Minimist prototype pollution vulnerability' },
    'serialize-javascript': { versions: ['<3.1.0'], severity: 'high', message: 'XSS vulnerability in serialize-javascript' },
    'node-forge': { versions: ['<0.10.0'], severity: 'high', message: 'Cryptographic vulnerabilities in node-forge' }
  },

  // File type restrictions
  restrictedFiles: [
    { pattern: /\.(exe|bat|cmd|sh|ps1|vbs|scr)$/i, message: 'Executable files not allowed' },
    { pattern: /\.(dll|so|dylib)$/i, message: 'Binary libraries not allowed' },
    { pattern: /\.(sql|db|sqlite)$/i, message: 'Database files not allowed in source code' }
  ]
};

// Scan container code for security issues
export async function POST({ request, locals }: APIContext) {
  const { DB, R2 } = locals.runtime.env;

  try {
    const { containerId, userId, codeFiles } = await request.json();

    if (!containerId || !userId) {
      return new Response(JSON.stringify({
        error: 'Container ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify container ownership
    const container = await DB.prepare(`
      SELECT * FROM code_containers WHERE id = ? AND user_id = ?
    `).bind(containerId, userId).first();

    if (!container) {
      return new Response(JSON.stringify({
        error: 'Container not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let filesToScan = codeFiles;

    // If no files provided, fetch from R2
    if (!filesToScan) {
      filesToScan = {};
      const objects = await R2.list({ prefix: `containers/${containerId}/` });

      for (const object of objects.objects) {
        const content = await R2.get(object.key);
        if (content) {
          const filename = object.key.replace(`containers/${containerId}/`, '');
          filesToScan[filename] = await content.text();
        }
      }
    }

    // Perform security scan
    const scanResults = await performSecurityScan(filesToScan);
    const now = Math.floor(Date.now() / 1000);

    // Store scan results
    await DB.prepare(`
      INSERT INTO security_scans
      (id, container_id, user_id, scan_results, vulnerability_count, risk_level, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateScanId(),
      containerId,
      userId,
      JSON.stringify(scanResults),
      scanResults.issues.length,
      calculateRiskLevel(scanResults.issues),
      now
    ).run();

    // Update container security status
    const isSecure = scanResults.issues.filter((issue: any) => issue.severity === 'high').length === 0;

    await DB.prepare(`
      UPDATE code_containers SET
        security_scan_passed = ?,
        last_security_scan = ?,
        security_issues = ?
      WHERE id = ?
    `).bind(
      isSecure ? 1 : 0,
      now,
      scanResults.issues.length,
      containerId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      scanResults,
      securityStatus: isSecure ? 'passed' : 'failed',
      recommendations: generateSecurityRecommendations(scanResults.issues)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error performing security scan:', error);
    return new Response(JSON.stringify({ error: 'Security scan failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get security scan history
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const containerId = url.searchParams.get('containerId');
  const userId = url.searchParams.get('userId');

  if (!containerId || !userId) {
    return new Response(JSON.stringify({
      error: 'Container ID and User ID required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get scan history
    const scans = await DB.prepare(`
      SELECT * FROM security_scans
      WHERE container_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(containerId, userId).all();

    const processedScans = scans.map((scan: any) => ({
      ...scan,
      scan_results: JSON.parse(scan.scan_results || '{}')
    }));

    // Get container security status
    const container = await DB.prepare(`
      SELECT security_scan_passed, last_security_scan, security_issues
      FROM code_containers
      WHERE id = ? AND user_id = ?
    `).bind(containerId, userId).first();

    return new Response(JSON.stringify({
      scans: processedScans,
      currentStatus: {
        passed: container.security_scan_passed === 1,
        lastScan: container.last_security_scan,
        issueCount: container.security_issues || 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting security scan history:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve scan history' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function performSecurityScan(files: Record<string, string>) {
  const issues: any[] = [];
  const summary = {
    filesScanned: Object.keys(files).length,
    highRiskIssues: 0,
    mediumRiskIssues: 0,
    lowRiskIssues: 0
  };

  for (const [filename, content] of Object.entries(files)) {
    // Check for restricted file types
    for (const restriction of SECURITY_RULES.restrictedFiles) {
      if (restriction.pattern.test(filename)) {
        issues.push({
          file: filename,
          line: 0,
          severity: 'high',
          type: 'restricted_file',
          message: restriction.message,
          pattern: restriction.pattern.source
        });
        summary.highRiskIssues++;
      }
    }

    // Skip binary files or very large files
    if (typeof content !== 'string' || content.length > 1000000) {
      continue;
    }

    // Scan for dangerous patterns
    const lines = content.split('\n');
    for (const [lineIndex, line] of lines.entries()) {
      for (const rule of SECURITY_RULES.dangerousPatterns) {
        const matches = line.match(rule.pattern);
        if (matches) {
          issues.push({
            file: filename,
            line: lineIndex + 1,
            severity: rule.severity,
            type: 'code_vulnerability',
            message: rule.message,
            code: line.trim(),
            match: matches[0]
          });

          if (rule.severity === 'high') summary.highRiskIssues++;
          else if (rule.severity === 'medium') summary.mediumRiskIssues++;
          else summary.lowRiskIssues++;
        }
      }
    }

    // Check package.json for vulnerable dependencies
    if (filename === 'package.json') {
      try {
        const packageData = JSON.parse(content);
        const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };

        for (const [depName, version] of Object.entries(allDeps)) {
          const vuln = SECURITY_RULES.vulnerableDependencies[depName];
          if (vuln && typeof version === 'string') {
            // Simplified version check (in production, use proper semver)
            const isVulnerable = vuln.versions.some((vulnVersion: string) => {
              return version.includes(vulnVersion.replace('<', '').replace('>', ''));
            });

            if (isVulnerable) {
              issues.push({
                file: filename,
                line: 0,
                severity: vuln.severity,
                type: 'vulnerable_dependency',
                message: `${depName}@${version}: ${vuln.message}`,
                dependency: depName,
                currentVersion: version,
                vulnerableVersions: vuln.versions
              });

              if (vuln.severity === 'high') summary.highRiskIssues++;
              else if (vuln.severity === 'medium') summary.mediumRiskIssues++;
              else summary.lowRiskIssues++;
            }
          }
        }
      } catch (e) {
        // Invalid package.json
        issues.push({
          file: filename,
          line: 0,
          severity: 'low',
          type: 'parse_error',
          message: 'Invalid package.json format'
        });
        summary.lowRiskIssues++;
      }
    }
  }

  return {
    issues,
    summary,
    scannedAt: Date.now(),
    riskLevel: calculateRiskLevel(issues)
  };
}

function calculateRiskLevel(issues: any[]): string {
  const highRisk = issues.filter(issue => issue.severity === 'high').length;
  const mediumRisk = issues.filter(issue => issue.severity === 'medium').length;

  if (highRisk > 0) return 'high';
  if (mediumRisk > 3) return 'medium';
  if (mediumRisk > 0) return 'low';
  return 'safe';
}

function generateSecurityRecommendations(issues: any[]): string[] {
  const recommendations = [];
  const highRiskIssues = issues.filter(issue => issue.severity === 'high');

  if (highRiskIssues.length > 0) {
    recommendations.push('🚨 Critical: Address all high-severity security issues before deployment');
  }

  const codeVulns = issues.filter(issue => issue.type === 'code_vulnerability');
  if (codeVulns.length > 0) {
    recommendations.push('🔒 Implement input validation and sanitization for user data');
    recommendations.push('🛡️ Use parameterized queries to prevent SQL injection');
  }

  const depVulns = issues.filter(issue => issue.type === 'vulnerable_dependency');
  if (depVulns.length > 0) {
    recommendations.push('📦 Update vulnerable dependencies to latest secure versions');
    recommendations.push('🔍 Consider using npm audit or yarn audit regularly');
  }

  const restrictedFiles = issues.filter(issue => issue.type === 'restricted_file');
  if (restrictedFiles.length > 0) {
    recommendations.push('🚫 Remove executable files and use proper deployment scripts');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ No major security issues detected, but continue following security best practices');
  }

  return recommendations;
}

function generateScanId(): string {
  const prefix = 'scan_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const id = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + id;
}