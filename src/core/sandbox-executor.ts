import vm from 'vm'

/**
 * SADIYA Sandbox Executor
 * -----------------------
 * Provides isolated execution for untrusted code snippets.
 * This is the foundational safety layer for future Docker/Firecracker integration.
 */
export function runSandboxed(code: string) {
  const sandbox = {
    console,
    // Add safe globals here as needed
    process: {
      env: { NODE_ENV: 'sandbox' }
    }
  }

  const context = vm.createContext(sandbox)

  try {
    return vm.runInContext(code, context, { timeout: 5000 })
  } catch (err: any) {
    return {
      success: false,
      error: `Sandbox Execution Failed: ${err.message}`
    }
  }
}
