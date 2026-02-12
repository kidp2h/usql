/**
 * IPC Message Reader for Monaco Language Client
 * Implements MessageReader interface from vscode-jsonrpc
 */
export class IPCMessageReader {
  private listeners: ((data: any) => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private partialMessageListeners: ((data: any) => void)[] = [];
  private cleanupFn: (() => void) | null = null;
  private isDisposed = false;

  constructor() {
    // Guard against SSR
    if (typeof window === 'undefined') {
      console.warn('[LSP Reader] Running in SSR environment');
      return;
    }

    if ((window as any).electronLSP) {
      this.cleanupFn = (window as any).electronLSP.onLSPMessage((data: string) => {
        if (this.isDisposed) return;
        
        try {
          const message = JSON.parse(data);
          this.listeners.forEach(listener => listener(message));
        } catch (error) {
          console.error('[LSP Reader] Parse error:', error);
          this.errorListeners.forEach(listener => listener(error));
        }
      });
    }
  }

  listen(callback: (data: any) => void) {
    this.listeners.push(callback);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(callback);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      },
    };
  }

  onError(callback: (error: any) => void) {
    this.errorListeners.push(callback);
    return {
      dispose: () => {
        const index = this.errorListeners.indexOf(callback);
        if (index !== -1) {
          this.errorListeners.splice(index, 1);
        }
      },
    };
  }

  onClose(callback: () => void) {
    this.closeListeners.push(callback);
    return {
      dispose: () => {
        const index = this.closeListeners.indexOf(callback);
        if (index !== -1) {
          this.closeListeners.splice(index, 1);
        }
      },
    };
  }

  onPartialMessage(callback: (data: any) => void) {
    this.partialMessageListeners.push(callback);
    return {
      dispose: () => {
        const index = this.partialMessageListeners.indexOf(callback);
        if (index !== -1) {
          this.partialMessageListeners.splice(index, 1);
        }
      },
    };
  }

  dispose() {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    
    this.closeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[LSP Reader] Error in close listener:', error);
      }
    });
    
    this.listeners = [];
    this.errorListeners = [];
    this.closeListeners = [];
    this.partialMessageListeners = [];
  }
}

/**
 * IPC Message Writer for Monaco Language Client
 * Implements MessageWriter interface from vscode-jsonrpc
 */
export class IPCMessageWriter {
  private errorListeners: ((error: any) => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private isDisposed = false;

  write(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDisposed) {
        reject(new Error('Writer is disposed'));
        return;
      }

      // Guard against SSR
      if (typeof window === 'undefined') {
        reject(new Error('Window not available (SSR)'));
        return;
      }

      if ((window as any).electronLSP) {
        try {
          const message = JSON.stringify(data);
          (window as any).electronLSP.sendToLSP(message);
          resolve();
        } catch (error) {
          console.error('[LSP Writer] Write error:', error);
          this.errorListeners.forEach(listener => listener(error));
          reject(error);
        }
      } else {
        const error = new Error('electronLSP not available');
        this.errorListeners.forEach(listener => listener(error));
        reject(error);
      }
    });
  }

  onError(callback: (error: any) => void) {
    this.errorListeners.push(callback);
    return {
      dispose: () => {
        const index = this.errorListeners.indexOf(callback);
        if (index !== -1) {
          this.errorListeners.splice(index, 1);
        }
      },
    };
  }

  onClose(callback: () => void) {
    this.closeListeners.push(callback);
    return {
      dispose: () => {
        const index = this.closeListeners.indexOf(callback);
        if (index !== -1) {
          this.closeListeners.splice(index, 1);
        }
      },
    };
  }

  end(): void {
    this.dispose();
  }

  dispose() {
    if (this.isDisposed) return;
    
    this.isDisposed = true;
    
    this.closeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[LSP Writer] Error in close listener:', error);
      }
    });
    
    this.errorListeners = [];
    this.closeListeners = [];
  }
}

/**
 * Check if running in Electron environment with LSP support
 */
export function isElectronLSPAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    (window as any).electronLSP !== undefined &&
    typeof (window as any).electronLSP.isAvailable === 'function' &&
    (window as any).electronLSP.isAvailable()
  );
}

/**
 * Get LSP status from Electron
 */
export async function getLSPStatus(): Promise<{
  ok: boolean;
  ready?: boolean;
  transport?: string;
  message?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'SSR environment' };
  }
  
  if (!(window as any).electron?.getLspStatus) {
    return { ok: false, message: 'Not running in Electron' };
  }

  try {
    return await (window as any).electron.getLspStatus();
  } catch (error) {
    console.error('[LSP] Failed to get status:', error);
    return { ok: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}