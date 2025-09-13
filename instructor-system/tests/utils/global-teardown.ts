import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  // Clean up test artifacts if needed
  const testResultsDir = 'test-results';
  const playwrightReportDir = 'playwright-report';

  // Create summary of test results
  try {
    if (fs.existsSync('test-results.json')) {
      const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
      console.log('📊 Test Results Summary:');
      console.log(`   Passed: ${results.suites.reduce((acc: number, suite: any) => acc + suite.specs.filter((spec: any) => spec.ok).length, 0)}`);
      console.log(`   Failed: ${results.suites.reduce((acc: number, suite: any) => acc + suite.specs.filter((spec: any) => !spec.ok).length, 0)}`);
    }
  } catch (error) {
    console.warn('⚠ Could not read test results:', error);
  }

  // Clean up old screenshots if keeping them gets too large
  const screenshotDir = path.join(testResultsDir, 'screenshots');
  if (fs.existsSync(screenshotDir)) {
    const files = fs.readdirSync(screenshotDir);
    if (files.length > 100) { // Keep only recent 100 screenshots
      console.log('🧹 Cleaning up old screenshots...');
      const filesToDelete = files
        .map(file => ({
          name: file,
          path: path.join(screenshotDir, file),
          time: fs.statSync(path.join(screenshotDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)
        .slice(100);

      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.warn(`⚠ Could not delete ${file.name}:`, error);
        }
      });
    }
  }

  console.log('🏁 Global test teardown completed');
}

export default globalTeardown;