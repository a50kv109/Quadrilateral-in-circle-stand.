import assert from 'node:assert';
import { REMIX2_VERSION } from '../src/index';
import { KERNEL_NAMESPACE } from '../src/kernel/index';
import { DOMAINS_NAMESPACE } from '../src/domains/index';
import { RESEARCH_NAMESPACE } from '../src/research/index';
import { UI_NAMESPACE } from '../src/ui/index';

console.log("=== RUNNING REMIX 2 FOUNDATION TEST ===");

try {
  // Test 1: Assert correct version
  assert.strictEqual(REMIX2_VERSION, "2.0.0-alpha.0", "Version mismatch");
  console.log("✓ Test 1: REMIX2_VERSION validated.");

  // Test 2: Assert namespaces are properly configured
  assert.strictEqual(KERNEL_NAMESPACE, "remix2.kernel", "Kernel namespace mismatch");
  assert.strictEqual(DOMAINS_NAMESPACE, "remix2.domains", "Domains namespace mismatch");
  assert.strictEqual(RESEARCH_NAMESPACE, "remix2.research", "Research namespace mismatch");
  assert.strictEqual(UI_NAMESPACE, "remix2.ui", "UI namespace mismatch");
  console.log("✓ Test 2: Namespaces imported and verified successfully.");

  console.log("\n🎉 REMIX 2 FOUNDATION TESTS PASSED SUCCESSFULLY! 🎉\n");
} catch (error) {
  console.error("❌ REMIX 2 FOUNDATION TEST FAILED!");
  console.error(error);
  process.exit(1);
}
