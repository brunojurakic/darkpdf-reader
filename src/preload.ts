import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => ipcRenderer.invoke("window-minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window-maximize"),
  closeWindow: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  toggleDevTools: () => ipcRenderer.invoke("window-toggle-dev-tools"),
  onWindowMaximized: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on("window-maximized", (_, maximized) => callback(maximized))
  },
  removeWindowMaximizedListener: () => {
    ipcRenderer.removeAllListeners("window-maximized")
  },
})

declare global {
  interface Window {
    electronAPI: {
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<boolean>
      closeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>
      toggleDevTools: () => Promise<void>
      onWindowMaximized: (callback: (maximized: boolean) => void) => void
      removeWindowMaximizedListener: () => void
    }
  }
}
